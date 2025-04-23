import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaUser, FaLock, FaArrowRight, FaCheckCircle, FaSun, FaMoon, FaGoogle, FaApple, FaFingerprint, FaCamera } from 'react-icons/fa';
import { startRegistration } from '@simplewebauthn/browser';
import * as faceapi from 'face-api.js';
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('PENDING');
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [counter, setCounter] = useState(5);
  const [descriptors, setDescriptors] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceApiIntervalRef = useRef(null);
  const navigate = useNavigate();
  const videoWidth = 320;
  const videoHeight = 240;
  const requiredDescriptors = 3;

  const loadModels = async () => {
    const uri = '/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(uri);
    await faceapi.nets.faceLandmark68Net.loadFromUri(uri);
    await faceapi.nets.faceRecognitionNet.loadFromUri(uri);
  };

  useEffect(() => {
    if (signupMethod === 'face') {
      loadModels()
        .then(() => setModelsLoaded(true))
        .catch(err => {
          console.error('Model loading error:', err);
          setError('Failed to load face recognition models.');
        });
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      setIsCameraActive(false);
      if (faceApiIntervalRef.current) {
        clearInterval(faceApiIntervalRef.current);
      }
    };
  }, [signupMethod]);

  useEffect(() => {
    if (captureStatus === 'SUCCESS' && faceCaptured && descriptors.length === requiredDescriptors) {
      const counterInterval = setInterval(() => {
        setCounter(prev => prev - 1);
      }, 1000);

      if (counter === 0) {
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
        clearInterval(counterInterval);
        if (faceApiIntervalRef.current) {
          clearInterval(faceApiIntervalRef.current);
        }
        handleFaceSignup();
      }

      return () => clearInterval(counterInterval);
    }
    setCounter(5);
  }, [captureStatus, faceCaptured, counter, descriptors]);

  const getLocalUserVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraActive(true);
        };
      } else {
        throw new Error('Video element not found');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera: ' + err.message);
      setIsCameraActive(false);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas element not found');
      setError('Video or canvas element not found');
      return;
    }

    faceapi.matchDimensions(canvasRef.current, videoRef.current);
    const faceApiInterval = setInterval(async () => {
      if (!videoRef.current || !videoRef.current.srcObject) {
        console.error('Video stream not available');
        clearInterval(faceApiInterval);
        setError('Video stream not available');
        return;
      }

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, {
          width: videoWidth,
          height: videoHeight,
        });

        if (!canvasRef.current) {
          return;
        }

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

        if (resizedDetections.length > 0) {
          const descriptor = resizedDetections[0].descriptor;
          if (!descriptor) {
            throw new Error('Face descriptor is missing');
          }
          setDescriptors(prev => {
            if (prev.length < requiredDescriptors) {
              const newDescriptors = [...prev, Array.from(descriptor)];
              if (newDescriptors.length === requiredDescriptors) {
                setFaceCaptured(true);
                setCaptureStatus('SUCCESS');
                localStorage.setItem('tempFaceDescriptors', JSON.stringify(newDescriptors));
              }
              return newDescriptors;
            }
            return prev;
          });
        } else {
          setCaptureStatus('FAILED');
        }

        if (!faceApiLoaded) {
          setFaceApiLoaded(true);
        }
      } catch (err) {
        console.error('Face detection error:', err);
        setError('Failed to detect face: ' + err.message);
        setCaptureStatus('FAILED');
        clearInterval(faceApiInterval);
      }
    }, 1000 / 15);
    faceApiIntervalRef.current = faceApiInterval;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (signupMethod === 'password' && !password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      const { data } = await api.post('/auth/register', { email, username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data.msg || 'Registration failed');
    }
  };

  const handleGoogleSignup = () => {
    alert('Google signup is not implemented. Please use email and password.');
  };

  const handleAppleSignup = () => {
    alert('Apple signup is not implemented. Please use email and password.');
  };

  const handleBiometricSignup = async () => {
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email to use biometric signup');
      return;
    }
    if (!username.trim()) {
      setError('Please enter your username to use biometric signup');
      return;
    }

    try {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error('This device does not support Face ID or biometric authentication.');
      }

      const response = await api.post('/auth/webauthn/register/begin', { email, username });
      const publicKey = response.data;
      const credential = await startRegistration(publicKey);
      const { data } = await api.post('/auth/webauthn/register/complete', { email, username, credential });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Biometric signup error:', err);
      setError(err.response?.data.msg || err.message || 'Biometric signup failed.');
    }
  };

  const handleFaceSignup = async () => {
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email to use face recognition signup');
      return;
    }
    if (!username.trim()) {
      setError('Please enter your username to use face recognition signup');
      return;
    }

    const faceDescriptors = JSON.parse(localStorage.getItem('tempFaceDescriptors'));
    if (!faceDescriptors || faceDescriptors.length !== requiredDescriptors) {
      setError('Face descriptors not found or insufficient. Please capture your face again.');
      return;
    }

    try {
      const { data } = await api.post('/auth/face/register', {
        email,
        username,
        descriptors: faceDescriptors,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      localStorage.removeItem('tempFaceDescriptors');
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Face signup error:', err);
      setError(err.response?.data.msg || 'Face recognition signup failed.');
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

  const videoContainerStyle = {
    position: 'relative',
    width: '320px',
    height: '240px',
    margin: '0 auto',
  };

  const videoStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'fill',
    borderRadius: '10px',
  };

  const canvasStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    pointerEvents: 'none',
    display: 'block',
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
                  onClick={() => { setSignupMethod('password'); setFaceApiLoaded(false); setCaptureStatus('PENDING'); setIsCameraActive(false); setCounter(5); setFaceCaptured(false); setDescriptors([]); }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'password' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSignupMethod('webauthn'); setFaceApiLoaded(false); setCaptureStatus('PENDING'); setIsCameraActive(false); setCounter(5); setFaceCaptured(false); setDescriptors([]); }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'webauthn' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Face ID
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSignupMethod('face'); setFaceApiLoaded(false); setCaptureStatus('PENDING'); setIsCameraActive(false); setCounter(5); setFaceCaptured(false); setDescriptors([]); }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'face' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Face Recognition
                </motion.button>
              </div>
              {signupMethod === 'face' && (
                <div className="flex flex-col items-center gap-8">
                  {!isCameraActive && !modelsLoaded && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block">Attempting to Sign Up With Your Face.</span>
                      <span className="block text-red-500 mt-2">Loading Models...</span>
                    </h3>
                  )}
                  {!isCameraActive && modelsLoaded && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block text-red-500 mt-2">
                        Please Capture Your Face to Sign Up.
                      </span>
                    </h3>
                  )}
                  {isCameraActive && captureStatus === 'SUCCESS' && faceCaptured && descriptors.length === requiredDescriptors && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block text-red-500 mt-2">
                        We've successfully captured your face!
                      </span>
                      <span className="block text-red-500 mt-2">
                        Please stay {counter} more seconds...
                      </span>
                    </h3>
                  )}
                  {isCameraActive && captureStatus === 'FAILED' && (
                    <h3 className="text-center text-xl font-bold text-red-500">
                      <span className="block mt-4">
                        We could not capture your face.
                      </span>
                    </h3>
                  )}
                  {isCameraActive && !faceApiLoaded && captureStatus === 'PENDING' && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block mt-4">Capturing Face... ({descriptors.length}/{requiredDescriptors})</span>
                    </h3>
                  )}
                  <div style={videoContainerStyle}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      style={{
                        ...videoStyle,
                        display: isCameraActive ? 'block' : 'none',
                      }}
                      onPlay={captureFace}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{
                        ...canvasStyle,
                        display: isCameraActive ? 'block' : 'none',
                      }}
                    />
                  </div>
                  {!isCameraActive && modelsLoaded && (
                    <motion.button
                      whileHover="hover"
                      whileTap="tap"
                      variants={buttonVariants}
                      onClick={getLocalUserVideo}
                      className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2 mt-2 mb-4`}
                    >
                      <FaCamera />
                      <span>Capture my face</span>
                    </motion.button>
                  )}
                  {!isCameraActive && !modelsLoaded && (
                    <button
                      disabled
                      className={`w-full p-4 rounded-lg font-semibold shadow-lg cursor-not-allowed ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-500'} flex items-center justify-center space-x-2 mt-2 mb-4`}
                    >
                      <svg
                        aria-hidden="true"
                        role="status"
                        className="inline mr-2 w-4 h-4 text-gray-200 animate-spin"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"
                        />
                        <path
                          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="#1C64F2"
                        />
                      </svg>
                      <span>Please wait while models are loading...</span>
                    </button>
                  )}
                </div>
              )}
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
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email"
                      className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                      required
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
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your Username"
                      className={`w-full bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:outline-none`}
                      required
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
                    disabled={success}
                  >
                    Sign Up Now
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                  onClick={handleGoogleSignup}
                  className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
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
                    onClick={handleBiometricSignup}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                  >
                    <FaFingerprint />
                    <span>Sign Up with Face ID</span>
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

export default Signup;
