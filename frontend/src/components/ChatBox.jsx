import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Send, X } from 'lucide-react';
import './ChatBox.css';

const ChatBox = ({ itemId, otherUserId, otherUserName, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API}/auth/me?token=${token}`)
      .then(res => {
        if (res.data.success) {
          setCurrentUserId(res.data.user.id);
        }
      });
    
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [itemId, otherUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/messages/${itemId}/${otherUserId}?token=${token}`
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      await axios.post(
        `${API}/messages?token=${token}`,
        {
          item_id: itemId,
          receiver_id: otherUserId,
          message: newMessage
        }
      );
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-box" data-testid="chat-box">
      <div className="chat-header">
        <h3 data-testid="chat-header-title">Chat with {otherUserName}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-testid="close-chat-button"
        >
          <X size={18} />
        </Button>
      </div>

      <ScrollArea className="chat-messages" ref={scrollRef} data-testid="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages" data-testid="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.sender_id === currentUserId ? 'sent' : 'received'}`}
              data-testid={`message-${msg.id}`}
            >
              <div className="message-content">
                {msg.sender_id !== currentUserId && (
                  <span className="sender-name" data-testid={`sender-name-${msg.id}`}>
                    {msg.sender_name}
                  </span>
                )}
                <p data-testid={`message-text-${msg.id}`}>{msg.message}</p>
                <span className="message-time" data-testid={`message-time-${msg.id}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      <form onSubmit={handleSend} className="chat-input" data-testid="chat-form">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          data-testid="message-input"
        />
        <Button
          type="submit"
          disabled={loading || !newMessage.trim()}
          data-testid="send-message-button"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default ChatBox;
