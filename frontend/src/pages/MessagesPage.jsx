import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import ChatBox from '@/components/ChatBox';
import './MessagesPage.css';

const MessagesPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/conversations?token=${token}`);
      setConversations(response.data);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="page-header">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="back-btn"
            data-testid="back-button"
          >
            <ArrowLeft /> Back
          </Button>
          <h1 data-testid="messages-title">Messages</h1>
        </div>

        {conversations.length === 0 ? (
          <div className="no-conversations" data-testid="no-conversations">
            <MessageCircle size={64} />
            <p>No messages yet</p>
            <Button onClick={() => navigate('/')} data-testid="browse-items-button">
              Browse Items
            </Button>
          </div>
        ) : (
          <div className="conversations-list" data-testid="conversations-list">
            {conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                className="conversation-card"
                onClick={() => setSelectedChat(conv)}
                data-testid={`conversation-${conv.conversation_id}`}
              >
                <div className="conversation-image">
                  <img src={conv.item.image_url} alt={conv.item.title} />
                </div>
                <div className="conversation-info">
                  <div className="conversation-header">
                    <h3 data-testid={`conversation-user-${conv.conversation_id}`}>
                      {conv.other_user.name}
                    </h3>
                    {conv.unread_count > 0 && (
                      <span className="unread-badge" data-testid={`unread-badge-${conv.conversation_id}`}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="item-title" data-testid={`conversation-item-${conv.conversation_id}`}>
                    Re: {conv.item.title}
                  </p>
                  <p className="last-message" data-testid={`last-message-${conv.conversation_id}`}>
                    {conv.last_message}
                  </p>
                  <span className="message-time">
                    {new Date(conv.last_message_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedChat && (
        <ChatBox
          itemId={selectedChat.item.id}
          otherUserId={selectedChat.other_user.id}
          otherUserName={selectedChat.other_user.name}
          onClose={() => {
            setSelectedChat(null);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
};

export default MessagesPage;
