import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { FaEnvelope, FaEdit, FaSave, FaTimes, FaCog, FaLock, FaTrash, FaUsers, FaUserMinus, FaShieldAlt, FaUserPlus, FaSun, FaMoon } from 'react-icons/fa';
import io from 'socket.io-client';
import api from '../utils/api';
import Navbar from './Navbar';

const Profile = () => {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    age: null,
    status: 'Available',
    privacy: { allowFriendRequests: true },
    friends: [],
    blockedUsers: [],
    createdAt: null,
  });
  const [friendRequests, setFriendRequests] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const socketRef = React.useRef(null);
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
          privacy: { allowFriendRequests: data.privacy?.allowFriendRequests ?? true },
          friends: Array.isArray(data.friends) ? data.friends : [],
          blockedUsers: Array.isArray(data.blockedUsers) ? data.blockedUsers : [],
          createdAt: data.createdAt || null,
        });
        setFriendRequests(Array.isArray(data.friendRequests) ? data.friendRequests : []);
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
      socket.emit('getFriendRequests', userId);
    });

    socket.on('friendRequestsUpdate', (friendRequests) => {
      console.log('Received friendRequestsUpdate:', friendRequests);
      setFriendRequests(friendRequests);
    });

    socket.on('getFriendRequestsResponse', (friendRequests) => {
      console.log('Received getFriendRequestsResponse:', friendRequests);
      setFriendRequests(friendRequests);
    });

    socket.on('friendsUpdate', (friendList) => {
      console.log('Received friendsUpdate:', friendList);
      setProfile((prev) => ({ ...prev, friends: Array.isArray(friendList) ? friendList : [] }));
    });

    socket.on('blockedUsersUpdate', (blockedUsers) => {
      console.log('Received blockedUsersUpdate:', blockedUsers);
      setProfile((prev) => ({ ...prev, blockedUsers: Array.isArray(blockedUsers) ? blockedUsers : [] }));
    });

    socket.on('actionResponse', ({ type, success, msg }) => {
      console.log('Action response:', { type, success, msg });
      setError(success ? '' : msg);
      setSuccess(success ? msg : '');
      setTimeout(() => { setError(''); setSuccess(''); }, 3000);
      if (type === 'acceptFriendRequest' && success) socket.emit('getFriends', userId);
    });

    socket.on('error', ({ msg }) => {
      console.log('Socket error:', msg);
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, userId, username, navigate]);

  const handleSave = async () => {
    try {
      const { data } = await api.put('/auth/profile', {
        bio: profile.bio,
        age: profile.age,
        status: profile.status,
        allowFriendRequests: profile.privacy.allowFriendRequests,
      });
      setProfile((prev) => ({
        ...prev,
        bio: data.bio,
        age: data.age,
        status: data.status,
        privacy: { allowFriendRequests: data.privacy.allowFriendRequests },
      }));
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

  const handlePrivacyChange = () => {
    setProfile((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, allowFriendRequests: !prev.privacy.allowFriendRequests },
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword) {
      setError('Please enter both passwords');
      return;
    }
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
      setSuccess(data.msg);
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
  };

  const handleUnfriend = async (friendId) => {
    try {
      await api.post('/auth/remove-friend', { friendId });
      const { data } = await api.get('/auth/profile');
      setProfile((prev) => ({ ...prev, friends: Array.isArray(data.friends) ? data.friends : [] }));
      setSuccess('Friend removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to remove friend');
    }
  };

  const handleChatWithFriend = (friendId) => navigate(`/chat?friendId=${friendId}`);
  const handleAcceptFriendRequest = (requesterId) => socketRef.current.emit('acceptFriendRequest', { userId, requesterId });
  const handleDeclineFriendRequest = (requesterId) => socketRef.current.emit('declineFriendRequest', { userId, requesterId });

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } };
  const sidebarVariants = { hidden: { x: -50, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.5 } } };
  const formVariants = { hidden: { x: 50, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.5 } } };
  const inputVariants = { hover: { scale: 1.02, borderColor: '#FF0000' }, focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)' } };
  const buttonVariants = { hover: { scale: 1.1 }, tap: { scale: 0.95 } };
  const dropdownVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } };
  const modalVariants = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } } };

  if (loading) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col pt-20 items-center justify-center`}
      >
        <Navbar />
        <p>Loading profile...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col pt-20`}
    >
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8 flex-grow">
        <motion.div
          variants={sidebarVariants}
          className={`w-full lg:w-1/3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-800' : 'bg-gray-200 border-gray-300'} p-6 rounded-xl border shadow-lg`}
        >
          <div className="text-center mb-6">
            <motion.div whileHover={{ scale: 1.05 }} className="w-24 h-24 mx-auto bg-red-500 rounded-full flex items-center justify-center text-4xl font-bold">
              {profile.username[0].toUpperCase()}
            </motion.div>
            <h2 className={`mt-4 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.username}</h2>
          </div>
          <div className="space-y-4">
            <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-2">
              <FaEnvelope className="text-red-500" />
              <span>{profile.email}</span>
            </motion.div>
            <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-2">
              <FaUsers className="text-red-500" />
              <span>{profile.friends.length} Friends</span>
            </motion.div>
            <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-2">
              <FaUserPlus className="text-red-500" />
              <span>{friendRequests.length} Pending Requests</span>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/chat')}
              className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
            >
              Go to Chat
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={formVariants} className="w-full lg:w-2/3 flex items-start justify-center">
          <Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000} className="w-full max-w-2xl">
            <div className={`${isDarkMode ? 'bg-[#1A1A1A] border-gray-800' : 'bg-gray-200 border-gray-300'} p-6 sm:p-8 rounded-xl border shadow-2xl transform transition-all duration-300 hover:shadow-[0_15px_30px_rgba(255,0,0,0.3)]`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Profile</h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`${isDarkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-600 hover:text-red-500'}`}
                >
                  <FaCog className="text-2xl" />
                </motion.button>
              </div>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={dropdownVariants}
                    className={`absolute right-8 top-16 w-48 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-300 border-gray-400'} rounded-lg shadow-xl p-4 z-10`}
                  >
                    <div className="space-y-3">
                      <motion.div
                        whileHover={{ x: 5, color: '#FF0000' }}
                        onClick={() => { setIsSettingsOpen(false); setIsChangePasswordOpen(true); }}
                        className="flex items-center space-x-2 text-sm cursor-pointer"
                      >
                        <FaLock />
                        <span>Change Password</span>
                      </motion.div>
                      <motion.div
                        whileHover={{ x: 5, color: '#FF0000' }}
                        onClick={handleDeleteAccount}
                        className="flex items-center space-x-2 text-sm cursor-pointer"
                      >
                        <FaTrash />
                        <span>Delete Account</span>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-center mb-4 bg-red-900 bg-opacity-20 p-2 rounded">{error}</motion.p>}
              {success && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-center mb-4 bg-green-900 bg-opacity-20 p-2 rounded">{success}</motion.p>}

              <div className="space-y-6">
                <div>
                  <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</label>
                  {isEditing ? (
                    <motion.input
                      name="status"
                      value={profile.status}
                      onChange={handleChange}
                      maxLength="30"
                      variants={inputVariants}
                      whileHover="hover"
                      whileFocus="focus"
                      className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-400 text-black'} focus:outline-none`}
                    />
                  ) : (
                    <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{profile.status}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bio</label>
                  {isEditing ? (
                    <motion.textarea
                      name="bio"
                      value={profile.bio}
                      onChange={handleChange}
                      maxLength="150"
                      variants={inputVariants}
                      whileHover="hover"
                      whileFocus="focus"
                      className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-400 text-black'} focus:outline-none`}
                      rows="3"
                    />
                  ) : (
                    <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{profile.bio || 'No bio yet'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Age</label>
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
                      className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-400 text-black'} focus:outline-none`}
                    />
                  ) : (
                    <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{profile.age || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
                    <FaUserPlus className="mr-2" /> Friend Requests ({friendRequests.length})
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
                    {friendRequests.length > 0 ? (
                      friendRequests.map((req) => (
                        <motion.div
                          key={req._id}
                          whileHover={{ scale: 1 }}
                          className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} p-2 rounded-lg flex justify-between items-center`}
                        >
                          <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{req.username}</span>
                          <div className="flex space-x-2">
                            <motion.button
                              whileHover="hover"
                              whileTap="tap"
                              variants={buttonVariants}
                              onClick={() => handleAcceptFriendRequest(req._id)}
                              className="bg-green-600 text-white p-2 rounded-lg"
                            >
                              Accept
                            </motion.button>
                            <motion.button
                              whileHover="hover"
                              whileTap="tap"
                              variants={buttonVariants}
                              onClick={() => handleDeclineFriendRequest(req._id)}
                              className="bg-red-600 text-white p-2 rounded-lg"
                            >
                              Decline
                            </motion.button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No pending requests.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
                    <FaUsers className="mr-2" /> Friends ({profile.friends.length})
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
                    {profile.friends.map((friend) => (
                      <motion.div
                        key={friend._id}
                        whileHover={{ scale: 1 }}
                        className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} p-2 rounded-lg flex justify-between items-center`}
                      >
                        <span onClick={() => handleChatWithFriend(friend._id)} className={`cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {friend.username}
                        </span>
                        <motion.button
                          whileHover="hover"
                          whileTap="tap"
                          variants={buttonVariants}
                          onClick={() => handleUnfriend(friend._id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <FaUserMinus />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
                    <FaShieldAlt className="mr-2" /> Privacy
                  </label>
                  <label className="flex items-center space-x-2 mt-2">
                    <input
                      type="checkbox"
                      checked={profile.privacy.allowFriendRequests}
                      onChange={handlePrivacyChange}
                      disabled={!isEditing}
                      className="form-checkbox h-5 w-5 text-red-600"
                    />
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Allow Friend Requests</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4">
                  {isEditing ? (
                    <>
                      <motion.button
                        whileHover="hover"
                        whileTap="tap"
                        variants={buttonVariants}
                        onClick={handleSave}
                        className="bg-red-600 text-white p-3 rounded-lg flex items-center space-x-2"
                      >
                        <FaSave />
                        <span>Save</span>
                      </motion.button>
                      <motion.button
                        whileHover="hover"
                        whileTap="tap"
                        variants={buttonVariants}
                        onClick={() => setIsEditing(false)}
                        className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'} text-white p-3 rounded-lg flex items-center space-x-2`}
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
                      className="bg-red-600 text-white p-3 rounded-lg flex items-center space-x-2"
                    >
                      <FaEdit />
                      <span>Edit</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </Tilt>
        </motion.div>
      </div>

      <motion.div whileHover={{ scale: 1.1 }} className="fixed top-20 right-4 z-50">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-300'}`}>
          {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
        </button>
      </motion.div>

      <AnimatePresence>
        {isChangePasswordOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          >
            <div className={`${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'} p-6 rounded-lg shadow-lg w-full max-w-md`}>
              <h3 className={`text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <motion.input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current Password"
                  variants={inputVariants}
                  whileHover="hover"
                  whileFocus="focus"
                  className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-400 text-black'} focus:outline-none`}
                  required
                />
                <motion.input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  variants={inputVariants}
                  whileHover="hover"
                  whileFocus="focus"
                  className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-400 text-black'} focus:outline-none`}
                  required
                />
                {error && <p className="text-red-400 text-center bg-red-900 bg-opacity-20 p-2 rounded">{error}</p>}
                {success && <p className="text-green-400 text-center bg-green-900 bg-opacity-20 p-2 rounded">{success}</p>}
                <div className="flex justify-end space-x-4">
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    type="submit"
                    className="bg-red-600 text-white p-3 rounded-lg"
                  >
                    Change Password
                  </motion.button>
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={() => setIsChangePasswordOpen(false)}
                    className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'} text-white p-3 rounded-lg`}
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
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          >
            <div className={`${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'} p-6 rounded-lg shadow-lg w-full max-w-md`}>
              <h3 className={`text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Blocked Users ({profile.blockedUsers.length})</h3>
              <div className="space-y-4">
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {profile.blockedUsers.length > 0 ? (
                    profile.blockedUsers.map((user) => (
                      <div key={user._id} className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} p-2 rounded-lg flex justify-between items-center`}>
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{user.username || 'Unknown User'}</span>
                        <motion.button
                          whileHover="hover"
                          whileTap="tap"
                          variants={buttonVariants}
                          onClick={() => handleUnblockUser(user._id)}
                          className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'} text-white p-2 rounded-lg`}
                        >
                          Unblock
                        </motion.button>
                      </div>
                    ))
                  ) : (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No users blocked.</p>
                  )}
                </div>
                <motion.button
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={() => setIsBlockedUsersOpen(false)}
                  className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'} text-white p-3 rounded-lg w-full`}
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;
