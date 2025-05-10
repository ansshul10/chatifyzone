/* eslint-disable no-undef */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import {
  FaEnvelope,
  FaArrowRight,
  FaCheckCircle,
  FaRedo,
  FaTwitter,
  FaGithub,
  FaDiscord,
  FaRocket,
  FaSpinner,
} from 'react-icons/fa';
import api from '../utils/api';
import Navbar from './Navbar';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [otpStatus, setOtpStatus] = useState(null); // 'correct', 'incorrect', or null
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes in seconds
  const navigate = useNavigate();
  const otpInputs = useRef([]);

  // OTP Timer
  useEffect(() => {
    let timer;
    if (step === 'otp' && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpTimer]);

  // Reset OTP timer on resend
  const resetOtpTimer = () => {
    setOtpTimer(300);
  };

  // Format timer as MM:SS
  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle email submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    if (!email.trim()) {
      setError('Please enter your email');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/forgot-password/init', { email: email.trim().toLowerCase() });
      setStep('otp');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data.msg || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        otpInputs.current[index + 1].focus();
      }

      if (!value && index > 0) {
        otpInputs.current[index - 1].focus();
      }
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '');
    if (paste.length === 6) {
      setOtp(paste.split(''));
      otpInputs.current[5].focus();
    }
  };

  // Handle OTP submission
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOtpStatus(null);
    setIsLoading(true);

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit OTP');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/forgot-password/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otpCode,
      });
      setOtpStatus('correct');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setOtpStatus('incorrect');
      setError(err.response?.data.msg || 'Invalid OTP');
      if (err.response?.data.attemptsLeft) {
        setAttemptsLeft(err.response.data.attemptsLeft);
      }
      if (err.response?.status === 429) {
        setTimeout(() => navigate('/login'), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP resend
  const handleResendOtp = async () => {
    setError('');
    setSuccess(false);
    setOtp(['', '', '', '', '', '']);
    setOtpStatus(null);
    setAttemptsLeft(5);
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password/resend-otp', { email: email.trim().toLowerCase() });
      setSuccess(true);
      resetOtpTimer();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Focus first OTP input on step change
  useEffect(() => {
    if (step === 'otp' && otpInputs.current[0]) {
      otpInputs.current[0].focus();
    }
  }, [step]);

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

  const otpInputVariants = {
    initial: { borderColor: '#1A1A1A' },
    correct: { borderColor: '#00FF00', boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)', transition: { duration: 0.3 } },
    incorrect: { borderColor: '#FF0000', boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)', transition: { duration: 0.3 } },
  };

  const buttonVariants = {
    hover: { scale: 1.1, transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const successVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <>
      <Navbar setIsDarkMode={setIsDarkMode} isDarkMode={isDarkMode} />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`min-h-screen flex flex-col justify-between pt-20 ${
          isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-[#1A1A1A]'
        }`}
      >
        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-grow bg-black">
          {/* Left Side - Text Content */}
          <motion.div
            variants={textVariants}
            className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
          >
            <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left ${
              isDarkMode ? 'text-white' : 'text-[#1A1A1A]'
            }`}>
              Reset Your Password
            </h1>
            <p className={`text-base sm:text-lg ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            } leading-relaxed text-center lg:text-left`}>
              {step === 'email'
                ? 'Enter your email address to receive a secure OTP for password reset.'
                : 'Enter the 6-digit OTP sent to your email to verify and receive a password reset link.'}
            </p>
            <div className="space-y-4 sm:space-y-6">
              {[
                step === 'email' ? 'Enter your registered email' : 'Check your email for OTP',
                step === 'email' ? 'Receive a secure OTP' : 'Verify OTP to get reset link',
                'Securely reset your password',
              ].map((text, index) => (
                <motion.div
                  key={index}
                  whileHover={{ x: 10 }}
                  className="flex items-center space-x-4 justify-center lg:justify-start"
                >
                  <FaCheckCircle className="text-[#FF0000] text-xl" />
                  <span className={`text-sm sm:text-base ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>{text}</span>
                </motion.div>
              ))}
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="mt-6 flex items-center space-x-4 justify-center lg:justify-start"
            >
              <span className={`text-lg sm:text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-[#1A1A1A]'
              }`}>
                {step === 'email' ? 'Ready to Reset?' : 'Verify OTP Now'}
              </span>
              <FaArrowRight className="text-[#FF0000] text-xl sm:text-2xl" />
            </motion.div>
          </motion.div>

          {/* Right Side - Form with Tilt Effect */}
          <motion.div
            variants={formVariants}
            className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0"
          >
            <Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000} className="w-full max-w-md">
              <div className={`bg-black bg-opacity-90 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-2xl border border-[#1A1A1A] hover:shadow-[0_15px_30px_rgba(255,0,0,0.3)] transition-all duration-300`}>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${
                  isDarkMode ? 'text-white' : 'text-[#1A1A1A]'
                }`}>
                  {step === 'email' ? 'Forgot Password' : 'Verify OTP'}
                </h2>
                {step === 'email' ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-6" aria-label="Email input form">
                    <div className="relative">
                      <motion.div
                        whileHover="hover"
                        whileFocus="focus"
                        variants={inputVariants}
                        className="flex items-center border border-[#1A1A1A] rounded-lg p-3 bg-[#1A1A1A]"
                      >
                        <FaEnvelope className="text-gray-400 mr-3" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your Email"
                          className="w-full bg-transparent text-white focus:outline-none"
                          required
                          aria-label="Email address"
                          disabled={isLoading}
                        />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-[#FF0000] text-sm text-center"
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
                          <span>OTP sent! Check your email.</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button
                      type="submit"
                      whileHover="hover"
                      whileTap="tap"
                      variants={buttonVariants}
                      className="w-full p-4 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 bg-[#1A1A1A] text-[#FF0000] hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300"
                      disabled={isLoading || success}
                      aria-label="Send OTP"
                    >
                      {isLoading ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <span>Send OTP</span>
                          <FaArrowRight />
                        </>
                      )}
                    </motion.button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpSubmit} className="space-y-6" aria-label="OTP verification form">
                    <div className="flex justify-center space-x-2">
                      {otp.map((digit, index) => (
                        <motion.input
                          key={index}
                          type="text"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onPaste={index === 0 ? handleOtpPaste : null}
                          maxLength="1"
                          ref={(el) => (otpInputs.current[index] = el)}
                          className="w-10 h-10 text-center text-lg font-semibold rounded-lg border bg-[#1A1A1A] text-white border-[#1A1A1A] focus:outline-none"
                          variants={otpInputVariants}
                          initial="initial"
                          animate={otpStatus ? otpStatus : 'initial'}
                          aria-label={`OTP digit ${index + 1}`}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                    {attemptsLeft < 5 && (
                      <div className="text-yellow-500 text-sm text-center">
                        {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
                      </div>
                    )}
                    {step === 'otp' && (
                      <div className="text-gray-400 text-sm text-center">
                        OTP expires in: {formatTimer(otpTimer)}
                      </div>
                    )}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-[#FF0000] text-sm text-center"
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
                          <span>OTP verified! Redirecting...</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button
                      type="submit"
                      whileHover="hover"
                      whileTap="tap"
                      variants={buttonVariants}
                      className="w-full p-4 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 bg-[#1A1A1A] text-[#FF0000] hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300"
                      disabled={isLoading || success}
                      aria-label="Verify OTP"
                    >
                      {isLoading ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <span>Verify OTP</span>
                          <FaArrowRight />
                        </>
                      )}
                    </motion.button>
                    <div className="text-center">
                      <motion.button
                        type="button"
                        onClick={handleResendOtp}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-sm text-gray-400 hover:text-[#FF0000] flex items-center justify-center mx-auto space-x-1"
                        disabled={isLoading}
                        aria-label="Resend OTP"
                      >
                        <FaRedo />
                        <span>Resend OTP</span>
                      </motion.button>
                    </div>
                  </form>
                )}
                <div className={`mt-6 text-center text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Remember your password?{' '}
                  <Link to="/login" className="text-[#FF0000] hover:underline">
                    Log in
                  </Link>
                </div>
              </div>
            </Tilt>
          </motion.div>
        </div>

        {/* Advanced Footer */}
        <motion.footer
          variants={containerVariants}
          className="mt-auto py-6 px-4 sm:px-6 lg:px-8 bg-[#1A1A1A] border-t border-[#1A1A1A]"
        >
          <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center sm:text-left">
            {/* About ChatifyZone */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">About ChatifyZone</h3>
              <p className="text-xs sm:text-sm text-gray-400">
                ChatifyZone is your go-to platform for secure, anonymous, and real-time communication. Connect globally with ease and privacy.
              </p>
              <Link
                to="/"
                className="text-[#FF0000] hover:underline flex items-center justify-center sm:justify-start text-xs sm:text-sm"
              >
                <FaRocket className="mr-2" /> Explore Now
              </Link>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Quick Links</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                {[
                  { to: '/terms', label: 'Terms of Service' },
                  { to: '/privacy', label: 'Privacy Policy' },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="hover:text-[#FF0000] transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Connect With Us</h3>
              <div className="flex justify-center sm:justify-start space-x-4">
                {[
                  { href: 'https://twitter.com', icon: <FaTwitter />, label: 'Twitter' },
                  { href: 'https://github.com', icon: <FaGithub />, label: 'GitHub' },
                  { href: 'https://discord.com', icon: <FaDiscord />, label: 'Discord' },
                ].map((social) => (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF0000] hover:text-[#FF3333] transition-colors duration-200"
                    aria-label={`Follow us on ${social.label}`}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-400">
                Join our community for updates and support!
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Get in Touch</h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Have questions? Reach out to us at{' '}
                <a
                  href="mailto:support@chatifyzone.in"
                  className="text-[#FF0000] hover:underline"
                >
                  support@chatifyzone.in
                </a>
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                Follow us on{' '}
                <a
                  href="https://x.com/chatifyzone"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF0000] hover:underline"
                >
                  X
                </a>{' '}
                for real-time updates.
              </p>
            </div>
          </div>
          <div className="mt-4 text-center text-xs sm:text-sm text-gray-500">
            © {new Date().getFullYear()} ChatifyZone. All rights reserved.
          </div>
        </motion.footer>
      </motion.div>
    </>
  );
};

export default ForgotPassword;
