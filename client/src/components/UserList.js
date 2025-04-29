import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaComment, FaInfoCircle, FaTimes } from 'react-icons/fa';
import PropTypes from 'prop-types';
import ReactCountryFlag from 'react-country-flag';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import verifiedIcon from '../assets/verified.png'; // Adjust path as needed
import api from '../utils/api';

// Initialize i18n-iso-countries
countries.registerLocale(en);

// Skeleton Loader Component
const SkeletonUserCard = () => (
  <div className="p-4 rounded-xl bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center space-x-4 animate-pulse">
    <div className="w-10 h-10 rounded-full bg-gray-700/50"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 w-3/4 rounded bg-gray-700/50"></div>
      <div className="h-3 w-1/2 rounded bg-gray-700/50"></div>
    </div>
    <div className="w-8 h-8 rounded-full bg-gray-700/50"></div>
  </div>
);

const UserList = ({ users, setSelectedUserId, currentUserId, unreadMessages, typingUsers = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [localUsers, setLocalUsers] = useState(users);
  const [showMessageHint, setShowMessageHint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef(null);
  const suggestionListRef = useRef(null);

  // Get current user's country
  const currentUser = useMemo(() => {
    const user = localUsers.find((u) => u.id === currentUserId);
    return user || JSON.parse(localStorage.getItem('user') || '{}');
  }, [localUsers, currentUserId]);

  // Sort users
  const sortedUsers = useMemo(() => {
    const currentCountry = currentUser?.country;
    return [...localUsers]
      .filter((user) => user.id !== currentUserId && user.username && user.id)
      .sort((a, b) => {
        const aIsSameCountry = a.country && currentCountry && a.country === currentCountry;
        const bIsSameCountry = b.country && currentCountry && b.country === currentCountry;
        if (aIsSameCountry && !bIsSameCountry) return -1;
        if (!aIsSameCountry && bIsSameCountry) return 1;
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return a.username.localeCompare(b.username);
      });
  }, [localUsers, currentUserId, currentUser]);

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return sortedUsers;
    return sortedUsers.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedUsers, searchQuery]);

  // Sync localUsers and simulate loading
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setLocalUsers(users);
      setIsLoading(false);
    }, 500);
  }, [users]);

  // One-time hint
  useEffect(() => {
    if (!localStorage.getItem('seenMessageHint') && filteredUsers.length > 0) {
      setShowMessageHint(true);
      setTimeout(() => {
        setShowMessageHint(false);
        localStorage.setItem('seenMessageHint', 'true');
      }, 3000);
    }
  }, [filteredUsers]);

  // Debounce search
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Generate avatar color
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

  // Handle search
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
    }, 200),
    [sortedUsers]
  );

  // Select suggestion
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setSearchSuggestions([]);
    searchInputRef.current.focus();
  };

  // Handle context menu
  const handleContextMenu = (e, user) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY < rect.bottom - 100 ? e.clientY : rect.bottom - 100;
    setContextMenu({ x, y, user });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Fetch user profile
  const fetchUserProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('anonymousId');
      api.defaults.headers.common['x-auth-token'] = token;
      const { data } = await api.get(`/auth/profile/${userId}`);
      setSelectedProfile(data);
      setIsProfileModalOpen(true);
      setError('');
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to load profile');
    }
  };

  // Handle context actions
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

  // Dismiss error
  const dismissError = () => {
    setError('');
  };

  // Keyboard navigation for suggestions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!suggestionListRef.current || !searchSuggestions.length) return;
      const items = suggestionListRef.current.querySelectorAll('li');
      const focusedIndex = Array.from(items).findIndex((item) =>
        item === document.activeElement
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
        items[prevIndex].focus();
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(searchSuggestions[focusedIndex]);
      } else if (e.key === 'Escape') {
        setSearchSuggestions([]);
        searchInputRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchSuggestions]);

  // Animation variants
  const listVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, type: 'spring', stiffness: 200, damping: 20 },
    },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  };

  const notificationVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, type: 'spring', stiffness: 300 },
    },
  };

  const contextMenuVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.25, type: 'spring', stiffness: 400, damping: 25 },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.4, type: 'spring', stiffness: 300, damping: 20 },
    },
  };

  const suggestionVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, type: 'spring', stiffness: 300, damping: 20 },
    },
  };

  const errorVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, type: 'spring', stiffness: 300, damping: 20 },
    },
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target) &&
          suggestionListRef.current && !suggestionListRef.current.contains(e.target)) {
        setSearchSuggestions([]);
      }
      closeContextMenu();
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mx-auto bg-transparent px-6 py-8 h-full flex flex-col font-[Inter, sans-serif] overflow-hidden"
      role="region"
      aria-label="User List"
    >
      {/* Header with Sticky Search */}
      <div className="sticky top-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-md rounded-2xl p-4 mb-6 shadow-xl">
        <div className="flex items-center justify-between">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent"
          >
            Users
          </motion.h2>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative flex items-center w-3/5 z-9999 overflow-visible"
          >
            <FaSearch className="absolute left-4 text-gray-300 text-xl" style={{ filter: 'none', backdropFilter: 'none' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Search users..."
              className="w-full pl-12 pr-4 py-3 text-base text-gray-200 bg-gray-800/40 border border-gray-700/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 backdrop-blur-md transition-all duration-300"
              aria-label="Search users"
              aria-autocomplete="list"
            />
            <AnimatePresence>
              {searchSuggestions.length > 0 && (
                <motion.ul
                  ref={suggestionListRef}
                  variants={suggestionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="absolute top-full left-0 right-0 mt-3 bg-[#1A1A1A]/95 border border-gray-700/50 rounded-xl shadow-2xl z-9999 pointer-events-auto backdrop-blur-md max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent"
                  role="listbox"
                  aria-label="Search suggestions"
                >
                  {searchSuggestions.map((suggestion, index) => (
                    <motion.li
                      key={index}
                      whileHover={{ backgroundColor: '#1E40AF', scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-3 text-base text-gray-200 cursor-pointer flex items-center space-x-3 focus:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg m-1"
                      onClick={() => handleSuggestionClick(suggestion)}
                      tabIndex={0}
                      role="option"
                      aria-selected={searchQuery === suggestion}
                    >
                      <FaSearch className="text-gray-400" />
                      <span>{suggestion}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && !isProfileModalOpen && (
          <motion.div
            variants={errorVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl shadow-lg flex items-center justify-between"
            role="alert"
            aria-live="assertive"
          >
            <span className="text-red-400 text-sm">{error}</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={dismissError}
              className="text-red-400 hover:text-red-300"
              aria-label="Dismiss error"
            >
              <FaTimes />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User List */}
      <div
        className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent space-y-4 scroll-smooth overscroll-y-contain will-change-scroll z-0"
        role="list"
        aria-label="Available users"
        aria-live="polite"
      >
        {isLoading ? (
          <>
            <SkeletonUserCard />
            <SkeletonUserCard />
            <SkeletonUserCard />
          </>
        ) : filteredUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-300 text-center text-base font-medium py-8"
          >
            {searchQuery ? 'No users found' : 'No users available yet 🌐'}
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                variants={itemVariants}
                whileHover="hover"
                whileTap="tap"
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-xl bg-[#1A1A1A]/80 backdrop-blur-md flex items-center justify-between border border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow duration-300"
                onContextMenu={(e) => handleContextMenu(e, user)}
                role="listitem"
                aria-label={`User ${user.username}`}
              >
                <div className="flex items-center space-x-4 flex-grow">
                  {user.country && countries.getName(user.country, 'en') && (
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <ReactCountryFlag
                        countryCode={user.country}
                        svg
                        className="w-8 h-6 rounded-sm shadow-sm"
                        style={{ width: '32px', height: '24px' }}
                        title={countries.getName(user.country, 'en')}
                        aria-label={`Flag of ${countries.getName(user.country, 'en')}`}
                      />
                    </motion.div>
                  )}
                  <motion.div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold relative shadow-inner"
                    style={{ backgroundColor: generateRandomColor(user.id) }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {user.username[0]?.toUpperCase() || '?'}
                    {user.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1A1A1A]"></span>
                    )}
                  </motion.div>
                  <div className="flex flex-col flex-grow">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-semibold text-gray-200 truncate">
                        {user.username}
                      </span>
                      {user.isAnonymous ? (
                        <span className="text-xs text-gray-400 bg-gray-700/30 px-2 py-1 rounded-full">
                          Anon
                        </span>
                      ) : (
                        <img
                          src={verifiedIcon}
                          alt="Verified"
                          className="w-5 h-5"
                        />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {countries.getName(user.country, 'en') || 'Not specified'}
                        {user.age ? `, ${user.age}y` : ''}
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
                <div className="flex items-center space-x-3">
                  {unreadMessages[user.id] > 0 && (
                    <motion.span
                      variants={notificationVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-xs text-white bg-blue-500 px-2 py-1 rounded-full shadow-md"
                    >
                      {unreadMessages[user.id]}
                    </motion.span>
                  )}
                  <motion.button
                    animate={showMessageHint && index === 0 ? {
                      scale: [1, 1.15, 1],
                      boxShadow: ['0 0 0 0 rgba(59, 130, 246, 0)', '0 0 10px 4px rgba(59, 130, 246, 0.5)', '0 0 0 0 rgba(59, 130, 246, 0)'],
                    } : {}}
                    transition={showMessageHint && index === 0 ? { repeat: 3, duration: 0.6 } : {}}
                    whileHover={{ scale: 1.1, backgroundColor: '#3B82F6' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleContextAction('message', user)}
                    className="p-3 rounded-full bg-blue-500/20 text-white shadow-md"
                    aria-label={`Message ${user.username}`}
                    title={`Message ${user.username}`}
                  >
                    <FaComment className="text-xl" style={{ stroke: 'black', strokeWidth: 1, fill: 'white' }} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: '#4B5563' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleContextAction('profile', user)}
                    className="p-3 rounded-full bg-gray-700/30 text-gray-400 shadow-md"
                    aria-label={`View ${user.username}'s profile`}
                  >
                    <FaInfoCircle className="text-xl" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            variants={contextMenuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed bg-black/90 border border-gray-700/50 rounded-xl shadow-2xl p-3 z-50 backdrop-blur-lg"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            role="menu"
            aria-label="User actions"
          >
            <motion.div
              whileHover={{ backgroundColor: '#1E40AF', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-3 p-3 text-base text-white rounded-lg cursor-pointer"
              onClick={() => handleContextAction('message', contextMenu.user)}
              role="menuitem"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleContextAction('message', contextMenu.user)}
            >
              <FaComment className="text-lg" />
              <span>Send Message</span>
            </motion.div>
            <motion.div
              whileHover={{ backgroundColor: '#1E40AF', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-3 p-3 text-base text-white rounded-lg cursor-pointer"
              onClick={() => handleContextAction('profile', contextMenu.user)}
              role="menuitem"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleContextAction('profile', contextMenu.user)}
            >
              <FaInfoCircle className="text-lg" />
              <span>View Profile</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && selectedProfile && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm"
            role="dialog"
            aria-label="User profile"
            aria-modal="true"
          >
            <motion.div
              className="bg-[#1A1A1A]/95 border border-gray-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-lg"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">User Profile</h3>
                <motion.button
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeProfileModal}
                  className="text-gray-400 hover:text-red-400 transition-colors duration-200"
                  aria-label="Close profile"
                >
                  <FaTimes className="text-2xl" />
                </motion.button>
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-center mb-6 bg-red-900/20 p-3 rounded-lg text-sm shadow-inner"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}
              <motion.div
                className="text-center mb-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring' }}
              >
                <div
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-white border-4 border-blue-500 shadow-lg"
                  style={{ backgroundColor: generateRandomColor(selectedProfile.id) }}
                >
                  {selectedProfile.username[0]?.toUpperCase() || '?'}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-white">{selectedProfile.username}</h4>
                <p className="text-sm text-gray-400">Joined {new Date(selectedProfile.createdAt).toLocaleDateString()}</p>
              </motion.div>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1">Bio</label>
                  <p className="text-base text-gray-300 bg-gray-800/30 p-3 rounded-lg">{selectedProfile.bio || 'No bio available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1">Country</label>
                  <p className="text-base text-gray-300 flex items-center bg-gray-800/30 p-3 rounded-lg">
                    {selectedProfile.country && countries.getName(selectedProfile.country, 'en') ? (
                      <>
                        <ReactCountryFlag
                          countryCode={selectedProfile.country}
                          svg
                          className="mr-2 w-8 h-6 rounded-sm"
                          style={{ width: '32px', height: '24px' }}
                          aria-label={`Flag of ${countries.getName(selectedProfile.country, 'en')}`}
                        />
                        {countries.getName(selectedProfile.country, 'en')}
                      </>
                    ) : (
                      'Not specified'
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1">Age</label>
                  <p className="text-base text-gray-300 bg-gray-800/30 p-3 rounded-lg">{selectedProfile.age ? `${selectedProfile.age} years` : 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1">Status</label>
                  <p className="text-base text-gray-300 bg-gray-800/30 p-3 rounded-lg">{selectedProfile.status || 'Available'}</p>
                </div>
              </div>
              <div className="mt-8 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={closeProfileModal}
                  className="px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-base font-semibold transition-all duration-200 shadow-md"
                  aria-label="Close"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="mt-6 text-center text-xs text-gray-300"
      >
        © 2025 Chatify | All Rights Reserved
      </motion.div>
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
      country: PropTypes.string,
      age: PropTypes.number,
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
