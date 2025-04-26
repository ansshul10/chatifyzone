/* eslint-disable no-undef */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaUser, FaLock, FaArrowRight, FaCheckCircle, FaSun, FaMoon, FaGoogle, FaApple, FaFingerprint } from 'react-icons/fa';
import { startRegistration } from '@simplewebauthn/browser';
import api from '../utils/api';
import Navbar from './Navbar';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [signupMethod, setSignupMethod] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFingerprintSignup = async () => {
  setError('');
  setSuccess(false);
  setIsLoading(true);

  try {
    // Step 1: Validate input fields
    console.log('[Fingerprint Signup Step 1] Validating input fields:', { email, username });
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[Fingerprint Signup Step 1 Error] Email is empty or invalid');
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    if (!username.trim() || username.length < 3 || username.length > 30) {
      console.error('[Fingerprint Signup Step 1 Error] Username is empty or invalid');
      setError('Please enter a valid username (3-30 characters)');
      setIsLoading(false);
      return;
    }
    console.log('[Fingerprint Signup Step 1] Input validation passed');

    // Step 2: Send request to /webauthn/register/begin
    console.log('[Fingerprint Signup Step 2] Sending request to /webauthn/register/begin:', { email, username });
    let beginResponse;
    try {
      beginResponse = await api.post('/auth/webauthn/register/begin', { email, username });
      console.log('[Fingerprint Signup Step 2] Received response from /webauthn/register/begin:', beginResponse.data);
    } catch (apiError) {
      console.error('[Fingerprint Signup Step 2 Error] Failed to fetch WebAuthn registration options:', apiError.message);
      console.error('[Fingerprint Signup Step 2 Error] API error details:', {
        status: apiError.response?.status,
        data: apiError.response?.data,
      });
      setError(apiError.response?.data?.msg || 'Failed to start fingerprint registration. Please try again.');
      setIsLoading(false);
      return;
    }

    // Step 3: Validate WebAuthn registration options
    console.log('[Fingerprint Signup Step 3] Validating WebAuthn registration options');
    const { publicKey, challenge, userID, email: responseEmail, username: responseUsername } = beginResponse.data;
    console.log('[Fingerprint Signup Step 3] Extracted options:', { publicKey, challenge, userID, responseEmail, responseUsername });

    if (!publicKey) {
      console.error('[Fingerprint Signup Step 3 Error] Missing publicKey in API response');
      setError('Invalid server response: missing publicKey');
      setIsLoading(false);
      return;
    }
    if (!challenge) {
      console.error('[Fingerprint Signup Step 3 Error] Missing challenge in API response');
      setError('Invalid server response: missing challenge');
      setIsLoading(false);
      return;
    }
    if (!userID) {
      console.error('[Fingerprint Signup Step 3 Error] Missing userID in API response');
      setError('Invalid server response: missing userID');
      setIsLoading(false);
      return;
    }
    if (responseEmail !== email || responseUsername !== username) {
      console.error('[Fingerprint Signup Step 3 Error] Mismatch in email or username:', {
        expectedEmail: email,
        receivedEmail: responseEmail,
        expectedUsername: username,
        receivedUsername: responseUsername,
      });
      setError('Server returned incorrect email or username');
      setIsLoading(false);
      return;
    }
    console.log('[Fingerprint Signup Step 3] WebAuthn options validation passed');

    // Step 4: Start WebAuthn registration
    console.log('[Fingerprint Signup Step 4] Starting WebAuthn registration with publicKey:', publicKey);
    let credential;
    try {
      credential = await startRegistration(publicKey);
      console.log('[Fingerprint Signup Step 4] WebAuthn credential created:', credential);
    } catch (webauthnError) {
      console.error('[Fingerprint Signup Step 4 Error] Failed to create WebAuthn credential:', webauthnError.message);
      console.error('[Fingerprint Signup Step 4 Error] WebAuthn error details:', webauthnError);
      if (webauthnError.name === 'NotAllowedError') {
        setError('Fingerprint registration was cancelled or not allowed by the browser.');
      } else if (webauthnError.name === 'SecurityError') {
        setError('Security error: Ensure you’re using a secure connection (HTTPS) or localhost.');
      } else {
        setError('Failed to register fingerprint. Ensure your device supports fingerprint authentication.');
      }
      setIsLoading(false);
      return;
    }

    // Step 5: Send request to /webauthn/register/complete
    console.log('[Fingerprint Signup Step 5] Sending request to /webauthn/register/complete:', {
      email,
      username,
      challenge,
      userID,
    });
    let completeResponse;
    try {
      completeResponse = await api.post('/auth/webauthn/register/complete', {
        email,
        username,
        credential,
        challenge,
        userID,
      });
      console.log('[Fingerprint Signup Step 5] Fingerprint signup successful:', completeResponse.data);
    } catch (completeError) {
      console.error('[Fingerprint Signup Step 5 Error] Failed to complete WebAuthn registration:', completeError.message);
      console.error('[Fingerprint Signup Step 5 Error] API error details:', {
        status: completeError.response?.status,
        data: completeError.response?.data,
      });
      setError(completeError.response?.data?.msg || 'Failed to complete fingerprint registration. Please try again.');
      setIsLoading(false);
      return;
    }

    // Step 6: Store token and user data
    console.log('[Fingerprint Signup Step 6] Storing token and user data');
    try {
      localStorage.setItem('token', completeResponse.data.token);
      localStorage.setItem('user', JSON.stringify(completeResponse.data.user));
      api.defaults.headers.common['x-auth-token'] = completeResponse.data.token;
      console.log('[Fingerprint Signup Step 6] Token and user data stored successfully');
    } catch (storageError) {
      console.error('[Fingerprint Signup Step 6 Error] Failed to store token or user data:', storageError.message);
      setError('Failed to save authentication data. Please try again.');
      setIsLoading(false);
      return;
    }

    // Step 7: Update UI and redirect
    console.log('[Fingerprint Signup Step 7] Setting success state and preparing to redirect');
    setSuccess(true);
    console.log('[Fingerprint Signup Step 7] Success state set, redirecting in 2 seconds');
    setTimeout(() => {
      console.log('[Fingerprint Signup Step 7] Navigating to home page');
      navigate('/');
    }, 2000);
  } catch (unexpectedError) {
    // Step 8: Catch any unexpected errors
    console.error('[Fingerprint Signup Step 8 Error] Unexpected error during fingerprint signup:', unexpectedError.message);
    console.error('[Fingerprint Signup Step 8 Error] Full error details:', unexpectedError);
    setError('An unexpected error occurred during fingerprint signup. Please try again.');
    setIsLoading(false);
  }
};
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Password Signup] Starting password signup process');
    setError('');
    setSuccess(false);
    setIsLoading(true);

    // Validate input fields
    if (!email.trim()) {
      console.error('[Password Signup Error] Email is empty or invalid');
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    if (!username.trim()) {
      console.error('[Password Signup Error] Username is empty or invalid');
      setError('Please enter a valid username');
      setIsLoading(false);
      return;
    }
    if (signupMethod === 'password' && !password.trim()) {
      console.error('[Password Signup Error] Password is empty or invalid');
      setError('Please enter a valid password');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[Password Signup] Sending registration request:', { email, username });
      const { data } = await api.post('/auth/register', { email, username, password });
      console.log('[Password Signup] Registration successful:', data);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;

      console.log('[Password Signup] Setting success state');
      setSuccess(true);

      console.log('[Password Signup] Redirecting to home page in 2 seconds');
      setTimeout(() => {
        console.log('[Password Signup] Navigating to home page');
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('[Password Signup Error] Error during registration:', err.message);
      console.error('[Password Signup Error] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.msg || 'Password registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    console.log('[Google Signup] Attempting Google signup');
    setError('Google signup is not implemented. Please use email and password or fingerprint.');
  };

  const handleAppleSignup = () => {
    console.log('[Apple Signup] Attempting Apple signup');
    setError('Apple signup is not implemented. Please use email and password or fingerprint.');
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
              Join Chatify Today
            </h1>
            <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
              Sign up to start your seamless communication experience. Connect with friends, enjoy private messaging, and access premium features.
            </p>
            <div className="space-y-4 sm:space-y-6">
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Instant Access</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Secure Registration</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Start Chatting Instantly</span>
              </motion.div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} className="mt-6 flex items-center space-x-4 justify-center lg:justify-start">
              <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ready to Connect?</span>
              <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
            </motion.div>
          </motion.div>
          <motion.div variants={formVariants} className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0">
            <div className={`bg-opacity-80 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} hover:shadow-[0_15px_30px_rgba(255,0,0,0.3)] transform transition-all duration-300 w-full max-w-md`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Create Your Account
              </h2>
              <div className="flex justify-center space-x-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('[Signup Method] Switching to password signup');
                    setSignupMethod('password');
                  }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'password' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  disabled={isLoading}
                >
                  Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('[Signup Method] Switching to fingerprint signup');
                    setSignupMethod('webauthn');
                  }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'webauthn' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  disabled={isLoading}
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
                    className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-400 bg-gray-100'}`}
                  >
                    <FaEnvelope className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        console.log('[Input] Email changed:', e.target.value);
                        setEmail(e.target.value);
                      }}
                      placeholder="Your Email"
                      className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                      required
                      disabled={isLoading}
                    />
                  </motion.div>
                </div>
                <div className="relative">
                  <motion.div
                    whileHover="hover"
                    whileFocus="focus"
                    variants={inputVariants}
                    className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-400 bg-gray-100'}`}
                  >
                    <FaUser className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        console.log('[Input] Username changed:', e.target.value);
                        setUsername(e.target.value);
                      }}
                      placeholder="Your Username"
                      className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                      required
                      disabled={isLoading}
                    />
                  </motion.div>
                </div>
                {signupMethod === 'password' && (
                  <div className="relative">
                    <motion.div
                      whileHover="hover"
                      whileFocus="focus"
                      variants={inputVariants}
                      className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-400 bg-gray-100'}`}
                    >
                      <FaLock className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          console.log('[Input] Password changed');
                          setPassword(e.target.value);
                        }}
                        placeholder="Your Password"
                        className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                        required
                        disabled={isLoading}
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
                      <span>Signup successful! Redirecting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {signupMethod === 'password' && (
                  <motion.button
                    type="submit"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                    disabled={isLoading || success}
                  >
                    {isLoading ? 'Signing Up...' : 'Sign Up Now'}
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleGoogleSignup}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  disabled={isLoading}
                >
                  <FaGoogle />
                  <span>Sign Up with Google</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleAppleSignup}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  disabled={isLoading}
                >
                  <FaApple />
                  <span>Sign Up with Apple</span>
                </motion.button>
                {signupMethod === 'webauthn' && (
                  <motion.button
                    type="button"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={handleFingerprintSignup}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                    disabled={isLoading}
                  >
                    <FaFingerprint />
                    <span>{isLoading ? 'Processing...' : 'Sign Up with Fingerprint'}</span>
                  </motion.button>
                )}
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-2`}>
                <div>
                  Already have an account? <a href="/login" className="text-red-500 hover:underline">Log in here</a>
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

export default Signup;
