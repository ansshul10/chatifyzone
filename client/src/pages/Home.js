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
  FaQuestionCircle,
  FaArrowRight,
  FaSun,
  FaMoon,
  FaUsers,
  FaPaperPlane,
  FaHistory,
  FaUserPlus,
  FaBan,
  FaUserEdit,
  FaVideo,
  FaMicrophone,
  FaGem,
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Navbar from '../components/Navbar'; // Adjust path as needed

const Home = () => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const anonymousId = localStorage.getItem('anonymousId');
    if (token) {
      setIsAuthenticated(true);
      setIsAnonymous(false);
    } else if (anonymousId) {
      setIsAuthenticated(false);
      setIsAnonymous(true);
    } else {
      setIsAuthenticated(false);
      setIsAnonymous(false);
    }
  }, [navigate]);

  // Animation Variants
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } } };
  const textVariants = { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5 } } };
  const buttonVariants = { hover: { scale: 1.1, backgroundColor: isDarkMode ? '#1A1A1A' : '#d1d5db', transition: { duration: 0.3 } }, tap: { scale: 0.95 } };
  const cardVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
  const footerVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } } };

  // Jitsi Meet Component
  const VoiceVideoRoom = ({ roomName }) => (
    <motion.div variants={cardVariants} className="w-full h-96 rounded-lg overflow-hidden shadow-md border border-gray-700">
      <iframe
        // eslint-disable-next-line react/no-unescaped-entities
        src={`https://meet.jit.si/${roomName}?config.defaultLanguage="en"`}
        allow="camera; microphone; fullscreen"
        className="w-full h-full border-none"
        title="Voice and Video Chat"
      />
    </motion.div>
  );

  VoiceVideoRoom.propTypes = {
    roomName: PropTypes.string.isRequired,
  };

  // Feature Data for Normal Home
  const features = [
    { icon: <FaComment className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Instant⚡', desc: 'Zero-delay chats anytime, anywhere.' },
    { icon: <FaShieldAlt className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Top Security 🔒', desc: 'End-to-end encryption for peace of mind.' },
    { icon: <FaRocket className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Blazing Fast 🚀', desc: 'Lightweight and optimized for all devices.' },
    { icon: <FaGlobe className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Global Reach 🌍', desc: 'Connect with users worldwide effortlessly.' },
    { icon: <FaVideo className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Voice & Video 🎥', desc: 'Free calls with crystal-clear quality.' },
  ];

  // Community Spotlight Data
  const communitySpotlight = [
    { title: 'Global Chatters', desc: 'Join 10K+ users in our biggest group!', link: '/group-chat' },
    { title: 'Trivia Night', desc: 'Live event every Friday—test your wits!', link: '/events' },
    { title: 'Anon Hangout', desc: 'Casual voice room for anonymous fun.', link: '/chat' },
  ];

  // Testimonial Data
  const testimonials = [
    { quote: 'Chatify’s voice rooms are insanely fun!', author: 'Anonymous User' },
    { quote: 'Fastest chat app I’ve ever used—love it!', author: 'Raj' },
    { quote: 'Secure and global—perfect combo!', author: 'Sakshi' },
  ];

  // FAQ Data
  const faqs = [
    { question: 'What is Chatify?', answer: 'A cutting-edge platform for real-time, secure, and anonymous communication.' },
    { question: 'Are voice/video calls free?', answer: 'Yes, completely free using our integrated system!' },
    { question: 'Can I stay anonymous?', answer: 'Absolutely—chat or call without revealing your identity.' },
  ];

  // Chat Home Features
  const chatHomeFeatures = [
    { icon: <FaPaperPlane className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Start a Chat', desc: 'Message instantly.', link: '/chat' },
    { icon: <FaUsers className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Join Groups', desc: 'Explore or create groups.', link: '/group-chat' },
    { icon: <FaVideo className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Voice/Video Call', desc: 'Connect live with friends.', link: '#' },
  ];

  // Anonymous Home Features
  const anonymousHomeFeatures = [
    { icon: <FaPaperPlane className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Quick Chat', desc: 'Start messaging instantly.', link: '/chat' },
    { icon: <FaUsers className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Join Groups', desc: 'Explore public groups.', link: '/group-chat' },
    { icon: <FaMicrophone className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Voice Room', desc: 'Join live audio chats.', link: '#' },
  ];

  // Sign-Up Benefits
  const signUpBenefits = [
    { icon: <FaHistory className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Chat History', desc: 'Access past messages anytime.' },
    { icon: <FaUserPlus className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Friend Lists', desc: 'Build and manage contacts.' },
    { icon: <FaBan className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Block Users', desc: 'Control who you chat with.' },
    { icon: <FaUsers className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Create Groups', desc: 'Start your own communities.' },
    { icon: <FaUserEdit className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Custom Profile', desc: 'Personalize your identity.' },
    { icon: <FaVideo className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Private Calls', desc: 'Exclusive voice/video rooms.' },
  ];

  // NormalHome
  const NormalHome = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16 flex-grow">
      {/* Simplified Hero Section */}
      <section className="flex flex-col lg:flex-row gap-8 lg:gap-12 bg-gradient-to-r from-red-500/10 to-blue-500/10 rounded-xl p-8">
        <motion.div variants={textVariants} className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0">
          <h1 className={`text-3xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Chatify : Chat Hub 🌌
          </h1>
          <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left max-w-xl`}>
            Connect instantly, chat anonymously, or hop into voice/video rooms Chatify brings the world to your fingertips.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-6">
            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
              <Link to="/login" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} hover:shadow-[0_0_15px_rgba(255,0,0,0.5)]`}>
                <FaUser />
                <span>Login</span>
              </Link>
            </motion.div>
            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
              <Link to="/anonymous" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} hover:shadow-[0_0_15px_rgba(255,0,0,0.5)]`}>
                <FaArrowRight />
                <span>Go Anonymous</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="w-full lg:w-1/2 flex items-center justify-center">
          <Tilt tiltMaxAngleX={20} tiltMaxAngleY={20} perspective={1000} className="w-full max-w-lg">
            <div className={`p-6 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.3),-10px_0_20px_rgba(255,0,0,0.3)] transform transition-all duration-300`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 text-center ${isDarkMode ? 'text-white hover:text-red-600' : 'text-gray-900 hover:text-red-500'} transition-colors duration-300`}>
                🚀 Dive into Chatify
              </h2>
              <ul className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} space-y-4`}>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Real-time chats & calls</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Anonymous freedom</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Secure & private</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Global community</span></li>
              </ul>
            </div>
          </Tilt>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="w-full flex flex-col items-center space-y-12 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Why Chatify Rocks in 2025 🎸
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
          {features.map((feature, index) => (
            <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
              <motion.div variants={cardVariants} whileHover={{ scale: 1.05, rotate: 2 }} onHoverStart={() => setActiveFeature(null)} onHoverEnd={() => setActiveFeature(null)} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.2),-10px_0_20px_rgba(255,0,0,0.2)] transition-all duration-300`}>
                {feature.icon}
                <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
                <AnimatePresence>
                  {activeFeature === index && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-sm mt-2 text-center">
                      Explore Now →
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Tilt>
          ))}
        </div>
      </section>

      {/* Community Spotlight */}
      <section className="w-full flex flex-col items-center space-y-12 py-12 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Community Spotlight 🌟
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-1/2">
          {communitySpotlight.map((spotlight, index) => (
            <motion.div key={index} variants={cardVariants} whileHover={{ scale: 1.05 }} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(0,0,255,0.2),-10px_0_20px_rgba(0,0,255,0.2)] transition-all duration-300`}>
              <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{spotlight.title}</h3>
              <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{spotlight.desc}</p>
              <Link to={spotlight.link} className="text-red-500 hover:underline flex items-center justify-center mt-4">
                <FaArrowRight className="mr-2" /> Join Now
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className={`w-full flex flex-col items-center space-y-12 py-12 rounded-xl p-6 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}>
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Voices of Chatify 💬
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {testimonials.map((testimonial, index) => (
            <motion.div key={index} variants={cardVariants} whileHover={{ y: -10 }} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-400'}`}>
              <FaStar className="text-yellow-400 text-2xl mb-4 mx-auto" />
              <p className={`text-center italic ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>&quot{testimonial.quote}&quot</p>
              <p className="text-red-500 font-semibold text-center mt-4">— {testimonial.author}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="w-full flex flex-col items-center space-y-12 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Got Questions? ❓
        </motion.h2>
        <div className="w-full max-w-3xl space-y-6">
          {faqs.map((faq, index) => (
            <motion.div key={index} variants={cardVariants} whileHover={{ scale: 1.02 }} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'}`}>
              <div className="flex items-center space-x-3">
                <FaQuestionCircle className="text-red-500 text-xl" />
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{faq.question}</h3>
              </div>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{faq.answer}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full flex flex-col items-center space-y-8 py-12 bg-gradient-to-r from-purple-500/10 to-red-500/10 rounded-xl">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Join the Chat Revolution 🚀
        </motion.h2>
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-2xl`}>
          Sign up now for exclusive features—or start anonymously and upgrade later!
        </motion.p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
            <Link to="/signup" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300`}>
              <FaGem />
              <span>Sign Up Free</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Link to="/anonymous" className="text-red-500 hover:underline flex items-center justify-center space-x-2">
              <FaArrowRight />
              <span>Start Anonymously</span>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );

  // ChatHome
  const ChatHome = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16 flex-grow">
      <section className="flex flex-col items-center space-y-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-8">
        <motion.h1 variants={textVariants} className={`text-3xl sm:text-5xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Hey, Chatify Pro! 🌟
        </motion.h1>
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-2xl`}>
          Your chats, calls, and communities are ready—dive in!
        </motion.p>
      </section>
      <section className="w-full flex flex-col items-center space-y-12">
        <motion.h2 variants={textVariants} className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Your Tools
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {chatHomeFeatures.map((feature, index) => (
            <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
              <motion.div variants={cardVariants} whileHover={{ scale: 1.05, rotate: 2 }} onClick={() => navigate(feature.link)} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.2),-10px_0_20px_rgba(255,0,0,0.2)] transition-all duration-300 cursor-pointer`}>
                {feature.icon}
                <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
              </motion.div>
            </Tilt>
          ))}
        </div>
      </section>
      <section className="w-full flex flex-col items-center space-y-8">
        <motion.h2 variants={textVariants} className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Private Voice & Video
        </motion.h2>
        <VoiceVideoRoom roomName={`ChatifyPrivateRoom-${Math.random().toString(36).substr(2, 9)}`} />
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center`}>
          Start a private call—unique room just for you!
        </motion.p>
      </section>
    </div>
  );

  // AnonymousHome
  const AnonymousHome = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16 flex-grow">
      {/* Simplified Hero */}
      <section className="flex flex-col lg:flex-row gap-8 lg:gap-12 bg-gradient-to-r from-purple-500/10 to-red-500/10 rounded-xl p-8">
        <motion.div variants={textVariants} className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0">
          <h1 className={`text-3xl sm:text-5xl font-extrabold text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome, Anonymous Legend! 🕵️‍♂️
          </h1>
          <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left max-w-xl`}>
            Chat without limits—text, voice, or video—all incognito and free.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} className="flex justify-center lg:justify-start">
            <Link to="/chat" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} hover:shadow-[0_0_15px_rgba(255,0,0,0.5)]`}>
              <FaPaperPlane />
              <span>Start Now</span>
            </Link>
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="w-full lg:w-1/2 flex items-center justify-center">
          <Tilt tiltMaxAngleX={20} tiltMaxAngleY={20} perspective={1000} className="w-full max-w-lg">
            <div className={`p-6 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.3),-10px_0_20px_rgba(255,0,0,0.3)] transform transition-all duration-300`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 text-center ${isDarkMode ? 'text-white hover:text-red-600' : 'text-gray-900 hover:text-red-500'} transition-colors duration-300`}>
                Your Anon Toolkit 🚀
              </h2>
              <ul className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} space-y-4`}>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Instant messaging</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Public voice rooms</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Total anonymity</span></li>
              </ul>
            </div>
          </Tilt>
        </motion.div>
      </section>

      {/* Current Features */}
      <section className="w-full flex flex-col items-center space-y-12">
        <motion.h2 variants={textVariants} className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Your Anon Powers
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {anonymousHomeFeatures.map((feature, index) => (
            <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
              <motion.div variants={cardVariants} whileHover={{ scale: 1.05, rotate: 2 }} onClick={() => navigate(feature.link)} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.2),-10px_0_20px_rgba(255,0,0,0.2)] transition-all duration-300 cursor-pointer`}>
                {feature.icon}
                <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
              </motion.div>
            </Tilt>
          ))}
        </div>
      </section>

      {/* Public Voice Room */}
      <section className="w-full flex flex-col items-center space-y-8">
        <motion.h2 variants={textVariants} className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Join a Public Voice Room 🎙️
        </motion.h2>
        <VoiceVideoRoom roomName="ChatifyPublicRoom" />
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center`}>
          Hop into a live chat with others—no sign-up needed!
        </motion.p>
      </section>

      {/* Sign-Up Benefits */}
      <section className="w-full flex flex-col items-center space-y-12 py-12 bg-gradient-to-r from-red-500/10 to-green-500/10 rounded-xl">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Level Up with Sign-Up 🌟
        </motion.h2>
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-2xl`}>
          Unlock a world of premium features—free forever when you join now!
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {signUpBenefits.map((benefit, index) => (
            <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
              <motion.div variants={cardVariants} whileHover={{ scale: 1.05, rotate: 2 }} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(0,255,0,0.2),-10px_0_20px_rgba(0,255,0,0.2)] transition-all duration-300`}>
                {benefit.icon}
                <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{benefit.title}</h3>
                <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{benefit.desc}</p>
              </motion.div>
            </Tilt>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full flex flex-col items-center space-y-8 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Ready for More? 🎉
        </motion.h2>
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-2xl`}>
          Sign up to unlock private calls, custom profiles, and more—or keep it anonymous!
        </motion.p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
            <Link to="/signup" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300`}>
              <FaGem />
              <span>Sign Up Free</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Link to="/chat" className="text-red-500 hover:underline flex items-center justify-center space-x-2">
              <FaArrowRight />
              <span>Stay Anonymous</span>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col pt-20 overflow-x-hidden`}>
      <Navbar />
      {isAuthenticated ? <ChatHome /> : isAnonymous ? <AnonymousHome /> : <NormalHome />}
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
            <a href="/terms" className="hover:text-red-500 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-red-500 transition-colors">Privacy</a>
            <a href="/contact" className="hover:text-red-500 transition-colors">Contact</a>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
};

export default Home;
