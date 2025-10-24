import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import AuthPage from '@/pages/AuthPage';
import HomePage from '@/pages/HomePage';
import ItemDetailPage from '@/pages/ItemDetailPage';
import MyItemsPage from '@/pages/MyItemsPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API}/auth/me?token=${token}`)
        .then(res => {
          if (res.data.success) {
            setUser(res.data.user);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <HomePage user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
        <Route path="/item/:id" element={user ? <ItemDetailPage user={user} /> : <Navigate to="/auth" />} />
        <Route path="/my-items" element={user ? <MyItemsPage user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;