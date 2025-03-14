import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight, FaCheckCircle, FaKey } from 'react-icons/fa';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const { data } = await api.post('/auth/login', { email, password }); // Fixed endpoint
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user)); // Store user object
      api.defaults.headers.common['x-auth-token'] = data.token; // Set token for authenticated requests
      setSuccess(true);
      setTimeout(() => navigate('/chat'), 2000); // Redirect to chat after 2 seconds
    } catch (err) {
      setError(err.response?.data.msg || 'Invalid credentials');
    }
  };

  // Animation variants (unchanged)
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
    hover: { scale: 1.1, backgroundColor: '#1A1A1A', transition: { duration: 0.3 } },
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
      className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col justify-between pt-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-grow">
        {/* Left Side - Text Content */}
        <motion.div
          variants={textVariants}
          className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left">
            Welcome Back to Chatify
          </h1>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed text-center lg:text-left">
            Log in to continue your seamless communication experience. Connect with friends, enjoy private messaging, and access premium features.
          </p>
          <div className="space-y-4 sm:space-y-6">
            <motion.div
              whileHover={{ x: 10, color: '#FF0000' }}
              className="flex items-center space-x-4 justify-center lg:justify-start"
            >
              <FaCheckCircle className="text-red-500" />
              <span>Quick Access</span>
            </motion.div>
            <motion.div
              whileHover={{ x: 10, color: '#FF0000' }}
              className="flex items-center space-x-4 justify-center lg:justify-start"
            >
              <FaCheckCircle className="text-red-500" />
              <span>Secure Login</span>
            </motion.div>
            <motion.div
              whileHover={{ x: 10, color: '#FF0000' }}
              className="flex items-center space-x-4 justify-center lg:justify-start"
            >
              <FaCheckCircle className="text-red-500" />
              <span>Resume Chatting Instantly</span>
            </motion.div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="mt-6 flex items-center space-x-4 justify-center lg:justify-start"
          >
            <span className="text-lg sm:text-xl font-semibold">Ready to Connect?</span>
            <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
          </motion.div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-6 w-12 h-12 bg-red-500 opacity-20 rounded-full blur-md mx-auto lg:mx-0"
          />
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          variants={formVariants}
          className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0"
        >
          <div className="w-full max-w-md bg-black bg-opacity-80 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-800">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">
              Log In to Your Account
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div className="relative">
                <motion.div
                  whileHover="hover"
                  whileFocus="focus"
                  variants={inputVariants}
                  className="flex items-center border border-gray-700 rounded-lg bg-gray-800 p-3"
                >
                  <FaEnvelope className="text-gray-400 mr-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your Email"
                    className="w-full bg-transparent text-white focus:outline-none"
                    required
                  />
                </motion.div>
              </div>
              {/* Password Input */}
              <div className="relative">
                <motion.div
                  whileHover="hover"
                  whileFocus="focus"
                  variants={inputVariants}
                  className="flex items-center border border-gray-700 rounded-lg bg-gray-800 p-3"
                >
                  <FaLock className="text-gray-400 mr-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your Password"
                    className="w-full bg-transparent text-white focus:outline-none"
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
                    <span>Login successful! Redirecting...</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover="hover"
                whileTap="tap"
                variants={buttonVariants}
                className="w-full bg-gradient-to-r from-custom-dark to-black text-red-600 p-4 rounded-lg font-semibold shadow-lg"
                disabled={success}
              >
                Log In Now
              </motion.button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
              <div>
                <a href="/forgot-password" className="text-red-500 hover:underline flex items-center justify-center space-x-1">
                  <FaKey className="text-sm" />
                  <span>Forgot Password?</span>
                </a>
              </div>
              <div>
                Don’t have an account?{' '}
                <a href="/signup" className="text-red-500 hover:underline">Sign up here</a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
            <motion.footer
              variants={footerVariants}
              initial="hidden"
              animate="visible"
              className="bg-black bg-opacity-90 py-6 border-t border-gray-800"
            >
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-gray-400 text-sm">
                <div className="mb-4 sm:mb-0">
                  <span className="font-semibold text-white">Chatify</span> © {new Date().getFullYear()} All rights reserved.
                </div>
                <div className="flex space-x-6">
                  <a href="/terms" className="hover:text-red-500 transition-colors">Terms of Service</a>
                  <a href="/privacy" className="hover:text-red-500 transition-colors">Privacy Policy</a>
                  <a href="/contact" className="hover:text-red-500 transition-colors">Contact Us</a>
                </div>
              </div>
            </motion.footer>

      {/* Decorative Elements (simplified for brevity) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-20 left-10 w-16 h-16 bg-red-500 opacity-20 rounded-full blur-xl hidden lg:block"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-20 right-10 w-24 h-24 bg-red-500 opacity-20 rounded-full blur-xl hidden lg:block"
      />
    </motion.div>
  );
};

export default Login;