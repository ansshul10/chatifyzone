import React from 'react';
import { motion } from 'framer-motion';

const UserList = ({ users, setSelectedUserId, currentUserId }) => {
  const itemVariants = {
    hover: { scale: 1.05, backgroundColor: '#374151', transition: { duration: 0.3 } }, // Gray-700
    tap: { scale: 0.95 },
  };

  const listVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-800 to-black bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl border border-gray-700 p-4 sm:p-6 h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-800"
    >
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-center text-white bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
        Online Users 👥
      </h2>
      <ul className="space-y-2 sm:space-y-3">
        {users.length === 0 ? (
          <li className="text-gray-400 text-center text-sm sm:text-base">No users online yet 🌐</li>
        ) : (
          users
            .filter((user) => user.id !== currentUserId)
            .map((user) => (
              <motion.li
                key={user.id}
                variants={itemVariants}
                whileHover="hover"
                whileTap="tap"
                className="p-2 sm:p-3 rounded-lg cursor-pointer text-gray-200 bg-gray-900 hover:bg-gray-700 transition-colors duration-300 flex items-center justify-between"
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-green-500 text-xs sm:text-sm">●</span>
                  <span className="text-sm sm:text-base truncate">
                    {user.username}{' '}
                    <span className="text-xs text-gray-400">
                      {user.isAnonymous ? '(Anon)' : '(Reg)'}
                    </span>
                  </span>
                </div>
              </motion.li>
            ))
        )}
      </ul>
    </motion.div>
  );
};

export default UserList;