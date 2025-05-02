import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaArrowRight } from 'react-icons/fa';
import api from '../utils/api';

const Unsubscribe = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };
  const buttonVariants = { hover: { scale: 1.1, transition: { duration: 0.3 } }, tap: { scale: 0.95 } };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="max-w-md w-full bg-[#1A1A1A] rounded-lg shadow-md border border-gray-700 p-8 text-center">
        <FaEnvelope className="text-red-500 text-4xl mb-4 mx-auto" />
        <h2 className="text-2xl font-extrabold mb-4">Unsubscribe from ChatifyZone Newsletter</h2>
        {isLoading ? (
          <p className="text-gray-300">Processing your request...</p>
        ) : (
          <>
            <p className={`text-lg ${message.includes('successfully') ? 'text-green-500' : 'text-red-500'} mb-6`}>
              {message}
            </p>
            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
              <button
                onClick={() => navigate('/')}
                className="p-4 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 bg-[#1A1A1A] text-red-600 hover:shadow-[0_0_15px_rgba(255,0,0,0.5)] mx-auto"
              >
                <FaArrowRight />
                <span>Return to ChatifyZone</span>
              </button>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Unsubscribe;