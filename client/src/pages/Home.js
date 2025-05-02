/* eslint-disable no-undef */
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
  FaPaperPlane,
  FaHistory,
  FaUserPlus,
  FaBan,
  FaUserEdit,
  FaGem,
  FaEnvelope,
  FaUserCircle,
  FaUsers,
  FaClock,
  FaTwitter,
  FaGithub,
  FaDiscord,
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';

// Separate Email Subscription Component
const EmailSubscription = ({ isDarkMode }) => {
  const [email, setEmail] = useState('');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Submit button clicked with email:', email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubscriptionMessage('Please enter a valid email address.');
      setTimeout(() => setSubscriptionMessage(''), 5000);
      return;
    }

    try {
      const response = await api.post('/auth/subscribe', { email });
      console.log('Subscription response:', response.data);
      setSubscriptionMessage(response.data.msg);
      setEmail('');
      setTimeout(() => setSubscriptionMessage(''), 5000);
    } catch (err) {
      console.error('Subscription error:', err.response?.data.msg || err.message);
      setSubscriptionMessage(err.response?.data.msg || 'Failed to subscribe. Please try again later.');
      setTimeout(() => setSubscriptionMessage(''), 5000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Enter key prevented in email input');
    }
  };

  const handleChange = (e) => {
    console.log('Typing email:', e.target.value);
    setEmail(e.target.value);
  };

  return (
    <section className="w-full flex flex-col items-center space-y-6 py-12">
      <h2 className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Join Our Newsletter 📧
      </h2>
      <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-xl`}>
        Get the latest updates, tips, and exclusive offers from ChatifyZone!
      </p>
      <form
        id="email-subscription-form"
        onSubmit={handleSubmit}
        className="w-full max-w-lg flex flex-col sm:flex-row gap-3"
        noValidate
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            console.log('Form-level Enter key prevented');
          }
        }}
      >
        <input
          type="email"
          value={email}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Your email address"
          className={`flex-1 p-3 rounded-md border-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:border-red-500 transition-colors duration-200`}
          autoComplete="off"
          aria-label="Email address"
        />
        <button
          type="submit"
          className={`px-4 py-3 rounded-md font-semibold flex items-center justify-center gap-2 ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'} hover:bg-red-700 transition-colors duration-200`}
        >
          <FaEnvelope />
          <span>Subscribe</span>
        </button>
      </form>
      {subscriptionMessage && (
        <p
          className={`text-center text-sm ${subscriptionMessage.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}
        >
          {subscriptionMessage}
        </p>
      )}
    </section>
  );
};

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
  }, []);

  // Animation Variants
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } } };
  const textVariants = { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5 } } };
  const buttonVariants = { hover: { scale: 1.1, transition: { duration: 0.3 } }, tap: { scale: 0.95 } };
  const cardVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
  const footerVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } } };

  // Feature Data for Normal Home
  const features = [
    { icon: <FaComment className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Instant⚡', desc: 'Zero-delay chats anytime, anywhere.' },
    { icon: <FaShieldAlt className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Top Security 🔒', desc: 'End-to-end encryption for peace of mind.' },
    { icon: <FaRocket className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Blazing Fast 🚀', desc: 'Lightweight and optimized for all devices.' },
    { icon: <FaGlobe className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Global Reach 🌍', desc: 'Connect with users worldwide effortlessly.' },
  ];

  // Community Spotlight Data
  const communitySpotlight = [
    { title: 'Trivia Night', desc: 'Live event every Friday—test your wits!', link: '/events' },
    { title: 'Anon Hangout', desc: 'Casual chat room for anonymous fun.', link: '/chat' },
  ];

  // Testimonial Data
  const testimonials = [
    { quote: 'ChatifyZone’s chat rooms are insanely fun!', author: 'Anonymous User' },
    { quote: 'Fastest chat app I’ve ever used—love it!', author: 'Raj' },
    { quote: 'Secure and global—perfect combo!', author: 'Sakshi' },
  ];

  // FAQ Data
  const faqs = [
    { question: 'What is ChatifyZone?', answer: 'A cutting-edge platform for real-time, secure, and anonymous communication.' },
    { question: 'Can I stay anonymous?', answer: 'Absolutely—chat without revealing your identity.' },
  ];

  // Chat Home Features
  const chatHomeFeatures = [
    { icon: <FaPaperPlane className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Start a Chat', desc: 'Message instantly.', link: '/chat' },
    { icon: <FaUserCircle className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'View Profile', desc: 'Customize your identity.', link: '/profile' },
    { icon: <FaUsers className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Manage Friends', desc: 'Connect with buddies.', link: '/friends' },
    { icon: <FaClock className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Recent Chats', desc: 'Pick up where you left off.', link: '/chat' },
  ];

  // Anonymous Home Features
  const anonymousHomeFeatures = [
    { icon: <FaPaperPlane className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Quick Chat', desc: 'Start messaging instantly.', link: '/chat' },
  ];

  // Sign-Up Benefits
  const signUpBenefits = [
    { icon: <FaHistory className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Chat History', desc: 'Access past messages anytime.' },
    { icon: <FaUserPlus className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Friend Lists', desc: 'Build and manage contacts.' },
    { icon: <FaBan className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Block Users', desc: 'Control who you chat with.' },
    { icon: <FaUserEdit className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Custom Profile', desc: 'Personalize your identity.' },
  ];

  // NormalHome
  const NormalHome = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16 flex-grow">
      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row gap-8 lg:gap-12 bg-gradient-to-r from-red-500/10 to-blue-500/10 rounded-xl p-8">
        <motion.div variants={textVariants} className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0">
          <h1 className={`text-3xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ChatifyZone
          </h1>
          <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left max-w-xl`}>
            Connect instantly and chat anonymously. ChatifyZone brings the world to your fingertips.
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
                🚀 Dive into ChatifyZone
              </h2>
              <ul className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} space-y-4`}>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Real-time chats</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Anonymous freedom</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Secure & private</span></li>
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Global community</span></li>
              </ul>
            </div>
          </Tilt>
        </motion.div>
      </section>

      {/* Email Subscription Section */}
      <EmailSubscription isDarkMode={isDarkMode} />

      {/* Features Section */}
      <section className="w-full flex flex-col items-center space-y-12 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Why ChatifyZone Rocks in 2025 🎸
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
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

      {/* Testimonials */}
      <section className={`w-full flex flex-col items-center space-y-12 py-12 rounded-xl p-6 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}>
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Voices of ChatifyZone 💬
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {testimonials.map((testimonial, index) => (
            <motion.div key={index} variants={cardVariants} whileHover={{ y: -10 }} className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-400'}`}>
              <FaStar className="text-yellow-400 text-2xl mb-4 mx-auto" />
              <p className={`text-center italic ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{testimonial.quote}"</p>
              <p className="text-red-500 font-semibold text-center mt-4">— {testimonial.author}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="w-full flex flex-col items-center space-y-12 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Got Questions❓
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
      {/* Hero Section */}
      <section className="flex flex-col items-center space-y-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-8">
        <motion.h1 variants={textVariants} className={`text-3xl sm:text-5xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Welcome Back, ChatifyZone Pro! 🌟
        </motion.h1>
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-2xl`}>
          Your chats are ready—dive into seamless messaging, manage your connections, and personalize your experience!
        </motion.p>
        <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
          <Link to="/chat" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300`}>
            <FaPaperPlane />
            <span>Start Chatting Now</span>
          </Link>
        </motion.div>
      </section>

      {/* Tools Section */}
      <section className="w-full flex flex-col items-center space-y-12">
        <motion.h2 variants={textVariants} className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Your ChatifyZone Dashboard
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {chatHomeFeatures.map((feature, index) => (
            <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.05, rotate: 2 }}
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

      {/* Why Upgrade Section */}
      <section className="w-full flex flex-col items-center space-y-12 py-12 bg-gradient-to-r from-purple-500/10 to-red-500/10 rounded-xl">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Unlock Premium Features 🚀
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {signUpBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ scale: 1.05 }}
              className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(0,255,0,0.2),-10px_0_20px_rgba(0,255,0,0.2)] transition-all duration-300`}
            >
              {benefit.icon}
              <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{benefit.title}</h3>
              <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
          <Link to="/premium" className={`p-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} hover:shadow-[0_0_20px_rgba(255,0,0,0.7)] transition-all duration-300`}>
            <FaGem />
            <span>Go Premium</span>
          </Link>
        </motion.div>
      </section>

      {/* Recent Activity Teaser */}
      <section className="w-full flex flex-col items-center space-y-8 py-12">
        <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Recent Activity 📬
        </motion.h2>
        <motion.p variants={textVariants} className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-center max-w-2xl`}>
          Stay connected with your recent chats and friends.
        </motion.p>
        <motion.div
          variants={cardVariants}
          className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} w-full max-w-md`}
        >
          <p className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Check your latest messages and updates!</p>
          <Link to="/chat" className="text-red-500 hover:underline flex items-center justify-center mt-4">
            <FaArrowRight className="mr-2" /> View Now
          </Link>
        </motion.div>
      </section>
    </div>
  );

  // AnonymousHome
  const AnonymousHome = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16 flex-grow">
      <section className="flex flex-col lg:flex-row gap-8 lg:gap-12 bg-gradient-to-r from-purple-500/10 to-red-500/10 rounded-xl p-8">
        <motion.div variants={textVariants} className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0">
          <h1 className={`text-3xl sm:text-5xl font-extrabold text-center lg:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome, Anonymous Legend! 🕵️‍♂️
          </h1>
          <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left max-w-xl`}>
            Chat without limits—text incognito and free.
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
                <li className="flex items-start space-x-2"><FaCheckCircle className="text-red-500 mt-1" /><span>Total anonymity</span></li>
              </ul>
            </div>
          </Tilt>
        </motion.div>
      </section>

      <section className="w-full flex flex-col items-center space-y-12">
        <motion.h2 variants={textVariants} className={`text-2xl sm:text-3xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Your Anon Powers
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
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
    </div>
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'} pt-20`}
    >
      <Navbar setIsDarkMode={setIsDarkMode} isDarkMode={isDarkMode} />
      {isAuthenticated ? <ChatHome /> : isAnonymous ? <AnonymousHome /> : <NormalHome />}
      <motion.footer
        variants={footerVariants}
        className={`mt-auto py-4 px-4 sm:px-6 lg:px-8 bg-[#1A1A1A] rounded-t-l`}
      >
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Links</h3>
            <ul className="space-y-2 text-sm sm:text-base">
              <li>
                <Link to="/terms" className={`text-red-500 hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} aria-label="Terms of Service">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={`text-red-500 hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} aria-label="Privacy Policy">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Connect With Us</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 transition-colors duration-200"
                aria-label="Follow us on Twitter"
              >
                <FaTwitter className="text-2xl" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 transition-colors duration-200"
                aria-label="Visit our GitHub"
              >
                <FaGithub className="text-2xl" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 transition-colors duration-200"
                aria-label="Join our Discord"
              >
                <FaDiscord className="text-2xl" />
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>ChatifyZone</h3>
            <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              © 2025 ChatifyZone. All rights reserved.
            </p>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
};

export default Home;
