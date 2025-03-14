import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import Navbar from '../components/Navbar'; // Adjust path as needed

const NotFound = () => {
  // Container Animation
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: 'easeOut', staggerChildren: 0.3 },
    },
  };

  // Child Animation
  const childVariants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: 'easeOut' },
    },
  };

  // Modal Animation (Simplified Floating)
  const modalVariants = {
    initial: { y: 0 },
    animate: {
      y: [-10, 10, -10],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    hover: {
      scale: 1.03,
      transition: { duration: 0.3 },
    },
  };

  // Footer Animation
  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.6 } },
  };

  return (
    <>
      <Navbar />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative min-h-screen bg-black text-white flex flex-col justify-between pt-20 overflow-hidden"
      >
        {/* Inline Styles for Flicker Animation */}
        <style>
          {`
            .flicker {
              animation: flicker 1.5s infinite;
            }
            @keyframes flicker {
              0% { opacity: 1; }
              25% { opacity: 0.8; }
              50% { opacity: 1; }
              75% { opacity: 0.9; }
              100% { opacity: 1; }
            }
          `}
        </style>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center flex-grow relative z-10">
          <Tilt tiltMaxAngleX={20} tiltMaxAngleY={20} perspective={1000} className="w-full max-w-lg">
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              className="bg-[#1A1A1A] p-8 rounded-xl shadow-2xl border border-gray-700 hover:shadow-[0_15px_30px_rgba(255,0,0,0.3)] transform transition-all duration-300"
            >
              <motion.div variants={childVariants} className="text-center space-y-6">
                {/* 404 with Flicker */}
                <FaExclamationTriangle className="text-red-500 text-6xl sm:text-7xl mx-auto mb-4 flicker" />
                <h1
                  className="text-7xl sm:text-8xl font-extrabold tracking-tight text-white flicker"
                  style={{
                    textShadow: '3px 3px 0px #ff0000, 6px 6px 0px #4b5563',
                  }}
                >
                  404
                </h1>

                {/* Funny Text */}
                <motion.div variants={childVariants}>
                  <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-md mx-auto">
                    Oops! You broke the internet.
                  </p>
                  <p className="text-md sm:text-lg text-gray-400 italic mt-2">
                    (This page is probably hiding in the server’s snack drawer.)
                  </p>
                </motion.div>

                {/* Normal Back Button with Rounded Edges */}
                <div className="inline-block">
                  <Link
                    to="/"
                    className="flex items-center space-x-3 bg-black text-white p-4 rounded-full font-semibold shadow-md border-2 border-red-500 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(255,0,0,0.7)] transition-all duration-300"
                  >
                    <FaArrowLeft />
                    <span>Escape the Void</span>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </Tilt>
        </div>

        {/* Footer */}
        <motion.footer
          variants={footerVariants}
          initial="hidden"
          animate="visible"
          className="bg-black py-6 border-t border-gray-700 relative z-10"
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
    </>
  );
};

export default NotFound;