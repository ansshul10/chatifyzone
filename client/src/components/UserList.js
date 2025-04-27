import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaComment, FaInfoCircle, FaTimes, FaShareAlt } from 'react-icons/fa';
import PropTypes from 'prop-types';
import verifiedIcon from '../assets/verified.png'; // Adjust path as needed
import api from '../utils/api';

const UserList = ({ users, setSelectedUserId, currentUserId, unreadMessages, typingUsers = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [localUsers, setLocalUsers] = useState(users);
  const searchInputRef = useRef(null);

  // Sync localUsers with users prop
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Debounce search input
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Generate random avatar color
  const generateRandomColor = (id) => {
    const cachedColor = localStorage.getItem(`avatarColor-${id}`);
    if (cachedColor) return cachedColor;

    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 20);
    const lightness = 50 + Math.floor(Math.random() * 20);
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    localStorage.setItem(`avatarColor-${id}`, color);
    return color;
  };

  // Sort users: online first, then offline, alphabetically by username
  const sortedUsers = useMemo(() => {
    return [...localUsers]
      .filter((user) => user.id !== currentUserId && user.username && user.id)
      .sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return a.username.localeCompare(b.username);
      });
  }, [localUsers, currentUserId]);

  // Handle search input change
  const handleSearch = useCallback(
    debounce((value) => {
      setSearchQuery(value);
      if (value) {
        const suggestions = sortedUsers
          .filter((user) => user.username.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 5)
          .map((user) => user.username);
        setSearchSuggestions(suggestions);
      } else {
        setSearchSuggestions([]);
      }
    }, 300),
    [sortedUsers]
  );

  // Select suggestion
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setSearchSuggestions([]);
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return sortedUsers;
    return sortedUsers.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedUsers, searchQuery]);

  // Handle context menu
  const handleContextMenu = (e, user) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      user,
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Fetch user profile
  const fetchUserProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      api.defaults.headers.common['x-auth-token'] = token;
      const { data } = await api.get(`/auth/profile/${userId}`);
      setSelectedProfile(data);
      setIsProfileModalOpen(true);
      setError('');
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to load profile');
    }
  };

  // Handle context menu actions
  const handleContextAction = async (action, user) => {
    switch (action) {
      case 'message':
        setSelectedUserId(user.id);
        break;
      case 'profile':
        await fetchUserProfile(user.id);
        break;
      default:
        break;
    }
    closeContextMenu();
  };

  // Close profile modal
  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedProfile(null);
    setError('');
  };

  // Copy profile link
  const copyProfileLink = () => {
    const profileLink = `${window.location.origin}/profile/${selectedProfile.username}`;
    navigator.clipboard.writeText(profileLink);
    setError(<span className="text-green-400">Link copied</span>);
  };

  // Animation variants
  const listVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 },
  };

  const notificationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  const contextMenuVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, type: 'spring', stiffness: 200 } },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
  };

  const suggestionVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  useEffect(() => {
    console.log('UserList received users:', users);
    console.log('Local users:', localUsers);
    console.log('Unread messages:', unreadMessages);
    console.log('Typing users:', typingUsers);
    users.forEach((user) => {
      if (!user.username) console.error('User with no username:', user);
    });

    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setSearchSuggestions([]);
      }
      closeContextMenu();
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [users, localUsers, unreadMessages, typingUsers]);

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto bg-transparent p-6 sm:p-4 h-full flex flex-col font-sans"
      role="region"
      aria-label="User List"
    >
      <div className="flex items-center justify-between mb-4 relative">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-md">
          Users
        </h2>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative flex items-center w-1/2"
        >
          <FaSearch className="absolute left-3 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 text-sm text-gray-200 bg-gray-800/30 border border-gray-700/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 backdrop-blur-sm"
            aria-label="Search users"
            aria-autocomplete="list"
          />
          <AnimatePresence>
            {searchSuggestions.length > 0 && (
              <motion.ul
                variants={suggestionVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="absolute top-full left-0 right-0 mt-2 bg-gray-800/90 border border-gray-700/50 rounded-lg shadow-lg z-50"
              >
                {searchSuggestions.map((suggestion, index) => (
                  <motion.li
                    key={index}
                    whileHover={{ backgroundColor: '#1E40AF' }}
                    className="px-4 py-2 text-sm text-gray-200 cursor-pointer"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {error && !isProfileModalOpen && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-center mb-4 bg-red-900/10 p-2 rounded-lg text-sm"
        >
          {error}
        </motion.p>
      )}

      <div
        className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent space-y-3"
        role="list"
        aria-label="Available users"
      >
        {filteredUsers.length === 0 ? (
          <div className="text-gray-300 text-center text-sm sm:text-base drop-shadow-sm">
            {searchQuery ? 'No users found' : 'No users available yet 🌐'}
          </div>
        ) : (
          <AnimatePresence>
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                variants={itemVariants}
                whileHover="hover"
                whileTap="tap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-xl cursor-pointer text-gray-200 bg-gray-800/20 backdrop-blur-md hover:bg-red-500/10 transition-colors duration-200 flex items-center justify-between border border-gray-700/30"
                onContextMenu={(e) => handleContextMenu(e, user)}
                role="listitem"
                aria-label={`User ${user.username}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedUserId(user.id);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium relative group"
                    style={{ backgroundColor: generateRandomColor(user.id) }}
                  >
                    {user.username[0].toUpperCase()}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm sm:text-base font-medium truncate flex items-center drop-shadow-sm">
                      {user.username}{' '}
                      {user.isAnonymous ? (
                        <span className="text-xs text-gray-400 ml-1">(Anon)</span>
                      ) : (
                        <img
                          src={verifiedIcon}
                          alt="Verified"
                          className="w-4 h-4 ml-1"
                        />
                      )}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs ${user.online ? 'text-green-400' : 'text-gray-500'}`}>
                        ● {user.online ? 'Online' : 'Offline'}
                      </span>
                      {typingUsers.includes(user.id) && (
                        <motion.span
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="text-xs text-blue-400"
                        >
                          Typing...
                        </motion.span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {unreadMessages[user.id] > 0 && (
                    <motion.span
                      variants={notificationVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-xs text-white bg-blue-500 px-2 py-1 rounded-full drop-shadow-sm"
                    >
                      {unreadMessages[user.id]}
                    </motion.span>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleContextAction('message', user)}
                    className="p-1.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-colors"
                    aria-label={`Message ${user.username}`}
                  >
                    <FaComment />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleContextAction('profile', user)}
                    className="p-1.5 rounded-full bg-gray-700/20 text-gray-400 hover:bg-gray-700/40 transition-colors"
                    aria-label={`View ${user.username}'s profile`}
                  >
                    <FaInfoCircle />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            variants={contextMenuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed bg-gray-800/95 border border-gray-700/50 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-md"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            role="menu"
            aria-label="User actions"
          >
            <motion.div
              whileHover={{ backgroundColor: '#1E40AF', scale: 1.02 }}
              className="flex items-center space-x-2 p-2 text-sm text-gray-200 rounded-lg cursor-pointer"
              onClick={() => handleContextAction('message', contextMenu.user)}
              role="menuitem"
            >
              <FaComment />
              <span>Send Message</span>
            </motion.div>
            <motion.div
              whileHover={{ backgroundColor: '#1E40AF', scale: 1.02 }}
              className="flex items-center space-x-2 p-2 text-sm text-gray-200 rounded-lg cursor-pointer"
              onClick={() => handleContextAction('profile', contextMenu.user)}
              role="menuitem"
            >
              <FaInfoCircle />
              <span>View Profile</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileModalOpen && selectedProfile && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
            role="dialog"
            aria-label="User profile"
          >
            <div className="bg-[#1A1A1A] border border-gray-700/50 p-6 rounded-2xl shadow-lg w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">User Profile</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={closeProfileModal}
                  className="text-gray-400 hover:text-red-400 transition-colors duration-200"
                  aria-label="Close profile"
                >
                  <FaTimes className="text-xl" />
                </motion.button>
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-green-400 text-center mb-4 bg-green-900/10 p-2 rounded-lg text-sm"
                >
                  {error}
                </motion.p>
              )}
              <div className="text-center mb-4">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-semibold text-white border-2 border-blue-500"
                  style={{ backgroundColor: generateRandomColor(selectedProfile.id) }}
                >
                  {selectedProfile.username[0].toUpperCase()}
                </div>
                <h4 className="mt-2 text-base font-medium text-white">{selectedProfile.username}</h4>
                <p className="text-xs text-gray-400">Joined {new Date(selectedProfile.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Bio</label>
                  <p className="text-sm text-gray-300">{selectedProfile.bio || 'No bio available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Age</label>
                  <p className="text-sm text-gray-300">{selectedProfile.age || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Status</label>
                  <p className="text-sm text-gray-300">{selectedProfile.status || 'Available'}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyProfileLink}
                  className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                  aria-label="Share profile"
                >
                  <FaShareAlt />
                  <span>Share</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={closeProfileModal}
                  className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors duration-200"
                  aria-label="Close"
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 pt-4 text-center text-xs text-gray-300 drop-shadow-sm">
        © 2025 Chatify | All Rights Reserved
      </div>
    </motion.div>
  );
};

UserList.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      online: PropTypes.bool.isRequired,
      isAnonymous: PropTypes.bool.isRequired,
    })
  ).isRequired,
  setSelectedUserId: PropTypes.func.isRequired,
  currentUserId: PropTypes.string.isRequired,
  unreadMessages: PropTypes.objectOf(PropTypes.number).isRequired,
  typingUsers: PropTypes.arrayOf(PropTypes.string),
};

UserList.defaultProps = {
  typingUsers: [],
};

export default UserList;
