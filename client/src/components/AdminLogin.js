/* eslint-disable no-undef */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import api from '../utils/api';
import Navbar from './Navbar';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    // Validate input fields
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }
    if (!adminSecret.trim()) {
      setError('Please enter the admin secret key');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/auth/admin/login', {
        email,
        password,
        adminSecret,
      });

      // Ensure user and token exist in response
      if (!data.user || !data.token) {
        throw new Error('Invalid response from server');
      }

      // Store data in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Set Authorization header for future requests
      api.defaults.headers.common['x-auth-token'] = data.token;

      setSuccess(true);
      setTimeout(() => navigate('/admin/panel'), 2000);
    } catch (err) {
      console.error('[AdminLogin] Login error:', err);
      setError(err.response?.data?.msg || 'Admin login failed. Please try again.');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };

  const textVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  const successVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <>
      <Navbar />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col justify-between pt-20`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-grow">
          <motion.div
            variants={textVariants}
            className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
          >
            <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Admin Login to Chatify
            </h1>
            <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
              Log in as an admin to manage users, send newsletters, and oversee Chatify operations.
            </p>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Secure Admin Access</span>
              </div>
              <div className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Manage Newsletter</span>
              </div>
              <div className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Control User Accounts</span>
              </div>
            </div>
            <div className="mt-6 flex items-center space-x-4 justify-center lg:justify-start">
              <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Ready to Manage?
              </span>
              <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
            </div>
          </motion.div>
          <motion.div
            variants={formVariants}
            className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0"
          >
            <div
              className={`bg-opacity-80 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border ${
                isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'
              } w-full max-w-md`}
            >
              <h2
                className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Admin Login
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4 mb-4">
                <div className="relative">
                  <div
                    className={`flex items-center border rounded-lg p-3 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'
                    }`}
                  >
                    <FaEnvelope className={`${isDarkMode ? 'text-red-600' : 'text-red-500'} mr-3`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Admin Email"
                      className={`w-full ${
                        isDarkMode ? 'bg-[#1A1A1A] text-white placeholder-gray-400' : 'bg-gray-300 text-black placeholder-gray-600'
                      } focus:outline-none ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="relative">
                  <div
                    className={`flex items-center border rounded-lg p-3 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'
                    }`}
                  >
                    <FaLock className={`${isDarkMode ? 'text-red-600' : 'text-red-500'} mr-3`} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Admin Password"
                      className={`w-full ${
                        isDarkMode ? 'bg-[#1A1A1A] text-white placeholder-gray-400' : 'bg-gray-300 text-black placeholder-gray-600'
                      } focus:outline-none ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="relative">
                  <div
                    className={`flex items-center border rounded-lg p-3 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-300 border-gray-400'
                    }`}
                  >
                    <FaLock className={`${isDarkMode ? 'text-red-600' : 'text-red-500'} mr-3`} />
                    <input
                      type="text"
                      value={adminSecret}
                      onChange={(e) => setAdminSecret(e.target.value)}
                      placeholder="Admin Secret Key"
                      className={`w-full ${
                        isDarkMode ? 'bg-[#1A1A1A] text-white placeholder-gray-400' : 'bg-gray-300 text-black placeholder-gray-600'
                      } focus:outline-none ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-500 text-sm text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {success && (
                    <motion.div
                      variants={successVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="text-green-500 text-sm text-center flex items-center justify-center space-x-2"
                    >
                      <FaCheckCircle />
                      <span>Admin login successful! Redirecting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  type="submit"
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${
                    isDarkMode
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  } flex items-center justify-center space-x-2 transition-colors duration-300`}
                  disabled={isLoading || success}
                >
                  <span>{isLoading ? 'Logging In...' : 'Log In as Admin'}</span>
                </button>
              </form>
              <div
                className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                Not an admin yet?{' '}
                <a href="/admin/signup" className="text-red-500 hover:underline">
                  Sign up
                </a>
              </div>
            </div>
          </motion.div>
        </div>
        <motion.footer
          variants={containerVariants}
          className={`py-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
        >
          © {new Date().getFullYear()} Chatify. All rights reserved.
        </motion.footer>
      </motion.div>
    </>
  );
};

export default AdminLogin;