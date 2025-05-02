import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope,
  FaArrowRight,
  FaTwitter,
  FaGithub,
  FaDiscord,
  FaRocket,
  FaShieldAlt,
  FaGlobe,
} from 'react-icons/fa';
import Navbar from './Navbar';
import api from '../utils/api';

const Unsubscribe = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = async () => {
      const query = new URLSearchParams(location.search);
      const token = query.get('token');

      if (!token) {
        setMessage('Invalid unsubscribe link. Please check your email and try again.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get(`/auth/unsubscribe?token=${token}`);
        setMessage('You have been successfully unsubscribed from the ChatifyZone Newsletter.');
        setIsLoading(false);
      } catch (err) {
        console.error('Unsubscribe error:', err.response?.data.msg || err.message);
        setMessage(err.response?.data.msg || 'Failed to unsubscribe. Please try again later.');
        setIsLoading(false);
      }
    };

    unsubscribe();
  }, [location]);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  const buttonVariants = {
    hover: { scale: 1.1, transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`min-h-screen flex flex-col pt-20 ${
        isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <Navbar setIsDarkMode={setIsDarkMode} isDarkMode={isDarkMode} />

      {/* Main Content */}
      <div className="flex flex-col items-center flex-grow px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black to-black mb-20">
        <motion.section
          variants={itemVariants}
          className="w-full max-w-2xl bg-[#1A1A1A] rounded-xl shadow-2xl border border-gray-700 p-6 sm:p-8 text-center"
        >
          <FaEnvelope className="text-red-500 text-4xl sm:text-5xl mb-6 mx-auto" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-4">
            Unsubscribe from ChatifyZone Newsletter
          </h2>
          {isLoading ? (
            <p className="text-gray-300 text-base sm:text-lg">Processing your request...</p>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <>
                  <p
                    className={`text-base sm:text-lg lg:text-xl mb-6 ${
                      message.includes('successfully') ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {message}
                  </p>
                  {message.includes('successfully') ? (
                    <>
                      <p className="text-gray-300 mb-6 text-sm sm:text-base">
                        We're sorry to see you go! You can always resubscribe to stay updated with the latest ChatifyZone news, events, and exclusive offers.
                      </p>
                      <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
                        <button
                          onClick={() => navigate('/')}
                          className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 bg-[#1A1A1A] text-red-600 hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300 mx-auto text-sm sm:text-base"
                        >
                          <FaArrowRight />
                          <span>Return to ChatifyZone</span>
                        </button>
                      </motion.div>
                      <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
                        <button
                          onClick={() => navigate('/#email-subscription')}
                          className="mt-4 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 bg-red-600 text-white hover:bg-red-700 transition-all duration-300 mx-auto text-sm sm:text-base"
                        >
                          <FaEnvelope />
                          <span>Resubscribe Now</span>
                        </button>
                      </motion.div>
                    </>
                  ) : (
                    <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
                      <button
                        onClick={() => navigate('/')}
                        className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 bg-[#1A1A1A] text-red-600 hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300 mx-auto text-sm sm:text-base"
                      >
                        <FaArrowRight />
                        <span>Return to ChatifyZone</span>
                      </button>
                    </motion.div>
                  )}
                </>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.section>
      </div>

      {/* Advanced Footer */}
      <motion.footer
        variants={itemVariants}
        className="mt-auto py-2 px-4 sm:px-6 lg:px-8 bg-black border-t border-gray-700"
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
              className="text-red-500 hover:underline flex items-center justify-center sm:justify-start text-xs sm:text-sm"
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
                    className="hover:text-red-500 transition-colors duration-200"
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
                  className="text-red-500 hover:text-red-400 transition-colors duration-200"
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
                className="text-red-500 hover:underline"
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
                className="text-red-500 hover:underline"
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
  );
};

export default Unsubscribe;
