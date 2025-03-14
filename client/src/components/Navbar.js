import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes, FaUser, FaSignOutAlt } from 'react-icons/fa';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const anonymousId = localStorage.getItem('anonymousId');
  const user = token ? JSON.parse(localStorage.getItem('user')) : null;
  const anonymousUsername = anonymousId ? localStorage.getItem('anonymousUsername') : null;
  const displayName = user?.username || anonymousUsername || null;
  const userId = user?.id || anonymousId;

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    if (userId) {
      socket.emit('logout', userId); // Notify server of logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('anonymousId');
    localStorage.removeItem('anonymousUsername');
    socket.disconnect(); // Disconnect Socket.IO
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const navbarVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } },
  };

  const menuVariants = {
    closed: { opacity: 0, height: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
    open: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } },
  };

  const linkVariants = {
    hover: { scale: 1.1, color: '#FF0000', transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  const iconVariants = {
    hover: { rotate: 15, scale: 1.2, transition: { duration: 0.2 } },
  };

  return (
    <motion.nav
      initial="hidden"
      animate="visible"
      variants={navbarVariants}
      className={`fixed top-0 left-0 w-full z-50 bg-black text-white shadow-lg transition-all duration-300 ${
        scrollY > 50 ? 'py-2' : 'py-4'
      }`}
      style={{
        background: 'linear-gradient(90deg, #1A1A1A 0%, #000000 100%)',
        boxShadow: scrollY > 50 ? '0 4px 15px rgba(255, 0, 0, 0.2)' : '0 2px 10px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <motion.div
            whileHover={{ rotate: 360, transition: { duration: 0.5 } }}
            className="text-2xl font-extrabold tracking-tight"
          >
            Chatify
          </motion.div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-sm text-red-600"
          >
            Premium
          </motion.span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
            <Link to="/" className="text-lg font-medium hover:text-red-500 transition-colors">
              Home
            </Link>
          </motion.div>

          {/* Show Guest Chat only if not logged in */}
          {!token && !anonymousId && (
            <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
              <Link to="/anonymous" className="text-lg font-medium hover:text-red-500 transition-colors">
                Guest Chat
              </Link>
            </motion.div>
          )}

          {token || anonymousId ? (
            <div className="relative">
              <motion.div
                whileHover="hover"
                variants={iconVariants}
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <FaUser className="text-xl" />
                <span className="text-lg font-medium">{displayName}</span>
              </motion.div>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={dropdownVariants}
                    className="absolute right-0 mt-2 w-48 bg-black border border-gray-800 rounded-lg shadow-xl p-4"
                  >
                    <div className="flex flex-col space-y-3">
                      <motion.div
                        whileHover={{ x: 5, color: '#FF0000' }}
                        onClick={handleLogout}
                        className="flex items-center space-x-2 text-sm cursor-pointer"
                      >
                        <FaSignOutAlt />
                        <span>Logout</span>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex space-x-6">
              <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
                <Link to="/signup" className="text-lg font-medium hover:text-red-500 transition-colors">
                  Signup
                </Link>
              </motion.div>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <motion.div
          className="md:hidden flex items-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white focus:outline-none"
          >
            {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </motion.div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="md:hidden bg-black border-t border-gray-800 px-4 py-6"
          >
            <div className="flex flex-col space-y-6">
              <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium hover:text-red-500 transition-colors"
                >
                  Home
                </Link>
              </motion.div>

              {/* Show Guest Chat only if not logged in */}
              {!token && !anonymousId && (
                <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
                  <Link
                    to="/anonymous"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-medium hover:text-red-500 transition-colors"
                  >
                    Guest Chat
                  </Link>
                </motion.div>
              )}

              {token || anonymousId ? (
                <div className="space-y-4">
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="flex items-center space-x-2 text-lg font-medium"
                  >
                    <FaUser />
                    <span>{displayName}</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ x: 5, color: '#FF0000' }}
                    onClick={handleLogout}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <FaSignOutAlt />
                    <span>Logout</span>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
                    <Link
                      to="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-lg font-medium hover:text-red-500 transition-colors"
                    >
                      Signup
                    </Link>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;