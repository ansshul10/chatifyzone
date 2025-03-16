import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const MessageActions = ({ messageId, content, setMessages, reactions = {}, showReactions, isSender, showMenu, userId }) => {
  const [editMode, setEditMode] = useState(false);
  const [newContent, setNewContent] = useState(content);
  const [isDarkMode] = useState(true); // Assuming dark mode is default, adjust if needed

  const handleModify = () => {
    if (!newContent.trim()) {
      alert('Message content cannot be empty');
      return;
    }
    socket.emit('editMessage', { messageId, content: newContent, userId });
    setEditMode(false);
  };

  const handleUnsend = () => {
    socket.emit('deleteMessage', { messageId, userId });
  };

  const handleReaction = (emoji) => {
    socket.emit('addReaction', { messageId, emoji, userId });
  };

  const buttonVariants = {
    hover: { scale: 1.1, transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: '#FF0000', transition: { duration: 0.3 } },
    focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)', transition: { duration: 0.3 } },
  };

  const reactionPickerVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
  };

  const reactionVariants = {
    hover: { scale: 1.2, transition: { duration: 0.2 } },
    tap: { scale: 0.9 },
  };

  const menuVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } },
  };

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢'];

  return (
    <div className="mt-2 relative">
      {editMode && isSender && (
        <div className="flex space-x-2">
          <motion.input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
            className={`p-1 border rounded w-full ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-100 border-gray-400 text-gray-900'} focus:outline-none`}
          />
          <motion.button
            onClick={handleModify}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className={`px-2 py-1 rounded ${isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'} hover:bg-green-700`}
          >
            Save
          </motion.button>
          <motion.button
            onClick={() => setEditMode(false)}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className={`px-2 py-1 rounded ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'} hover:bg-red-700`}
          >
            Cancel
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isSender && showMenu && !editMode && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`absolute ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-200 border-gray-400'} border rounded-lg shadow-lg p-2 z-10`}
            style={{ top: '100%', right: 0 }}
          >
            <motion.button
              onClick={() => setEditMode(true)}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className={`w-full text-left px-2 py-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} hover:bg-gray-700 rounded`}
            >
              Modify
            </motion.button>
            <motion.button
              onClick={handleUnsend}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className={`w-full text-left px-2 py-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'} hover:bg-gray-700 rounded`}
            >
              Unsend
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReactions && (
          <motion.div
            variants={reactionPickerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`flex space-x-2 mt-2 p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}
          >
            {reactionEmojis.map((emoji) => (
              <motion.button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                variants={reactionVariants}
                whileHover="hover"
                whileTap="tap"
                className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-yellow-500`}
                title={`React with ${emoji}`}
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {Object.keys(reactions).length > 0 && (
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
          {Object.entries(reactions).map(([emoji, count]) => (
            <span key={emoji} className="mr-2">
              {emoji} {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
