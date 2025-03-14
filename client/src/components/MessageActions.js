import React, { useState } from 'react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const MessageActions = ({ messageId, content, setMessages }) => {
  const [editMode, setEditMode] = useState(false);
  const [newContent, setNewContent] = useState(content);
  const [isDarkMode, setIsDarkMode] = useState(true); // Local theme state (can be inherited from parent)
  const userId = localStorage.getItem('anonymousId') || JSON.parse(localStorage.getItem('user'))?.id;

  // Handle edit message
  const handleEdit = () => {
    if (!newContent.trim()) {
      alert('Message content cannot be empty');
      return;
    }
    socket.emit('editMessage', { messageId, content: newContent, sender: userId });
    setMessages((prev) =>
      prev.map((msg) => (msg._id === messageId ? { ...msg, content: newContent, edited: true } : msg))
    );
    setEditMode(false);
  };

  // Handle delete message
  const handleDelete = () => {
    socket.emit('deleteMessage', { messageId, sender: userId });
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
  };

  // Animation variants
  const buttonVariants = {
    hover: { scale: 1.1, transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: '#FF0000', transition: { duration: 0.3 } },
    focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)', transition: { duration: 0.3 } },
  };

  return (
    <div className="flex space-x-2 mt-2">
      {editMode ? (
        <>
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
            onClick={handleEdit}
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
        </>
      ) : (
        <>
          <motion.button
            onClick={() => setEditMode(true)}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
          >
            Edit
          </motion.button>
          <motion.button
            onClick={handleDelete}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className={`${isDarkMode ? 'text-red-400' : 'text-red-600'} hover:underline`}
          >
            Delete
          </motion.button>
        </>
      )}
    </div>
  );
};

export default MessageActions;
