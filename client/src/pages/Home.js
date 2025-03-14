import React from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaCheckCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Home = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };

  const textVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  const buttonVariants = {
    hover: { scale: 1.1, backgroundColor: '#1A1A1A', transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col pt-20"
    >
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-grow">
        <motion.div
          variants={textVariants}
          className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left">
            Welcome to Chatify
          </h1>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed text-center lg:text-left">
            Connect instantly with friends or chat anonymously. Enjoy secure, real-time messaging tailored for you.
          </p>
          <div className="space-y-4 sm:space-y-6">
            <motion.div whileHover={{ x: 10, color: '#FF0000' }} className="flex items-center space-x-4 justify-center lg:justify-start">
              <FaCheckCircle className="text-red-500" />
              <span>Real-Time Messaging</span>
            </motion.div>
            <motion.div whileHover={{ x: 10, color: '#FF0000' }} className="flex items-center space-x-4 justify-center lg:justify-start">
              <FaCheckCircle className="text-red-500" />
              <span>Anonymous Chat Option</span>
            </motion.div>
            <motion.div whileHover={{ x: 10, color: '#FF0000' }} className="flex items-center space-x-4 justify-center lg:justify-start">
              <FaCheckCircle className="text-red-500" />
              <span>Secure & Private</span>
            </motion.div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-6">
            <motion.div whileHover={{ scale: 1.05 }} variants={buttonVariants} whileTap="tap">
              <Link to="/login" className="bg-black text-red-600 p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2">
                <FaUser />
                <span>Login</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} variants={buttonVariants} whileTap="tap">
              <Link to="/anonymous" className="bg-black red-600 p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2">
                <FaUser />
                <span>Join as Guest</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>
        <motion.div
  initial={{ opacity: 0, x: 50, rotate: 5 }}
  animate={{ opacity: 1, x: 0, rotate: 0 }}
  transition={{ duration: 0.8, ease: 'easeOut' }}
  className="w-full lg:w-1/2 flex items-center justify-center z-10"
>
  <motion.div
    whileHover={{ scale: 1.05, rotateY: 10, boxShadow: '0 15px 40px rgba(20, 18, 18, 0.4)' }}
    transition={{ type: 'spring', stiffness: 120, damping: 15 }}
    className="relative bg-gradient-to-br from-gray-800 to-black bg-opacity-90 backdrop-blur-2xl p-10 rounded-3xl shadow-3xl border border-gray-700 overflow-hidden transform-style-3d"
  >
    {/* Holographic Overlay */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-purple-500/20 to-blue-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500"
      style={{ filter: 'blur(10px)' }}
    />

    {/* Content */}
    <h2 className="text-3xl lg:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-red-900 via-red-500 to-black-800 bg-clip-text text-transparent tracking-tight">
      🚀 Launch Your Chat Now
    </h2>
    <p className="text-gray-200 text-lg lg:text-xl text-center leading-relaxed font-light">
      Pick your vibe and jump into the ultimate chat adventure! 🌟 Whether it’s secret whispers or bold talks, we’ve got you covered. 🎉
    </p>
  </motion.div>
</motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)' }}
      />
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-20 left-10 w-16 h-16 bg-red-500 opacity-20 rounded-full blur-xl hidden lg:block"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-20 right-10 w-24 h-24 bg-red-500 opacity-20 rounded-full blur-xl hidden lg:block"
      />
      {/* Footer */}
                  <motion.footer
                    variants={footerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-black bg-opacity-90 py-6 border-t border-gray-800"
                  >
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-gray-400 text-sm">
                      <div className="mb-4 sm:mb-0">
                        <span className="font-semibold text-white">Chatify</span> © {new Date().getFullYear()} All rights reserved.
                      </div>
                      <div className="flex space-x-6">
                        <a href="/terms" className="hover:text-red-500 transition-colors">Terms of Service</a>
                        <a href="/privacy" className="hover:text-red-500 transition-colors">Privacy Policy</a>
                        <a href="/contact" className="hover:text-red-500 transition-colors">Contact Us</a>
                      </div>
                    </div>
                  </motion.footer>
    </motion.div>
  );
};

export default Home;