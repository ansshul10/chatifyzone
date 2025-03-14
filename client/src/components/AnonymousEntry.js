import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import {
  FaUserSecret,
  FaArrowRight,
  FaCheckCircle,
  FaComment,
  FaShieldAlt,
  FaRocket,
  FaGlobe,
  FaStar,
  FaEnvelope,
  FaQuestionCircle,
  FaSun,
  FaMoon,
  FaDice,
} from 'react-icons/fa';
import api from '../utils/api';
import Navbar from './Navbar';

const AnonymousEntry = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Theme state
  const navigate = useNavigate();

  // Random username generator
  const generateRandomUsername = () => {
    const adjectives = ['Mystic', 'Silent', 'Swift', 'Shadow', 'Clever'];
    const nouns = ['Fox', 'Wolf', 'Eagle', 'Ghost', 'Rider'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 100);
    setUsername(`${randomAdj}${randomNoun}${randomNum}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.length > 20) {
      setError('Username must be 20 characters or less');
      return;
    }

    try {
      const { data } = await api.post('/chat/anonymous-session', { username });
      localStorage.setItem('anonymousId', data.anonymousId);
      localStorage.setItem('anonymousUsername', username);
      api.defaults.headers.common['x-anonymous-id'] = data.anonymousId;
      console.log('Anonymous login successful:', { anonymousId: data.anonymousId, username });
      setSuccess(true);
      setTimeout(() => navigate('/chat'), 2000);
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to start anonymous chat');
    }
  };

  // Animation Variants
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

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: '#FF0000', transition: { duration: 0.3 } },
    focus: { scale: 1.05, boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)', transition: { duration: 0.3 } },
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

  // Feature Data for "Why Go Anonymous?"
  const whyAnonymousFeatures = [
    { icon: <FaComment className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Instant Chat', desc: 'Start chatting right away—no delays!' },
    { icon: <FaShieldAlt className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Total Privacy', desc: 'No personal data needed, ever.' },
    { icon: <FaRocket className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Fast Access', desc: 'Quick and lightweight experience.' },
    { icon: <FaGlobe className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Global Reach', desc: 'Connect with users worldwide.' },
  ];

  // Anonymous Entry Features Data
  const anonymousFeatures = [
    { icon: <FaRocket className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Quick Chat', desc: 'Quick chat without signup' },
    { icon: <FaShieldAlt className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Privacy First', desc: 'No personal info required' },
    { icon: <FaComment className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Basic Messaging', desc: 'Basic messaging with others' },
  ];

  // Logged-In Features Data
  const loggedInFeatures = [
    { icon: <FaCheckCircle className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Block Users', desc: 'Block or report users' },
    { icon: <FaCheckCircle className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Add Friends', desc: 'Add friends for quick access' },
    { icon: <FaCheckCircle className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Chat History', desc: 'Persistent chat history' },
  ];

  // Testimonial Data
  const testimonials = [
    { quote: 'Love the anonymity—chatting without worry is amazing!', author: 'Hidden User' },
    { quote: 'Super fast and easy to use, perfect for quick chats.', author: 'Ghost V.' },
    { quote: 'The privacy features make this my go-to app!', author: 'Secret K.' },
  ];

  // FAQ Data
  const faqs = [
    { question: 'What is anonymous entry?', answer: 'Chat without an account using just a username.' },
    { question: 'Is it secure?', answer: 'Yes, your chats are encrypted and no personal info is stored.' },
    { question: 'Can I switch to a full account?', answer: 'Absolutely, sign up anytime for more features!' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col pt-16 relative overflow-x-hidden`}
    >
      <Navbar />
      <div className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">
        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <motion.div
            variants={textVariants}
            className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-red-500">
              Join Chatify Anonymously
            </h1>
            <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
              Chat instantly as a guest or unlock more with a full account—your privacy, your choice!
            </p>

            {/* Anonymous Entry Features with Tilt */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-center lg:text-left text-red-500">Anonymous Entry Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {anonymousFeatures.map((feature, index) => (
                  <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
                    <motion.div
                      variants={cardVariants}
                      whileHover={{ scale: 1.05 }}
                      className={`p-4 rounded-lg shadow-md border h-40 flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.2),-10px_0_20px_rgba(255,0,0,0.2)] transition-all duration-300`}
                    >
                      {feature.icon}
                      <h3 className={`text-lg font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                      <p className={`text-sm text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
                    </motion.div>
                  </Tilt>
                ))}
              </div>
            </div>

            {/* Logged-In Features with Tilt */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-center lg:text-left text-green-500">Logged-In Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loggedInFeatures.map((feature, index) => (
                  <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
                    <motion.div
                      variants={cardVariants}
                      whileHover={{ scale: 1.05 }}
                      className={`p-4 rounded-lg shadow-md border h-40 flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(0,255,0,0.2),-10px_0_20px_rgba(0,255,0,0.2)] transition-all duration-300`}
                    >
                      {feature.icon}
                      <h3 className={`text-lg font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                      <p className={`text-sm text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
                    </motion.div>
                  </Tilt>
                ))}
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.05 }} className="mt-6 flex items-center space-x-4 justify-center lg:justify-start">
              <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ready to Chat?</span>
              <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
            </motion.div>
          </motion.div>

          {/* Right Side - Form with Tilt */}
          <motion.div variants={formVariants} className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0 pt-16">
            <Tilt tiltMaxAngleX={20} tiltMaxAngleY={20} perspective={1000} className="w-full max-w-md">
              <div className={`p-6 sm:p-8 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.3),-10px_0_20px_rgba(255,0,0,0.3)] transition-all duration-300`}>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${isDarkMode ? 'text-white hover:text-red-600' : 'text-gray-900 hover:text-red-500'} transition-colors duration-300`}>
                  Enter Anonymously
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="relative">
                    <motion.div
                      whileHover="hover"
                      whileFocus="focus"
                      variants={inputVariants}
                      className={`flex items-center border rounded-lg p-3 transition-all duration-300 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-white border-gray-300'}`}
                    >
                      <FaUserSecret className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        className={`w-full bg-transparent focus:outline-none ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                        maxLength={20}
                        required
                      />
                    </motion.div>
                    <span className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{username.length}/20</span>
                  </div>
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    type="button"
                    onClick={generateRandomUsername}
                    className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} p-3 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2`}
                  >
                    <FaDice />
                    <span>Random Username</span>
                  </motion.button>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-sm text-center bg-red-900 bg-opacity-20 p-2 rounded"
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
                        className="text-green-500 text-sm text-center flex items-center justify-center space-x-2 bg-green-900 bg-opacity-20 p-2 rounded"
                      >
                        <FaCheckCircle />
                        <span>Welcome! Joining chat...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button
                    type="submit"
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                    className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} p-4 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 hover:shadow-xl transition-shadow duration-300`}
                    disabled={success}
                  >
                    <span>Join Chat</span>
                    <FaArrowRight />
                  </motion.button>
                </form>

                <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-2`}>
                  <div>
                    Want full features?{' '}
                    <a href="/signup" className="text-red-500 hover:underline hover:text-red-400 transition-colors">
                      Sign up here
                    </a>
                  </div>
                  <div>
                    Already have an account?{' '}
                    <a href="/login" className="text-red-500 hover:underline hover:text-red-400 transition-colors">
                      Login here
                    </a>
                  </div>
                </div>
              </div>
            </Tilt>
          </motion.div>
        </section>

        {/* Theme Toggle */}
        <motion.div whileHover={{ scale: 1.1 }} className="fixed top-20 right-4 z-50">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-300'}`}>
            {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
          </button>
        </motion.div>

        {/* Why Go Anonymous Section */}
        <section className="w-full flex flex-col items-center space-y-12 py-12">
          <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Why Go Anonymous? 🤔
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {whyAnonymousFeatures.map((feature, index) => (
              <Tilt key={index} tiltMaxAngleX={15} tiltMaxAngleY={15} perspective={1000}>
                <motion.div
                  variants={cardVariants}
                  whileHover={{ scale: 1.05 }}
                  className={`p-6 rounded-lg shadow-md border h-48 flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'} hover:shadow-[10px_0_20px_rgba(255,0,0,0.2),-10px_0_20px_rgba(255,0,0,0.2)] transition-all duration-300`}
                >
                  {feature.icon}
                  <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                  <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
                </motion.div>
              </Tilt>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full flex flex-col items-center space-y-12 py-12">
          <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            What Users Say 💬
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                className={`p-6 rounded-lg shadow-md border ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'}`}
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
            <a href="/contact" className="text-red-500 hover:underline flex items-center justify-center space-x-2">
              <FaEnvelope />
              <span>Have more questions? Contact us!</span>
            </a>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section className="w-full flex flex-col items-center space-y-12 py-12">
          <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Anonymous Chat Stats 📊
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

      {/* Footer */}
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

export default AnonymousEntry;
