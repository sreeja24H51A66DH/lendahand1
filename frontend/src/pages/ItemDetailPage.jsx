import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react';
import './ItemDetailPage.css';

const ItemDetailPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const response = await axios.get(`${API}/items/${id}`);
      if (response.data.success) {
        setItem(response.data.item);
      }
    } catch (error) {
      toast.error('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  if (!item) {
    return <div className="error-page">Item not found</div>;
  }

  const isOwner = user.id === item.user_id;

  return (
    <div className="item-detail-page">
      <div className="detail-container">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="back-btn"
          data-testid="back-button"
        >
          <ArrowLeft /> Back
        </Button>

        <div className="detail-content">
          <div className="image-section" data-testid="item-image-section">
            <img src={item.image_url} alt={item.title} />
            <span className={`status-badge ${item.status}`} data-testid="item-detail-status">
              {item.status}
            </span>
          </div>

          <div className="info-section">
            <div className="item-header">
              <h1 data-testid="item-detail-title">{item.title}</h1>
              <span className="category-badge" data-testid="item-detail-category">
                {item.category}
              </span>
            </div>

            <div className="item-description">
              <h3>Description</h3>
              <p data-testid="item-detail-description">{item.description}</p>
            </div>

            <div className="item-location">
              <MapPin className="icon" />
              <div>
                <h4>Meeting Location</h4>
                <p data-testid="item-detail-location">{item.location}</p>
              </div>
            </div>

            {!isOwner && (
              <div className="contact-section" data-testid="contact-section">
                <h3>Contact Information</h3>
                <div className="contact-details">
                  <div className="contact-item">
                    <Mail className="icon" />
                    <div>
                      <h4>Email</h4>
                      <a href={`mailto:${item.contact_email}`} data-testid="contact-email">
                        {item.contact_email}
                      </a>
                    </div>
                  </div>
                  <div className="contact-item">
                    <Phone className="icon" />
                    <div>
                      <h4>Phone</h4>
                      <a href={`tel:${item.contact_phone}`} data-testid="contact-phone">
                        {item.contact_phone}
                      </a>
                    </div>
                  </div>
                  <div className="contact-item">
                    <div className="icon">👤</div>
                    <div>
                      <h4>Name</h4>
                      <p data-testid="contact-name">{item.contact_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isOwner && (
              <div className="owner-note" data-testid="owner-note">
                <p>This is your item. Others can see your contact information.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;