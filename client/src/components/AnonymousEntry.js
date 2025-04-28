import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUserSecret,
  FaArrowRight,
  FaCheckCircle,
  FaComment,
  FaShieldAlt,
  FaRocket,
  FaGlobe,
  FaEnvelope,
  FaQuestionCircle,
  FaSun,
  FaMoon,
  FaDice,
  FaHistory,
  FaUserPlus,
  FaBan,
  FaUserEdit,
} from 'react-icons/fa';
import { Country, State } from 'country-state-city';
import api from '../utils/api';
import Navbar from './Navbar';

// Transform country-state-city data into a usable format
const countryList = Country.getAllCountries()
  .map((c) => ({
    iso2: c.isoCode,
    name: c.name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

const getStatesForCountry = (iso2) => {
  console.log('[getStatesForCountry] Fetching states for iso2:', iso2);
  if (!iso2) {
    console.log('[getStatesForCountry] No iso2 provided, returning empty array');
    return [];
  }
  const states = State.getStatesOfCountry(iso2)
    .map((s) => ({
      name: s.name,
      iso2: s.isoCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  console.log('[getStatesForCountry] States found:', states);
  return states;
};

const AnonymousEntry = () => {
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [states, setStates] = useState([]);
  const navigate = useNavigate();

  // Update states when country changes
  useEffect(() => {
    console.log('[AnonymousEntry] Country changed:', country);
    if (!country) {
      setStates([]);
      setState('');
      console.log('[AnonymousEntry] No country selected, states reset');
      return;
    }
    const newStates = getStatesForCountry(country);
    setStates(newStates);
    setState(''); // Reset state when country changes
    console.log('[AnonymousEntry] States updated for country', country, ':', newStates);
  }, [country]);

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
    setIsLoading(true);

    if (!username.trim()) {
      setError('Please enter a username');
      setIsLoading(false);
      return;
    }
    if (username.length > 20) {
      setError('Username must be 20 characters or less');
      setIsLoading(false);
      return;
    }
    if (!country) {
      setError('Please select a country');
      setIsLoading(false);
      return;
    }
    if (states.length > 0 && !state) {
      setError('Please select a state');
      setIsLoading(false);
      return;
    }
    if (!age || age < 13 || age > 120) {
      setError('Please enter a valid age (13-120)');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/chat/anonymous-session', { username, country, state, age });
      localStorage.setItem('anonymousId', data.anonymousId);
      localStorage.setItem('anonymousUsername', username);
      localStorage.setItem('anonymousUser', JSON.stringify({ username, country, state, age }));
      api.defaults.headers.common['x-anonymous-id'] = data.anonymousId;
      console.log('Anonymous login successful:', { anonymousId: data.anonymousId, username, country, state, age });
      setSuccess(true);
      setTimeout(() => navigate('/chat'), 2000);
    } catch (err) {
      setError(err.response?.data.msg || 'Failed to start anonymous chat');
      setIsLoading(false);
    }
  };

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

  const successVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } },
  };

  const whyAnonymousFeatures = [
    { icon: <FaComment className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Instant Chat', desc: 'Start chatting right away—no delays!' },
    { icon: <FaShieldAlt className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Total Privacy', desc: 'No personal data needed, ever.' },
    { icon: <FaRocket className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Fast Access', desc: 'Quick and lightweight experience.' },
    { icon: <FaGlobe className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Global Reach', desc: 'Connect with users worldwide.' },
  ];

  const anonymousFeatures = [
    { icon: <FaRocket className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Quick Chat', desc: 'Instant messaging without signup' },
    { icon: <FaShieldAlt className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Privacy First', desc: 'No personal info required' },
    { icon: <FaComment className="text-red-500 text-3xl mb-4 mx-auto" />, title: 'Basic Messaging', desc: 'Chat with others simply' },
  ];

  const signedUpFeatures = [
    { icon: <FaHistory className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Chat History', desc: 'Persistent messages across sessions' },
    { icon: <FaUserPlus className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Add Friends', desc: 'Build a friend list' },
    { icon: <FaBan className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Block/Report', desc: 'Control who you chat with' },
    { icon: <FaUserEdit className="text-green-500 text-3xl mb-4 mx-auto" />, title: 'Profile', desc: 'Customize your identity' },
  ];

  const faqs = [
    { question: 'What is anonymous entry?', answer: 'Chat without an account using just a username.' },
    { question: 'What do signed-up users get?', answer: 'Chat history, friends, profile customization, and more!' },
    { question: 'Is it secure?', answer: 'Yes, chats are encrypted, and no personal data is stored for anonymous users.' },
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
        <section className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <motion.div
            variants={textVariants}
            className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:space-y-8 px-4 sm:px-0"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center lg:text-left bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-red-500">
              Join Chatify Your Way
            </h1>
            <p className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-center lg:text-left`}>
              Chat anonymously for free or sign up for premium features—your choice, your experience!
            </p>

            <div className="space-y-4 sm:space-y-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-center lg:text-left text-red-500">Anonymous Users Get</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {anonymousFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    variants={cardVariants}
                    className={`p-2 rounded-lg shadow-md border h-40 flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'}`}
                  >
                    {feature.icon}
                    <h3 className={`text-lg font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                    <p className={`text-sm text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-4 sm:space-y-10">
              <h2 className="text-xl sm:text-2xl font-semibold text-center lg:text-left text-green-500">Signed-Up Users Unlock</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                {signedUpFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    variants={cardVariants}
                    className={`p-4 rounded-lg shadow-md border h-40 flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'}`}
                  >
                    {feature.icon}
                    <h3 className={`text-lg font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                    <p className={`text-sm text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center space-x-4 justify-center lg:justify-start">
              <span className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ready to Chat?</span>
              <FaArrowRight className="text-red-500 text-xl sm:text-2xl" />
            </div>
          </motion.div>

          <motion.div variants={formVariants} className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-0 pt-16">
            <div className={`p-6 sm:p-8 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-gray-200 border-gray-400'} w-full max-w-md`}>
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Enter Anonymously
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-white border-gray-300'}`}>
                    <FaUserSecret className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className={`w-full bg-transparent focus:outline-none ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                      maxLength={20}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <span className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{username.length}/20</span>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-white border-gray-300'}`}>
                    <select
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setState('');
                        console.log('[AnonymousEntry] Country selected:', e.target.value);
                      }}
                      className={`w-full bg-[#1A1A1A] text-white focus:outline-none rounded-md`}
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select Country</option>
                      {countryList.map((c) => (
                        <option key={c.iso2} value={c.iso2}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-white border-gray-300'}`}>
                    <select
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        console.log('[AnonymousEntry] State selected:', e.target.value);
                      }}
                      className={`w-full bg-[#1A1A1A] text-white focus:outline-none rounded-md`}
                      disabled={isLoading}
                    >
                      <option value="">Select State</option>
                      {states.length > 0 ? (
                        states.map((s) => (
                          <option key={s.iso2} value={s.name}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No states available</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <div className={`flex items-center border rounded-lg p-3 ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-white border-gray-300'}`}>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Your Age (13-120)"
                      className={`w-full bg-transparent focus:outline-none ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                      min="13"
                      max="120"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={generateRandomUsername}
                  className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} p-3 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2`}
                  disabled={isLoading}
                >
                  <FaDice />
                  <span>Random Username</span>
                </button>

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
                <button
                  type="submit"
                  className={`w-full ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'} p-4 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2`}
                  disabled={success || isLoading}
                >
                  <span>{isLoading ? 'Joining...' : 'Join Chat'}</span>
                  <FaArrowRight />
                </button>
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
          </motion.div>
        </section>

        <div className="fixed top-20 right-4 z-50">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-300'}`}>
            {isDarkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
          </button>
        </div>

        <section className="w-full flex flex-col items-center space-y-12 py-12">
          <motion.h2 variants={textVariants} className={`text-3xl sm:text-4xl font-extrabold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Why Go Anonymous? 🤔
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {whyAnonymousFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                className={`p-6 rounded-lg shadow-md border h-48 flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A] border-gray-700' : 'bg-gray-200 border-gray-400'}`}
              >
                {feature.icon}
                <h3 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={`text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

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
          <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <a href="/contact" className="text-red-500 hover:underline flex items-center justify-center space-x-2">
              <FaEnvelope />
              <span>Have more questions? Contact us!</span>
            </a>
          </div>
        </section>

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
