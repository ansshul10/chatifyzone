import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './components/Login';
import Register from './components/Signup';
import AnonymousEntry from './components/AnonymousEntry';
import ChatWindow from './components/ChatWindow';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Profile from './components/Profile'; // Add this import
import NotFound from './pages/NotFound';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

function App() {
  useEffect(() => {
    const userId = JSON.parse(localStorage.getItem('user'))?.id || localStorage.getItem('anonymousId');
    if (userId) socket.emit('join', userId);

    socket.on('notification', ({ text }) => {
      if (Notification.permission === 'granted') {
        new Notification('Chatify', { body: text });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') new Notification('Chatify', { body: text });
        });
      }
    });

    return () => socket.off('notification');
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/anonymous" element={<AnonymousEntry />} />
          <Route path="/chat" element={<ChatWindow />} />
          <Route path="/profile" element={<Profile />} /> {/* Add this route */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
