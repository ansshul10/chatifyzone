/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import api from '../utils/api';

const AnnouncementBanner = ({ isDarkMode }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data } = await api.get('/admin/announcements');
        setAnnouncements(data);
        // Filter out dismissed announcements
        const storedDismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements')) || [];
        setVisibleAnnouncements(data.filter((ann) => !storedDismissed.includes(ann._id)));
      } catch (err) {
        console.error('[AnnouncementBanner] Failed to fetch announcements:', err.message);
      }
    };
    fetchAnnouncements();
  }, []);

  const handleDismiss = (announcementId) => {
    // Update visible announcements
    setVisibleAnnouncements(visibleAnnouncements.filter((ann) => ann._id !== announcementId));
    // Store dismissed announcement in localStorage
    const storedDismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements')) || [];
    localStorage.setItem('dismissedAnnouncements', JSON.stringify([...storedDismissed, announcementId]));
  };

  if (!visibleAnnouncements.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center gap-3 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
    >
      {visibleAnnouncements.map((announcement) => (
        <motion.div
          key={announcement._id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`relative w-full max-w-[90%] sm:max-w-sm lg:max-w-md xl:max-w-lg p-3 sm:p-4 lg:p-5 rounded-2xl shadow-lg ${
            isDarkMode ? 'bg-[#1A1A1A] text-white border-gray-700' : 'bg-gray-200 text-black border-gray-300'
          } border`}
        >
          <div className="pr-8 sm:pr-10">
            <h3
              className={`font-semibold truncate ${
                isDarkMode ? 'text-red-600' : 'text-red-500'
              } text-sm sm:text-base lg:text-lg`}
            >
              {announcement.title}
            </h3>
            <p className="text-xs sm:text-sm lg:text-base mt-1 line-clamp-3">{announcement.content}</p>
            <p
              className={`mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              } text-[10px] sm:text-xs lg:text-sm`}
            >
              Posted on {new Date(announcement.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => handleDismiss(announcement._id)}
            className={`absolute top-2 right-2 p-2 sm:p-3 rounded-full ${
              isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-300'
            } transition-colors duration-200`}
            aria-label="Dismiss announcement"
          >
            <FaTimes size={12} className="sm:w-4 sm:h-4" />
          </button>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnnouncementBanner;