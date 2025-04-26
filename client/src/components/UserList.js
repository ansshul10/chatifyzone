import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaComment, FaUserSlash, FaInfoCircle } from 'react-icons/fa';
import PropTypes from 'prop-types';
import verifiedIcon from '../assets/verified.png'; // Adjust path as needed

const UserList = ({ users, setSelectedUserId, currentUserId, unreadMessages, typingUsers = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const searchInputRef = useRef(null);

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

    // Generate color using HSL for vibrant, accessible colors
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 20); // 60-80% for vibrancy
    const lightness = 50 + Math.floor(Math.random() * 20); // 50-70% for contrast
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    localStorage.setItem(`avatarColor-${id}`, color);
    return color;
  };

  // Sort users: online first, then offline, alphabetically by username
  const sortedUsers = useMemo(() => {
    return [...users]
      .filter((user) => user.id !== currentUserId && user.username && user.id)
      .sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return a.username.localeCompare(b.username);
      });
  }, [users, currentUserId]);

  // Handle search input change
  const handleSearch = useCallback(
    debounce((value) => {
      setSearchQuery(value);
    }, 300),
    []
  );

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

  // Handle context menu actions
  const handleContextAction = (action, user) => {
    switch (action) {
      case 'message':
        setSelectedUserId(user.id);
        break;
      case 'profile':
        console.log(`View profile for ${user.username}`);
        // Implement profile view logic here
        break;
      case 'block':
        console.log(`Block user ${user.username}`);
        // Implement block logic here
        break;
      default:
        break;
    }
    closeContextMenu();
  };

  // Animation variants
  const listVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const itemVariants = {
    hover: { scale: 1.02, backgroundColor: '#1E40AF', transition: { duration: 0.2 } },
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

  useEffect(() => {
    console.log('UserList received users:', users);
    console.log('Unread messages:', unreadMessages);
    console.log('Typing users:', typingUsers);
    users.forEach((user) => {
      if (!user.username) console.error('User with no username:', user);
    });

    // Handle clicks outside context menu
    const handleClickOutside = () => {
      closeContextMenu();
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [users, unreadMessages, typingUsers]);

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
            aria-autocomplete="none"
          />
        </motion.div>
      </div>

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
                whileTap="tap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-xl cursor-pointer text-gray-200 bg-gray-800/20 backdrop-blur-md hover:bg-blue-600/20 transition-colors duration-200 flex items-center justify-between border border-gray-700/30"
                onClick={() => setSelectedUserId(user.id)}
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
            <motion.div
              whileHover={{ backgroundColor: '#1E40AF', scale: 1.02 }}
              className="flex items-center space-x-2 p-2 text-sm text-gray-200 rounded-lg cursor-pointer"
              onClick={() => handleContextAction('block', contextMenu.user)}
              role="menuitem"
            >
              <FaUserSlash />
              <span>Block User</span>
            </motion.div>
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
