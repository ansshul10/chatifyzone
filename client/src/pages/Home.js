import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import {
  FaUser,
  FaCheckCircle,
  FaComment,
  FaShieldAlt,
  FaRocket,
  FaGlobe,
  FaStar,
  FaEnvelope,
  FaQuestionCircle,
  FaArrowRight,
  FaSun,
  FaMoon,
  FaUsers,
  FaPaperPlane,
  FaHistory,
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar'; // Adjust path as needed

const Home = () => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Theme state
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Signed-up user state
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const anonymousId = localStorage.getItem('anonymousId');

    if (token) {
      // Signed-up user with a token
      setIsAuthenticated(true);
    } else if (anonymousId) {
      // Anonymous user with anonymousId but no token
      navigate('/'); // Redirect to chat immediately
    } else {
      // Unauthenticated user (no token or anonymousId)
      setIsAuthenticated(false);
    }
  }, [navigate]);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };

  const textVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  const buttonVariants = {
    hover: { scale: 1.1, backgroundColor: isDarkMode ? '#1A1A1A' : '#d1d5db', transition: { duration: 0.3 } },
    tap: { scale: 0.95 },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } },
  };

  // Feature Data for Normal Home
  const features = [
    {
      icon: <FaComment className="text-red-500 text-3xl mb-4 mx-auto" />,
      title: 'Instant Messaging ⚡',
      desc: 'Chat in real-time with zero delays, keeping your conversations flowing smoothly.',
    },
    {
      icon: <FaShieldAlt className="text-red-500 text-3xl mb-4 mx-auto" />,
      title: 'Top-Notch Security 🔒',
      desc: 'Your privacy is our priority with end-to-end encryption and secure servers.',
    },
    {
      icon: <FaRocket className="text-red-500 text-3xl mb-4 mx-auto" />,
      title: 'Fast & Lightweight 🚀',
      desc: 'Experience a sleek, fast app designed for performance on any device.',
    },
    {
      icon: <FaGlobe className="text-red-500 text-3xl mb-4 mx-auto" />,
      title: 'Global Connectivity 🌍',
      desc: 'Reach friends and communities worldwide with seamless cross-platform support.',
    },
  ];

  // Testimonial Data
  const testimonials = [
    { quote: 'Chatify transformed how I connect with friends. It’s fast, secure, and the anonymous mode is a game-changer!', author: 'Anonymous User' },
    { quote: 'The best messaging app I’ve used—intuitive design and lightning-fast performance!', author: 'Jane D.' },
    { quote: 'I love the privacy features and the ability to chat globally without hassle.', author: 'Mark S.' },
  ];

  // FAQ Data
  const faqs = [
    { question: 'What is Chatify?', answer: 'Chatify is a modern messaging platform offering real-time, secure, and anonymous chat options.' },
    { question: 'Is my data safe?', answer: 'Yes, we use end-to-end encryption and strict privacy protocols to protect your data.' },
    { question: 'Can I use Chatify without signing up?', answer: 'Absolutely! Use our guest mode to chat anonymously without an account.' },
  ];

  // Chat Home Features for Signed-Up Users
  const chatHomeFeatures = [
    { icon: <FaPaperPlane className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Start a Chat', desc: 'Message friends or new users instantly.', link: '/chat' },
    { icon: <FaUsers className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Join Groups', desc: 'Explore or create chat groups.', link: '/group-chat' },
    { icon: <FaHistory className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Recent Chats', desc: 'Pick up where you left off.', link: '/chat' },
  ];

  // Normal Home Page (Unauthenticated Users)
  const NormalHome = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16 flex-grow">
      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <motion.div
          variants={textVariants}
          className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
        >
          <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome to Chatify 🌟
          </h1>
          <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left max-w-xl`}>
            Discover a world of seamless communication. Connect instantly with friends, chat anonymously, or join global communities—all in real-time.
          </p>
          <div className="space-y-4 sm:space-y-6">
            <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
              <FaCheckCircle className="text-red-500" />
              <span>Real-Time Messaging ⚡</span>
            </motion.div>
            <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
              <FaCheckCircle className="text-red-500" />
              <span>Anonymous Chat Option 🕵️‍♂️</span>
            </motion.div>
            <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
              <FaCheckCircle className="text-red-500" />
              <span>Secure & Private 🔒</span>
            </motion.div>
            <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-4 justify-center lg:justify-start">
              <FaCheckCircle className="text-red-500" />
              <span>Cross-Platform Sync 🌍</span>
            </motion.div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-6">
            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
              <Link to="/login" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}>
                <FaUser />
                <span>Login</span>
              </Link>
            </motion.div>
            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
              <Link to="/anonymous" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}>
                <FaArrowRight />
                <span>Start Chatting Anonymously</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full lg:w-1/2 flex items-center justify-center z-10"
        >
          <Tilt tiltMaxAngleX={20} tiltMaxAngleY={20} perspective={1000} className="w-full max-w-lg">
            <div className={`p-6 sm:p-6 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.3),-10px_0_20px_rgba(255,0,0,0.3)] transform transition-all duration-300`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 text-center ${isDarkMode ? 'text-white hover:text-red-600' : 'text-gray-900 hover:text-red-500'} transition-colors duration-300`}>
                🚀 Launch Your Chat Now
              </h2>
              <ul className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} space-y-4`}>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>🎉 Instant chats with friends or strangers!</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>🕵️‍♂️ Go incognito with anonymous mode!</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>⚡ Lightning-fast messaging!</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>🌍 Global reach with a modern interface.</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>🎨 Customize your experience.</span></li>
              </ul>
            </div>
          </Tilt>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="w-full flex flex-col items-center space-y-12 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Why Choose Chatify? 🤔
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {features.map((feature, index) => (
            <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.05 }}
                onHoverStart={() => setActiveFeature(index)}
                onHoverEnd={() => setActiveFeature(null)}
                className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.2),-10px_0_20px_rgba(255,0,0,0.2)] transition-all duration-300`}
              >
                {feature.icon}
                <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
                <AnimatePresence>
                  {activeFeature === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-sm mt-2 text-center"
                    >
                      Learn More →
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Tilt>
          ))}
        </div>

        {/* Call-to-Action */}
        <section className="w-full flex flex-col items-center space-y-8 py-12">
          <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Ready to Join the Chat Revolution? 🎉
          </motion.h2>
          <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-xl`}>
            Whether you’re here to connect, explore, or just chat, Chatify has everything you need. Register now!
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-4">
            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
              <Link to="/signup" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}>
                <FaUser />
                <span>Sign Up Now</span>
              </Link>
            </motion.div>
          </div>
        </section>
      </section>

      {/* Testimonials Section */}
      <section className={`w-full flex flex-col items-center space-y-12 py-12 rounded-xl p-6 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}>
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          What Our Users Say 💬
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-400'}`}
            >
              <FaStar className="text-yellow-400 text-2xl mb-4 mx-auto" />
              <p className={`text-center italic ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{testimonial.quote}"</p>
              <p className="text-red-500 font-semibold text-center mt-4">— {testimonial.author}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full flex flex-col items-center space-y-12 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Frequently Asked Questions ❓
        </motion.h2>
        <div className="w-full max-w-3xl space-y-6">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'}`}
            >
              <div className="flex items-center space-x-3">
                <FaQuestionCircle className="text-red-500 text-xl" />
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{faq.question}</h3>
              </div>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{faq.answer}</p>
            </motion.div>
          ))}
        </div>
        <motion.div whileHover={{ scale: 1.05 }} className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Link to="/contact" className="text-red-500 hover:underline flex items-center justify-center space-x-2">
            <FaEnvelope />
            <span>Have more questions? Contact us!</span>
          </Link>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="w-full flex flex-col items-center space-y-12 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Chatify Stats 📊
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          <motion.div variants={cardVariants} className="text-center">
            <p className="text-4xl font-bold text-red-500">50K+</p>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Anonymous Users</p>
          </motion.div>
          <motion.div variants={cardVariants} className="text-center">
            <p className="text-4xl font-bold text-red-500">500K+</p>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Messages Sent</p>
          </motion.div>
          <motion.div variants={cardVariants} className="text-center">
            <p className="text-4xl font-bold text-red-500">99.9%</p>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Uptime</p>
          </motion.div>
          <motion.div variants={cardVariants} className="text-center">
            <p className="text-4xl font-bold text-red-500">40+</p>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Countries</p>
          </motion.div>
        </div>
      </section>
    </div>
  );

  // Chat Home Page (Signed-Up Users)
  const ChatHome = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16 flex-grow">
      {/* Welcome Section */}
      <section className="flex flex-col items-center space-y-8">
        <motion.h1
          variants={textVariants}
          className={`text-3xl sm:text-5xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        >
          Welcome Back to Chatify! 👋
        </motion.h1>
        <motion.p
          variants={textVariants}
          className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-2xl`}
        >
          Jump into your chats, connect with friends, or explore groups—everything’s ready for you!
        </motion.p>
      </section>

      {/* Quick Access Features */}
      <section className="w-full flex flex-col items-center space-y-12">
        <motion.h2
          variants={textVariants}
          className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        >
          Quick Actions
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {chatHomeFeatures.map((feature, index) => (
            <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(feature.link)}
                className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.2),-10px_0_20px_rgba(255,0,0,0.2)] transition-all duration-300 cursor-pointer`}
              >
                {feature.icon}
                <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
              </motion.div>
            </Tilt>
          ))}
        </div>
      </section>

      {/* Placeholder for Recent Messages or Groups */}
      <section className="w-full flex flex-col items-center space-y-8">
        <motion.h2
          variants={textVariants}
          className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        >
          Get Started
        </motion.h2>
        <motion.p
          variants={textVariants}
          className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center`}
        >
          Pick an action above to dive into your chats!
        </motion.p>
      </section>
    </div>
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col pt-20 overflow-x-hidden`}
    >
      <Navbar />
      {isAuthenticated ? <ChatHome /> : <NormalHome />}
      {/* Theme Toggle */}
      <motion.div whileHover={{ scale: 1.1 }} className="fixed top-20 right-4 z-50">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-300'}`}>
          {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
        </button>
      </motion.div>
      <motion.footer variants={footerVariants} initial="hidden" animate="visible" className={`${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'} py-6 border-t`}>
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
  );
};

export default Home;
