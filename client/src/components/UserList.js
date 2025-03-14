import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const UserList = ({ users, setSelectedUserId, currentUserId, unreadMessages }) => {
  const itemVariants = {
    hover: { scale: 1.05, backgroundColor: '#374151', transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const listVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const notificationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  useEffect(() => {
    console.log('UserList received users:', users);
    console.log('Unread messages:', unreadMessages);
    users.forEach(user => {
      if (!user.username) console.error('User with no username:', user);
    });
  }, [users, unreadMessages]);

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-800 to-black bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl border border-gray-700 p-4 sm:p-6 h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-800"
    >
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-center text-white bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
        Users 👥
      </h2>
      <ul className="space-y-2 sm:space-y-3">
        {users.length === 0 ? (
          <li className="text-gray-400 text-center text-sm sm:text-base">No users available yet 🌐</li>
        ) : (
          users
            .filter((user) => user.id !== currentUserId && user.username && user.id)
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
                  <span className={`text-xs sm:text-sm ${user.online ? 'text-green-500' : 'text-gray-500'}`}>
                    ●
                  </span>
                  <span className="text-sm sm:text-base truncate">
                    {user.username}{' '}
                    <span className="text-xs text-gray-400">
                      {user.isAnonymous ? '(Anon)' : '(Reg)'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {unreadMessages[user.id] > 0 && (
                    <motion.span
                      variants={notificationVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-xs text-white bg-red-600 px-2 py-1 rounded-full"
                    >
                      New Message ({unreadMessages[user.id]})
                    </motion.span>
                  )}
                  <span className="text-xs text-gray-400">
                    {user.online ? 'Online' : 'Offline'}
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
