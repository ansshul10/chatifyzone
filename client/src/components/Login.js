import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight, FaCheckCircle, FaKey, FaSun, FaMoon, FaGoogle, FaApple, FaFingerprint, FaCamera } from 'react-icons/fa';
import { startAuthentication } from '@simplewebauthn/browser';
import * as faceapi from 'face-api.js'; // Import faceapi
import api from '../utils/api';
import { loadModels, getFaceDescriptorWithLandmarks } from '../utils/faceApi';
import Navbar from './Navbar';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loginMethod, setLoginMethod] = useState('password'); // password, webauthn, or face
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceLoginAttempts, setFaceLoginAttempts] = useState(0);
  const [distance, setDistance] = useState(null); // Euclidean distance feedback
  const MAX_FACE_ATTEMPTS = 3;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (loginMethod === 'face') {
      const setupCamera = async () => {
        try {
          await loadModels();
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraActive(true);
            startFaceDetection();
          }
        } catch (err) {
          setError('Failed to access camera or load models: ' + err.message);
        }
      };
      setupCamera();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        setIsCameraActive(false);
      }
    };
  }, [loginMethod]);

  const startFaceDetection = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    const detectFace = async () => {
      if (!isCameraActive) return;
      try {
        const detections = await getFaceDescriptorWithLandmarks(video);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections) {
          const { landmarks } = detections;

          // Draw face frame
          const faceBox = detections.detection.box;
          const frameWidth = 200;
          const frameHeight = 250;
          const frameX = (canvas.width - frameWidth) / 2;
          const frameY = (canvas.height - frameHeight) / 2;
          ctx.strokeStyle = faceBox.x >= frameX && faceBox.x + faceBox.width <= frameX + frameWidth &&
                           faceBox.y >= frameY && faceBox.y + faceBox.height <= frameY + frameHeight
                           ? 'green' : 'red';
          ctx.lineWidth = 2;
          ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);

          // Draw facial landmarks
          const landmarkPositions = landmarks.positions;
          ctx.fillStyle = 'cyan';
          landmarkPositions.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }
      requestAnimationFrame(detectFace);
    };
    detectFace();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (loginMethod === 'password' && !password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data.msg || 'Invalid credentials');
    }
  };

  const handleGoogleLogin = () => {
    alert('Google login is not implemented. Please use email and password.');
  };

  const handleAppleLogin = () => {
    alert('Apple login is not implemented. Please use email and password.');
  };

  const handleBiometricLogin = async () => {
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email to use biometric login');
      return;
    }

    try {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error('This device does not support Face ID or biometric authentication.');
      }

      const response = await api.post('/auth/webauthn/login/begin', { email });
      const publicKey = response.data;
      const credential = await startAuthentication(publicKey);
      const { data } = await api.post('/auth/webauthn/login/complete', { email, credential });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Biometric login error:', err);
      setError(err.response?.data.msg || err.message || 'Biometric login failed.');
    }
  };

  const handleFaceLogin = async () => {
    setError('');
    setSuccess(false);
    setDistance(null);

    if (!email.trim()) {
      setError('Please enter your email to use face login');
      return;
    }

    if (!isCameraActive) {
      setError('Camera is not active. Please enable face login.');
      return;
    }

    if (faceLoginAttempts >= MAX_FACE_ATTEMPTS) {
      setError('Too many failed face login attempts. Please try another method or contact support.');
      return;
    }

    try {
      const detections = await getFaceDescriptorWithLandmarks(videoRef.current);
      if (!detections) {
        setError('No face detected. Please position your face within the frame.');
        setFaceLoginAttempts(prev => prev + 1);
        return;
      }

      const { descriptor } = detections;
      const frameWidth = 200;
      const frameHeight = 250;
      const frameX = (videoRef.current.width - frameWidth) / 2;
      const frameY = (videoRef.current.height - frameHeight) / 2;
      const faceBox = detections.detection.box;

      if (faceBox.x < frameX || faceBox.x + faceBox.width > frameX + frameWidth ||
          faceBox.y < frameY || faceBox.y + faceBox.height > frameY + frameHeight) {
        setError('Please position your face within the green frame.');
        setFaceLoginAttempts(prev => prev + 1);
        return;
      }

      const { data } = await api.post('/auth/face/login', { email, descriptor });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setFaceLoginAttempts(0);
      setDistance(data.distance); // Display distance from backend
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Face login error:', err);
      const errorMsg = err.response?.data.msg || 'Face login failed. Ensure you are registered with face recognition.';
      setError(errorMsg);
      setDistance(err.response?.data.distance || null);
      if (errorMsg === 'Invalid face') {
        setFaceLoginAttempts(prev => prev + 1);
      }
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
              Log in to continue your seamless communication experience. Connect with friends, enjoy private messaging, and access premium features.
            </p>
            <div className="space-y-4 sm:space-y-6">
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Quick Access</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Secure Login</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Resume Chatting Instantly</span>
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
                Log In to Your Account
              </h2>
              <div className="flex justify-center space-x-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setLoginMethod('password'); setFaceLoginAttempts(0); setDistance(null); }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'password' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setLoginMethod('webauthn'); setFaceLoginAttempts(0); setDistance(null); }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'webauthn' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Face ID
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setLoginMethod('face'); setFaceLoginAttempts(0); setDistance(null); }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'face' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Face Recognition
                </motion.button>
              </div>
              {loginMethod === 'face' && (
                <div className="mb-6 flex justify-center relative">
                  <video ref={videoRef} autoPlay muted className="rounded-lg border-2 border-gray-700" width="320" height="240" />
                  <canvas ref={canvasRef} className="absolute top-0 left-0" width="320" height="240" />
                  <div className="absolute bottom-2 left-2 text-sm text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                    {distance !== null ? `Distance: ${distance.toFixed(3)}` : 'Position face in frame'}
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
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
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your Password"
                        className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                        required
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
                    disabled={success}
                  >
                    Log In Now
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleGoogleLogin}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                >
                  <FaGoogle />
                  <span>Login with Google</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleAppleLogin}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                >
                  <FaApple />
                  <span>Login with Apple</span>
                </motion.button>
                {loginMethod === 'webauthn' && (
                  <motion.button
                    type="button"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={handleBiometricLogin}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  >
                    <FaFingerprint />
                    <span>Login with Face ID</span>
                  </motion.button>
                )}
                {loginMethod === 'face' && (
                  <motion.button
                    type="button"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={handleFaceLogin}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                    disabled={success || faceLoginAttempts >= MAX_FACE_ATTEMPTS}
                  >
                    <FaCamera />
                    <span>Login with Face Recognition</span>
                  </motion.button>
                )}
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-2`}>
                <div>
                  <a href="/forgot-password" className="text-red-500 hover:underline flex items-center justify-center space-x-1">
                    <FaKey className="text-sm" />
                    <span>Forgot Password?</span>
                  </a>
                </div>
                <div>
                  Don’t have an account? <a href="/signup" className="text-red-500 hover:underline">Sign up here</a>
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
    </>
  );
};

export default Login;
