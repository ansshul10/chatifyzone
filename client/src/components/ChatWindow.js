import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaUser, FaUserSecret, FaArrowLeft, FaEllipsisV, FaBan, FaUserPlus, FaFlag, FaUnlock, FaSun, FaMoon, FaUserMinus } from 'react-icons/fa';
import Navbar from './Navbar';
import UserList from './UserList';
import MessageActions from './MessageActions';

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
  const [friends, setFriends] = useState([]); // Store friend IDs
  const isAnonymous = !!localStorage.getItem('anonymousId');
  const userId = isAnonymous ? localStorage.getItem('anonymousId') : JSON.parse(localStorage.getItem('user'))?.id;
  const username = isAnonymous ? localStorage.getItem('anonymousUsername') : JSON.parse(localStorage.getItem('user'))?.username;
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const messageInputRef = useRef(null);
  const longPressTimer = useRef(null);
  const hoverTimeout = useRef(null);

  useEffect(() => {
    console.log('ChatWindow loaded with userId:', userId, 'username:', username);
    if (!userId || !username) {
      console.error('Missing userId or username, redirecting to login');
      window.location.href = '/';
      return;
    }

    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      query: { username: username },
    });

    const socket = socketRef.current;

    socket.emit('join', userId);

    socket.on('loadPreviousMessages', (previousMessages) => {
      console.log('Loaded previous messages:', previousMessages);
      setMessages(previousMessages);
      updateUnreadMessages(previousMessages);
    });

    socket.on('receiveMessage', (message) => {
      console.log('Received message:', message);
      setMessages((prev) => [...prev, message]);
      if (message.receiver === userId && !message.readAt && message.sender !== selectedUserId) {
        setUnreadMessages((prev) => ({
          ...prev,
          [message.sender]: (prev[message.sender] || 0) + 1,
        }));
      }
    });

    socket.on('userListUpdate', (onlineUsers) => {
      console.log('Received user list:', onlineUsers);
      setUsers(onlineUsers);
    });

    socket.on('messageEdited', (updatedMessage) => {
      console.log('Message edited:', updatedMessage);
      setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
    });

    socket.on('messageDeleted', (deletedMessageId) => {
      console.log('Message deleted:', deletedMessageId);
      setMessages((prev) => prev.filter((msg) => msg._id !== deletedMessageId));
      updateUnreadMessages(messages.filter((msg) => msg._id !== deletedMessageId));
    });

    socket.on('userTyping', ({ sender }) => {
      if (sender === selectedUserId) setTypingUser(getUsername(sender));
    });

    socket.on('userStoppedTyping', () => setTypingUser(null));

    socket.on('messageRead', (updatedMessage) => {
      console.log('Message read:', updatedMessage);
      setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
      if (updatedMessage.receiver === userId) {
        setUnreadMessages((prev) => {
          const newUnread = { ...prev };
          if (newUnread[updatedMessage.sender] > 0) {
            newUnread[updatedMessage.sender]--;
            if (newUnread[updatedMessage.sender] === 0) delete newUnread[updatedMessage.sender];
          }
          return newUnread;
        });
      }
    });

    socket.on('reactionUpdate', ({ messageId, reactions }) => {
      console.log('Reaction update received:', { messageId, reactions });
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
      );
    });

    socket.on('error', ({ msg }) => {
      console.log('Error received:', msg);
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    socket.on('blockedUsersUpdate', (blockedList) => {
      console.log('Blocked users updated:', blockedList);
      setBlockedUsers(blockedList);
    });

    socket.on('friendsUpdate', (friendList) => {
      console.log('Friends updated:', friendList);
      setFriends(friendList.map(friend => friend._id)); // Store friend IDs
    });

    socket.on('actionResponse', ({ type, success, msg }) => {
      console.log('Action response:', { type, success, msg });
      setError(msg); // Display the error or success message
      setTimeout(() => setError(''), 3000);
      if (type === 'block' && success) {
        setBlockedUsers((prev) => [...prev, selectedUserId]);
      } else if (type === 'unblock' && success) {
        setBlockedUsers((prev) => prev.filter((id) => id !== selectedUserId));
      } else if (type === 'acceptFriendRequest' && success) {
        setFriends((prev) => [...prev, selectedUserId]);
      } else if (type === 'unfriend' && success) {
        setFriends((prev) => prev.filter((id) => id !== selectedUserId));
      }
      setIsDropdownOpen(false);
    });

    // Fetch initial friends list on mount
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
      socket.off('loadPreviousMessages');
      socket.off('receiveMessage');
      socket.off('userListUpdate');
      socket.off('messageEdited');
      socket.off('messageDeleted');
      socket.off('userTyping');
      socket.off('userStoppedTyping');
      socket.off('messageRead');
      socket.off('reactionUpdate');
      socket.off('error');
      socket.off('blockedUsersUpdate');
      socket.off('friendsUpdate');
      socket.off('actionResponse');
      window.removeEventListener('popstate', handlePopState);
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
        socketRef.current.emit('messageRead', { messageId: msg._id, userId });
      });
      setUnreadMessages((prev) => {
        const newUnread = { ...prev };
        delete newUnread[selectedUserId];
        return newUnread;
      });
    }
  }, [selectedUserId, messages, userId]);

  const updateUnreadMessages = (msgList) => {
    const unread = {};
    msgList.forEach((msg) => {
      if (msg.receiver === userId && !msg.readAt && msg.sender !== selectedUserId) {
        unread[msg.sender] = (unread[msg.sender] || 0) + 1;
      }
    });
    setUnreadMessages(unread);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) {
      setError('Please type a message and select a user');
      return;
    }
    if (blockedUsers.includes(selectedUserId)) {
      setError('You have blocked this user');
      return;
    }
    const messageData = { sender: userId, receiver: selectedUserId, content: newMessage };
    console.log('Sending message:', messageData);
    socketRef.current.emit('sendMessage', messageData);
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      socketRef.current.emit('typing', { sender: userId, receiver: selectedUserId });
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socketRef.current.emit('stopTyping', { sender: userId, receiver: selectedUserId });
      }, 1000);
    }
  };

  const handleDoubleClick = (messageId) => {
    setActiveMessageId(activeMessageId === messageId ? null : messageId);
    setMenuMessageId(null);
  };

  const handleLongPressStart = (messageId, isSender) => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (isSender) {
        setMenuMessageId((prev) => (prev === messageId ? null : messageId));
      } else {
        setActiveMessageId(messageId);
      }
    }, 500);
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleHoverStart = (messageId) => {
    clearTimeout(hoverTimeout.current);
    setMenuMessageId(messageId);
  };

  const handleHoverEnd = (messageId) => {
    hoverTimeout.current = setTimeout(() => {
      setMenuMessageId(null);
    }, 1500);
  };

  const handleBackToUserList = () => {
    setSelectedUserId(null);
    setBackCount(1);
    window.history.pushState({ page: 'userlist' }, null, window.location.pathname);
  };

  const handleLogout = () => {
    socketRef.current.emit('logout', userId);
    localStorage.removeItem('anonymousId');
    localStorage.removeItem('anonymousUsername');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleStayHere = () => {
    setShowLogoutModal(false);
    setBackCount(0);
    window.history.pushState({ page: 'userlist' }, null, window.location.pathname);
  };

  const getUsername = (id) => {
    if (id === userId) return username;
    const user = users.find((u) => u.id === id);
    return user ? user.username : 'Unknown';
  };

  const handleBlockUser = () => {
    if (!selectedUserId) return;
    socketRef.current.emit('blockUser', { userId, targetId: selectedUserId });
  };

  const handleUnblockUser = () => {
    if (!selectedUserId) return;
    socketRef.current.emit('unblockUser', { userId, targetId: selectedUserId });
  };

  const handleSendFriendRequest = () => {
    if (!selectedUserId) {
      console.log('No user selected for friend request');
      setError('Please select a user to send a friend request');
      return;
    }
    console.log('Sending friend request from', userId, 'to', selectedUserId);
    socketRef.current.emit('sendFriendRequest', { userId, friendId: selectedUserId });
  };

  const handleUnfriend = () => {
    if (!selectedUserId) return;
    socketRef.current.emit('unfriend', { userId, friendId: selectedUserId });
  };

  const handleReportUser = () => {
    if (!selectedUserId) return;
    socketRef.current.emit('reportUser', { userId, targetId: selectedUserId });
  };

  const handleInputFocus = () => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        window.scrollTo({
          top: messageInputRef.current?.offsetTop - 50,
          behavior: 'smooth',
        });
      }, 300);
    }
  };

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

  const isFriend = selectedUserId && friends.includes(selectedUserId);

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
                        {blockedUsers.includes(selectedUserId) ? (
                          <motion.div
                            whileHover={{ backgroundColor: isDarkMode ? '#1F2937' : '#e5e7eb', scale: 1.05 }}
                            onClick={handleUnblockUser}
                            className={`flex items-center space-x-2 p-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} cursor-pointer rounded-md`}
                          >
                            <FaUnlock />
                            <span>Unblock User</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            whileHover={{ backgroundColor: isDarkMode ? '#1F2937' : '#e5e7eb', scale: 1.05 }}
                            onClick={handleBlockUser}
                            className={`flex items-center space-x-2 p-2 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-500'} cursor-pointer rounded-md`}
                          >
                            <FaBan />
                            <span>Block User</span>
                          </motion.div>
                        )}
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
                              onMouseLeave={msg.sender === userId ? () => handleHoverEnd(msg._id) : null}
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
                              {msg.sender === userId && <> - {msg.readAt ? 'Read' : msg.deliveredAt ? 'Delivered' : 'Sent'}</>}
                            </span>
                            <MessageActions
                              messageId={msg._id}
                              content={msg.content}
                              setMessages={setMessages}
                              reactions={msg.reactions || {}}
                              showReactions={activeMessageId === msg._id}
                              isSender={msg.sender === userId}
                              showMenu={menuMessageId === msg._id}
                            />
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 flex flex-col space-y-2">
                  {typingUser && (
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm text-left`}>{typingUser} is typing...</p>
                  )}
                  {error && (
                    <p className={`text-red-400 text-center text-sm sm:text-base ${isDarkMode ? 'bg-red-900' : 'bg-red-200'} bg-opacity-20 p-2 rounded`}>
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
        </div>
      </motion.div>
    );
  };
  
  export default ChatWindow;
