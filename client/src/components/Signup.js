import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaArrowRight, FaCheckCircle, FaSun, FaMoon, FaGoogle, FaApple, FaFingerprint, FaCamera } from 'react-icons/fa';
import { startRegistration } from '@simplewebauthn/browser';
import * as faceapi from 'face-api.js'; // Import faceapi
import api from '../utils/api';
import { loadModels, getFaceDescriptorWithLandmarks } from '../utils/faceApi';
import Navbar from './Navbar';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [signupMethod, setSignupMethod] = useState('password');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facePosition, setFacePosition] = useState('center'); // center, left, right
  const [descriptors, setDescriptors] = useState([]); // Store 3 descriptors
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (signupMethod === 'face') {
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
  }, [signupMethod]);

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
          const { landmarks, detection } = detections;

          // Draw face frame
          const faceBox = detection.box;
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

          // Check face orientation
          const noseTip = landmarks.getNose()[3];
          const canvasCenterX = canvas.width / 2;
          if (facePosition === 'center' && Math.abs(noseTip.x - canvasCenterX) > 30) {
            setError('Please center your face.');
          } else if (facePosition === 'left' && noseTip.x > canvasCenterX - 50) {
            setError('Please turn your face slightly to the right.');
          } else if (facePosition === 'right' && noseTip.x < canvasCenterX + 50) {
            setError('Please turn your face slightly to the left.');
          } else {
            setError('');
          }
        } else {
          setError('No face detected. Please position your face in the frame.');
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }
      requestAnimationFrame(detectFace);
    };
    detectFace();
  };

  const captureFace = async () => {
    try {
      const detections = await getFaceDescriptorWithLandmarks(videoRef.current);
      if (!detections) {
        setError('No face detected. Please position your face in the frame.');
        return false;
      }

      const { descriptor, detection, landmarks } = detections;
      const frameWidth = 200;
      const frameHeight = 250;
      const frameX = (videoRef.current.width - frameWidth) / 2;
      const frameY = (videoRef.current.height - frameHeight) / 2;
      const faceBox = detection.box;

      if (faceBox.x < frameX || faceBox.x + faceBox.width > frameX + frameWidth ||
          faceBox.y < frameY || faceBox.y + faceBox.height > frameY + frameHeight) {
        setError('Please position your face within the green frame.');
        return false;
      }

      const noseTip = landmarks.getNose()[3];
      const canvasCenterX = videoRef.current.width / 2;
      if (facePosition === 'center' && Math.abs(noseTip.x - canvasCenterX) > 30) {
        setError('Please center your face.');
        return false;
      } else if (facePosition === 'left' && noseTip.x > canvasCenterX - 50) {
        setError('Please turn your face slightly to the right.');
        return false;
      } else if (facePosition === 'right' && noseTip.x < canvasCenterX + 50) {
        setError('Please turn your face slightly to the left.');
        return false;
      }

      setDescriptors(prev => [...prev, descriptor]);
      return true;
    } catch (err) {
      setError('Error capturing face: ' + err.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!username.trim() || !email.trim()) {
      setError('Username and email are required');
      return;
    }
    if (signupMethod === 'password' && !password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      const { data } = await api.post('/auth/register', { username, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data.msg || 'Something went wrong');
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

    if (!username.trim() || !email.trim()) {
      setError('Username and email are required for biometric signup');
      return;
    }

    try {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error('This device does not support Face ID or biometric authentication.');
      }

      const response = await api.post('/auth/webauthn/register/begin', { username, email });
      const publicKey = response.data;
      const credential = await startRegistration(publicKey);
      const { data } = await api.post('/auth/webauthn/register/complete', { username, email, credential });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['x-auth-token'] = data.token;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Biometric signup error:', err);
      setError(err.response?.data.msg || err.message || 'Biometric signup failed.');
    }
  };

  const handleFaceSignup = async () => {
    setError('');
    setSuccess(false);

    if (!username.trim() || !email.trim()) {
      setError('Username and email are required for face signup');
      return;
    }

    if (!isCameraActive) {
      setError('Camera is not active. Please enable face signup.');
      return;
    }

    if (descriptors.length < 3) {
      const success = await captureFace();
      if (success) {
        if (facePosition === 'center') {
          setFacePosition('left');
          setError('Face captured. Now turn slightly to the right.');
        } else if (facePosition === 'left') {
          setFacePosition('right');
          setError('Face captured. Now turn slightly to the left.');
        } else if (facePosition === 'right') {
          // All three descriptors captured
          try {
            const { data } = await api.post('/auth/face/register', { username, email, descriptors });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            api.defaults.headers.common['x-auth-token'] = data.token;
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
          } catch (err) {
            setError(err.response?.data.msg || 'Face signup failed.');
            setDescriptors([]); // Reset on failure
            setFacePosition('center');
          }
        }
      }
      return;
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
              Join Chatify for an Elite Experience
            </h1>
            <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
              Sign up today to unlock a world of seamless communication. Connect with friends, chat anonymously, and enjoy premium features designed just for you.
            </p>
            <div className="space-y-4 sm:space-y-6">
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Instant Account Creation</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Secure & Private Messaging</span>
              </motion.div>
              <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
                <FaCheckCircle className="text-red-500" />
                <span>Premium Features Access</span>
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
                Create Your Account
              </h2>
              <div className="flex justify-center space-x-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSignupMethod('password'); setDescriptors([]); setFacePosition('center'); }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'password' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSignupMethod('webauthn'); setDescriptors([]); setFacePosition('center'); }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'webauthn' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Face ID
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSignupMethod('face'); setDescriptors([]); setFacePosition('center'); }}
                  className={`px-4 py-2 rounded-lg ${signupMethod === 'face' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  Face Recognition
                </motion.button>
              </div>
              {signupMethod === 'face' && (
                <div className="mb-6 flex justify-center relative">
                  <video ref={videoRef} autoPlay muted className="rounded-lg border-2 border-gray-700" width="320" height="240" />
                  <canvas ref={canvasRef} className="absolute top-0 left-0" width="320" height="240" />
                  <div className="absolute bottom-2 left-2 text-sm text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                    {facePosition === 'center' ? 'Position face in center' :
                     facePosition === 'left' ? 'Turn slightly to the right' :
                     'Turn slightly to the left'}
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
                {signupMethod === 'face' && (
                  <motion.button
                    type="button"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    onClick={handleFaceSignup}
                    className={`w-full p-4 rounded-lg font-semibold shadow-lg ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} flex items-center justify-center space-x-2`}
                    disabled={success}
                  >
                    <FaCamera />
                    <span>{descriptors.length < 3 ? `Capture ${facePosition} face` : 'Sign Up with Face Recognition'}</span>
                  </motion.button>
                )}
              </form>
              <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Already have an account? <a href="/login" className="text-red-500 hover:underline">Login here</a>
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

export default Register;
