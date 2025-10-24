import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Package } from 'lucide-react';
import './MyItemsPage.css';

const MyItemsPage = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyItems();
  }, []);

  const fetchMyItems = async () => {
    try {
      const response = await axios.get(`${API}/items/user/${user.id}`);
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load your items');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (itemId, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'taken' : 'available';
    const token = localStorage.getItem('token');

    try {
      await axios.patch(
        `${API}/items/${itemId}/status?status=${newStatus}&token=${token}`
      );
      toast.success(`Item marked as ${newStatus}`);
      fetchMyItems();
    } catch (error) {
      toast.error('Failed to update item status');
    }
  };

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  return (
    <div className="my-items-page">
      <div className="my-items-container">
        <div className="page-header">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="back-btn"
            data-testid="back-button"
          >
            <ArrowLeft /> Back
          </Button>
          <h1 data-testid="my-items-title">My Items</h1>
        </div>

        {items.length === 0 ? (
          <div className="no-items" data-testid="no-items-message">
            <Package size={64} />
            <p>You haven't posted any items yet</p>
            <Button onClick={() => navigate('/')} data-testid="go-home-button">
              Post Your First Item
            </Button>
          </div>
        ) : (
          <div className="my-items-grid" data-testid="my-items-grid">
            {items.map(item => (
              <div key={item.id} className="my-item-card" data-testid={`my-item-card-${item.id}`}>
                <div className="my-item-image">
                  <img src={item.image_url} alt={item.title} />
                  <span className={`status-badge ${item.status}`} data-testid={`my-item-status-${item.id}`}>
                    {item.status}
                  </span>
                </div>
                <div className="my-item-details">
                  <h3 data-testid={`my-item-title-${item.id}`}>{item.title}</h3>
                  <p className="category" data-testid={`my-item-category-${item.id}`}>{item.category}</p>
                  <p className="description">{item.description.substring(0, 80)}...</p>
                  <div className="my-item-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/item/${item.id}`)}
                      data-testid={`view-item-button-${item.id}`}
                    >
                      View Details
                    </Button>
                    <Button
                      variant={item.status === 'available' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleStatusToggle(item.id, item.status)}
                      data-testid={`toggle-status-button-${item.id}`}
                    >
                      Mark as {item.status === 'available' ? 'Taken' : 'Available'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyItemsPage;