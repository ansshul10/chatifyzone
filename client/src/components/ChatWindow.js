import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaUser, FaUserSecret, FaArrowLeft, FaEllipsisV, FaBan, FaUserPlus, FaFlag, FaUnlock } from 'react-icons/fa';
import Navbar from './Navbar';
import UserList from './UserList';
import MessageActions from './MessageActions';

// Initialize Socket.IO inside useEffect to ensure localStorage is ready
const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [error, setError] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const isAnonymous = !!localStorage.getItem('anonymousId');
  const userId = isAnonymous ? localStorage.getItem('anonymousId') : JSON.parse(localStorage.getItem('user'))?.id;
  const username = isAnonymous ? localStorage.getItem('anonymousUsername') : JSON.parse(localStorage.getItem('user'))?.username;
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    console.log('ChatWindow loaded with userId:', userId, 'username:', username);
    if (!userId || !username) {
      console.error('Missing userId or username, redirecting to login');
      window.location.href = '/';
      return;
    }

    // Initialize Socket.IO
    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      query: { username: username },
    });

    const socket = socketRef.current;

    socket.emit('join', userId);

    socket.on('loadPreviousMessages', (previousMessages) => {
      setMessages(previousMessages);
    });

    socket.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.receiver === userId && !message.readAt) {
        socket.emit('messageRead', { messageId: message._id, userId });
      }
    });

    socket.on('userListUpdate', (onlineUsers) => {
      console.log('Received user list:', onlineUsers);
      setUsers(onlineUsers);
    });

    socket.on('messageEdited', (updatedMessage) => {
      setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
    });

    socket.on('messageDeleted', (deletedMessageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== deletedMessageId));
    });

    socket.on('userTyping', ({ sender }) => {
      if (sender === selectedUserId) setTypingUser(getUsername(sender));
    });

    socket.on('userStoppedTyping', () => setTypingUser(null));

    socket.on('messageRead', (updatedMessage) => {
      setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
    });

    socket.on('error', ({ msg }) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    socket.on('blockedUsersUpdate', (blockedList) => {
      console.log('Blocked users updated:', blockedList);
      setBlockedUsers(blockedList);
    });

    socket.on('actionResponse', ({ type, success, msg }) => {
      console.log('Action response:', { type, success, msg });
      setError(msg);
      setTimeout(() => setError(''), 3000);
      if (type === 'block' && success) {
        setBlockedUsers((prev) => [...prev, selectedUserId]);
      } else if (type === 'unblock' && success) {
        setBlockedUsers((prev) => prev.filter((id) => id !== selectedUserId));
      }
      setIsDropdownOpen(false);
    });

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
      socket.off('error');
      socket.off('blockedUsersUpdate');
      socket.off('actionResponse');
    };
  }, [userId, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleBackToUserList = () => {
    setSelectedUserId(null);
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

  const handleAddFriend = () => {
    if (!selectedUserId) return;
    socketRef.current.emit('addFriend', { userId, friendId: selectedUserId });
  };

  const handleReportUser = () => {
    if (!selectedUserId) return;
    socketRef.current.emit('reportUser', { userId, targetId: selectedUserId });
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } };
  const chatVariants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
  const messageVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
  const inputVariants = { hover: { scale: 1.02, borderColor: '#FF1A1A' }, focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 26, 26, 0.5)' } };
  const buttonVariants = { hover: { scale: 1.1, backgroundColor: '#FF1A1A' }, tap: { scale: 0.95 } };
  const footerVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } } };
  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, type: 'spring', stiffness: 200, damping: 15 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col pt-11"
    >
      <Navbar />
      <div className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
        <AnimatePresence>
          {!selectedUserId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 mx-auto mt-16"
            >
              <UserList users={users} setSelectedUserId={setSelectedUserId} currentUserId={userId} />
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
              className="w-full flex flex-col bg-gradient-to-br from-gray-800 to-black bg-opacity-90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 p-4 sm:p-6 mt-16 lg:mt-0"
            >
              <div className="flex items-center justify-between border-b border-gray-600 pb-2 mb-4">
                <div className="flex items-center space-x-2">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={handleBackToUserList} className="text-gray-300 hover:text-red-400">
                    <FaArrowLeft className="text-xl sm:text-2xl" />
                  </motion.button>
                  {isAnonymous ? <FaUserSecret className="text-purple-500 text-xl" /> : <FaUser className="text-red-500 text-xl" />}
                  <span className="text-lg sm:text-xl font-semibold text-gray-100">
                    {isAnonymous ? 'Guest Chat' : 'Chat'} <span className="text-red-400">with {getUsername(selectedUserId)}</span>
                  </span>
                </div>
                <div className="relative flex items-center space-x-2">
                  {isAnonymous && <span className="text-yellow-400 text-xs sm:text-sm bg-yellow-900 bg-opacity-30 px-2 py-1 rounded-full">Anonymous Mode</span>}
                  {!isAnonymous && (
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="text-gray-300 hover:text-red-400">
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
                        className="absolute right-0 top-10 w-52 bg-black border border-gray-600 rounded-lg shadow-2xl p-3 z-10"
                      >
                        {blockedUsers.includes(selectedUserId) ? (
                          <motion.div
                            whileHover={{ backgroundColor: '#1F2937', scale: 1.05 }}
                            onClick={handleUnblockUser}
                            className="flex items-center space-x-2 p-2 text-sm text-red-500 cursor-pointer rounded-md"
                          >
                            <FaUnlock />
                            <span>Unblock User</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            whileHover={{ backgroundColor: '#1F2937', scale: 1.05 }}
                            onClick={handleBlockUser}
                            className="flex items-center space-x-2 p-2 text-sm text-red-500 cursor-pointer rounded-md"
                          >
                            <FaBan />
                            <span>Block User</span>
                          </motion.div>
                        )}
                        <motion.div
                          whileHover={{ backgroundColor: '#1F2937', scale: 1.05 }}
                          onClick={handleAddFriend}
                          className="flex items-center space-x-2 p-2 text-sm text-red-500 cursor-pointer rounded-md"
                        >
                          <FaUserPlus />
                          <span>Add Friend</span>
                        </motion.div>
                        <motion.div
                          whileHover={{ backgroundColor: '#1F2937', scale: 1.05 }}
                          onClick={handleReportUser}
                          className="flex items-center space-x-2 p-2 text-sm text-red-500 cursor-pointer rounded-md"
                        >
                          <FaFlag />
                          <span>Report</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto h-[50vh] sm:h-[60vh] lg:h-[70vh] space-y-4 px-2 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-800">
                <AnimatePresence>
                  {messages.length === 0 && !error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-400 text-center text-sm sm:text-base">
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
                        className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-xs lg:max-w-md p-3 rounded-lg shadow-md ${
                            msg.sender === userId ? 'bg-gradient-to-r from-black-600 to-red-800 text-white' : 'bg-gradient-to-r from-black-700 to-gray-600 text-gray-200'
                          }`}
                        >
                          <p className="text-sm sm:text-base">
                            <span className="font-bold">{getUsername(msg.sender)}:</span> {msg.content}
                          </p>
                          <span className="text-xs text-gray-300 block mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                            {msg.edited && ' (Edited)'}
                            {msg.sender === userId && <> - {msg.readAt ? 'Read' : msg.deliveredAt ? 'Delivered' : 'Sent'}</>}
                          </span>
                          {msg.sender === userId && <MessageActions messageId={msg._id} content={msg.content} setMessages={setMessages} />}
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="pt-2 flex flex-col space-y-2">
                {typingUser && <p className="text-gray-400 text-sm text-left">{typingUser} is typing...</p>}
                {error && <p className="text-red-400 text-center text-sm sm:text-base bg-red-900 bg-opacity-20 p-2 rounded">{error} ⚠️</p>}
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center pt-4 border-t border-gray-600 gap-2">
                <motion.div whileHover="hover" whileFocus="focus" variants={inputVariants} className="flex-grow flex items-center border border-gray-600 rounded-lg bg-gray-900 p-2 sm:p-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none"
                    disabled={blockedUsers.includes(selectedUserId)}
                  />
                </motion.div>
                <motion.button
                  type="submit"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  className="bg-gradient-to-r from-red-600 to-red-800 text-white p-2 sm:p-3 rounded-lg shadow-lg"
                  disabled={!newMessage.trim() || blockedUsers.includes(selectedUserId)}
                >
                  <FaPaperPlane className="text-lg sm:text-xl" />
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.footer variants={footerVariants} initial="hidden" animate="visible" className="bg-gradient-to-t from-black to-gray-900 py-4 sm:py-6 border-t border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-gray-400 text-xs sm:text-sm">
          <div className="mb-2 sm:mb-0">
            <span className="font-semibold text-white">Chatify</span> © {new Date().getFullYear()} All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6">
            <motion.a href="/terms" whileHover={{ y: -2, color: '#FF1A1A' }} className="transition-all duration-300">Terms of Service</motion.a>
            <motion.a href="/privacy" whileHover={{ y: -2, color: '#FF1A1A' }} className="transition-all duration-300">Privacy Policy</motion.a>
            <motion.a href="/contact" whileHover={{ y: -2, color: '#FF1A1A' }} className="transition-all duration-300">Contact Us</motion.a>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
};

export default ChatWindow;
