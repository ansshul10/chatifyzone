import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import verifiedIcon from '../assets/verified.png'; // Adjust path as needed

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
    users.forEach((user) => {
      if (!user.username) console.error('User with no username:', user);
    });
  }, [users, unreadMessages]);

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto bg-gradient-to-b from-black to-black bg-opacity-90 backdrop-blur-md shadow-xl border border-gray-700 p-6 sm:p-4 h-full flex flex-col"
    >
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-center text-white bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
        Users 👥
      </h2>

      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-800 space-y-2 sm:space-y-3">
        {users.length === 0 ? (
          <div className="text-gray-400 text-center text-sm sm:text-base">No users available yet 🌐</div>
        ) : (
          users
            .filter((user) => user.id !== currentUserId && user.username && user.id)
            .map((user) => (
              <motion.div
                key={user.id}
                variants={itemVariants}
                whileTap="tap"
                className="p-2 sm:p-3 rounded-lg cursor-pointer text-gray-200 bg-gray-900 hover:bg-gray-700 transition-colors duration-300 flex items-center justify-between"
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className="flex items-center space-x-2">
                  <span className={`text-xs sm:text-sm ${user.online ? 'text-green-500' : 'text-gray-500'}`}>
                    ●
                  </span>
                  <span className="text-sm sm:text-base truncate flex items-center">
                    {user.username}{' '}
                    {user.isAnonymous ? (
                      <span className="text-xs text-gray-400 ml-1">(Anon)</span>
                    ) : (
                      <img
                        src={verifiedIcon}
                        alt="Verified"
                        className="w-4 h-4 ml-1"
                      />
                    )}
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
              </motion.div>
            ))
        )}
      </div>
      <div className="mt-4 pt-4 border-gray-700 text-center text-xs sm:text-sm text-gray-400">
        © 2025 Chatify | All Rights Reserved
      </div>
    </motion.div>
  );
};

export default UserList;
