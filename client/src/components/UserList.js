import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaSearch, FaComment, FaInfoCircle, FaTimes, FaUsers, FaEnvelope } from 'react-icons/fa';
import PropTypes from 'prop-types';
import ReactCountryFlag from 'react-country-flag';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import verifiedIcon from '../assets/verified.png';
import api from '../utils/api';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

countries.registerLocale(en);

const maleIcon = 'https://img.icons8.com/3d-fluency/94/guest-male--v1.png';
const femaleIcon = 'https://img.icons8.com/3d-fluency/94/businesswoman--v3.png';

const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
  auth: { token: localStorage.getItem('token') || localStorage.getItem('anonymousId') },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000;

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

const SkeletonMessageCard = () => (
  <div className="p-3 rounded-md bg-[#1A1A1A]/80 flex items-center space-x-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-gray-700/50"></div>
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/2 rounded bg-gray-700/50"></div>
      <div className="h-2 w-3/4 rounded bg-gray-700/50"></div>
    </div>
  </div>
);

const UserList = ({ users, setSelectedUserId, currentUserId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [localUsers, setLocalUsers] = useState(users);
  const [showMessageHint, setShowMessageHint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  const [conversations, setConversations] = useState([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchInputRef = useRef(null);
  const contextMenuTimeoutRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const lastActivityUpdateRef = useRef(Date.now());
  const userListDebounceRef = useRef(null);
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    const user = localUsers.find((u) => u.id === currentUserId);
    return user || JSON.parse(localStorage.getItem('user') || '{}');
  }, [localUsers, currentUserId]);

  const sortedUsers = useMemo(() => {
    const currentCountry = currentUser?.country;
    return [...localUsers]
      .filter((user) => user.id !== currentUserId && user.username && user.id)
      .sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        const aIsSameCountry = a.country && currentCountry && a.country === currentCountry;
        const bIsSameCountry = b.country && currentCountry && b.country === currentCountry;
        if (aIsSameCountry && !bIsSameCountry) return -1;
        if (!aIsSameCountry && bIsSameCountry) return 1;
        return a.username.localeCompare(b.username);
      });
  }, [localUsers, currentUserId, currentUser]);

  const filteredUsers = useMemo(() => {
    let filtered = sortedUsers;
    if (searchQuery) {
      filtered = filtered.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (genderFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (!user.gender) return false;
        const userGender = user.gender.toLowerCase();
        return (
          (genderFilter === 'male' && (userGender === 'male' || userGender === 'm')) ||
          (genderFilter === 'female' && (userGender === 'female' || userGender === 'f'))
        );
      });
    }
    return filtered;
  }, [sortedUsers, searchQuery, genderFilter]);

  const fetchConversations = async () => {
    try {
      setIsMessagesLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('anonymousId');
      api.defaults.headers.common['x-auth-token'] = token;
      const { data } = await api.get('/chat/conversations');
      console.log('[UserList] fetchConversations: Fetched conversations:', data);
      setConversations(data);
      setError('');
    } catch (err) {
      console.error('[UserList] fetchConversations error:', err);
      setError(err.response?.data.msg || 'Failed to load conversations');
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('anonymousId');
      api.defaults.headers.common['x-auth-token'] = token;
      const { data } = await api.get('/chat/unread-count');
      console.log('[UserList] fetchUnreadCount: Fetched unread count:', data.unreadCount);
      setUnreadCount(data.unreadCount);
      setError('');
    } catch (err) {
      console.error('[UserList] fetchUnreadCount error:', err);
      setError(err.response?.data.msg || 'Failed to load unread count');
    }
  };

  const markMessagesAsRead = async (senderId) => {
    try {
      console.log('[UserList] markMessagesAsRead: Marking messages as read for sender:', senderId);
      const token = localStorage.getItem('token') || localStorage.getItem('anonymousId');
      api.defaults.headers.common['x-auth-token'] = token;
      const { data } = await api.post('/chat/mark-read', { senderId });
      console.log('[UserList] markMessagesAsRead: API response:', data);
      if (data.modifiedCount > 0) {
        setConversations((prev) => {
          const updated = prev.filter((conv) => conv.senderId !== senderId);
          console.log('[UserList] markMessagesAsRead: Updated conversations:', updated);
          return updated;
        });
        setUnreadCount((prev) => {
          const newCount = Math.max(0, prev - data.modifiedCount);
          console.log('[UserList] markMessagesAsRead: Updated unreadCount:', newCount);
          return newCount;
        });
        socket.emit('updateMessageStatus', {
          messageId: null,
          userId: currentUserId,
          status: 'read',
          senderId,
        });
      } else {
        console.warn('[UserList] markMessagesAsRead: No messages were updated for sender:', senderId);
      }
    } catch (err) {
      console.error('[UserList] markMessagesAsRead error:', err);
      setError(err.response?.data.msg || 'Failed to mark messages as read');
    }
  };

  const debounceUserListUpdate = (newUsers) => {
    if (userListDebounceRef.current) clearTimeout(userListDebounceRef.current);
    userListDebounceRef.current = setTimeout(() => {
      setLocalUsers(newUsers);
    }, 500);
  };

  useEffect(() => {
    setIsLoading(true);
    const fetchInitialData = async () => {
      try {
        let updatedUsers = [...users];
        const token = localStorage.getItem('token') || localStorage.getItem('anonymousId');
        api.defaults.headers.common['x-auth-token'] = token;

        const genderPromises = updatedUsers
          .filter((user) => !user.gender)
          .map(async (user) => {
            try {
              const { data } = await api.get(`/auth/profile/${user.id}`);
              return { id: user.id, gender: data.gender, country: data.country, age: data.age };
            } catch (err) {
              console.error(`[UserList] Failed to fetch profile for user ${user.id}:`, err);
              return { id: user.id, gender: null, country: null, age: null };
            }
          });

        const profileResults = await Promise.all(genderPromises);
        profileResults.forEach(({ id, gender, country, age }) => {
          const userIndex = updatedUsers.findIndex((u) => u.id === id);
          if (userIndex !== -1) {
            updatedUsers[userIndex] = { ...updatedUsers[userIndex], gender, country, age };
          }
        });

        setLocalUsers(updatedUsers);
        await fetchConversations();
        await fetchUnreadCount();
      } catch (err) {
        setError('Failed to load initial data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [currentUserId, users]);

  useEffect(() => {
    socket.emit('join', currentUserId);

    const handleConnect = () => {
      console.log('[Socket.IO] Connected to WebSocket server');
      socket.emit('join', currentUserId);
    };

    const handleUserListUpdate = (updatedUsers) => {
      console.log('[Socket.IO UserListUpdate] Received:', updatedUsers);
      debounceUserListUpdate(updatedUsers);
    };

    const handleUserStatus = (userData) => {
      console.log('[Socket.IO UserStatus] Status update:', userData);
      setLocalUsers((prevUsers) => {
        const index = prevUsers.findIndex((u) => u.id === userData.userId || u.id === userData.id);
        if (index !== -1) {
          return [
            ...prevUsers.slice(0, index),
            { ...prevUsers[index], ...userData, online: userData.status === 'online' },
            ...prevUsers.slice(index + 1),
          ];
        }
        return [...prevUsers, { ...userData, online: userData.status === 'online' }];
      });
    };

    const handleReceiveMessage = async (message) => {
      console.log('[Socket.IO ReceiveMessage] Received:', message);
      const sender = message.sender?.toString();
      const receiver = message.receiver?.toString();

      if (sender && sender !== currentUserId && receiver === currentUserId && !message.readAt) {
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          console.log('[UserList] handleReceiveMessage: Updated unreadCount:', newCount);
          return newCount;
        });
        try {
          const { data: senderDetails } = await api.get(`/auth/profile/${sender}`);
          setConversations((prev) => {
            const existingConv = prev.find((conv) => conv.senderId === sender);
            const updated = existingConv
              ? prev.map((conv) =>
                  conv.senderId === sender
                    ? {
                        ...conv,
                        unreadCount: (conv.unreadCount || 0) + 1,
                        latestMessageTime: message.createdAt,
                      }
                    : conv
                )
              : [
                  {
                    senderId: sender,
                    username: senderDetails.username,
                    isAnonymous: senderDetails.isAnonymous,
                    gender: senderDetails.gender,
                    unreadCount: 1,
                    latestMessageTime: message.createdAt,
                  },
                  ...prev,
                ];
            console.log('[UserList] handleReceiveMessage: Updated conversations:', updated);
            return updated.sort((a, b) => new Date(b.latestMessageTime) - new Date(a.latestMessageTime));
          });
        } catch (err) {
          console.error('[UserList] Failed to fetch sender profile:', err);
          setError('Failed to load sender details');
        }
      }
    };

    const handleMessageStatusUpdate = (message) => {
      console.log('[Socket.IO MessageStatusUpdate] Received:', message);
      if (message.receiver === currentUserId && message.readAt) {
        setConversations((prev) => {
          const updated = prev.filter((conv) => conv.senderId !== message.sender.toString());
          console.log('[UserList] handleMessageStatusUpdate: Updated conversations:', updated);
          return updated;
        });
        setUnreadCount((prev) => {
          const newCount = Math.max(0, prev - 1);
          console.log('[UserList] handleMessageStatusUpdate: Updated unreadCount:', newCount);
          return newCount;
        });
      }
    };

    const handleError = ({ msg }) => {
      setError(msg);
    };

    const handleLogout = ({ reason }) => {
      setError(`You have been logged out due to ${reason.toLowerCase()}.`);
      localStorage.clear();
      delete api.defaults.headers.common['x-auth-token'];
      navigate('/login');
    };

    socket.on('connect', handleConnect);
    socket.on('userListUpdate', handleUserListUpdate);
    socket.on('userStatus', handleUserStatus);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageStatusUpdate', handleMessageStatusUpdate);
    socket.on('error', handleError);
    socket.on('logout', handleLogout);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('userListUpdate', handleUserListUpdate);
      socket.off('userStatus', handleUserStatus);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageStatusUpdate', handleMessageStatusUpdate);
      socket.off('error', handleError);
      socket.off('logout', handleLogout);
    };
  }, [currentUserId, navigate]);

  useEffect(() => {
    const resetInactivityTimer = () => {
      const now = Date.now();
      if (now - lastActivityUpdateRef.current >= 60 * 1000) {
        api
          .post('/api/users/update-last-active')
          .catch((err) =>
            console.error('[UserList] Error updating lastActive:', err.message)
          );
        lastActivityUpdateRef.current = now;
      }

      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        socket.emit('inactivity', { userId: currentUserId });
      }, INACTIVITY_TIMEOUT);
    };

    const handleActivity = () => resetInactivityTimer();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!localStorage.getItem('seenMessageHint') && filteredUsers.length > 0) {
      setShowMessageHint(true);
      setTimeout(() => {
        setShowMessageHint(false);
        localStorage.setItem('seenMessageHint', 'true');
      }, 3000);
    }
  }, [filteredUsers]);

  const handleContextMenu = (e, user) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY < rect.bottom - 80 ? e.clientY : rect.bottom - 80;
    setContextMenu({ x, y, user });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    if (contextMenuTimeoutRef.current) clearTimeout(contextMenuTimeoutRef.current);
  };

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

  const handleContextAction = (action, user) => {
    if (contextMenuTimeoutRef.current) clearTimeout(contextMenuTimeoutRef.current);
    switch (action) {
      case 'message':
        setSelectedUserId(user.id);
        break;
      case 'profile':
        fetchUserProfile(user.id);
        break;
      default:
        break;
    }
    contextMenuTimeoutRef.current = setTimeout(closeContextMenu, 3000);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedProfile(null);
    setError('');
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const isToday = now.toDateString() === messageDate.toDateString();
    return isToday
      ? messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : messageDate.toLocaleDateString();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-transparent px-4 py-6 sm:px-4 sm:py-8 h-full flex flex-col font-[Inter, sans-serif] overflow-x-hidden">
      <div className="sticky top-0 bg-[#1A1A1A]/80 rounded-md p-3 mb-4 sm:mb-6 shadow-md">
        <div className="flex justify-around mb-4">
          <button
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${
              activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <FaUsers />
            <span>Users</span>
          </button>
          <button
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 relative ${
              activeTab === 'messages' ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setActiveTab('messages')}
          >
            <FaEnvelope />
            <span>Messages</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        {activeTab === 'users' && (
          <>
            <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Users
              </h2>
              <div className="relative flex items-center w-full sm:w-3/5 overflow-visible">
                <FaSearch className="absolute left-3 text-gray-300 text-lg" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 text-sm text-white bg-black border border-gray-700/50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500 transition-all duration-300"
                />
              </div>
            </div>
            <div className="mt-3">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full sm:w-1/3 py-2 px-3 text-sm text-white bg-black border border-gray-700/50 rounded-md focus:outline-none transition-all duration-300"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </>
        )}
      </div>

      {error && !isProfileModalOpen && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-md shadow-md flex items-center justify-between">
          <span className="text-red-400 text-xs">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
            <FaTimes className="text-sm" />
          </button>
        </div>
      )}

      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent space-y-3 scroll-smooth overscroll-y-contain">
        {activeTab === 'users' ? (
          isLoading ? (
            <>
              <SkeletonUserCard />
              <SkeletonUserCard />
              <SkeletonUserCard />
            </>
          ) : filteredUsers.length === 0 ? (
            <div className="text-gray-300 text-center text-sm font-medium py-6">
              {searchQuery || genderFilter !== 'all' ? 'No users found' : 'No users available yet 🌐'}
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className="p-3 rounded-md bg-[#1A1A1A]/80 flex items-center justify-between border border-gray-700/50 shadow-md hover:shadow-md transition-shadow duration-300"
                onContextMenu={(e) => handleContextMenu(e, user)}
              >
                <div className="flex items-center space-x-3 flex-grow">
                  {user.country && countries.getName(user.country, 'en') && (
                    <ReactCountryFlag
                      countryCode={user.country}
                      svg
                      className="w-8 h-6 rounded-sm shadow-sm"
                      title={countries.getName(user.country, 'en')}
                    />
                  )}
                  <div className="w-10 h-10 flex items-center justify-center text-white relative">
                    {user.gender && (user.gender.toLowerCase() === 'male' || user.gender.toUpperCase() === 'M') ? (
                      <img src={maleIcon} alt="Male icon" className="w-8 h-8" />
                    ) : user.gender && (user.gender.toLowerCase() === 'female' || user.gender.toUpperCase() === 'F') ? (
                      <img src={femaleIcon} alt="Female icon" className="w-8 h-8" />
                    ) : (
                      <img src={maleIcon} alt="Default male icon" className="w-8 h-8 opacity-50" />
                    )}
                    {user.online && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border-2 border-[#1A1A1A]"></span>
                    )}
                  </div>
                  <div className="flex flex-col flex-grow">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-200 truncate">{user.username}</span>
                      {user.isAnonymous ? (
                        <span className="text-xs text-gray-400 bg-gray-700/30 px-1.5 py-0.5 rounded-full">Anon</span>
                      ) : (
                        <img src={verifiedIcon} alt="Verified" className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {countries.getName(user.country, 'en') || 'Not specified'}
                        {user.age ? `, ${user.age}y` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleContextAction('message', user)}
                    className={`p-2.5 rounded-full text-white shadow-md min-w-[38px] min-h-[38px] ${
                      showMessageHint && index === 0 ? 'bg-[#1A1A1A]/80' : 'bg-[#1A1A1A]/80'
                    } hover:bg-red-600`}
                  >
                    <FaComment className="text-lg" style={{ stroke: 'black', strokeWidth: 1, fill: 'white' }} />
                  </button>
                  <button
                    onClick={() => handleContextAction('profile', user)}
                    className="p-2.5 rounded-full bg-[#1A1A1A]/80 text-white shadow-md min-w-[38px] min-h-[38px] hover:bg-red-600"
                  >
                    <FaInfoCircle className="text-lg" />
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          isMessagesLoading ? (
            <>
              <SkeletonMessageCard />
              <SkeletonMessageCard />
              <SkeletonMessageCard />
            </>
          ) : conversations.length === 0 ? (
            <div className="text-gray-300 text-center text-sm font-medium py-6">No unread messages 📭</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.senderId}
                className="p-3 rounded-md bg-[#1A1A1A]/80 flex items-center justify-between border border-gray-700/50 shadow-md hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => {
                  console.log('[UserList] Conversation clicked for sender:', conv.senderId);
                  markMessagesAsRead(conv.senderId);
                  setSelectedUserId(conv.senderId);
                }}
              >
                <div className="flex items-center space-x-3 flex-grow">
                  <div className="w-10 h-10 flex items-center justify-center text-white">
                    {conv.gender && (conv.gender.toLowerCase() === 'male' || conv.gender.toUpperCase() === 'M') ? (
                      <img src={maleIcon} alt="Male icon" className="w-8 h-8" />
                    ) : conv.gender && (conv.gender.toLowerCase() === 'female' || conv.gender.toUpperCase() === 'F') ? (
                      <img src={femaleIcon} alt="Female icon" className="w-8 h-8" />
                    ) : (
                      <img src={maleIcon} alt="Default male icon" className="w-8 h-8 opacity-50" />
                    )}
                  </div>
                  <div className="flex flex-col flex-grow">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-200 truncate">{conv.username}</span>
                      {conv.isAnonymous ? (
                        <span className="text-xs text-gray-400 bg-gray-700/30 px-1.5 py-0.5 rounded-full">Anon</span>
                      ) : (
                        <img src={verifiedIcon} alt="Verified" className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {conv.unreadCount} {conv.unreadCount === 1 ? 'message' : 'messages'}
                      </span>
                      <span className="text-xs text-gray-500">{formatTimestamp(conv.latestMessageTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-black/90 border border-gray-700/50 rounded-md shadow-md p-2 z-20"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="flex items-center space-x-2 p-2 text-sm text-white rounded-md cursor-pointer hover:bg-blue-600"
            onClick={() => handleContextAction('message', contextMenu.user)}
          >
            <FaComment className="text-sm" />
            <span>Send Message</span>
          </div>
          <div
            className="flex items-center space-x-2 p-2 text-sm text-white rounded-md cursor-pointer hover:bg-blue-600"
            onClick={() => handleContextAction('profile', contextMenu.user)}
          >
            <FaInfoCircle className="text-sm" />
            <span>View Profile</span>
          </div>
        </div>
      )}

      {isProfileModalOpen && selectedProfile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-[#1A1A1A]/95 border border-gray-700/50 p-6 rounded-md shadow-md w-11/12 max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">User Profile</h2>
              <button
                onClick={closeProfileModal}
                className="text-gray-400 hover:text-red-400 transition-colors duration-200"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-center mb-4 bg-red-900/20 p-2 rounded-md text-xs shadow-inner">{error}</p>
            )}
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-blue-500 shadow-md"
                style={{ backgroundColor: '#4B5563' }}
              >
                {selectedProfile.username[0]?.toUpperCase() || '?'}
              </div>
              <h4 className="mt-3 text-sm font-semibold text-white">{selectedProfile.username}</h4>
              <p className="text-xs text-gray-400">
                Joined {new Date(selectedProfile.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Bio</label>
                <p className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded-md">
                  {selectedProfile.bio || 'No bio available'}
                </p>
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
                <p className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded-md">
                  {selectedProfile.age ? `${selectedProfile.age} years` : 'Not specified'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">Status</label>
                <p className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded-md">
                  {selectedProfile.status || 'Available'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={closeProfileModal}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

UserList.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      online: PropTypes.bool,
      isAnonymous: PropTypes.bool,
      country: PropTypes.string,
      gender: PropTypes.string,
      age: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    })
  ).isRequired,
  setSelectedUserId: PropTypes.func.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default UserList;
