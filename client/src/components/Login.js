/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight, FaCheckCircle, FaGoogle, FaApple, FaFingerprint } from 'react-icons/fa';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../utils/api';
import Navbar from './Navbar';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loginMethod, setLoginMethod] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const navigate = useNavigate();

  // Check WebAuthn support on component mount
  useEffect(() => {
    console.log('[Login] Checking WebAuthn support');
    const checkWebAuthnSupport = async () => {
      try {
        if (window.PublicKeyCredential) {
          const isSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          console.log('[Login] WebAuthn support check result:', isSupported);
          setIsWebAuthnSupported(isSupported);
          if (!isSupported) {
            console.warn('[Login] WebAuthn is not supported on this device');
          }
        } else {
          console.warn('[Login] WebAuthn API not available in this browser');
          setIsWebAuthnSupported(false);
        }
      } catch (err) {
        console.error('[Login] Error checking WebAuthn support:', err.message);
        setIsWebAuthnSupported(false);
      }
    };
    checkWebAuthnSupport();
  }, []);

  const handleBiometricLogin = async () => {
    console.log('[Fingerprint Login] Starting fingerprint login process');
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      // Step 1: Check WebAuthn support
      console.log('[Fingerprint Login Step 1] Verifying WebAuthn support');
      if (!isWebAuthnSupported) {
        console.error('[Fingerprint Login Step 1 Error] WebAuthn not supported');
        setError('Fingerprint authentication is not supported on this device or browser.');
        setIsLoading(false);
        return;
      }
      console.log('[Fingerprint Login Step 1] WebAuthn support verified');

      // Step 2: Validate email
      console.log('[Fingerprint Login Step 2] Validating email:', { email });
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('[Fingerprint Login Step 2 Error] Email is empty or invalid');
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
      console.log('[Fingerprint Login Step 2] Email validation passed');

      // Step 3: Send request to /webauthn/login/begin
      console.log('[Fingerprint Login Step 3] Sending request to /auth/webauthn/login/begin:', { email });
      let beginResponse;
      try {
        beginResponse = await api.post('/auth/webauthn/login/begin', { email });
        console.log('[Fingerprint Login Step 3] Received response from /auth/webauthn/login/begin:', beginResponse.data);
      } catch (apiError) {
        console.error('[Fingerprint Login Step 3 Error] Failed to fetch WebAuthn authentication options:', apiError.message);
        console.error('[Fingerprint Login Step 3 Error] API error details:', {
          status: apiError.response?.status,
          data: apiError.response?.data,
        });
        setError(apiError.response?.data?.msg || 'Failed to start fingerprint authentication. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }

      // Step 4: Validate WebAuthn authentication options
      console.log('[Fingerprint Login Step 4] Validating WebAuthn authentication options');
      const { publicKey } = beginResponse.data;
      console.log('[Fingerprint Login Step 4] Extracted options:', { publicKey });

      if (!publicKey || !publicKey.challenge) {
        console.error('[Fingerprint Login Step 4 Error] Invalid publicKey structure in API response');
        setError('Invalid server response: missing or malformed WebAuthn options');
        setIsLoading(false);
        return;
      }
      console.log('[Fingerprint Login Step 4] WebAuthn options validation passed');

      // Step 5: Start WebAuthn authentication
      console.log('[Fingerprint Login Step 5] Starting WebAuthn authentication with publicKey:', publicKey);
      let credential;
      try {
        credential = await startAuthentication(publicKey);
        console.log('[Fingerprint Login Step 5] WebAuthn credential retrieved:', credential);
      } catch (webauthnError) {
        console.error('[Fingerprint Login Step 5 Error] Failed to authenticate with WebAuthn:', webauthnError.message);
        console.error('[Fingerprint Login Step 5 Error] WebAuthn error details:', webauthnError);
        if (webauthnError.name === 'NotSupportedError') {
          setError('Your device does not support fingerprint authentication.');
        } else if (webauthnError.name === 'NotAllowedError') {
          setError('Fingerprint authentication was cancelled or not allowed. Please try again.');
        } else if (webauthnError.name === 'SecurityError') {
          setError('Security error: Ensure you’re using a secure connection (HTTPS) and try again.');
        } else if (webauthnError.name === 'InvalidStateError') {
          setError('Invalid state: Please try again or use password login.');
        } else {
          setError(`Failed to authenticate with fingerprint: ${webauthnError.message}. Please try again.`);
        }
        setIsLoading(false);
        return;
      }

      // Step 6: Send request to /webauthn/login/complete
      console.log('[Fingerprint Login Step 6] Sending request to /auth/webauthn/login/complete:', { email, credential });
      let completeResponse;
      try {
        completeResponse = await api.post('/auth/webauthn/login/complete', { email, credential });
        console.log('[Fingerprint Login Step 6] Fingerprint login successful:', completeResponse.data);
      } catch (completeError) {
        console.error('[Fingerprint Login Step 6 Error] Failed to complete WebAuthn authentication:', completeError.message);
        console.error('[Fingerprint Login Step 6 Error] API error details:', {
          status: completeError.response?.status,
          data: completeError.response?.data,
        });
        setError(completeError.response?.data?.msg || 'Failed to complete fingerprint authentication. Please try again.');
        setIsLoading(false);
        return;
      }

      // Step 7: Store token and user data
      console.log('[Fingerprint Login Step 7] Storing token and user data');
      try {
        localStorage.setItem('token', completeResponse.data.token);
        localStorage.setItem('user', JSON.stringify(completeResponse.data.user));
        api.defaults.headers.common['x-auth-token'] = completeResponse.data.token;
        console.log('[Fingerprint Login Step 7] Token and user data stored successfully');
      } catch (storageError) {
        console.error('[Fingerprint Login Step 7 Error] Failed to store token or user data:', storageError.message);
        setError('Failed to save authentication data. Please try again.');
        setIsLoading(false);
        return;
      }

      // Step 8: Update UI and redirect
      console.log('[Fingerprint Login Step 8] Setting success state and preparing to redirect');
      setSuccess(true);
      console.log('[Fingerprint Login Step 8] Success state set, redirecting in 2 seconds');
      setTimeout(() => {
        console.log('[Fingerprint Login Step 8] Navigating to home page');
        navigate('/');
      }, 2000);
    } catch (unexpectedError) {
      // Step 9: Catch any unexpected errors
      console.error('[Fingerprint Login Step 9 Error] Unexpected error during fingerprint login:', unexpectedError.message);
      console.error('[Fingerprint Login Step 9 Error] Full error details:', unexpectedError);
      setError('An unexpected error occurred during fingerprint login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Password Login] Starting password login process');
    setError('');
    setSuccess(false);
    setIsLoading(true);

    // Validate input fields
    console.log('[Password Login] Validating input fields:', { email, password });
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[Password Login Error] Email is empty or invalid');
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    if (loginMethod === 'password' && !password.trim()) {
      console.error('[Password Login Error] Password is empty or invalid');
      setError('Please enter a valid password');
      setIsLoading(false);
      return;
    }
    console.log('[Password Login] Input validation passed');

    try {
      console.log('[Password Login] Sending login request:', { email });
      const { data } = await api.post('/auth/login', { email, password });
      console.log('[Password Login] Login successful:', {
        userId: data.user.id,
        username: data.user.username,
        token: data.token.substring(0, 20) + '...',
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;

      console.log('[Password Login] Setting success state');
      setSuccess(true);

      console.log('[Password Login] Redirecting to home page in 2 seconds');
      setTimeout(() => {
        console.log('[Password Login] Navigating to home page');
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('[Password Login Error] Error during login:', err.message);
      console.error('[Password Login Error] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.msg || 'Password login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('[Google Login] Attempting Google login');
    setError('Google login is not implemented. Please use email and password or fingerprint.');
  };

  const handleAppleLogin = () => {
    console.log('[Apple Login] Attempting Apple login');
    setError('Apple login is not implemented. Please use email and password or fingerprint.');
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
                    console.log('[Login Method] Switching to password login');
                    setLoginMethod('password');
                  }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'password' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  disabled={isLoading}
                >
                  Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('[Login Method] Switching to fingerprint login');
                    setLoginMethod('webauthn');
                  }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'webauthn' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} ${!isWebAuthnSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoading || !isWebAuthnSupported}
                  title={!isWebAuthnSupported ? 'Fingerprint login is not supported on this device' : ''}
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
                {loginMethod === 'password' && (
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
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                    disabled={isLoading || success}
                  >
                    {isLoading ? 'Logging In...' : 'Log In Now'}
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleGoogleLogin}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2 ${!isWebAuthnSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading || !isWebAuthnSupported}
                    title={!isWebAuthnSupported ? 'Fingerprint login is not supported on this device' : ''}
                  >
                    <FaFingerprint />
                    <span>{isLoading ? 'Processing...' : 'Log In with Fingerprint'}</span>
                  </motion.button>
                )}
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Don't have an account?{' '}
                <a href="/signup" className="text-red-500 hover:underline">
                  Sign up
                </a>
              </div>
            </div>
          </motion.div>
        </div>
        <motion.footer
          variants={footerVariants}
          className={`py-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
        >
          © {new Date().getFullYear()} Chatify. All rights reserved.
        </motion.footer>
      </motion.div>
    </>
  );
};

export default Login;
