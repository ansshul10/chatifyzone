import React, { useState } from 'react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const MessageActions = ({ messageId, content, setMessages }) => {
  const [editMode, setEditMode] = useState(false);
  const [newContent, setNewContent] = useState(content);
  const userId = localStorage.getItem('anonymousId') || JSON.parse(localStorage.getItem('user'))?.id;

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

  const handleDelete = () => {
    socket.emit('deleteMessage', { messageId, sender: userId });
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
  };

  const buttonVariants = {
    hover: { scale: 1.1, transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  return (
    <div className="flex space-x-2 mt-2">
      {editMode ? (
        <>
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="p-1 border rounded bg-gray-800 border-gray-600 text-white"
          />
          <motion.button
            onClick={handleEdit}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className="text-green-500 hover:underline"
          >
            Save
          </motion.button>
          <motion.button
            onClick={() => setEditMode(false)}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className="text-red-500 hover:underline"
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
            className="text-blue-500 hover:underline"
          >
            Edit
          </motion.button>
          <motion.button
            onClick={handleDelete}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className="text-red-500 hover:underline"
          >
            Delete
          </motion.button>
        </>
      )}
    </div>
  );
};

export default MessageActions;