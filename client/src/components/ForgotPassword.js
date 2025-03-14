import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt'; // Import Tilt for parallax effect
import { FaEnvelope, FaArrowRight, FaCheckCircle, FaSun, FaMoon } from 'react-icons/fa';
import api from '../utils/api';
import Navbar from './Navbar';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Theme state
  const navigate = useNavigate();

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3 seconds
    } catch (err) {
      setError(err.response?.data.msg || 'Something went wrong');
    }
  };

  // Animation variants
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

  const inputVariants = {
    hover: { scale: 1.02, borderColor: '#FF0000', transition: { duration: 0.3 } },
    focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)' },
  };

  const buttonVariants = {
    hover: { scale: 1.1, backgroundColor: isDarkMode ? '#1A1A1A' : '#d1d5db', transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const successVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col pt-20`}
    >
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-grow">
        {/* Left Side - Text Content */}
        <motion.div
          variants={textVariants}
          className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
        >
          <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Reset Your Password
          </h1>
          <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
            Enter your email address to receive a password reset link. We’ll help you get back to chatting in no time!
          </p>
          <div className="space-y-4 sm:space-y-6">
            <motion.div
              whileHover={{ x: 10 }}
              className="flex items-center space-x-4 justify-center lg:justify-start"
            >
              <FaCheckCircle className="text-red-500" />
              <span>Enter your registered email</span>
            </motion.div>
            <motion.div
              whileHover={{ x: 10 }}
              className="flex items-center space-x-4 justify-center lg:justify-start"
            >
              <FaCheckCircle className="text-red-500" />
              <span>Check your inbox for reset link</span>
            </motion.div>
            <motion.div
              whileHover={{ x: 10 }}
              className="flex items-center space-x-4 justify-center lg:justify-start"
            >
              <FaCheckCircle className="text-red-500" />
              <span>Securely reset your password</span>
            </motion.div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="mt-6 flex items-center space-x-4 justify-center lg:justify-start"
          >
            <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ready to Reset?</span>
            <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
          </motion.div>
        </motion.div>

        {/* Right Side - Forgot Password Form with Tilt Effect */}
        <motion.div
          variants={formVariants}
          className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0"
        >
          <Tilt tiltMaxAngleX={20} tiltMaxAngleY={20} perspective={1000} className="w-full max-w-md">
            <div className={`bg-opacity-80 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} hover:shadow-[0_15px_30px_rgba(255,0,0,0.3)] transform transition-all duration-300`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Forgot Password
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div className="relative">
                  <motion.div
                    whileHover="hover"
                    whileFocus="focus"
                    variants={inputVariants}
                    className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-400 bg-gray-100'}`}
                  >
                    <FaEnvelope className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email"
                      className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                      required
                    />
                  </motion.div>
                </div>
                {/* Error Message */}
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
                {/* Success Message */}
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
                      <span>Reset link sent! Redirecting to login...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                  disabled={success}
                >
                  <span>Send Reset Link</span>
                  <FaArrowRight />
                </motion.button>
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-2`}>
                <div>
                  Remembered your password?{' '}
                  <a href="/login" className="text-red-500 hover:underline">Login here</a>
                </div>
                <div>
                  Don’t have an account?{' '}
                  <a href="/signup" className="text-red-500 hover:underline">Sign up here</a>
                </div>
              </div>
            </div>
          </Tilt>
        </motion.div>
      </div>

      {/* Theme Toggle */}
      <motion.div whileHover={{ scale: 1.1 }} className="fixed top-20 right-4 z-50">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-300'}`}>
          {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
        </button>
      </motion.div>

      {/* Footer */}
      <motion.footer
        variants={footerVariants}
        initial="hidden"
        animate="visible"
        className={`${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'} py-6 border-t`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm">
          <div className={`mb-4 sm:mb-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Chatify</span> © {new Date().getFullYear()} All rights reserved.
          </div>
          <div className={`flex space-x-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <a href="/terms" className="hover:text-red-500 transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-red-500 transition-colors">Privacy Policy</a>
            <a href="/contact" className="hover:text-red-500 transition-colors">Contact Us</a>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
};

export default ForgotPassword;
