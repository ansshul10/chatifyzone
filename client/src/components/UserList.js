import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaSearch, FaComment, FaInfoCircle, FaTimes } from 'react-icons/fa';
import PropTypes from 'prop-types';
import ReactCountryFlag from 'react-country-flag';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import verifiedIcon from '../assets/verified.png'; // Adjust path as needed
import api from '../utils/api';

// Initialize i18n-iso-countries
countries.registerLocale(en);

// Icons8 gender icons (50x50, red color)
const maleIcon = 'https://img.icons8.com/3d-fluency/94/guest-male--v1.png';
const femaleIcon = 'https://img.icons8.com/3d-fluency/94/businesswoman--v3.png';

// Skeleton Loader Component
const SkeletonUserCard = () => (
  <div className="p-3 rounded-md bg-[#1A1A1A]/80 flex items-center space-x-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-gray-700/50"></div>
    <div className="flex-1 space-y-2">
      <div className="h-3 w-3/4 rounded bg-gray-700/50"></div>
      <div className="h-2 w-1/2 rounded bg-gray-700/50"></div>
    </div>
    <div className="w-6 h-6 rounded-full bg-gray-700/50"></div>
  </div>
);

const UserList = ({ users, setSelectedUserId, currentUserId, unreadMessages, typingUsers = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [localUsers, setLocalUsers] = useState(users);
  const [showMessageHint, setShowMessageHint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef(null);
  const contextMenuTimeoutRef = useRef(null); // Ref to store the timeout ID

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

  // Sync localUsers and fetch gender from backend if missing
  useEffect(() => {
    setIsLoading(true);
    setTimeout(async () => {
      let updatedUsers = [...users];
      const token = localStorage.getItem('token') || localStorage.getItem('anonymousId');
      api.defaults.headers.common['x-auth-token'] = token;

      // Fetch gender for users where it's missing
      const genderPromises = updatedUsers
        .filter((user) => !user.gender)
        .map(async (user) => {
          try {
            const { data } = await api.get(`/auth/profile/${user.id}`);
            return { id: user.id, gender: data.gender };
          } catch (err) {
            console.error(`Failed to fetch gender for user ${user.id}:`, err);
            return { id: user.id, gender: null };
          }
        });

      const genderResults = await Promise.all(genderPromises);
      genderResults.forEach(({ id, gender }) => {
        const userIndex = updatedUsers.findIndex((u) => u.id === id);
        if (userIndex !== -1) {
          updatedUsers[userIndex] = { ...updatedUsers[userIndex], gender };
        }
      });

      setLocalUsers(updatedUsers);
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

  // Handle context menu
  const handleContextMenu = (e, user) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY < rect.bottom - 80 ? e.clientY : rect.bottom - 80;
    setContextMenu({ x, y, user });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
    // Clear any existing timeout when manually closing
    if (contextMenuTimeoutRef.current) {
      clearTimeout(contextMenuTimeoutRef.current);
      contextMenuTimeoutRef.current = null;
    }
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
    // Clear any existing timeout to prevent multiple timers
    if (contextMenuTimeoutRef.current) {
      clearTimeout(contextMenuTimeoutRef.current);
      contextMenuTimeoutRef.current = null;
    }

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

    // Set a new timeout to close the context menu after 3 seconds
    contextMenuTimeoutRef.current = setTimeout(() => {
      setContextMenu(null);
      contextMenuTimeoutRef.current = null;
    }, 3000);
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

  return (
    <div
      className="w-full max-w-md mx-auto bg-transparent px-4 py-6 sm:px-4 sm:py-8 pt-16 h-full flex flex-col font-[Inter, sans-serif] overflow-x-hidden"
      role="region"
      aria-label="User List"
    >
      {/* Header with Sticky Search */}
      <div className="sticky top-0  bg-[#1A1A1A]/80 rounded-md p-3 mb-4 sm:mb-6 shadow-md">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
          <h2
            className="text-xl sm:text-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent"
          >
            Users
          </h2>
          <div
            className="relative flex items-center w-full sm:w-3/5 overflow-visible"
          >
            <FaSearch className="absolute left-3 text-gray-300 text-lg" style={{ filter: 'none', backdropFilter: 'none' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 text-sm text-gray-200 bg-gray-800/40 border border-gray-700/50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500 transition-all duration-300"
              aria-label="Search users"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && !isProfileModalOpen && (
        <div
          className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-md shadow-md flex items-center justify-between"
          role="alert"
          aria-live="assertive"
        >
          <span className="text-red-400 text-xs">{error}</span>
          <button
            onClick={dismissError}
            className="text-red-400 hover:text-red-300"
            aria-label="Dismiss error"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>
      )}

      {/* User List */}
      <div
        className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent space-y-3 scroll-smooth overscroll-y-contain"
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
          <div
            className="text-gray-300 text-center text-sm font-medium py-6"
          >
            {searchQuery ? 'No users found' : 'No users available yet 🌐'}
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className="p-3 rounded-md bg-[#1A1A1A]/80 flex items-center justify-between border border-gray-700/50 shadow-md hover:shadow-md transition-shadow duration-300"
              onContextMenu={(e) => handleContextMenu(e, user)}
              role="listitem"
              aria-label={`User ${user.username}`}
            >
              <div className="flex items-center space-x-3 flex-grow">
                {user.country && countries.getName(user.country, 'en') && (
                  <div>
                    <ReactCountryFlag
                      countryCode={user.country}
                      svg
                      className="w-8 h-6 rounded-sm shadow-sm"
                      style={{ width: '32px', height: '24px' }}
                      title={countries.getName(user.country, 'en')}
                      aria-label={`Flag of ${countries.getName(user.country, 'en')}`}
                    />
                  </div>
                )}
                <div
                  className="w-10 h-10 flex items-center justify-center text-white relative"
                >
                  {user.gender && (user.gender.toLowerCase() === 'male' || user.gender.toUpperCase() === 'M') ? (
                    <img
                      src={maleIcon}
                      alt="Male icon"
                      className="w-8 h-8"
                      aria-label="Male user"
                    />
                  ) : user.gender && (user.gender.toLowerCase() === 'female' || user.gender.toUpperCase() === 'F') ? (
                    <img
                      src={femaleIcon}
                      alt="Female icon"
                      className="w-8 h-8"
                      aria-label="Female user"
                    />
                  ) : (
                    <img
                      src={maleIcon}
                      alt="Default male icon"
                      className="w-8 h-8 opacity-50"
                      aria-label="Default user gender icon"
                    />
                  )}
                  {user.online && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border-2 border-[#1A1A1A]"></span>
                  )}
                </div>
                <div className="flex flex-col flex-grow">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-200 truncate">
                      {user.username}
                    </span>
                    {user.isAnonymous ? (
                      <span className="text-xs text-gray-400 bg-gray-700/30 px-1.5 py-0.5 rounded-full">
                        Anon
                      </span>
                    ) : (
                      <img
                        src={verifiedIcon}
                        alt="Verified"
                        className="w-4 h-4"
                      />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {countries.getName(user.country, 'en') || 'Not specified'}
                      {user.age ? `, ${user.age}y` : ''}
                    </span>
                    {typingUsers.includes(user.id) && (
                      <span
                        className="text-xs text-blue-400"
                      >
                        Typing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {unreadMessages[user.id] > 0 && (
                  <span
                    className="text-xs text-white bg-blue-500 px-1.5 py-0.5 rounded-full shadow-sm"
                  >
                    {unreadMessages[user.id]}
                  </span>
                )}
                <button
                  onClick={() => handleContextAction('message', user)}
                  className={`p-2.5 rounded-full text-white shadow-md min-w-[38px] min-h-[38px] ${showMessageHint && index === 0 ? 'bg-[#1A1A1A]/80' : 'bg-[#1A1A1A]/80'} hover:bg-red-600`}
                  aria-label={`Message ${user.username}`}
                  title={`Message ${user.username}`}
                >
                  <FaComment className="text-lg" style={{ stroke: 'black', strokeWidth: 1, fill: 'white' }} />
                </button>
                <button
                  onClick={() => handleContextAction('profile', user)}
                  className="p-2.5 rounded-full bg-[#1A1A1A]/80 text-white-400 shadow-md min-w-[38px] min-h-[38px] hover:bg-red-600"
                  aria-label={`View ${user.username}'s profile`}
                >
                  <FaInfoCircle className="text-lg" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-black/90 border border-gray-700/50 rounded-md shadow-md p-2 z-20"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
          aria-label="User actions"
        >
          <div
            className="flex items-center space-x-2 p-2 text-sm text-white rounded-md cursor-pointer hover:bg-blue-600"
            onClick={() => handleContextAction('message', contextMenu.user)}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleContextAction('message', contextMenu.user)}
          >
            <FaComment className="text-sm" />
            <span>Send Message</span>
          </div>
          <div
            className="flex items-center space-x-2 p-2 text-sm text-white rounded-md cursor-pointer hover:bg-blue-600"
            onClick={() => handleContextAction('profile', contextMenu.user)}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleContextAction('profile', contextMenu.user)}
          >
            <FaInfoCircle className="text-sm" />
            <span>View Profile</span>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && selectedProfile && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
          role="dialog"
          aria-label="User profile"
          aria-modal="true"
        >
          <div
            className="bg-[#1A1A1A]/95 border border-gray-700/50 p-6 rounded-md shadow-md w-11/12 max-w-sm"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">User Profile</h2>
              <button
                onClick={closeProfileModal}
                className="text-gray-400 hover:text-red-400 transition-colors duration-200"
                aria-label="Close profile"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            {error && (
              <p
                className="text-red-400 text-center mb-4 bg-red-900/20 p-2 rounded-md text-xs shadow-inner"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-blue-500 shadow-md"
                style={{ backgroundColor: '#4B5563' }} // Static gray color for profile modal
              >
                {selectedProfile.username[0]?.toUpperCase() || '?'}
              </div>
              <h4 className="mt-3 text-sm font-semibold text-white">{selectedProfile.username}</h4>
              <p className="text-xs text-gray-400">Joined {new Date(selectedProfile.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Bio</label>
                <p className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded-md">{selectedProfile.bio || 'No bio available'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Country</label>
                <p className="text-sm text-gray-300 flex items-center bg-gray-800/30 p-2 rounded-md">
                  {selectedProfile.country && countries.getName(selectedProfile.country, 'en') ? (
                    <>
                      <ReactCountryFlag
                        countryCode={selectedProfile.country}
                        svg
                        className="mr-2 w-6 h-4 rounded-sm"
                        style={{ width: '24px', height: '16px' }}
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
                <label className="text-xs font-medium text-gray-400 block mb-1">Age</label>
                <p className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded-md">{selectedProfile.age ? `${selectedProfile.age} years` : 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Status</label>
                <p className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded-md">{selectedProfile.status || 'Available'}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={closeProfileModal}
                className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold transition-all duration-200 shadow-md min-w-[44px] min-h-[44px]"
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-gray-400">
        © 2025 Chatify | All Rights Reserved
      </div>
    </div>
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
      gender: PropTypes.oneOf(['male', 'female', 'M', 'F']),
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
