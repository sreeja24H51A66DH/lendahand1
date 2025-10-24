import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Package, LogOut, User, MessageCircle } from 'lucide-react';
import './HomePage.css';

const categories = ['All', 'Lab Items', 'Stationery', 'Clothing', 'Books', 'Electronics', 'Sports Equipment', 'Others'];

const HomePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Books',
    location: '',
    contact_phone: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, selectedCategory]);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/items`);
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load items');
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', imageFile);
      formDataToSend.append('token', token);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('contact_phone', formData.contact_phone);

      const response = await axios.post(`${API}/items`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success('Item posted successfully!');
        setShowAddDialog(false);
        resetForm();
        fetchItems();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post item');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Books',
      location: '',
      contact_phone: ''
    });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="home-page">
      <nav className="navbar" data-testid="navbar">
        <div className="nav-content">
          <h1 data-testid="app-title">Lend A Hand</h1>
          <div className="nav-actions">
            <Button
              variant="outline"
              onClick={() => navigate('/messages')}
              data-testid="messages-button"
            >
              <MessageCircle className="icon" /> Messages
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/my-items')}
              data-testid="my-items-button"
            >
              <Package className="icon" /> My Items
            </Button>
            <div className="user-info" data-testid="user-info">
              <User className="icon" />
              <span>{user.name}</span>
            </div>
            <Button variant="ghost" onClick={onLogout} data-testid="logout-button">
              <LogOut className="icon" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <div className="hero-section">
          <h2 data-testid="hero-title">Exchange, Borrow & Share</h2>
          <p data-testid="hero-subtitle">Connect with fellow CMRCET students</p>
        </div>

        <div className="controls-section">
          <div className="search-bar">
            <Search className="search-icon" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="category-select" data-testid="category-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat} data-testid={`category-${cat}`}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="add-btn" data-testid="add-item-button">
                <Plus className="icon" /> Post Item
              </Button>
            </DialogTrigger>
            <DialogContent className="add-item-dialog" data-testid="add-item-dialog">
              <DialogHeader>
                <DialogTitle>Post New Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="add-item-form">
                <div className="form-group">
                  <Label htmlFor="title">Item Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="item-title-input"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger data-testid="item-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    data-testid="item-description-input"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="location">Location (where to meet)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Library, Canteen"
                    required
                    data-testid="item-location-input"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    required
                    data-testid="item-phone-input"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="image">Item Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                    data-testid="item-image-input"
                  />
                </div>

                {imagePreview && (
                  <div className="image-preview" data-testid="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}

                <Button type="submit" disabled={loading} className="submit-btn" data-testid="submit-item-button">
                  {loading ? 'Posting...' : 'Post Item'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="items-grid" data-testid="items-grid">
          {filteredItems.length === 0 ? (
            <div className="no-items" data-testid="no-items-message">
              <Package size={48} />
              <p>No items found</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="item-card"
                onClick={() => navigate(`/item/${item.id}`)}
                data-testid={`item-card-${item.id}`}
              >
                <div className="item-image">
                  <img src={item.image_url} alt={item.title} />
                  <span className={`status-badge ${item.status}`} data-testid={`item-status-${item.id}`}>
                    {item.status}
                  </span>
                </div>
                <div className="item-details">
                  <h3 data-testid={`item-title-${item.id}`}>{item.title}</h3>
                  <p className="category" data-testid={`item-category-${item.id}`}>{item.category}</p>
                  <p className="description" data-testid={`item-description-${item.id}`}>
                    {item.description.substring(0, 80)}...
                  </p>
                  <p className="location" data-testid={`item-location-${item.id}`}>📍 {item.location}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;