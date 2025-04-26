import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight, FaCheckCircle, FaSun, FaMoon, FaGoogle, FaApple, FaFingerprint, FaSpinner } from 'react-icons/fa';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../utils/api';
import Navbar from './Navbar';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loginMethod, setLoginMethod] = useState('password');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Password Login] Step 1: Initiating password login process');
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!email.trim()) {
      console.error('[Password Login] Step 2: Email is missing');
      setError('Email is required');
      setLoading(false);
      return;
    }
    if (loginMethod === 'password' && !password.trim()) {
      console.error('[Password Login] Step 2: Password is missing');
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      console.log('[Password Login] Step 3: Sending login request', { email });
      const { data } = await api.post('/auth/login', { email, password });
      console.log('[Password Login] Step 4: Login successful:', {
        userId: data.user.id,
        username: data.user.username,
        token: data.token.substring(0, 20) + '...',
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;

      console.log('[Password Login] Step 5: Setting success state');
      setSuccess(true);

      console.log('[Password Login] Step 6: Redirecting to home page in 2 seconds');
      setTimeout(() => {
        console.log('[Password Login] Step 7: Navigating to home page');
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('[Password Login] Step 8: Error during login:', {
        message: err.message,
        response: err.response?.data,
      });
      const errorMessage = err.response?.data?.msg || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      console.log('[Password Login] Step 9: Resetting loading state');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('[Google Login] Step 1: Attempting Google login');
    alert('Google login is not implemented. Please use email and password.');
  };

  const handleAppleLogin = () => {
    console.log('[Apple Login] Step 1: Attempting Apple login');
    alert('Apple login is not implemented. Please use email and password.');
  };

  const handleBiometricLogin = async () => {
    console.log('[Fingerprint Login] Step 1: Initiating fingerprint login process');
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!email.trim()) {
      console.error('[Fingerprint Login] Step 2: Email is missing');
      setError('Please enter your email to use fingerprint login');
      setLoading(false);
      return;
    }

    try {
      console.log('[Fingerprint Login] Step 3: Checking WebAuthn support');
      if (!window.PublicKeyCredential) {
        console.error('[Fingerprint Login] Step 3: WebAuthn not supported');
        throw new Error('WebAuthn is not supported in this browser.');
      }

      console.log('[Fingerprint Login] Step 4: Checking platform authenticator availability');
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        console.error('[Fingerprint Login] Step 4: Platform authenticator not available');
        throw new Error('This device does not support fingerprint authentication.');
      }

      console.log('[Fingerprint Login] Step 5: Sending authentication begin request to server', { email });
      const response = await api.post('/auth/webauthn/login/begin', { email });
      console.log('[Fingerprint Login] Step 6: Received authentication options from server:', response.data);

      if (!response.data || !response.data.publicKey || !response.data.publicKey.challenge) {
        console.error('[Fingerprint Login] Step 6: Invalid server response:', response.data);
        throw new Error('Failed to initiate fingerprint authentication: invalid server response');
      }

      console.log('[Fingerprint Login] Step 7: Starting WebAuthn authentication');
      const credential = await startAuthentication(response.data);
      console.log('[Fingerprint Login] Step 8: Credential retrieved successfully:', {
        id: credential.id,
        rawId: Buffer.from(credential.rawId).toString('base64'),
        type: credential.type,
        response: {
          authenticatorData: credential.response.authenticatorData?.substring(0, 50) + '...',
          clientDataJSON: credential.response.clientDataJSON?.substring(0, 50) + '...',
          signature: credential.response.signature?.substring(0, 50) + '...',
          userHandle: credential.response.userHandle,
        },
      });

      console.log('[Fingerprint Login] Step 9: Sending authentication complete request', { email });
      const { data } = await api.post('/auth/webauthn/login/complete', { email, credential });
      console.log('[Fingerprint Login] Step 10: Authentication completed successfully:', {
        userId: data.user.id,
        username: data.user.username,
        token: data.token.substring(0, 20) + '...',
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;

      console.log('[Fingerprint Login] Step 11: Setting success state');
      setSuccess(true);

      console.log('[Fingerprint Login] Step 12: Redirecting to home page in 2 seconds');
      setTimeout(() => {
        console.log('[Fingerprint Login] Step 13: Navigating to home page');
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('[Fingerprint Login] Step 14: Error during fingerprint login:', {
        message: err.message,
        response: err.response?.data,
      });
      let errorMessage = 'Fingerprint login failed. Please try again.';
      if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
        if (err.response.data.details) {
          errorMessage += `: ${err.response.data.details}`;
        }
      } else if (err.message) {
        errorMessage = `Fingerprint login failed: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      console.log('[Fingerprint Login] Step 15: Resetting loading state');
      setLoading(false);
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
              Welcome Back to Chatify
            </h1>
            <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
              Log in to reconnect with friends, continue your conversations, and enjoy secure messaging.
            </p>
            <div className="space-y-4 sm:space-y-6">
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Secure Login</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Fast Access</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Stay Connected</span>
              </motion.div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} className="mt-6 flex items-center space-x-4 justify-center lg:justify-start">
              <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ready to Chat?</span>
              <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
            </motion.div>
          </motion.div>
          <motion.div variants={formVariants} className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0">
            <div className={`bg-opacity-80 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} hover:shadow-[0_15px_30px_rgba(255,0,0,0.3)] transform transition-all duration-300 w-full max-w-md`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Log In to Your Account
              </h2>
              <div className="flex justify-center space-x-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('[Login Method] Step 1: Switching to password login');
                    setLoginMethod('password');
                  }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'password' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  disabled={loading}
                >
                  Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('[Login Method] Step 1: Switching to fingerprint login');
                    setLoginMethod('webauthn');
                  }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'webauthn' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  disabled={loading}
                >
                  Fingerprint
                </motion.button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 mb-4">
                <div className="relative">
                  <motion.div
                    whileHover="hover"
                    whileFocus="focus"
                    variants={inputVariants}
                    className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-400 bg-gray-100'} mb-4`}
                  >
                    <FaEnvelope className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        console.log('[Input] Step 1: Email changed:', e.target.value);
                        setEmail(e.target.value);
                      }}
                      placeholder="Your Email"
                      className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                      required
                      disabled={loading}
                    />
                  </motion.div>
                </div>
                {loginMethod === 'password' && (
                  <div className="relative">
                    <motion.div
                      whileHover="hover"
                      whileFocus="focus"
                      variants={inputVariants}
                      className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'border-gray- fingerprint login failed: No biometric credentials found for this user700 bg-gray-800' : 'border-gray-400 bg-gray-100'}`}
                    >
                      <FaLock className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          console.log('[Input] Step 1: Password changed');
                          setPassword(e.target.value);
                        }}
                        placeholder="Your Password"
                        className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                        required
                        disabled={loading}
                      />
                    </motion.div>
                  </div>
                )}
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
                      <span>Login successful! Redirecting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {loginMethod === 'password' && (
                  <motion.button
                    type="submit"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                    disabled={loading || success}
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <span>Log In Now</span>}
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleGoogleLogin}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  disabled={loading || success}
                >
                  <FaGoogle />
                  <span>Log In with Google</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleAppleLogin}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  disabled={loading || success}
                >
                  <FaApple />
                  <span>Log In with Apple</span>
                </motion.button>
                {loginMethod === 'webauthn' && (
                  <motion.button
                    type="button"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={handleBiometricLogin}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                    disabled={loading || success}
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaFingerprint />}
                    <span>{loading ? 'Waiting for Fingerprint...' : 'Log In with Fingerprint'}</span>
                  </motion.button>
                )}
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-2`}>
                <div>
                  Don't have an account? <a href="/signup" className="text-red-500 hover:underline">Sign up here</a>
                </div>
                <div>
                  Forgot your password? <a href="/forgot-password" className="text-red-500 hover:underline">Reset it here</a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <motion.div whileHover={{ scale: 1.1 }} className="fixed top-20 right-4 z-50">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-300'}`}>
            {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
          </button>
        </motion.div>
        <motion.footer
          variants={footerVariants}
          initial="hidden"
          animate="visible"
          className={`${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} py-6 border-t`}
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
    </>
  );
};

export default Login;
