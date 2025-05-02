const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const { sendEmail } = require('../utils/email');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// Get all subscribers
router.get('/subscribers', [auth, isAdmin], async (req, res) => {
  try {
    const subscribers = await Subscriber.find();
    res.json(subscribers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all users
router.get('/users', [auth, isAdmin], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Send newsletter to all subscribers
router.post('/send-newsletter', [auth, isAdmin], async (req, res) => {
  const { subject, content } = req.body;

  if (!subject || !content) {
    return res.status(400).json({ msg: 'Subject and content are required' });
  }

  try {
    const subscribers = await Subscriber.find();
    const emailPromises = subscribers.map((subscriber) => {
      const unsubscribeLink = `${process.env.CLIENT_URL}/unsubscribe?token=${subscriber.unsubscribeToken}`;
      const html = `
        <h1>${subject}</h1>
        <p>${content}</p>
        <p><a href="${unsubscribeLink}">Unsubscribe</a></p>
      `;
      return sendEmail(subscriber.email, subject, html);
    });

    await Promise.all(emailPromises);
    res.json({ msg: 'Newsletter sent successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Ban a user
router.post('/ban-user', [auth, isAdmin], async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (user.isAdmin) {
      return res.status(400).json({ msg: 'Cannot ban an admin' });
    }

    await User.findByIdAndDelete(userId);
    res.json({ msg: 'User banned successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
