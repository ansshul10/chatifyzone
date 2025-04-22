import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import { FaCheck, FaUndo, FaTimes } from 'react-icons/fa';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const MessageActions = ({
  messageId,
  content,
  setMessages,
  reactions = {},
  showReactions,
  isSender,
  showMenu,
  userId,
  context = 'private',
  groupId,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [newContent, setNewContent] = useState(content);
  const [isDarkMode] = useState(true);
  const [undoVisible, setUndoVisible] = useState(false);
  const [charCount, setCharCount] = useState(content.length);
  const [reactionPreview, setReactionPreview] = useState(null);
  const inputRef = useRef(null);

  const MAX_CHARS = 500;

  // Handle edit message
  const handleModify = () => {
    if (!newContent.trim()) {
      alert('Message content cannot be empty');
      return;
    }
    if (newContent.length > MAX_CHARS) {
      alert(`Message exceeds ${MAX_CHARS} character limit`);
      return;
    }
    if (context === 'group') {
      socket.emit('editGroupMessage', { groupId, messageId, content: newContent, userId });
    } else {
      socket.emit('editMessage', { messageId, content: newContent, userId });
    }
    setEditMode(false);
  };

  // Handle unsend message with undo option
  const handleUnsend = () => {
    if (context === 'group') {
      socket.emit('deleteGroupMessage', { groupId, messageId, userId });
    } else {
      socket.emit('deleteMessage', { messageId, userId });
    }
    setUndoVisible(true);
    setTimeout(() => setUndoVisible(false), 5000);
  };

  // Handle undo unsend (simulated re-send)
  const handleUndoUnsend = () => {
    socket.emit('undoDeleteMessage', { messageId, content, userId, groupId: context === 'group' ? groupId : undefined });
    setUndoVisible(false);
  };

  // Handle reaction
  const handleReaction = (emoji) => {
    socket.emit('addReaction', { messageId, emoji, userId, groupId: context === 'group' ? groupId : undefined });
    setReactionPreview(null);
  };

  // Handle reaction preview
  const handleReactionHover = (emoji) => {
    setReactionPreview(emoji);
  };

  // Update character count
  useEffect(() => {
    setCharCount(newContent.length);
  }, [newContent]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editMode]);

  // Animation variants
  const buttonVariants = {
    hover: { scale: 1.1, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', transition: { duration: 0.2, type: 'spring', stiffness: 200 } },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.5)', transition: { duration: 0.2 } },
    focus: { scale: 1.03, boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)', transition: { duration: 0.2 } },
  };

  const reactionPickerVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, type: 'spring', stiffness: 200 } },
  };

  const reactionVariants = {
    hover: { scale: 1.3, transition: { duration: 0.2 } },
    tap: { scale: 0.9, transition: { duration: 0.1 } },
  };

  const menuVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, type: 'spring', stiffness: 200 } },
  };

  const undoVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const tooltipVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -5 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } },
  };

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢'];

  return (
    <div className="relative mt-2 font-sans">
      {/* Edit Mode */}
      {editMode && isSender && (
        <div className="flex flex-col space-y-2">
          <motion.div className="relative">
            <motion.input
              ref={inputRef}
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value.slice(0, MAX_CHARS))}
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
              className={`w-full p-2 rounded-xl text-sm border bg-gray-900/30 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none ${
                charCount > MAX_CHARS ? 'border-red-500' : 'border-gray-700/50'
              }`}
              placeholder="Edit your message..."
              aria-label="Edit message"
            />
            <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs ${charCount > MAX_CHARS ? 'text-red-400' : 'text-gray-400'}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </motion.div>
          <div className="flex space-x-2">
            <motion.button
              onClick={handleModify}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="flex-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm hover:from-blue-600 hover:to-indigo-600 focus:outline-none"
              aria-label="Save edited message"
            >
              <FaCheck className="inline mr-1" /> Save
            </motion.button>
            <motion.button
              onClick={() => setEditMode(false)}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="flex-1 px-3 py-1.5 rounded-xl bg-gray-700/50 text-white text-sm hover:bg-gray-600 focus:outline-none"
              aria-label="Cancel edit"
            >
              <FaTimes className="inline mr-1" /> Cancel
            </motion.button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {isSender && showMenu && !editMode && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute bg-gray-900/30 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl p-2 z-20"
            style={{ top: '100%', right: 0 }}
            role="menu"
            aria-label="Message actions"
          >
            <motion.button
              onClick={() => setEditMode(true)}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="relative flex w-full text-left px-3 py-1.5 text-sm text-blue-400 hover:bg-gray-700/50 rounded-lg"
              role="menuitem"
              aria-label="Modify message"
            >
              Modify
              <motion.div
                variants={tooltipVariants}
                initial="hidden"
                whileHover="visible"
                className="absolute left-full ml-2 bg-gray-800/90 text-white text-xs rounded px-2 py-1"
              >
                Edit your message
              </motion.div>
            </motion.button>
            <motion.button
              onClick={handleUnsend}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="relative flex w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700/50 rounded-lg"
              role="menuitem"
              aria-label="Unsend message"
            >
              Unsend
              <motion.div
                variants={tooltipVariants}
                initial="hidden"
                whileHover="visible"
                className="absolute left-full ml-2 bg-gray-800/90 text-white text-xs rounded px-2 py-1"
              >
                Remove message for everyone
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            variants={reactionPickerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="relative flex space-x-1.5 mt-2 p-2 rounded-xl bg-gray-900/30 backdrop-blur-md border border-gray-700/50"
            role="toolbar"
            aria-label="Reaction picker"
          >
            {reactionEmojis.map((emoji) => (
              <motion.button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                onMouseEnter={() => handleReactionHover(emoji)}
                onMouseLeave={() => setReactionPreview(null)}
                variants={reactionVariants}
                whileHover="hover"
                whileTap="tap"
                className="text-lg text-gray-300 hover:text-yellow-400 focus:outline-none"
                title={`React with ${emoji}`}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </motion.button>
            ))}
            {reactionPreview && (
              <motion.div
                className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800/90 rounded-full px-2 py-1 text-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0 }}
              >
                {reactionPreview}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction Counter */}
      {Object.keys(reactions).length > 0 && (
        <motion.div
          className="flex flex-wrap gap-1 mt-1 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Object.entries(reactions).map(([emoji, count]) => (
            <motion.button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="px-1.5 py-0.5 bg-gray-800/50 rounded-full hover:bg-gray-700/50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Toggle ${emoji} reaction`}
            >
              {emoji} {count}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Undo Notification */}
      <AnimatePresence>
        {undoVisible && (
          <motion.div
            variants={undoVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white text-sm px-4 py-2 rounded-xl flex items-center space-x-2"
          >
            <span>Message unsent</span>
            <motion.button
              onClick={handleUndoUnsend}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="text-blue-400 hover:text-blue-300"
              aria-label="Undo unsend"
            >
              <FaUndo className="inline mr-1" /> Undo
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageActions;
