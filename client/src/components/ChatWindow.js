import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaUser, FaUserSecret, FaArrowLeft } from 'react-icons/fa';
import Navbar from './Navbar';
import UserList from './UserList';
import MessageActions from './MessageActions';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
  query: { username: localStorage.getItem('anonymousUsername') || JSON.parse(localStorage.getItem('user'))?.username },
});

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [error ] = useState('');
  const isAnonymous = !!localStorage.getItem('anonymousId');
  const userId = isAnonymous ? localStorage.getItem('anonymousId') : JSON.parse(localStorage.getItem('user'))?.id;
  const username = isAnonymous ? localStorage.getItem('anonymousUsername') : JSON.parse(localStorage.getItem('user'))?.username;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      window.location.href = '/';
      return;
    }

    socket.emit('join', userId);

    socket.on('loadPreviousMessages', (previousMessages) => {
      setMessages(previousMessages);
    });

    socket.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('userListUpdate', (onlineUsers) => {
      setUsers(onlineUsers);
    });

    socket.on('messageEdited', (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
      );
    });

    socket.on('messageDeleted', (deletedMessageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== deletedMessageId));
    });

    return () => {
      socket.off('loadPreviousMessages');
      socket.off('receiveMessage');
      socket.off('userListUpdate');
      socket.off('messageEdited');
      socket.off('messageDeleted');
    };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    const messageData = { sender: userId, receiver: selectedUserId, content: newMessage };
    socket.emit('sendMessage', messageData);
    setNewMessage('');
  };

  const handleBackToUserList = () => {
    setSelectedUserId(null); // Reset to show UserList
  };

  const getUsername = (id) => {
    if (id === userId) return username;
    const user = users.find((u) => u.id === id);
    return user ? user.username : 'Unknown';
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const chatVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: '#FF1A1A', transition: { duration: 0.3 } },
    focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 26, 26, 0.5)', transition: { duration: 0.3 } },
  };

  const buttonVariants = {
    hover: { scale: 1.1, backgroundColor: '#FF1A1A', transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } },
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
        {/* User List - Shown only when no user is selected */}
        <AnimatePresence>
          {!selectedUserId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full lg:w-1/2 mx-auto mt-16" // Added mt-16 to push below Navbar
            >
              <UserList
                users={users}
                setSelectedUserId={setSelectedUserId}
                currentUserId={userId}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Window - Appears only after user selection */}
        <AnimatePresence>
          {selectedUserId && (
            <motion.div
              variants={chatVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="w-full flex flex-col bg-gradient-to-br from-gray-800 to-black bg-opacity-90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 p-4 sm:p-6 mt-16 lg:mt-0" // mt-16 on mobile only
            >
              {/* Chat Header with Back Arrow */}
              <div className="flex items-center justify-between border-b border-gray-600 pb-2 mb-4">
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBackToUserList}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <FaArrowLeft className="text-xl sm:text-2xl" />
                  </motion.button>
                  {isAnonymous ? (
                    <FaUserSecret className="text-purple-500 text-xl" />
                  ) : (
                    <FaUser className="text-red-500 text-xl" />
                  )}
                  <span className="text-lg sm:text-xl font-semibold text-gray-100">
                    {isAnonymous ? 'Guest Chat' : 'Chat'}{' '}
                    <span className="text-red-400">with {getUsername(selectedUserId)}</span>
                  </span>
                </div>
                {isAnonymous && (
                  <span className="text-yellow-400 text-xs sm:text-sm bg-yellow-900 bg-opacity-30 px-2 py-1 rounded-full">
                    Anonymous Mode
                  </span>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto h-[50vh] sm:h-[60vh] lg:h-[70vh] space-y-4 px-2 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-800">
                <AnimatePresence>
                  {messages.length === 0 && !error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-gray-400 text-center text-sm sm:text-base"
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
                        className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-xs lg:max-w-md p-3 rounded-lg shadow-md ${
                            msg.sender === userId
                              ? 'bg-gradient-to-r from-black-600 to-red-800 text-white'
                              : 'bg-gradient-to-r from-black-700 to-gray-600 text-gray-200'
                          }`}
                        >
                          <p className="text-sm sm:text-base">
                            <span className="font-bold">{getUsername(msg.sender)}:</span> {msg.content}
                          </p>
                          <span className="text-xs text-gray-300 block mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                            {msg.edited && ' (Edited)'}
                          </span>
                          {msg.sender === userId && (
                            <MessageActions messageId={msg._id} content={msg.content} setMessages={setMessages} />
                          )}
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {error && (
                  <p className="text-red-400 text-center text-sm sm:text-base bg-red-900 bg-opacity-20 p-2 rounded">
                    {error} ⚠️
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex items-center pt-4 border-t border-gray-600 gap-2">
                <motion.div
                  whileHover="hover"
                  whileFocus="focus"
                  variants={inputVariants}
                  className="flex-grow flex items-center border border-gray-600 rounded-lg bg-gray-900 p-2 sm:p-3 transition-all duration-300"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none"
                  />
                </motion.div>
                <motion.button
                  type="submit"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  className="bg-gradient-to-r from-red-600 to-red-800 text-white p-2 sm:p-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
                  disabled={!newMessage.trim()}
                >
                  <FaPaperPlane className="text-lg sm:text-xl" />
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.footer
        variants={footerVariants}
        initial="hidden"
        animate="visible"
        className="bg-gradient-to-t from-black to-gray-900 py-4 sm:py-6 border-t border-gray-700 shadow-lg"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-gray-400 text-xs sm:text-sm">
          <div className="mb-2 sm:mb-0">
            <span className="font-semibold text-white">Chatify</span> © {new Date().getFullYear()} All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6">
            <motion.a
              href="/terms"
              whileHover={{ y: -2, color: '#FF1A1A' }}
              className="transition-all duration-300"
            >
              Terms of Service
            </motion.a>
            <motion.a
              href="/privacy"
              whileHover={{ y: -2, color: '#FF1A1A' }}
              className="transition-all duration-300"
            >
              Privacy Policy
            </motion.a>
            <motion.a
              href="/contact"
              whileHover={{ y: -2, color: '#FF1A1A' }}
              className="transition-all duration-300"
            >
              Contact Us
            </motion.a>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
};

export default ChatWindow;
