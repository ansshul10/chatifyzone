import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaUser, FaUserSecret, FaArrowLeft, FaEllipsisV, FaBan, FaUserPlus, FaFlag, FaUnlock, FaSun, FaMoon, FaUserMinus, FaTrash, FaPhone } from 'react-icons/fa';
import Navbar from './Navbar';
import UserList from './UserList';
import MessageActions from './MessageActions';
import VoiceCall from './VoiceCall';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [error, setError] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [menuMessageId, setMenuMessageId] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [backCount, setBackCount] = useState(0);
  const [friends, setFriends] = useState([]);
  const isAnonymous = !!localStorage.getItem('anonymousId');
  const userId = isAnonymous ? localStorage.getItem('anonymousId') : JSON.parse(localStorage.getItem('user'))?.id;
  const username = isAnonymous ? localStorage.getItem('anonymousUsername') : JSON.parse(localStorage.getItem('user'))?.username;
  const messagesEndRef = useRef(null);
  const socketRef = useRef(socket);
  const messageInputRef = useRef(null);
  const longPressTimer = useRef(null);
  const hoverTimeout = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!userId || !username) {
      console.log('[ChatWindow] No userId or username, redirecting to /');
      window.location.href = '/';
      return;
    }

    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      query: { username },
    });

    const socket = socketRef.current;

    socket.emit('join', userId);

    socket.on('loadPreviousMessages', (previousMessages) => {
      const validMessages = Array.isArray(previousMessages) ? previousMessages.filter(msg => msg && msg._id) : [];
      setMessages(validMessages);
      updateUnreadMessages(validMessages);
    });

    socket.on('receiveMessage', (message) => {
      if (message && message._id) {
        setMessages((prev) => [...prev, message]);
        if (message.receiver === userId && !message.readAt && message.sender !== selectedUserId) {
          setUnreadMessages((prev) => ({
            ...prev,
            [message.sender]: (prev[message.sender] || 0) + 1,
          }));
        }
      } else {
        console.error('[ChatWindow] Invalid message received:', message);
      }
    });

    socket.on('userListUpdate', (onlineUsers) => {
      const validUsers = Array.isArray(onlineUsers) ? onlineUsers.filter(user => user && user.id) : [];
      setUsers(validUsers);
    });

    socket.on('messageEdited', (updatedMessage) => {
      if (updatedMessage && updatedMessage._id) {
        setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
      } else {
        console.error('[ChatWindow] Invalid updated message:', updatedMessage);
      }
    });

    socket.on('messageDeleted', (deletedMessageId) => {
      if (deletedMessageId) {
        setMessages((prev) => prev.filter((msg) => msg._id !== deletedMessageId));
        updateUnreadMessages(messages.filter((msg) => msg._id !== deletedMessageId));
      } else {
        console.error('[ChatWindow] Invalid deleted message ID:', deletedMessageId);
      }
    });

    socket.on('userTyping', ({ sender, username }) => {
      if (sender === selectedUserId) {
        setTypingUser(username);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUser(null);
        }, 2000);
      }
    });

    socket.on('userStoppedTyping', ({ sender }) => {
      if (sender === selectedUserId) {
        setTypingUser(null);
        clearTimeout(typingTimeoutRef.current);
      }
    });

    socket.on('messageStatusUpdate', (updatedMessage) => {
      if (updatedMessage && updatedMessage._id) {
        setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
        if (updatedMessage.receiver === userId && updatedMessage.readAt) {
          setUnreadMessages((prev) => {
            const newUnread = { ...prev };
            if (newUnread[updatedMessage.sender] > 0) {
              newUnread[updatedMessage.sender]--;
              if (newUnread[updatedMessage.sender] === 0) delete newUnread[updatedMessage.sender];
            }
            return newUnread;
          });
        }
      } else {
        console.error('[ChatWindow] Invalid message status update:', updatedMessage);
      }
    });

    socket.on('reactionUpdate', ({ messageId, reactions }) => {
      if (messageId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
        );
      } else {
        console.error('[ChatWindow] Invalid reaction update:', { messageId, reactions });
      }
    });

    socket.on('error', ({ msg }) => {
      setError(msg);
      console.error('[ChatWindow] Socket error:', msg);
      setTimeout(() => setError(''), 3000);
    });

    socket.on('blockedUsersUpdate', (blockedList) => {
      const validBlocked = Array.isArray(blockedList) ? blockedList.filter(id => id).map(id => id.toString()) : [];
      setBlockedUsers(validBlocked);
    });

    socket.on('friendsUpdate', (friendList) => {
      const validFriends = Array.isArray(friendList) ? friendList.filter(friend => friend && friend._id).map(friend => friend._id.toString()) : [];
      setFriends(validFriends);
    });

    socket.on('actionResponse', ({ type, success, msg }) => {
      setError(success ? '' : msg);
      setTimeout(() => setError(''), 3000);
      if (success && selectedUserId) {
        if (type === 'block') {
          setBlockedUsers((prev) => [...prev, selectedUserId.toString()]);
        } else if (type === 'unblock') {
          setBlockedUsers((prev) => prev.filter((id) => id !== selectedUserId.toString()));
        } else if (type === 'acceptFriendRequest') {
          setFriends((prev) => [...prev, selectedUserId.toString()]);
        } else if (type === 'unfriend') {
          setFriends((prev) => prev.filter((id) => id !== selectedUserId.toString()));
        } else if (type === 'sendFriendRequest') {
          setError('');
        }
      }
      setIsDropdownOpen(false);
    });

    if (!isAnonymous) {
      socket.emit('getFriends', userId);
    }

    window.history.pushState({ page: 'chat' }, null, window.location.pathname);
    const handlePopState = (event) => {
      event.preventDefault();
      if (selectedUserId) {
        setSelectedUserId(null);
        setBackCount(1);
        window.history.pushState({ page: 'userlist' }, null, window.location.pathname);
      } else if (backCount === 1) {
        setShowLogoutModal(true);
        setBackCount(2);
        window.history.pushState({ page: 'modal' }, null, window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      socket.disconnect();
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [userId, username, isAnonymous]);

  useEffect(() => {
    if (!isAnonymous && selectedUserId) {
      socketRef.current.emit('getFriends', userId);
    }
  }, [selectedUserId, userId, isAnonymous]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      const unreadFromSelected = messages.filter(
        (msg) => msg.sender === selectedUserId && msg.receiver === userId && !msg.readAt
      );
      unreadFromSelected.forEach((msg) => {
        socketRef.current.emit('updateMessageStatus', { messageId: msg._id, userId, status: 'read' });
      });
      setUnreadMessages((prev) => {
        const newUnread = { ...prev };
        delete newUnread[selectedUserId];
        return newUnread;
      });
    }
  }, [selectedUserId, messages, userId]);

  const updateUnreadMessages = useCallback((msgs) => {
    const unread = {};
    msgs.forEach((msg) => {
      if (msg.receiver === userId && !msg.readAt && msg.sender !== selectedUserId) {
        unread[msg.sender] = (unread[msg.sender] || 0) + 1;
      }
    });
    setUnreadMessages(unread);
  }, [userId, selectedUserId]);

  const handleBackToUserList = useCallback(() => {
    setSelectedUserId(null);
    setMessages([]);
    setBackCount((prev) => prev + 1);
  }, []);

  const getUsername = useCallback((id) => {
    const user = users.find((u) => u.id === id);
    return user ? user.username : 'Unknown';
  }, [users]);

  const handleTyping = useCallback((e) => {
    setNewMessage(e.target.value);
    if (e.target.value && selectedUserId) {
      socketRef.current.emit('typing', { sender: userId, receiver: selectedUserId, username });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stopTyping', { sender: userId, receiver: selectedUserId });
      }, 2000);
    }
  }, [userId, selectedUserId, username]);

  const handleInputFocus = useCallback(() => {
    if (selectedUserId) {
      socketRef.current.emit('updateMessageStatus', { userId, senderId: selectedUserId, status: 'read' });
    }
  }, [userId, selectedUserId]);

  const handleSendMessage = useCallback((e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || blockedUsers.includes(selectedUserId)) return;
    socketRef.current.emit('sendMessage', {
      sender: userId,
      receiver: selectedUserId,
      content: newMessage.trim(),
    });
    setNewMessage('');
    socketRef.current.emit('stopTyping', { sender: userId, receiver: selectedUserId });
  }, [newMessage, selectedUserId, blockedUsers, userId]);

  const handleDoubleClick = useCallback((messageId) => {
    setActiveMessageId((prev) => (prev === messageId ? null : messageId));
  }, []);

  const handleHoverStart = useCallback((messageId) => {
    hoverTimeout.current = setTimeout(() => {
      setMenuMessageId(messageId);
    }, 500);
  }, []);

  const handleHoverEnd = useCallback(() => {
    clearTimeout(hoverTimeout.current);
    setMenuMessageId(null);
  }, []);

  const handleLongPressStart = useCallback((messageId, isSender) => {
    longPressTimer.current = setTimeout(() => {
      setMenuMessageId(messageId);
      if (isSender) {
        setActiveMessageId(messageId);
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleBlockUser = useCallback(() => {
    socketRef.current.emit('blockUser', { userId, targetId: selectedUserId });
  }, [userId, selectedUserId]);

  const handleUnblockUser = useCallback(() => {
    socketRef.current.emit('unblockUser', { userId, targetId: selectedUserId });
  }, [userId, selectedUserId]);

  const handleSendFriendRequest = useCallback(() => {
    socketRef.current.emit('sendFriendRequest', { userId, friendId: selectedUserId });
  }, [userId, selectedUserId]);

  const handleUnfriend = useCallback(() => {
    socketRef.current.emit('unfriend', { userId, friendId: selectedUserId });
  }, [userId, selectedUserId]);

  const handleReportUser = useCallback(() => {
    socketRef.current.emit('reportUser', { userId, targetId: selectedUserId });
  }, [userId, selectedUserId]);

  const handleClearHistory = useCallback(() => {
    socketRef.current.emit('clearChatHistory', { userId, targetId: selectedUserId });
  }, [userId, selectedUserId]);

  const handleLogout = useCallback(() => {
    socketRef.current.emit('logout', userId);
    localStorage.removeItem('user');
    localStorage.removeItem('anonymousId');
    localStorage.removeItem('anonymousUsername');
    window.location.href = '/';
  }, [userId]);

  const handleStayHere = useCallback(() => {
    setShowLogoutModal(false);
    setBackCount(0);
  }, []);

  const handleEndCall = useCallback(() => {
    console.log('[ChatWindow] Call ended');
    // Additional cleanup if needed
  }, []);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } };
  const chatVariants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
  const messageVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
  const inputVariants = { hover: { scale: 1.02, borderColor: '#FF0000' }, focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)' } };
  const buttonVariants = { hover: { scale: 1.1, backgroundColor: isDarkMode ? '#1A1A1A' : '#d1d5db' }, tap: { scale: 0.95 } };
  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, type: 'spring', stiffness: 200, damping: 15 } },
  };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  const isFriend = selectedUserId && friends.includes(selectedUserId.toString());
  const isBlocked = selectedUserId && blockedUsers.includes(selectedUserId.toString());

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}
    >
      <div className="w-full z-10 pt-16">
        <Navbar />
      </div>
      <div className="w-full flex-grow flex flex-col h-[100vh]">
        <AnimatePresence>
          {!selectedUserId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full h-[94vh] flex flex-col"
            >
              <UserList
                users={users}
                setSelectedUserId={setSelectedUserId}
                currentUserId={userId}
                unreadMessages={unreadMessages}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedUserId && (
            <motion.div
              variants={chatVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`flex flex-col flex-grow ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'}`}
            >
              <div className={`flex items-center justify-between border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-400'} p-4`}>
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBackToUserList}
                    className={`${isDarkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-600 hover:text-red-500'}`}
                  >
                    <FaArrowLeft className="text-xl sm:text-2xl" />
                  </motion.button>
                  {isAnonymous ? <FaUserSecret className="text-purple-500 text-xl" /> : <FaUser className="text-red-500 text-xl" />}
                  <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {isAnonymous ? 'Guest Chat' : 'Chat'} <span className="text-red-400">with {getUsername(selectedUserId)}</span>
                  </span>
                </div>
                <div className="relative flex items-center space-x-2">
                  <motion.div whileHover={{ scale: 1.1 }}>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`p-2 rounded-full ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-300'}`}
                    >
                      {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
                    </button>
                  </motion.div>
                  {isAnonymous && (
                    <span className={`text-yellow-400 text-xs sm:text-sm ${isDarkMode ? 'bg-yellow-900' : 'bg-yellow-200'} bg-opacity-30 px-2 py-1 rounded-full`}>
                      Anonymous Mode
                    </span>
                  )}
                  {!isAnonymous && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`${isDarkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-600 hover:text-red-500'}`}
                    >
                      <FaEllipsisV className="text-xl" />
                    </motion.button>
                  )}
                  <AnimatePresence>
                    {isDropdownOpen && !isAnonymous && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={dropdownVariants}
                        className={`absolute right-4 top-12 w-52 ${isDarkMode ? 'bg-black border-gray-600' : 'bg-gray-200 border-gray-400'} border rounded-lg shadow-2xl p-3 z-10`}
                      >
                        <motion.div
                          whileHover={{ backgroundColor: isDarkMode ? '#1F2937' : '#e5e7eb', scale: 1.05 }}
                          onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                          className={`flex items-center space-x-2 p-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} cursor-pointer rounded-md`}
                        >
                          {isBlocked ? <FaUnlock /> : <FaBan />}
                          <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                        </motion.div>
                        {isFriend ? (
                          <motion.div
                            whileHover={{ backgroundColor: isDarkMode ? '#1F2937' : '#e5e7eb', scale: 1.05 }}
                            onClick={handleUnfriend}
                            className={`flex items-center space-x-2 p-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} cursor-pointer rounded-md`}
                          >
                            <FaUserMinus />
                            <span>Unfriend</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            whileHover={{ backgroundColor: isDarkMode ? '#1F2937' : '#e5e7eb', scale: 1.05 }}
                            onClick={handleSendFriendRequest}
                            className={`flex items-center space-x-2 p-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} cursor-pointer rounded-md`}
                          >
                            <FaUserPlus />
                            <span>Send Friend Request</span>
                          </motion.div>
                        )}
                        <motion.div
                          whileHover={{ backgroundColor: isDarkMode ? '#1F2937' : '#e5e7eb', scale: 1.05 }}
                          onClick={handleReportUser}
                          className={`flex items-center space-x-2 p-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} cursor-pointer rounded-md`}
                        >
                          <FaFlag />
                          <span>Report</span>
                        </motion.div>
                        <motion.div
                          whileHover={{ backgroundColor: isDarkMode ? '#1F2937' : '#e5e7eb', scale: 1.05 }}
                          onClick={handleClearHistory}
                          className={`flex items-center space-x-2 p-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} cursor-pointer rounded-md`}
                        >
                          <FaTrash />
                          <span>Clear Chat History</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div
                className={`flex-grow overflow-y-auto space-y-4 px-4 pt-6 scrollbar-thin ${isDarkMode ? 'scrollbar-thumb-red-500 scrollbar-track-gray-800' : 'scrollbar-thumb-red-400 scrollbar-track-gray-300'}`}
              >
                <AnimatePresence>
                  {messages.length === 0 && !error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center text-sm sm:text-base`}
                    >
                      No messages yet. Start chatting! 💬
                    </motion.p>
                  )}
                  {messages
                    .filter((msg) => msg.sender === selectedUserId || msg.receiver === selectedUserId)
                    .map((msg) => (
                      <motion.div
                        key={msg._id}
                        variants={messageVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'} relative`}
                        onDoubleClick={() => handleDoubleClick(msg._id)}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-xs lg:max-w-md p-3 rounded-lg shadow-md ${
                            msg.sender === userId
                              ? isDarkMode
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-300 text-gray-900'
                              : isDarkMode
                                ? 'bg-gray-700 text-gray-200'
                                : 'bg-gray-400 text-gray-800'
                          }`}
                        >
                          <p
                            className="text-sm sm:text-base"
                            onMouseEnter={msg.sender === userId ? () => handleHoverStart(msg._id) : null}
                            onMouseLeave={msg.sender === userId ? () => handleHoverEnd() : null}
                            onTouchStart={
                              msg.sender === userId
                                ? () => handleLongPressStart(msg._id, true)
                                : () => handleLongPressStart(msg._id, false)
                            }
                            onTouchEnd={handleLongPressEnd}
                            onTouchMove={handleLongPressEnd}
                          >
                            <span className="font-bold">{getUsername(msg.sender)}:</span> {msg.content}
                          </p>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} block mt-1`}>
                            {new Date(msg.createdAt).toLocaleTimeString()}
                            {msg.edited && ' (Edited)'}
                            {msg.sender === userId && (
                              <> - {msg.readAt ? 'Seen' : msg.deliveredAt ? 'Delivered' : 'Sent'}</>
                            )}
                          </span>
                          <MessageActions
                            messageId={msg._id}
                            content={msg.content}
                            setMessages={setMessages}
                            reactions={msg.reactions || {}}
                            showReactions={activeMessageId === msg._id}
                            isSender={msg.sender === userId}
                            showMenu={menuMessageId === msg._id}
                            userId={userId}
                          />
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 flex flex-col space-y-2">
                {typingUser && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm text-left`}
                  >
                    {typingUser} is typing...
                  </motion.p>
                )}
                {error && (
                  <p className={`text-red-400 text-center text-sm sm parabolic:base ${isDarkMode ? 'bg-red-900' : 'bg-red-200'} bg-opacity-20 p-2 rounded`}>
                    {error} ⚠️
                  </p>
                )}
              </div>

              <form onSubmit={handleSendMessage} className={`flex items-center p-4 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-400'} gap-2`}>
                <motion.div
                  whileHover="hover"
                  whileFocus="focus"
                  variants={inputVariants}
                  className={`flex-grow flex items-center border ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-100'} rounded-lg p-2 sm:p-3`}
                >
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    onFocus={handleInputFocus}
                    placeholder="Type a message..."
                    className={`w-full bg-transparent ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'} text-sm sm:text-base focus:outline-none`}
                    disabled={blockedUsers.includes(selectedUserId)}
                  />
                </motion.div>
                <motion.button
                  type="submit"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  className={`${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'} p-2 sm:p-3 rounded-lg shadow-lg`}
                  disabled={!newMessage.trim() || blockedUsers.includes(selectedUserId)}
                >
                  <FaPaperPlane className="text-lg sm:text-xl" />
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLogoutModal && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
              className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50`}
            >
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'} shadow-lg`}>
                <p className="text-lg mb-4">Are you sure you want to logout?</p>
                <div className="flex space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className={`px-4 py-2 rounded ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
                  >
                    Logout
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStayHere}
                    className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-400 text-black'}`}
                  >
                    Stay Here
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedUserId && !isAnonymous && (
          <VoiceCall
            userId={userId}
            receiverId={selectedUserId}
            socket={socketRef.current}
            onEndCall={handleEndCall}
            isDarkMode={isDarkMode}
            startCall={false}
          />
        )}
      </div>
    </motion.div>
  );
};

export default ChatWindow;
