/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaUsers, FaSignOutAlt, FaPaperPlane } from 'react-icons/fa';
import api from '../utils/api';
import Navbar from './Navbar';

const AdminPanel = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [users, setUsers] = useState([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subscribersRes, usersRes] = await Promise.all([
          api.get('/admin/subscribers'),
          api.get('/admin/users'),
        ]);
        setSubscribers(subscribersRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to fetch data.');
      }
    };
    fetchData();
  }, []);

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!emailSubject.trim() || !emailContent.trim()) {
      setError('Please provide both subject and content for the newsletter.');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/admin/send-newsletter', {
        subject: emailSubject,
        content: emailContent,
      });
      setSuccess(data.msg);
      setEmailSubject('');
      setEmailContent('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send newsletter.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      await api.post('/admin/ban-user', { userId });
      setUsers(users.filter((user) => user._id !== userId));
      setSuccess('User banned successfully.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to ban user.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['x-auth-token'];
    navigate('/admin/login');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <>
      <Navbar />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col pt-20`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12 flex-grow">
          <div className="flex justify-between items-center">
            <h1
              className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Admin Panel
            </h1>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg flex items-center space-x-2 ${
                isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'
              }`}
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>

          {/* Newsletter Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Send Newsletter
            </h2>
            <form onSubmit={handleSendNewsletter} className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className={`w-full p-3 rounded-lg ${
                    isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'
                  } focus:outline-none`}
                  placeholder="Newsletter Subject"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Content
                </label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className={`w-full p-3 rounded-lg ${
                    isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'
                  } focus:outline-none h-32`}
                  placeholder="Newsletter Content"
                  disabled={isLoading}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-500 text-sm">{success}</p>}
              <button
                type="submit"
                className={`w-full p-4 rounded-lg font-semibold ${
                  isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'
                } flex items-center justify-center space-x-2`}
                disabled={isLoading}
              >
                <FaPaperPlane />
                <span>{isLoading ? 'Sending...' : 'Send Newsletter'}</span>
              </button>
            </form>
          </motion.section>

          {/* Subscribers Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Subscribers
            </h2>
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}
              >
                <thead>
                  <tr>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Email
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Subscribed At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber._id}>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {subscriber.email}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {new Date(subscriber.subscribedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Users Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Users
            </h2>
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}
              >
                <thead>
                  <tr>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Username
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Email
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {user.username}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {user.email}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        <button
                          onClick={() => handleBanUser(user._id)}
                          className={`p-2 rounded-lg ${
                            isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'
                          }`}
                        >
                          Ban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        </div>
        <motion.footer
          variants={containerVariants}
          className={`py-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
        >
          © {new Date().getFullYear()} Chatify. All rights reserved.
        </motion.footer>
      </motion.div>
    </>
  );
};

export default AdminPanel;