from fastapi import FastAPI, APIRouter, HTTPException, status, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional, Annotated
import uuid
from datetime import datetime, timezone, timedelta
import os
import logging
import cloudinary
import cloudinary.uploader
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "")
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    
    @field_validator('email')
    def validate_college_email(cls, v):
        if not v.endswith('@cmrcet.ac.in'):
            raise ValueError('Only CMRCET college emails are allowed')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Item(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    image_url: str
    location: str
    contact_name: str
    contact_email: str
    contact_phone: str
    user_id: str
    status: str = "available"  # available or taken
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ItemCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    contact_phone: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    sender_name: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = False

class MessageCreate(BaseModel):
    item_id: str
    receiver_id: str
    message: str

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth endpoints
@api_router.post("/auth/signup")
async def signup(user_data: UserSignup):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = hashed_password
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    
    return {
        "success": True,
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user['id'], "email": user['email']})
    
    return {
        "success": True,
        "token": access_token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "phone": user['phone']
        }
    }

@api_router.get("/auth/me")
async def get_me(token: str):
    user = await get_current_user(token)
    return {
        "success": True,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "phone": user['phone']
        }
    }

# Item endpoints
@api_router.post("/items")
async def create_item(
    token: Annotated[str, Form()],
    title: Annotated[str, Form()],
    description: Annotated[str, Form()],
    category: Annotated[str, Form()],
    location: Annotated[str, Form()],
    contact_phone: Annotated[str, Form()],
    file: UploadFile = File(...)
):
    # Verify user
    user = await get_current_user(token)
    
    # Validate file
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Upload to Cloudinary (or use test mode)
    try:
        contents = await file.read()
        
        # Check if using test credentials
        if os.getenv("CLOUDINARY_CLOUD_NAME") == "test_cloud":
            # Test mode - use placeholder image
            image_url = f"https://placehold.co/600x400/ff7b54/white?text={title.replace(' ', '+')}"
            logger.info("Test mode: Using placeholder image")
        else:
            # Production mode - upload to Cloudinary
            result = cloudinary.uploader.upload(
                contents,
                folder="lend_a_hand/items",
                public_id=f"{title.replace(' ', '_')}_{uuid.uuid4().hex[:8]}",
                overwrite=False,
                resource_type="auto"
            )
            image_url = result.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    # Create item
    item = Item(
        title=title,
        description=description,
        category=category,
        image_url=image_url,
        location=location,
        contact_name=user['name'],
        contact_email=user['email'],
        contact_phone=contact_phone,
        user_id=user['id']
    )
    
    item_doc = item.model_dump()
    item_doc['created_at'] = item_doc['created_at'].isoformat()
    
    await db.items.insert_one(item_doc)
    
    return {
        "success": True,
        "item": item.model_dump()
    }

@api_router.get("/items", response_model=List[Item])
async def get_items(category: Optional[str] = None, search: Optional[str] = None):
    query = {}
    
    if category and category != "All":
        query['category'] = category
    
    if search:
        query['$or'] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.items.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return items

@api_router.get("/items/{item_id}")
async def get_item(item_id: str):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if isinstance(item['created_at'], str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return {"success": True, "item": item}

@api_router.patch("/items/{item_id}/status")
async def update_item_status(item_id: str, status: str, token: str):
    user = await get_current_user(token)
    
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.items.update_one({"id": item_id}, {"$set": {"status": status}})
    
    return {"success": True, "message": "Item status updated"}

@api_router.get("/items/user/{user_id}")
async def get_user_items(user_id: str):
    items = await db.items.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return items

# Chat endpoints
@api_router.post("/messages")
async def send_message(token: str, msg_data: MessageCreate):
    user = await get_current_user(token)
    
    # Get or create conversation
    conversation_id = f"{min(user['id'], msg_data.receiver_id)}_{max(user['id'], msg_data.receiver_id)}_{msg_data.item_id}"
    
    # Check if conversation exists
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        # Create new conversation
        conversation_doc = {
            "id": conversation_id,
            "item_id": msg_data.item_id,
            "participants": [user['id'], msg_data.receiver_id],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_message_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conversation_doc)
    
    # Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=user['id'],
        sender_name=user['name'],
        message=msg_data.message
    )
    
    message_doc = message.model_dump()
    message_doc['created_at'] = message_doc['created_at'].isoformat()
    
    await db.messages.insert_one(message_doc)
    
    # Update conversation last message time
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": message.model_dump()}

@api_router.get("/messages/{item_id}/{other_user_id}")
async def get_messages(item_id: str, other_user_id: str, token: str):
    user = await get_current_user(token)
    
    conversation_id = f"{min(user['id'], other_user_id)}_{max(user['id'], other_user_id)}_{item_id}"
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg['created_at'], str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "sender_id": other_user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.get("/conversations")
async def get_conversations(token: str):
    user = await get_current_user(token)
    
    # Get all conversations for this user
    conversations = await db.conversations.find(
        {"participants": user['id']},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(1000)
    
    result = []
    for conv in conversations:
        # Get the other participant
        other_user_id = [p for p in conv['participants'] if p != user['id']][0]
        other_user = await db.users.find_one({"id": other_user_id}, {"_id": 0})
        
        # Get item info
        item = await db.items.find_one({"id": conv['item_id']}, {"_id": 0})
        
        # Get last message
        last_message = await db.messages.find_one(
            {"conversation_id": conv['id']},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        # Count unread messages
        unread_count = await db.messages.count_documents({
            "conversation_id": conv['id'],
            "sender_id": other_user_id,
            "read": False
        })
        
        result.append({
            "conversation_id": conv['id'],
            "item": {
                "id": item['id'],
                "title": item['title'],
                "image_url": item['image_url']
            },
            "other_user": {
                "id": other_user['id'],
                "name": other_user['name']
            },
            "last_message": last_message['message'] if last_message else "",
            "last_message_at": conv['last_message_at'],
            "unread_count": unread_count
        })
    
    return result

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()