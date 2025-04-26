import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight, FaCheckCircle, FaSun, FaMoon, FaGoogle, FaApple, FaFingerprint, FaCamera } from 'react-icons/fa';
import { startAuthentication } from '@simplewebauthn/browser';
import * as faceapi from 'face-api.js';
import api from '../utils/api';
import Navbar from './Navbar';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loginMethod, setLoginMethod] = useState('password');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('PENDING');
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [counter, setCounter] = useState(3);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const navigate = useNavigate();
  const videoWidth = 320;
  const videoHeight = 240;

  const loadModels = async () => {
    const MODEL_URL = '/models';
    try {
      console.log('Loading face-api.js models from:', MODEL_URL);
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log('Face-api.js models loaded successfully');
      setModelsLoaded(true);
    } catch (err) {
      console.error('Error loading face-api.js models:', err);
      setError(`Failed to load face recognition models: ${err.message}`);
    }
  };

  useEffect(() => {
    if (loginMethod === 'face') {
      loadModels().catch(err => {
        console.error('Model loading error:', err);
        setError('Failed to load face recognition models.');
      });
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      setIsCameraActive(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [loginMethod]);

  useEffect(() => {
    if (captureStatus === 'SUCCESS' && faceCaptured) {
      const startTime = Date.now();
      const counterInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, 3 - Math.floor(elapsed));
        setCounter(remaining);
        if (remaining <= 0) {
          clearInterval(counterInterval);
          if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
          }
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          setIsCameraActive(false);
          handleFaceLogin();
        }
      }, 100);
      return () => clearInterval(counterInterval);
    }
    setCounter(3);
  }, [captureStatus, faceCaptured]);

  const getLocalUserVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: videoWidth, height: videoHeight },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraActive(true);
          captureFace();
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
      setError('Video or canvas element not found');
      return;
    }

    faceapi.matchDimensions(canvasRef.current, { width: videoWidth, height: videoHeight });

    const detectFace = async () => {
      if (!videoRef.current || !videoRef.current.srcObject) {
        console.error('Video stream not available');
        setError('Video stream not available');
        setCaptureStatus('FAILED');
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, videoWidth, videoHeight);

        if (detection) {
          const { detection: box, landmarks } = detection;

          const video = videoRef.current;
          const displayWidth = videoWidth;
          const displayHeight = videoHeight;
          const videoActualWidth = video.videoWidth;
          const videoActualHeight = video.videoHeight;

          const scaleX = displayWidth / videoActualWidth;
          const scaleY = displayHeight / videoActualHeight;

          const adjustedBox = {
            x: box.box.x * scaleX,
            y: box.box.y * scaleY,
            width: box.box.width * scaleX,
            height: box.box.height * scaleY,
          };

          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'red';
          ctx.rect(adjustedBox.x, adjustedBox.y, adjustedBox.width, adjustedBox.height);
          ctx.stroke();

          const score = box.score.toFixed(2);
          ctx.font = '16px Arial';
          ctx.fillStyle = 'red';
          ctx.fillText(score, adjustedBox.x, adjustedBox.y - 5);

          if (landmarks && landmarks.positions) {
            const scaledLandmarks = landmarks.positions.map(point => ({
              x: point.x * scaleX,
              y: point.y * scaleY,
            }));

            ctx.fillStyle = 'green';
            scaledLandmarks.forEach(point => {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
              ctx.fill();
            });
          }

          const descriptor = detection.descriptor;
          if (descriptor && !faceDescriptor) {
            setFaceDescriptor(Array.from(descriptor));
            setFaceCaptured(true);
            setCaptureStatus('SUCCESS');
          }
        } else if (!faceDescriptor) {
          setCaptureStatus('FAILED');
        }
      } catch (err) {
        console.error('Face detection error:', err);
        setError('Failed to detect face: ' + err.message);
        setCaptureStatus('FAILED');
      }

      if (!faceDescriptor) {
        animationFrameRef.current = requestAnimationFrame(detectFace);
      }
    };

    animationFrameRef.current = requestAnimationFrame(detectFace);
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
      setError(err.response?.data.msg || 'Login failed');
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
      setError('Please enter your email to use fingerprint login');
      return;
    }

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser.');
      }

      // Check if platform authenticator is available
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error('This device does not support fingerprint authentication.');
      }

      // Start WebAuthn authentication
      const response = await api.post('/auth/webauthn/login/begin', { email });
      const publicKey = response.data;

      // Trigger fingerprint prompt
      const credential = await startAuthentication(publicKey);

      // Complete authentication
      const { data } = await api.post('/auth/webauthn/login/complete', { email, credential });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Fingerprint login error:', err);
      setError(err.response?.data.msg || err.message || 'Fingerprint login failed. Please ensure your device has a fingerprint sensor and try again.');
    }
  };

  const handleFaceLogin = async () => {
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email to use face recognition login');
      return;
    }
    if (!faceCaptured || !faceDescriptor) {
      setError('Please capture your face to proceed');
      return;
    }

    try {
      const { data } = await api.post('/auth/face/login', {
        email,
        descriptor: faceDescriptor,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Face login error:', err);
      setError(err.response?.data.msg || 'Face recognition login failed.');
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
    borderRadius: '50%',
    overflow: 'hidden',
  };

  const videoStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
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
    borderRadius: '50%',
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
                    setLoginMethod('password');
                    setCaptureStatus('PENDING');
                    setIsCameraActive(false);
                    setCounter(3);
                    setFaceCaptured(false);
                    setFaceDescriptor(null);
                  }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'password' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setLoginMethod('webauthn');
                    setCaptureStatus('PENDING');
                    setIsCameraActive(false);
                    setCounter(3);
                    setFaceCaptured(false);
                    setFaceDescriptor(null);
                  }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'webauthn' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Fingerprint
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setLoginMethod('face');
                    setCaptureStatus('PENDING');
                    setIsCameraActive(false);
                    setCounter(3);
                    setFaceCaptured(false);
                    setFaceDescriptor(null);
                  }}
                  className={`px-4 py-2 rounded-lg ${loginMethod === 'face' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Face Recognition
                </motion.button>
              </div>
              {loginMethod === 'face' && (
                <div className="flex flex-col items-center gap-6">
                  {!isCameraActive && !modelsLoaded && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block">Attempting to Log In With Your Face.</span>
                      <span className="block text-red-500 mt-2">Loading Models...</span>
                    </h3>
                  )}
                  {!isCameraActive && modelsLoaded && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block text-red-500 mt-2">
                        Please Capture Your Face to Log In.
                      </span>
                    </h3>
                  )}
                  {isCameraActive && captureStatus === 'SUCCESS' && faceCaptured && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block text-red-500 mt-2">
                        We&apos;ve successfully captured your face!
                      </span>
                      <span className="block text-red-500 mt-2">
                        Please wait {counter} more seconds...
                      </span>
                      <svg
                        className="animate-spin h-5 w-5 text-red-500 mx-auto mt-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                    </h3>
                  )}
                  {isCameraActive && captureStatus === 'FAILED' && (
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-red-500">
                        <span className="block mt-4">
                          Oops! We did not recognize your face.
                        </span>
                      </h3>
                      <motion.button
                        whileHover="hover"
                        whileTap="tap"
                        variants={buttonVariants}
                        onClick={() => {
                          setCaptureStatus('PENDING');
                          setFaceCaptured(false);
                          setFaceDescriptor(null);
                          getLocalUserVideo();
                        }}
                        className={`mt-4 p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                      >
                        <FaCamera />
                        <span>Retry Capture</span>
                      </motion.button>
                    </div>
                  )}
                  {isCameraActive && captureStatus === 'PENDING' && (
                    <h3 className="text-center text-xl font-bold text-gray-900">
                      <span className="block mt-4">Attempting to Log In With Your Face.</span>
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
                    />
                    <canvas
                      ref={canvasRef}
                      style={{
                        ...canvasStyle,
                        display: isCameraActive ? 'block' : 'none',
                      }}
                    />
                  </div>
                  <div className="mt-6"></div>
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
                  <span>Log In with Google</span>
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
                  >
                    <FaFingerprint />
                    <span>Log In with Fingerprint</span>
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
                    disabled={!faceCaptured}
                  >
                    <FaArrowRight />
                    <span>Continue</span>
                  </motion.button>
                )}
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-2`}>
                <div>
                  Don&apos;t have an account? <a href="/signup" className="text-red-500 hover:underline">Sign up here</a>
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
