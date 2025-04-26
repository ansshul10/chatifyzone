import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaEdit, FaSave, FaTimes, FaCog, FaLock, FaTrash, FaUsers, FaUserMinus, FaShieldAlt, FaUserPlus, FaSun, FaMoon, FaHistory, FaSearch } from 'react-icons/fa';
import io from 'socket.io-client';
import api from '../utils/api';
import Navbar from './Navbar';

// Utility to generate consistent random color based on username
const generateAvatarColor = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 50%)`;
};

const Profile = () => {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    age: null,
    status: 'Available',
    privacy: { allowFriendRequests: true, twoFactorEnabled: false, profileVisibility: 'Public' },
    friends: [],
    blockedUsers: [],
    createdAt: null,
  });
  const [friendRequests, setFriendRequests] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true' || true);
  const [newFriendRequest, setNewFriendRequest] = useState(null);
  const [friendSearch, setFriendSearch] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const socketRef = useRef(null);
  const userId = JSON.parse(localStorage.getItem('user'))?.id;
  const username = JSON.parse(localStorage.getItem('user'))?.username;

  useEffect(() => {
    if (!token || !userId || !username) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        api.defaults.headers.common['x-auth-token'] = token;
        const { data } = await api.get('/auth/profile');
        setProfile({
          username: data.username || '',
          email: data.email || '',
          bio: data.bio || '',
          age: data.age || null,
          status: data.status || 'Available',
          privacy: {
            allowFriendRequests: data.privacy?.allowFriendRequests ?? true,
            twoFactorEnabled: data.privacy?.twoFactorEnabled ?? false,
            profileVisibility: data.privacy?.profileVisibility ?? 'Public',
          },
          friends: Array.isArray(data.friends) ? data.friends : [],
          blockedUsers: Array.isArray(data.blockedUsers) ? data.blockedUsers : [],
          createdAt: data.createdAt || null,
        });
        setFriendRequests(Array.isArray(data.friendRequests) ? data.friendRequests : []);
        setActivityLog(data.activityLog || []); // Simulated activity log
        setError('');
      } catch (err) {
        setError(err.response?.data.msg || 'Failed to load profile');
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();

    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', { query: { username } });
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join', userId);
    });

    socket.on('friendRequestsUpdate', (friendRequests) => {
      const validRequests = Array.isArray(friendRequests) ? friendRequests.filter(req => req && req._id && req.username) : [];
      setFriendRequests(validRequests);
    });

    socket.on('friendsUpdate', (friendList) => {
      const validFriends = Array.isArray(friendList) ? friendList.filter(friend => friend && friend._id && friend.username) : [];
      setProfile((prev) => ({ ...prev, friends: validFriends }));
    });

    socket.on('friendRequestReceived', (request) => {
      if (request._id === userId) return;
      setFriendRequests((prev) => {
        if (prev.some(req => req._id === request._id)) return prev;
        setNewFriendRequest(request);
        setTimeout(() => setNewFriendRequest(null), 5000);
        return [...prev, request];
      });
      setActivityLog((prev) => [
        { action: `Received friend request from ${request.username}`, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
    });

    socket.on('blockedUsersUpdate', (blockedUsers) => {
      const validBlocked = Array.isArray(blockedUsers) ? blockedUsers.filter(user => user && user._id) : [];
      setProfile((prev) => ({ ...prev, blockedUsers: validBlocked }));
    });

    socket.on('actionResponse', ({ success, msg }) => {
      setError(success ? '' : msg);
      setSuccess(success ? msg : '');
      setTimeout(() => { setError(''); setSuccess(''); }, 3000);
    });

    socket.on('error', ({ msg }) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, userId, username, navigate]);

  const handleSave = async () => {
    if (profile.bio.length > 150) {
      setError('Bio cannot exceed 150 characters');
      return;
    }
    if (profile.age && (profile.age < 13 || profile.age > 120)) {
      setError('Age must be between 13 and 120');
      return;
    }
    try {
      const { data } = await api.put('/auth/profile', {
        bio: profile.bio,
        age: profile.age,
        status: profile.status,
        allowFriendRequests: profile.privacy.allowFriendRequests,
        twoFactorEnabled: profile.privacy.twoFactorEnabled,
        profileVisibility: profile.privacy.profileVisibility,
      });
      setProfile((prev) => ({
        ...prev,
        bio: data.bio,
        age: data.age,
        status: data.status,
        privacy: {
          allowFriendRequests: data.privacy.allowFriendRequests,
          twoFactorEnabled: data.privacy.twoFactorEnabled,
          profileVisibility: data.privacy.profileVisibility,
        },
      }));
      setActivityLog((prev) => [
        { action: `Updated profile (${data.status})`, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to update profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: name === 'age' ? (value === '' ? null : Number(value)) : value,
    }));
  };

  const handlePrivacyChange = (key, value) => {
    setProfile((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    }));
  };

  const handleToggle2FA = async () => {
    try {
      const { data } = await api.put('/auth/toggle-2fa', { enable: !profile.privacy.twoFactorEnabled });
      setProfile((prev) => ({
        ...prev,
        privacy: { ...prev.privacy, twoFactorEnabled: data.twoFactorEnabled },
      }));
      setActivityLog((prev) => [
        { action: `2FA ${data.twoFactorEnabled ? 'enabled' : 'disabled'}`, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
      setSuccess(`2FA ${data.twoFactorEnabled ? 'enabled' : 'disabled'} successfully!`);
      setIs2FAModalOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to toggle 2FA');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword) {
      setError('Please enter both passwords');
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must be 8+ characters with at least one uppercase letter and one number');
      return;
    }
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
      setSuccess(data.msg);
      setActivityLog((prev) => [
        { action: 'Changed password', timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
      setCurrentPassword('');
      setNewPassword('');
      setIsChangePasswordOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure? This action cannot be undone.')) {
      try {
        await api.delete('/auth/delete-account');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setSuccess('Account deleted successfully.');
        setTimeout(() => navigate('/'), 2000);
      } catch (err) {
        setError(err.response?.data.msg || 'Failed to delete account');
      }
    }
    setIsSettingsOpen(false);
  };

  const handleUnblockUser = (targetId) => {
    socketRef.current.emit('unblockUser', { userId, targetId });
    setActivityLog((prev) => [
      { action: 'Unblocked a user', timestamp: new Date().toISOString() },
      ...prev.slice(0, 4),
    ]);
  };

  const handleUnfriend = (friendId) => {
    socketRef.current.emit('unfriend', { userId, friendId });
    setSuccess('Removing friend...');
    setActivityLog((prev) => [
      { action: 'Removed a friend', timestamp: new Date().toISOString() },
      ...prev.slice(0, 4),
    ]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleChatWithFriend = (friendId) => navigate(`/chat?friendId=${friendId}`);

  const handleAcceptFriendRequest = (friendId) => {
    const friendRequest = friendRequests.find((req) => req._id === friendId);
    if (friendRequest) {
      setFriendRequests((prev) => prev.filter((req) => req._id !== friendId));
      setProfile((prev) => {
        if (prev.friends.some(f => f._id === friendId)) return prev;
        return {
          ...prev,
          friends: [...prev.friends, { _id: friendId, username: friendRequest.username }],
        };
      });
      setActivityLog((prev) => [
        { action: `Accepted friend request from ${friendRequest.username}`, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
    }
    socketRef.current.emit('acceptFriendRequest', { userId, friendId });
  };

  const handleDeclineFriendRequest = (friendId) => {
    setFriendRequests((prev) => prev.filter((req) => req._id !== friendId));
    socketRef.current.emit('declineFriendRequest', { userId, friendId });
    setActivityLog((prev) => [
      { action: 'Declined a friend request', timestamp: new Date().toISOString() },
      ...prev.slice(0, 4),
    ]);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      localStorage.setItem('darkMode', !prev);
      return !prev;
    });
  };

  const filteredFriends = profile.friends.filter(friend =>
    friend.username.toLowerCase().includes(friendSearch.toLowerCase())
  );

  // Animation variants
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.1 } } };
  const sidebarVariants = { hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } } };
  const formVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } } };
  const inputVariants = {
    hover: { scale: 1.02, borderColor: 'rgba(255, 0, 0, 0.5)' },
    focus: { scale: 1.03, boxShadow: '0 0 8px rgba(255, 0, 0, 0.3)', borderColor: '#FF0000' },
  };
  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 2px 8px rgba(255, 0, 0, 0.2)' },
    tap: { scale: 0.95 },
  };
  const dropdownVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } } };
  const modalVariants = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } } };
  const notificationVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } } };

  if (loading) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`min-h-screen ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F7F7F7] text-gray-900'} flex flex-col pt-16 items-center justify-center font-sans`}
      >
        <Navbar />
        <p className="text-base">Loading profile...</p>
      </motion.div>
    );
  }

  if (!profile.username) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`min-h-screen ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F7F7F7] text-gray-900'} flex flex-col pt-16 items-center justify-center font-sans`}
      >
        <Navbar />
        <p className="text-red-400 bg-red-900/10 p-2 rounded-lg text-sm">Error: Profile data not loaded. {error}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`min-h-screen ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F7F7F7] text-gray-900'} flex flex-col pt-16 font-sans transition-colors duration-300`}
    >
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-6 flex-grow">
        <motion.div
          variants={sidebarVariants}
          className={`w-full lg:w-80 ${isDarkMode ? 'bg-white/5 backdrop-blur-md border-gray-800/20' : 'bg-white shadow-sm border-gray-200'} p-6 rounded-xl border`}
        >
          <div className="text-center mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-semibold text-white border-2 border-red-500"
              style={{ backgroundColor: generateAvatarColor(profile.username) }}
            >
              {profile.username[0].toUpperCase()}
            </motion.div>
            <h2 className={`mt-3 text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.username}</h2>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="space-y-3">
            <motion.div whileHover={{ x: 5 }} className="flex items-center space-x-2">
              <FaEnvelope className={`text-lg ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
              <span className="text-sm">{profile.email}</span>
            </motion.div>
            <motion.div whileHover={{ x: 5 }} className="flex items-center space-x-2">
              <FaUsers className={`text-lg ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
              <span className="text-sm">{profile.friends.length} Friends</span>
            </motion.div>
            <motion.div whileHover={{ x: 5 }} className="flex items-center space-x-2">
              <FaUserPlus className={`text-lg ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
              <span className="text-sm">{friendRequests.length} Pending Requests</span>
            </motion.div>
            <motion.button
              whileHover="hover"
              whileTap="tap"
              variants={buttonVariants}
              onClick={() => navigate('/chat')}
              className={`w-full px-4 py-2 rounded-lg ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} text-sm font-medium shadow-sm transition-colors duration-200`}
              aria-label="Go to chat"
            >
              Go to Chat
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={formVariants} className="w-full lg:flex-1">
          <div className={`${isDarkMode ? 'bg-white/5 backdrop-blur-md border-gray-800/20' : 'bg-white shadow-sm border-gray-200'} p-6 rounded-xl border`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile Settings</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'} transition-colors duration-200`}
                aria-label="Open settings"
              >
                <FaCog className="text-xl" />
              </motion.button>
            </div>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={dropdownVariants}
                  className={`absolute right-8 top-14 w-60 ${isDarkMode ? 'bg-white/5 backdrop-blur-md border-gray-800/20' : 'bg-white border-gray-200'} rounded-lg shadow-lg p-4 z-20`}
                  role="menu"
                  aria-label="Profile settings"
                >
                  <div className="space-y-2">
                    <motion.div
                      whileHover={{ x: 5, color: isDarkMode ? '#FF6666' : '#FF0000' }}
                      onClick={() => { setIsSettingsOpen(false); setIsChangePasswordOpen(true); }}
                      className="flex items-center space-x-2 text-sm cursor-pointer"
                      role="menuitem"
                    >
                      <FaLock />
                      <span>Change Password</span>
                    </motion.div>
                    <motion.div
                      whileHover={{ x: 5, color: isDarkMode ? '#FF6666' : '#FF0000' }}
                      onClick={() => { setIsSettingsOpen(false); setIsBlockedUsersOpen(true); }}
                      className="flex items-center space-x-2 text-sm cursor-pointer"
                      role="menuitem"
                    >
                      <FaShieldAlt />
                      <span>Blocked Users</span>
                    </motion.div>
                    <motion.div
                      whileHover={{ x: 5, color: isDarkMode ? '#FF6666' : '#FF0000' }}
                      onClick={() => { setIsSettingsOpen(false); setIs2FAModalOpen(true); }}
                      className="flex items-center space-x-2 text-sm cursor-pointer"
                      role="menuitem"
                    >
                      <FaShieldAlt />
                      <span>{profile.privacy.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}</span>
                    </motion.div>
                    <motion.div
                      whileHover={{ x: 5, color: '#EF4444' }}
                      onClick={handleDeleteAccount}
                      className="flex items-center space-x-2 text-sm cursor-pointer"
                      role="menuitem"
                    >
                      <FaTrash />
                      <span>Delete Account</span>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-center mb-4 bg-red-900/10 p-2 rounded-lg text-sm">{error}</motion.p>}
            {success && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-center mb-4 bg-green-900/10 p-2 rounded-lg text-sm">{success}</motion.p>}

            <div className="space-y-6">
              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
                {isEditing ? (
                  <motion.select
                    name="status"
                    value={profile.status}
                    onChange={handleChange}
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/10 border-gray-700/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors duration-200`}
                    aria-label="Status"
                  >
                    <option value="Available">Available</option>
                    <option value="Away">Away</option>
                    <option value="Busy">Busy</option>
                    <option value="Offline">Offline</option>
                  </motion.select>
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{profile.status}</p>
                )}
              </div>

              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bio (max 150 characters)</label>
                {isEditing ? (
                  <motion.textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleChange}
                    maxLength="150"
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/10 border-gray-700/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors duration-200`}
                    rows="3"
                    aria-label="Bio"
                  />
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{profile.bio || 'No bio yet'}</p>
                )}
                {isEditing && (
                  <span className={`text-xs ${profile.bio.length > 150 ? 'text-red-400' : 'text-gray-400'}`}>{profile.bio.length}/150</span>
                )}
              </div>

              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Age</label>
                {isEditing ? (
                  <motion.input
                    type="number"
                    name="age"
                    value={profile.age || ''}
                    onChange={handleChange}
                    min="13"
                    max="120"
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/10 border-gray-700/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors duration-200`}
                    aria-label="Age"
                  />
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{profile.age || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label
                  className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center cursor-pointer`}
                  onClick={() => setIsActivityOpen(!isActivityOpen)}
                >
                  <FaHistory className="mr-2" /> Recent Activity
                </label>
                <AnimatePresence>
                  {isActivityOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 max-h-40 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-transparent"
                    >
                      {activityLog.length > 0 ? (
                        activityLog.map((entry, index) => (
                          <div key={index} className={`${isDarkMode ? 'bg-gray-800/10' : 'bg-gray-50'} p-2 rounded-lg border ${isDarkMode ? 'border-gray-700/20' : 'border-gray-200'}`}>
                            <span className="text-sm">{entry.action}</span>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} block`}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No recent activity.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                  <FaUserPlus className="mr-2" /> Friend Requests ({friendRequests.length})
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 mt-2 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-transparent">
                  {friendRequests.length > 0 ? (
                    friendRequests.map((req, index) => (
                      <motion.div
                        key={req._id || `req-${index}`}
                        whileHover={{ scale: 1.02 }}
                        className={`${isDarkMode ? 'bg-gray-800/10' : 'bg-gray-50'} p-3 rounded-lg flex justify-between items-center border ${isDarkMode ? 'border-gray-700/20' : 'border-gray-200'}`}
                      >
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{req.username || 'Unknown'}</span>
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover="hover"
                            whileTap="tap"
                            variants={buttonVariants}
                            onClick={() => handleAcceptFriendRequest(req._id)}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors duration-200"
                            aria-label={`Accept friend request from ${req.username}`}
                          >
                            Accept
                          </motion.button>
                          <motion.button
                            whileHover="hover"
                            whileTap="tap"
                            variants={buttonVariants}
                            onClick={() => handleDeclineFriendRequest(req._id)}
                            className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors duration-200"
                            aria-label={`Decline friend request from ${req.username}`}
                          >
                            Decline
                          </motion.button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No pending requests.</p>
                  )}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                  <FaUsers className="mr-2" /> Friends ({filteredFriends.length})
                </label>
                <motion.div
                  className="relative mt-2"
                  variants={inputVariants}
                  whileHover="hover"
                >
                  <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    placeholder="Search friends..."
                    className={`w-full pl-10 pr-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800/10 border-gray-700/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors duration-200`}
                    aria-label="Search friends"
                  />
                </motion.div>
                <div className="max-h-40 overflow-y-auto space-y-2 mt-2 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-transparent">
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend, index) => (
                      <motion.div
                        key={friend._id || `friend-${index}`}
                        whileHover={{ scale: 1.02 }}
                        className={`${isDarkMode ? 'bg-gray-800/10' : 'bg-gray-50'} p-3 rounded-lg flex justify-between items-center border ${isDarkMode ? 'border-gray-700/20' : 'border-gray-200'}`}
                      >
                        <span
                          onClick={() => handleChatWithFriend(friend._id)}
                          className={`cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'} hover:text-red-400 text-sm transition-colors duration-200`}
                        >
                          {friend.username || 'Unknown'}
                        </span>
                        <motion.button
                          whileHover="hover"
                          whileTap="tap"
                          variants={buttonVariants}
                          onClick={() => handleUnfriend(friend._id)}
                          className="text-red-400 hover:text-red-500 transition-colors duration-200"
                          aria-label={`Remove friend ${friend.username}`}
                        >
                          <FaUserMinus className="text-lg" />
                        </motion.button>
                      </motion.div>
                    ))
                  ) : (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No friends found.</p>
                  )}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                  <FaShieldAlt className="mr-2" /> Privacy
                </label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={profile.privacy.allowFriendRequests}
                      onChange={() => handlePrivacyChange('allowFriendRequests', !profile.privacy.allowFriendRequests)}
                      disabled={!isEditing}
                      className="form-checkbox h-4 w-4 text-red-500 rounded focus:ring-red-500"
                      aria-label="Allow friend requests"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Allow Friend Requests</span>
                  </label>
                  <div>
                    <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Profile Visibility</label>
                    {isEditing ? (
                      <motion.select
                        name="profileVisibility"
                        value={profile.privacy.profileVisibility}
                        onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                        variants={inputVariants}
                        whileHover="hover"
                        whileFocus="focus"
                        className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/10 border-gray-700/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors duration-200`}
                        aria-label="Profile visibility"
                      >
                        <option value="Public">Public</option>
                        <option value="Friends">Friends</option>
                        <option value="Private">Private</option>
                      </motion.select>
                    ) : (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{profile.privacy.profileVisibility}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                {isEditing ? (
                  <>
                    <motion.button
                      whileHover="hover"
                      whileTap="tap"
                      variants={buttonVariants}
                      onClick={handleSave}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm flex items-center space-x-2 transition-colors duration-200"
                      aria-label="Save profile"
                    >
                      <FaSave />
                      <span>Save</span>
                    </motion.button>
                    <motion.button
                      whileHover="hover"
                      whileTap="tap"
                      variants={buttonVariants}
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium shadow-sm flex items-center space-x-2 transition-colors duration-200"
                      aria-label="Cancel editing"
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm flex items-center space-x-2 transition-colors duration-200"
                    aria-label="Edit profile"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.1 }} className="fixed top-16 right-4 z-50">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-gray-200'} transition-colors duration-300`}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-600" />}
          </button>
        </motion.div>

        <AnimatePresence>
          {newFriendRequest && (
            <motion.div
              variants={notificationVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`fixed bottom-4 right-4 ${isDarkMode ? 'bg-white/5 backdrop-blur-md' : 'bg-white'} p-4 rounded-lg shadow-lg flex items-center space-x-4 border ${isDarkMode ? 'border-gray-800/20' : 'border-gray-200'}`}
            >
              <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>New friend request from {newFriendRequest.username}</span>
              <div className="flex space-x-2">
                <motion.button
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={() => handleAcceptFriendRequest(newFriendRequest._id)}
                  className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors duration-200"
                >
                  Accept
                </motion.button>
                <motion.button
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={() => handleDeclineFriendRequest(newFriendRequest._id)}
                  className="px-2 py-1 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors duration-200"
                >
                  Decline
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isChangePasswordOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
              className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
              role="dialog"
              aria-label="Change password"
            >
              <div className={`${isDarkMode ? 'bg-white/5 backdrop-blur-md border-gray-800/20' : 'bg-white border-gray-200'} p-6 rounded-2xl shadow-lg w-full max-w-sm`}>
                <h3 className={`text-lg font-semibold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <motion.input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current Password"
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/10 border-gray-700/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors duration-200`}
                    required
                    aria-label="Current password"
                  />
                  <motion.input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    variants={inputVariants}
                    whileHover="hover"
                    whileFocus="focus"
                    className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/10 border-gray-700/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm transition-colors duration-200`}
                    required
                    aria-label="New password"
                  />
                  {error && <p className="text-red-400 text-center bg-red-900/10 p-2 rounded-lg text-sm">{error}</p>}
                  {success && <p className="text-green-400 text-center bg-green-900/10 p-2 rounded-lg text-sm">{success}</p>}
                  <div className="flex justify-end space-x-3">
                    <motion.button
                      whileHover="hover"
                      whileTap="tap"
                      variants={buttonVariants}
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm transition-colors duration-200"
                      aria-label="Change password"
                    >
                      Change Password
                    </motion.button>
                    <motion.button
                      whileHover="hover"
                      whileTap="tap"
                      variants={buttonVariants}
                      onClick={() => setIsChangePasswordOpen(false)}
                      className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium shadow-sm transition-colors duration-200"
                      aria-label="Cancel"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isBlockedUsersOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
              className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
              role="dialog"
              aria-label="Blocked users"
            >
              <div className={`${isDarkMode ? 'bg-white/5 backdrop-blur-md border-gray-800/20' : 'bg-white border-gray-200'} p-6 rounded-2xl shadow-lg w-full max-w-sm`}>
                <h3 className={`text-lg font-semibold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Blocked Users ({profile.blockedUsers.length})</h3>
                <div className="space-y-4">
                  <div className="max-h-40 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-transparent">
                    {profile.blockedUsers.length > 0 ? (
                      profile.blockedUsers.map((user, index) => (
                        <motion.div
                          key={user._id || `blocked-${index}`}
                          className={`${isDarkMode ? 'bg-gray-800/10' : 'bg-gray-50'} p-3 rounded-lg flex justify-between items-center border ${isDarkMode ? 'border-gray-700/20' : 'border-gray-200'}`}
                        >
                          <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.username || 'Unknown User'}</span>
                          <motion.button
                            whileHover="hover"
                            whileTap="tap"
                            variants={buttonVariants}
                            onClick={() => handleUnblockUser(user._id)}
                            className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors duration-200"
                            aria-label={`Unblock ${user.username}`}
                          >
                            Unblock
                          </motion.button>
                        </motion.div>
                      ))
                    ) : (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>No users blocked.</p>
                    )}
                  </div>
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={() => setIsBlockedUsersOpen(false)}
                    className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium shadow-sm w-full transition-colors duration-200"
                    aria-label="Close"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {is2FAModalOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
              className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
              role="dialog"
              aria-label="Two-factor authentication"
            >
              <div className={`${isDarkMode ? 'bg-white/5 backdrop-blur-md border-gray-800/20' : 'bg-white border-gray-200'} p-6 rounded-2xl shadow-lg w-full max-w-sm`}>
                <h3 className={`text-lg font-semibold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {profile.privacy.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} mb-4`}>
                  {profile.privacy.twoFactorEnabled
                    ? 'Disabling two-factor authentication will reduce account security.'
                    : 'Enabling two-factor authentication adds an extra layer of security to your account.'}
                </p>
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={handleToggle2FA}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm transition-colors duration-200"
                    aria-label={profile.privacy.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  >
                    {profile.privacy.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </motion.button>
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={() => setIs2FAModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium shadow-sm transition-colors duration-200"
                    aria-label="Cancel"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default Profile;
