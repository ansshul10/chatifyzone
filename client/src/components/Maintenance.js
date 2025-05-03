import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaQuestionCircle, FaEnvelope, FaTwitter, FaLinkedin, FaGithub, FaComment, FaCheckCircle, FaDownload, FaBell, FaPaperPlane } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import io from 'socket.io-client';
import axios from 'axios';

// Initialize WebSocket connection
const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
  withCredentials: true,
});

// API utility to fetch maintenance status
const checkMaintenanceStatus = async () => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/admin/settings/public`);
    return response.data;
  } catch (error) {
    console.error('[Maintenance Status] Fetch error:', error.message);
    throw error;
  }
};

const Maintenance = () => {
  const [timeLeft, setTimeLeft] = useState(7200); // Fallback to 2 hours in seconds
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing Maintenance...');
  const [faqOpen, setFaqOpen] = useState(null);
  const [faqSearch, setFaqSearch] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [maintenanceStartTime, setMaintenanceStartTime] = useState(null);
  const [maintenanceDuration, setMaintenanceDuration] = useState(120); // Default 2 hours in minutes
  const [statusLog, setStatusLog] = useState([]);
  const chatRef = useRef(null);

  // Maintenance phases for timeline
  const phases = [
    { name: 'Planning', progress: 20 },
    { name: 'Database Upgrade', progress: 40 },
    { name: 'Server Optimization', progress: 60 },
    { name: 'Security Enhancements', progress: 80 },
    { name: 'Testing & Finalization', progress: 100 },
  ];

  // Fetch maintenance status on mount and periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { maintenanceMode, maintenanceStartTime, maintenanceDuration } = await checkMaintenanceStatus();
        if (maintenanceMode && maintenanceStartTime && maintenanceDuration) {
          const startTime = new Date(maintenanceStartTime);
          setMaintenanceStartTime(startTime);
          setMaintenanceDuration(maintenanceDuration);
          const endTime = new Date(startTime.getTime() + maintenanceDuration * 60 * 1000);
          const now = new Date();
          const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000));
          setTimeLeft(secondsLeft);
        } else {
          setTimeLeft(7200); // Fallback to 2 hours
          setMaintenanceStartTime(null);
          setMaintenanceDuration(120);
        }
      } catch (error) {
        console.error('[Maintenance Status] Failed to fetch:', error.message);
        setTimeLeft(7200);
        setMaintenanceStartTime(null);
        setMaintenanceDuration(120);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Countdown timer and progress update
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          setProgress(100);
          setStatusMessage('Maintenance Complete');
          if (notificationsEnabled) {
            new Notification('ChatifyZone Maintenance Complete', {
              body: 'The site is back online! Thank you for your patience.',
            });
          }
          return 0;
        }
        const totalSeconds = maintenanceDuration * 60;
        const newProgress = Math.min(100, 100 - (prev / totalSeconds) * 100);
        setProgress(newProgress);
        const currentPhase = phases.find((phase) => newProgress <= phase.progress) || phases[phases.length - 1];
        setStatusMessage(`Phase: ${currentPhase.name}`);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [maintenanceDuration, notificationsEnabled]);

  // WebSocket for real-time updates
  useEffect(() => {
    socket.on('maintenance-progress', ({ progress, statusMessage }) => {
      setProgress(progress);
      setStatusMessage(statusMessage || 'Updating Systems...');
      setStatusLog((prev) => [
        ...prev,
        { time: new Date(), message: statusMessage, status: progress < 100 ? 'in-progress' : 'complete' },
      ].slice(-10)); // Keep last 10 entries
    });
    return () => socket.off('maintenance-progress');
  }, []);

  // Request notification permission
  const handleEnableNotifications = () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification('Notifications Enabled', {
          body: 'You will be notified when maintenance is complete.',
        });
      }
    });
  };

  // Generate PDF schedule
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ChatifyZone Maintenance Schedule', 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Start Time: ${maintenanceStartTime ? maintenanceStartTime.toLocaleString() : 'N/A'}`, 20, 40);
    doc.text(`Duration: ${maintenanceDuration} minutes`, 20, 50);
    doc.text('Phases:', 20, 60);
    phases.forEach((phase, index) => {
      doc.text(`${phase.name} (${phase.progress}%)`, 30, 70 + index * 10);
    });
    doc.save('maintenance-schedule.pdf');
  };

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return { hrs, mins, secs };
  };

  const { hrs, mins, secs } = formatTime(timeLeft);

  // FAQ toggle and search
  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const faqs = [
    {
      question: 'Why is the website under maintenance?',
      answer: 'We’re upgrading our infrastructure to ensure top-tier performance, security, and new features.',
    },
    {
      question: 'How long will the maintenance last?',
      answer: 'Check the countdown timer for the exact remaining time, based on the scheduled duration.',
    },
    {
      question: 'Can I access my account during maintenance?',
      answer: 'Most features are unavailable during maintenance. Please try again later.',
    },
    {
      question: 'What improvements are being made?',
      answer: 'We’re enhancing servers, databases, and security protocols for a better experience.',
    },
    {
      question: 'How can I stay updated?',
      answer: 'Subscribe to our newsletter or enable notifications for real-time updates.',
    },
  ].filter((faq) =>
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  // Newsletter subscription (simulated)
  const handleSubscribe = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setEmailSuccess(true);
    setEmail('');
    setTimeout(() => setEmailSuccess(false), 3000);
    // Note: In a real app, send a POST request to /subscribe endpoint
  };

  // Feedback submission (simulated)
  const handleFeedbackSubmit = () => {
    if (!feedback.trim()) {
      setFeedbackError('Please provide your feedback.');
      return;
    }
    setFeedbackError('');
    setFeedbackSuccess(true);
    setFeedback('');
    setTimeout(() => setFeedbackSuccess(false), 3000);
    // Note: In a real app, send a POST request to /feedback endpoint
  };

  // Simulated chat responses
  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { sender: 'user', text: chatInput }]);
    setChatInput('');
    setTimeout(() => {
      const responses = [
        'Thanks for your question! Check the timer for updates.',
        'We’re working diligently to complete maintenance.',
        'For urgent issues, email support@chatifyzone.in.',
      ];
      setChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: responses[Math.floor(Math.random() * responses.length)] },
      ]);
      chatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-inter">
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-gray-900/20 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-5xl border border-gray-700/30"
        role="main"
        aria-live="polite"
      >
        {/* Branding */}
        <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500 tracking-tight">
            ChatifyZone
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-2">Elevating Your Digital Experience</p>
        </motion.div>

        {/* Maintenance Message */}
        <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">System Upgrade in Progress</h2>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
            We’re rolling out cutting-edge enhancements to boost performance, fortify security, and introduce exciting features. Thank you for your patience as we redefine excellence.
          </p>
        </motion.div>

        {/* Countdown Timer */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white text-center mb-4">Time Until Completion</h3>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {[
              { value: hrs, label: 'Hours' },
              { value: mins, label: 'Minutes' },
              { value: secs, label: 'Seconds' },
            ].map(({ value, label }, index) => (
              <div key={index} className="text-center">
                <motion.div
                  key={value}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-800/40 p-4 sm:p-5 rounded-xl border border-red-500/30 shadow-lg shadow-red-500/20 w-20 sm:w-24"
                >
                  <span className="text-3xl sm:text-4xl font-mono text-red-500">{value}</span>
                </motion.div>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Progress Section */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white text-center mb-4">Maintenance Progress</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
            {/* Progress Bar */}
            <div className="w-full sm:w-2/3">
              <div className="w-full bg-gray-700/30 rounded-full h-4 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-red-500 to-pink-500 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-gray-300 text-sm mt-2 text-center">
                {Math.round(progress)}% - {statusMessage}
              </p>
            </div>
            {/* Progress Wheel */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#4B5563"
                  strokeWidth="10"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="10"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * progress) / 100}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 text-sm font-semibold">
                {Math.round(progress)}%
              </p>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Maintenance Timeline</h3>
          <div className="relative flex flex-col sm:flex-row justify-between items-center">
            <div className="absolute w-full sm:w-[calc(100%-4rem)] h-1 bg-gray-700/50 top-6 sm:top-1/2 transform sm:-translate-y-1/2 left-0 sm:left-8" />
            {phases.map((phase, index) => (
              <div key={index} className="relative flex flex-col items-center mb-6 sm:mb-0 z-10">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                    progress >= phase.progress ? 'bg-red-500' : 'bg-gray-600'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.2 }}
                >
                  {progress >= phase.progress ? <FaCheckCircle /> : index + 1}
                </motion.div>
                <p className="text-gray-300 text-xs sm:text-sm mt-2 text-center">{phase.name}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Status Log */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Status Updates</h3>
          <div className="space-y-4 max-h-60 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {statusLog.length === 0 && (
              <p className="text-gray-400 text-center">No status updates yet.</p>
            )}
            {statusLog.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center space-x-4 p-3 bg-gray-800/30 rounded-lg"
              >
                <span className={`w-3 h-3 rounded-full ${log.status === 'complete' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-gray-300">{log.message}</p>
                  <p className="text-gray-500 text-xs">{new Date(log.time).toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Frequently Asked Questions</h3>
          <input
            type="text"
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full p-3 mb-4 rounded-lg bg-gray-800/50 text-white border border-gray-700/30 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Search FAQs"
          />
          <div className="space-y-4">
            {faqs.length === 0 && (
              <p className="text-gray-400 text-center">No FAQs match your search.</p>
            )}
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-800/40 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 text-left flex justify-between items-center text-white hover:bg-gray-700/40 transition-colors"
                  aria-expanded={faqOpen === index}
                  aria-controls={`faq-${index}`}
                >
                  <span className="flex items-center text-sm sm:text-base">
                    <FaQuestionCircle className="mr-2 text-red-500" />
                    {faq.question}
                  </span>
                  <span className="text-gray-400">{faqOpen === index ? '−' : '+'}</span>
                </button>
                <AnimatePresence>
                  {faqOpen === index && (
                    <motion.div
                      id={`faq-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 text-gray-300 text-sm sm:text-base bg-gray-800/60"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Newsletter Signup */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Stay Updated</h3>
          <p className="text-gray-300 text-sm sm:text-base mb-4">
            Subscribe for updates on maintenance progress and new feature releases.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full p-3 rounded-lg bg-gray-800/50 text-white border border-gray-700/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Email for newsletter"
                aria-invalid={emailError ? 'true' : 'false'}
              />
              {emailError && <p className="text-red-500 text-sm mt-2">{emailError}</p>}
              {emailSuccess && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-green-500 text-sm mt-2 flex items-center"
                >
                  <FaCheckCircle className="mr-2" /> Subscribed successfully!
                </motion.p>
              )}
            </div>
            <button
              onClick={handleSubscribe}
              className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition-colors"
              aria-label="Subscribe to newsletter"
            >
              Subscribe
            </button>
          </div>
        </motion.div>

        {/* Feedback Form */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Share Your Feedback</h3>
          <p className="text-gray-300 text-sm sm:text-base mb-4">
            Have suggestions for ChatifyZone? Let us know during this maintenance window.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Your feedback..."
                className="w-full p-3 rounded-lg bg-gray-800/50 text-white border border-gray-700/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Feedback input"
                rows={4}
              />
              {feedbackError && <p className="text-red-500 text-sm mt-2">{feedbackError}</p>}
              {feedbackSuccess && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-green-500 text-sm mt-2 flex items-center"
                >
                  <FaCheckCircle className="mr-2" /> Feedback submitted successfully!
                </motion.p>
              )}
            </div>
            <button
              onClick={handleFeedbackSubmit}
              className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition-colors"
              aria-label="Submit feedback"
            >
              <FaPaperPlane />
            </button>
          </div>
        </motion.div>

        {/* Chat Widget */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Need Assistance?</h3>
          <div className="bg-gray-800/40 p-4 rounded-lg max-h-60 sm:max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {chatMessages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
              >
                <p
                  className={`inline-block p-3 rounded-lg text-sm sm:text-base ${
                    msg.sender === 'user' ? 'bg-red-500/50 text-white' : 'bg-gray-700/50 text-gray-300'
                  }`}
                >
                  {msg.text}
                </p>
              </motion.div>
            ))}
            <div ref={chatRef} />
          </div>
          <div className="flex mt-4">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
              placeholder="Type your question..."
              className="flex-1 p-3 rounded-l-lg bg-gray-800/50 text-white border border-gray-700/30 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Chat input"
            />
            <button
              onClick={handleChatSubmit}
              className="p-3 rounded-r-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              aria-label="Send chat message"
            >
              <FaComment />
            </button>
          </div>
        </motion.div>

        {/* Notifications and Schedule Download */}
        <motion.div variants={itemVariants} className="mb-8 sm:mb-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleEnableNotifications}
            className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition-colors flex items-center justify-center"
            aria-label="Enable notifications"
          >
            <FaBell className="mr-2" />
            {notificationsEnabled ? 'Notifications Enabled' : 'Enable Notifications'}
          </button>
          <button
            onClick={generatePDF}
            className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition-colors flex items-center justify-center"
            aria-label="Download schedule"
          >
            <FaDownload className="mr-2" />
            Download Schedule
          </button>
        </motion.div>

        {/* Social Links */}
        <motion.div variants={itemVariants} className="text-center">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Connect With Us</h3>
          <div className="flex justify-center space-x-6">
            {[
              { icon: FaTwitter, href: 'https://twitter.com/chatifyzone', label: 'Twitter' },
              { icon: FaLinkedin, href: 'https://linkedin.com/company/chatifyzone', label: 'LinkedIn' },
              { icon: FaGithub, href: 'https://github.com/chatifyzone', label: 'GitHub' },
            ].map(({ icon: Icon, href, label }, index) => (
              <motion.a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition-colors"
                whileHover={{ scale: 1.2 }}
                aria-label={label}
              >
                <Icon className="text-2xl sm:text-3xl" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
};

export default Maintenance;