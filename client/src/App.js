import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './components/Login';
import Register from './components/Signup';
import AnonymousEntry from './components/AnonymousEntry';
import ChatWindow from './components/ChatWindow';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Profile from './components/Profile';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import Unsubscribe from './components/Unsubscribe';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import AdminSignup from './components/AdminSignup';
import NotFound from './pages/NotFound';
import Maintenance from './components/Maintenance';
import io from 'socket.io-client';
import { checkMaintenanceStatus } from './utils/api';

const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
  withCredentials: true,
});

function App() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const { maintenanceMode } = await checkMaintenanceStatus();
        setMaintenanceMode(maintenanceMode);
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error);
        setMaintenanceMode(false); // Default to false on error
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceStatus();
  }, []);

  useEffect(() => {
    const userId = JSON.parse(localStorage.getItem('user'))?.id || localStorage.getItem('anonymousId');
    if (userId) socket.emit('join', userId);

    socket.on('notification', ({ text }) => {
      if (Notification.permission === 'granted') {
        new Notification('ChatifyZone', { body: text });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') new Notification('ChatifyZone', { body: text });
        });
      }
    });

    return () => socket.off('notification');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <Routes>
          {/* Admin routes that bypass maintenance mode */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/panel" element={<AdminPanel />} />

          {/* Other routes, affected by maintenance mode */}
          {maintenanceMode ? (
            <Route path="*" element={<Maintenance />} />
          ) : (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Register />} />
              <Route path="/anonymous" element={<AnonymousEntry />} />
              <Route path="/chat" element={<ChatWindow />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/terms" element={<TermsOfService isDarkMode={true} />} />
              <Route path="/privacy" element={<PrivacyPolicy isDarkMode={true} />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
