import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import Navbar from '../components/Navbar'; // Adjust path as needed

const NotFound = () => {
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8, ease: 'easeOut', staggerChildren: 0.2 },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  const modalVariants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.7, ease: 'easeOut' },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.3 },
    },
  };

  return (
    <>
      <Navbar />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative min-h-screen bg-black text-white flex flex-col justify-center pt-20 overflow-hidden"
      >
        {/* Inline Styles for Premium Effects */}
        <style>
          {`
            .glassmorphic {
              background: rgba(255, 255, 255, 0.05);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            @keyframes glow {
              0% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
              50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.4); }
              100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
            }
            .particle {
              position: absolute;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.3);
              animation: float 15s infinite linear;
            }
            @keyframes float {
              0% { transform: translateY(0); opacity: 0.5; }
              50% { opacity: 0.8; }
              100% { transform: translateY(-100vh); opacity: 0.5; }
            }
          `}
        </style>

        {/* Particle Background */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}vw`,
              top: `${Math.random() * 100}vh`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center flex-grow relative z-10">
          <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} perspective={1200} className="w-full max-w-sm">
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              className="glassmorphic p-8 rounded-2xl shadow-2xl glow"
              role="alert"
              aria-labelledby="not-found-title"
            >
              <motion.div variants={childVariants} className="text-center space-y-6">
                {/* Icon with Subtle Animation */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FaExclamationTriangle
                    className="text-red-500 text-4xl mx-auto mb-4"
                    aria-hidden="true"
                  />
                </motion.div>
                <h1
                  id="not-found-title"
                  className="text-5xl font-extrabold tracking-tight text-white"
                  style={{ fontFamily: '"SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                >
                  404
                </h1>

                {/* Professional Messaging */}
                <motion.div variants={childVariants}>
                  <p className="text-lg font-medium text-gray-100 leading-relaxed">
                    Page Not Found
                  </p>
                  <p className="text-sm text-gray-300 mt-2">
                    The requested page could not be located. Please check the URL or return to the homepage.
                  </p>
                </motion.div>

                {/* Premium Return Button */}
                <motion.div variants={childVariants}>
                  <Link
                    to="/"
                    className="inline-flex items-center space-x-2 bg-red-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black transition-all duration-300"
                    aria-label="Return to Homepage"
                  >
                    <FaArrowLeft className="text-sm" />
                    <span>Return to Homepage</span>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </Tilt>
        </div>
      </motion.div>
    </>
  );
};

export default NotFound;
