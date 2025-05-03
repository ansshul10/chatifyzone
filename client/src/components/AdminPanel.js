/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaUsers, FaSignOutAlt, FaPaperPlane, FaTrash, FaChartBar, FaComments, FaUserCheck, FaUser } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../utils/api';
import Navbar from './Navbar';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AdminPanel = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [users, setUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [analytics, setAnalytics] = useState({
    userCount: 0,
    subscriberCount: 0,
    postCount: 0,
    recentUsers: [],
    userGrowth: [],
    postEngagement: [],
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({ registrationEnabled: true, maintenanceMode: false, maintenanceStartTime: null, maintenanceDuration: 120 });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledNewsletters, setScheduledNewsletters] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [maintenanceStartTime, setMaintenanceStartTime] = useState(null);
  const [maintenanceDuration, setMaintenanceDuration] = useState(120); // Default 2 hours
  // Action-specific loading and message states
  const [actionStates, setActionStates] = useState({
    sendNewsletter: { isLoading: false, error: '', success: '' },
    banUser: { isLoading: false, error: '', success: '' },
    unbanUser: { isLoading: false, error: '', success: '' },
    updateRole: { isLoading: false, error: '', success: '' },
    deletePost: { isLoading: false, error: '', success: '' },
    removeSubscriber: { isLoading: false, error: '', success: '' },
    createAnnouncement: { isLoading: false, error: '', success: '' },
    updateSettings: { isLoading: false, error: '', success: '' },
    bulkAction: { isLoading: false, error: '', success: '' },
  });
  const navigate = useNavigate();

  // Helper function to update action-specific state
  const updateActionState = (action, updates) => {
    setActionStates((prev) => ({
      ...prev,
      [action]: { ...prev[action], ...updates },
    }));
  };

  // Initialize token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['x-auth-token'] = token;
    } else {
      updateActionState('initialLoad', { error: 'No authentication token found. Please log in.' });
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch data after token validation
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subscribersRes, usersRes, bannedUsersRes, postsRes, analyticsRes, auditLogsRes, settingsRes, scheduledNewslettersRes] = await Promise.all([
          api.get('/admin/subscribers'),
          api.get('/admin/users'),
          api.get('/admin/banned-users'),
          api.get('/admin/posts'),
          api.get('/admin/analytics'),
          api.get('/admin/audit-logs'),
          api.get('/admin/settings'),
          api.get('/admin/scheduled-newsletters'),
        ]);
        setSubscribers(subscribersRes.data);
        setUsers(usersRes.data);
        setBannedUsers(bannedUsersRes.data);
        setPosts(postsRes.data);
        setAnalytics(analyticsRes.data);
        setAuditLogs(auditLogsRes.data);
        setSettings(settingsRes.data);
        setScheduledNewsletters(scheduledNewslettersRes.data);
        setMaintenanceStartTime(settingsRes.data.maintenanceStartTime ? new Date(settingsRes.data.maintenanceStartTime) : null);
        setMaintenanceDuration(settingsRes.data.maintenanceDuration || 120);
      } catch (err) {
        if (err.response?.status === 401) {
          updateActionState('initialLoad', { error: 'Session expired. Please log in again.' });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete api.defaults.headers.common['x-auth-token'];
          navigate('/admin/login');
        } else {
          updateActionState('initialLoad', { error: err.response?.data?.msg || 'Failed to fetch data.' });
        }
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      fetchData();
    }
  }, [navigate]);

  // Poll for maintenance status only when maintenance mode is enabled
  useEffect(() => {
    if (!settings.maintenanceMode) return;

    const checkMaintenance = async () => {
      try {
        const { data } = await api.get('/admin/settings/public');
        if (!data.maintenanceMode) {
          setSettings({
            registrationEnabled: settings.registrationEnabled,
            maintenanceMode: false,
            maintenanceStartTime: null,
            maintenanceDuration: null,
          });
          setMaintenanceStartTime(null);
          setMaintenanceDuration(120);
          updateActionState('updateSettings', { success: 'Maintenance mode disabled' });
          setTimeout(() => updateActionState('updateSettings', { success: '' }), 5000);
        }
      } catch (err) {
        console.error('Error checking maintenance status:', err);
      }
    };

    const interval = setInterval(checkMaintenance, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [settings.maintenanceMode, settings.registrationEnabled]);

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    updateActionState('sendNewsletter', { isLoading: true, error: '', success: '' });

    if (!emailSubject.trim() || !emailContent.trim()) {
      updateActionState('sendNewsletter', { isLoading: false, error: 'Please provide both subject and content for the newsletter.' });
      return;
    }

    try {
      const { data } = await api.post('/admin/send-newsletter', {
        subject: emailSubject,
        content: emailContent,
        scheduledDate,
      });
      updateActionState('sendNewsletter', { success: scheduledDate ? 'Newsletter scheduled successfully' : 'Newsletter sent successfully' });
      setEmailSubject('');
      setEmailContent('');
      setScheduledDate(null);
      if (data.newsletter) {
        setScheduledNewsletters([...scheduledNewsletters, data.newsletter].filter((n) => new Date(n.scheduledDate) > new Date()));
      }
      setTimeout(() => updateActionState('sendNewsletter', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('sendNewsletter', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('sendNewsletter', { error: err.response?.data?.msg || 'Failed to send/schedule newsletter.' });
      }
    } finally {
      updateActionState('sendNewsletter', { isLoading: false });
    }
  };

  const handleBanUser = async (userId) => {
    updateActionState('banUser', { isLoading: true, error: '', success: '' });
    try {
      await api.post('/admin/ban-user', { userId });
      setUsers(users.filter((user) => user._id !== userId));
      updateActionState('banUser', { success: 'User banned successfully' });
      setTimeout(() => updateActionState('banUser', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('banUser', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('banUser', { error: err.response?.data?.msg || 'Failed to ban user.' });
      }
    } finally {
      updateActionState('banUser', { isLoading: false });
    }
  };

  const handleUnbanUser = async (userId) => {
    updateActionState('unbanUser', { isLoading: true, error: '', success: '' });
    try {
      const { data } = await api.post('/admin/unban-user', { userId });
      setBannedUsers(bannedUsers.filter((user) => user._id !== userId));
      setUsers([...users, { ...data.user, role: data.user.role || 'user' }]);
      updateActionState('unbanUser', { success: 'User unbanned successfully' });
      setTimeout(() => updateActionState('unbanUser', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('unbanUser', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('unbanUser', { error: err.response?.data?.msg || 'Failed to unban user.' });
      }
    } finally {
      updateActionState('unbanUser', { isLoading: false });
    }
  };

  const handleUpdateRole = async (userId, role) => {
    updateActionState('updateRole', { isLoading: true, error: '', success: '' });
    try {
      const { data } = await api.post('/admin/update-role', { userId, role });
      setUsers(users.map((user) => (user._id === userId ? { ...user, role } : user)));
      updateActionState('updateRole', { success: `User role updated to ${role} successfully` });
      setTimeout(() => updateActionState('updateRole', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('updateRole', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('updateRole', { error: err.response?.data?.msg || 'Failed to update role.' });
      }
    } finally {
      updateActionState('updateRole', { isLoading: false });
    }
  };

  const handleDeletePost = async (postId) => {
    updateActionState('deletePost', { isLoading: true, error: '', success: '' });
    try {
      await api.delete(`/admin/posts/${postId}`);
      setPosts(posts.filter((post) => post._id !== postId));
      updateActionState('deletePost', { success: 'Post deleted successfully' });
      setTimeout(() => updateActionState('deletePost', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('deletePost', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('deletePost', { error: err.response?.data?.msg || 'Failed to delete post.' });
      }
    } finally {
      updateActionState('deletePost', { isLoading: false });
    }
  };

  const handleRemoveSubscriber = async (subscriberId) => {
    updateActionState('removeSubscriber', { isLoading: true, error: '', success: '' });
    try {
      await api.delete(`/admin/subscribers/${subscriberId}`);
      setSubscribers(subscribers.filter((subscriber) => subscriber._id !== subscriberId));
      updateActionState('removeSubscriber', { success: 'Subscriber removed successfully' });
      setTimeout(() => updateActionState('removeSubscriber', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('removeSubscriber', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('removeSubscriber', { error: err.response?.data?.msg || 'Failed to remove subscriber.' });
      }
    } finally {
      updateActionState('removeSubscriber', { isLoading: false });
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    updateActionState('createAnnouncement', { isLoading: true, error: '', success: '' });

    if (!announcementTitle.trim() || !announcementContent.trim()) {
      updateActionState('createAnnouncement', { isLoading: false, error: 'Please provide both title and content for the announcement.' });
      return;
    }

    try {
      const { data } = await api.post('/admin/announcements', {
        title: announcementTitle,
        content: announcementContent,
      });
      updateActionState('createAnnouncement', { success: 'Announcement created successfully' });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setTimeout(() => updateActionState('createAnnouncement', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('createAnnouncement', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('createAnnouncement', { error: err.response?.data?.msg || 'Failed to create announcement.' });
      }
    } finally {
      updateActionState('createAnnouncement', { isLoading: false });
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    updateActionState('updateSettings', { isLoading: true, error: '', success: '' });

    try {
      // Update registration settings
      await api.post('/admin/settings', { registrationEnabled: settings.registrationEnabled });

      // Update maintenance settings
      const maintenancePayload = {
        maintenanceMode: settings.maintenanceMode,
      };

      if (settings.maintenanceMode) {
        if (!maintenanceStartTime || isNaN(maintenanceStartTime.getTime())) {
          updateActionState('updateSettings', { isLoading: false, error: 'Please set a valid start time for maintenance.' });
          return;
        }
        if (!maintenanceDuration || maintenanceDuration <= 0) {
          updateActionState('updateSettings', { isLoading: false, error: 'Please set a valid duration for maintenance.' });
          return;
        }
        maintenancePayload.maintenanceStartTime = maintenanceStartTime;
        maintenancePayload.maintenanceDuration = maintenanceDuration;
      }

      await api.post('/admin/toggle-maintenance', maintenancePayload);

      setSettings({
        ...settings,
        maintenanceMode: settings.maintenanceMode,
        maintenanceStartTime: settings.maintenanceMode ? maintenanceStartTime : null,
        maintenanceDuration: settings.maintenanceMode ? maintenanceDuration : null,
      });

      const successMessage = settings.maintenanceMode
        ? 'Maintenance mode enabled successfully'
        : settings.registrationEnabled
        ? 'User registration enabled successfully'
        : 'Settings updated successfully';
      updateActionState('updateSettings', { success: successMessage });

      if (!settings.maintenanceMode) {
        setMaintenanceStartTime(null);
        setMaintenanceDuration(120);
      }
      setTimeout(() => updateActionState('updateSettings', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('updateSettings', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('updateSettings', { error: err.response?.data?.msg || 'Failed to update settings.' });
      }
    } finally {
      updateActionState('updateSettings', { isLoading: false });
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkAction = async () => {
    updateActionState('bulkAction', { isLoading: true, error: '', success: '' });
    if (!bulkAction || selectedUsers.length === 0) {
      updateActionState('bulkAction', { error: 'Please select an action and at least one user.' });
      return;
    }
    try {
      await api.post('/admin/bulk-action', { userIds: selectedUsers, action: bulkAction });
      setUsers(users.filter((user) => !selectedUsers.includes(user._id)));
      setSelectedUsers([]);
      setBulkAction('');
      updateActionState('bulkAction', { success: `Bulk ${bulkAction} completed successfully` });
      setTimeout(() => updateActionState('bulkAction', { success: '' }), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        updateActionState('bulkAction', { error: 'Session expired. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['x-auth-token'];
        navigate('/admin/login');
      } else {
        updateActionState('bulkAction', { error: err.response?.data?.msg || `Failed to perform bulk ${bulkAction}.` });
      }
    } finally {
      updateActionState('bulkAction', { isLoading: false });
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
          <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
            <h1
              className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Admin Panel
            </h1>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg flex items-center space-x-2 ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>

          {/* Initial Load Error */}
          {actionStates.initialLoad?.error && (
            <p className="text-red-500 text-sm text-center">{actionStates.initialLoad.error}</p>
          )}

          {/* Analytics Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Analytics Dashboard
            </h2>
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'} p-6 rounded-lg`}>
              <div className="text-center">
                <p className="text-lg font-semibold">Total Users</p>
                <p className="text-2xl">{analytics.userCount || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Total Subscribers</p>
                <p className="text-2xl">{analytics.subscriberCount || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Total Posts</p>
                <p className="text-2xl">{analytics.postCount || 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  User Growth (Last 30 Days)
                </h3>
                <Line
                  data={{
                    labels: analytics.userGrowth.map((data) => data.date),
                    datasets: [
                      {
                        label: 'New Users',
                        data: analytics.userGrowth.map((data) => data.count),
                        borderColor: '#FF0000',
                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        fill: true,
                      },
                    ],
                  }}
                  options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
                />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Post Engagement (Last 30 Days)
                </h3>
                <Line
                  data={{
                    labels: analytics.postEngagement.map((data) => data.date),
                    datasets: [
                      {
                        label: 'Posts Created',
                        data: analytics.postEngagement.map((data) => data.count),
                        borderColor: '#00FF00',
                        backgroundColor: 'rgba(0, 255, 0, 0.2)',
                        fill: true,
                      },
                    ],
                  }}
                  options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
                />
              </div>
            </div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Users
            </h3>
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
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.recentUsers || []).map((user) => (
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
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Audit Logs Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Audit Logs
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
                      Action
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Admin
                    </th>
                    <th className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}>
                      Details
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {log.action}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {log.adminId?.username || 'Unknown'}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {log.details ? JSON.stringify(log.details) : 'No details'}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

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
                  className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'}`}
                  placeholder="Newsletter Subject"
                  disabled={actionStates.sendNewsletter.isLoading}
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
                  className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'}`}
                  placeholder="Newsletter Content"
                  disabled={actionStates.sendNewsletter.isLoading}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Schedule Date (Optional)
                </label>
                <DatePicker
                  selected={scheduledDate}
                  onChange={(date) => setScheduledDate(date)}
                  showTimeSelect
                  dateFormat="Pp"
                  className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'}`}
                  placeholderText="Select date and time"
                  disabled={actionStates.sendNewsletter.isLoading}
                />
              </div>
              {actionStates.sendNewsletter.error && (
                <p className="text-red-500 text-sm">{actionStates.sendNewsletter.error}</p>
              )}
              {actionStates.sendNewsletter.success && (
                <p className="text-green-500 text-sm">{actionStates.sendNewsletter.success}</p>
              )}
              <button
                type="submit"
                className={`w-full p-4 rounded-lg font-semibold ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                disabled={actionStates.sendNewsletter.isLoading}
              >
                <FaPaperPlane className="inline mr-2" />
                {actionStates.sendNewsletter.isLoading ? 'Processing...' : scheduledDate ? 'Schedule Newsletter' : 'Send Newsletter'}
              </button>
            </form>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Scheduled Newsletters
            </h3>
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}
              >
                <thead>
                  <tr>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Subject
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Scheduled Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledNewsletters.map((newsletter) => (
                    <tr key={newsletter._id}>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {newsletter.subject}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {new Date(newsletter.scheduledDate).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Subscribers Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Subscribers
            </h2>
            {actionStates.removeSubscriber.error && (
              <p className="text-red-500 text-sm">{actionStates.removeSubscriber.error}</p>
            )}
            {actionStates.removeSubscriber.success && (
              <p className="text-green-500 text-sm">{actionStates.removeSubscriber.success}</p>
            )}
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
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Actions
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
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        <button
                          onClick={() => handleRemoveSubscriber(subscriber._id)}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
                          disabled={actionStates.removeSubscriber.isLoading}
                        >
                          {actionStates.removeSubscriber.isLoading ? 'Processing...' : <FaTrash />}
                        </button>
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
            <div className="flex space-x-4 mb-4">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-gray-300 text-black'}`}
                disabled={actionStates.bulkAction.isLoading}
              >
                <option value="">Select Bulk Action</option>
                <option value="ban">Ban Selected</option>
                <option value="delete">Delete Selected</option>
              </select>
              <button
                onClick={handleBulkAction}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}
                disabled={actionStates.bulkAction.isLoading}
              >
                {actionStates.bulkAction.isLoading ? 'Processing...' : 'Apply'}
              </button>
            </div>
            {actionStates.bulkAction.error && (
              <p className="text-red-500 text-sm">{actionStates.bulkAction.error}</p>
            )}
            {actionStates.bulkAction.success && (
              <p className="text-green-500 text-sm">{actionStates.bulkAction.success}</p>
            )}
            {actionStates.banUser.error && (
              <p className="text-red-500 text-sm">{actionStates.banUser.error}</p>
            )}
            {actionStates.banUser.success && (
              <p className="text-green-500 text-sm">{actionStates.banUser.success}</p>
            )}
            {actionStates.updateRole.error && (
              <p className="text-red-500 text-sm">{actionStates.updateRole.error}</p>
            )}
            {actionStates.updateRole.success && (
              <p className="text-green-500 text-sm">{actionStates.updateRole.success}</p>
            )}
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}
              >
                <thead>
                  <tr>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          setSelectedUsers(e.target.checked ? users.map((user) => user._id) : [])
                        }
                        disabled={actionStates.bulkAction.isLoading}
                      />
                    </th>
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
                      Role
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
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => handleSelectUser(user._id)}
                          disabled={actionStates.bulkAction.isLoading}
                        />
                      </td>
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
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white' : 'bg-gray-300 text-black'}`}
                          disabled={actionStates.updateRole.isLoading}
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        <button
                          onClick={() => handleBanUser(user._id)}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'} mr-2`}
                          disabled={actionStates.banUser.isLoading}
                        >
                          {actionStates.banUser.isLoading ? 'Processing...' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Banned Users Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Banned Users
            </h2>
            {actionStates.unbanUser.error && (
              <p className="text-red-500 text-sm">{actionStates.unbanUser.error}</p>
            )}
            {actionStates.unbanUser.success && (
              <p className="text-green-500 text-sm">{actionStates.unbanUser.success}</p>
            )}
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
                      Banned At
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bannedUsers.map((user) => (
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
                        {new Date(user.bannedAt).toLocaleDateString()}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        <button
                          onClick={() => handleUnbanUser(user._id)}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}
                          disabled={actionStates.unbanUser.isLoading}
                        >
                          {actionStates.unbanUser.isLoading ? 'Processing...' : <FaUserCheck />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Posts Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Posts
            </h2>
            {actionStates.deletePost.error && (
              <p className="text-red-500 text-sm">{actionStates.deletePost.error}</p>
            )}
            {actionStates.deletePost.success && (
              <p className="text-green-500 text-sm">{actionStates.deletePost.success}</p>
            )}
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-200'}`}
              >
                <thead>
                  <tr>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Content
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Author
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Created At
                    </th>
                    <th
                      className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post._id}>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {post.content.substring(0, 50)}...
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {post.user?.username || 'Unknown'}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td
                        className={`p-3 border ${isDarkMode ? 'border-gray-700' : 'border-gray-400'}`}
                      >
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}
                          disabled={actionStates.deletePost.isLoading}
                        >
                          {actionStates.deletePost.isLoading ? 'Processing...' : <FaTrash />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Announcement Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Create Announcement
            </h2>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'}`}
                  placeholder="Announcement Title"
                  disabled={actionStates.createAnnouncement.isLoading}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Content
                </label>
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'}`}
                  placeholder="Announcement Content"
                  disabled={actionStates.createAnnouncement.isLoading}
                />
              </div>
              {actionStates.createAnnouncement.error && (
                <p className="text-red-500 text-sm">{actionStates.createAnnouncement.error}</p>
              )}
              {actionStates.createAnnouncement.success && (
                <p className="text-green-500 text-sm">{actionStates.createAnnouncement.success}</p>
              )}
              <button
                type="submit"
                className={`w-full p-4 rounded-lg font-semibold ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                disabled={actionStates.createAnnouncement.isLoading}
              >
                <FaComments className="inline mr-2" />
                {actionStates.createAnnouncement.isLoading ? 'Processing...' : 'Create Announcement'}
              </button>
            </form>
          </motion.section>

          {/* Settings Section */}
          <motion.section variants={cardVariants} className="w-full flex flex-col space-y-8">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Platform Settings
            </h2>
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Enable User Registration
                </label>
                <input
                  type="checkbox"
                  checked={settings.registrationEnabled}
                  onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
                  className="mt-1"
                  disabled={actionStates.updateSettings.isLoading}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Enable Maintenance Mode
                </label>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="mt-1"
                  disabled={actionStates.updateSettings.isLoading}
                />
              </div>
              {settings.maintenanceMode && (
                <>
                  <div>
                    <label
                      className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Maintenance Start Time
                    </label>
                    <DatePicker
                      selected={maintenanceStartTime}
                      onChange={(date) => setMaintenanceStartTime(date)}
                      showTimeSelect
                      dateFormat="Pp"
                      className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'}`}
                      placeholderText="Select start date and time"
                      disabled={actionStates.updateSettings.isLoading}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Maintenance Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={maintenanceDuration}
                      onChange={(e) => setMaintenanceDuration(Number(e.target.value))}
                      className={`w-full p-3 rounded-lg ${isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-300 text-black border-gray-400'}`}
                      placeholder="Enter duration in minutes"
                      min="1"
                      disabled={actionStates.updateSettings.isLoading}
                    />
                  </div>
                </>
              )}
              {actionStates.updateSettings.error && (
                <p className="text-red-500 text-sm">{actionStates.updateSettings.error}</p>
              )}
              {actionStates.updateSettings.success && (
                <p className="text-green-500 text-sm">{actionStates.updateSettings.success}</p>
              )}
              <button
                type="submit"
                className={`w-full p-4 rounded-lg font-semibold ${isDarkMode ? 'bg-[#1A1A1A] text-red-600' : 'bg-gray-300 text-red-500'}`}
                disabled={actionStates.updateSettings.isLoading}
              >
                {actionStates.updateSettings.isLoading ? 'Processing...' : 'Save Settings'}
              </button>
            </form>
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
