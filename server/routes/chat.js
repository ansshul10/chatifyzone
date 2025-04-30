const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const AnonymousSession = require('../models/AnonymousSession');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Validation schema for anonymous session
const anonymousSessionSchema = Joi.object({
  username: Joi.string().min(3).max(20).required(),
  country: Joi.string().required(),
  state: Joi.string().allow('').optional(),
  age: Joi.number().integer().min(13).max(120).required(),
});

// Create anonymous session
router.post('/anonymous-session', async (req, res) => {
  try {
    console.log('[Anonymous Session] Received request:', req.body);
    const { error } = anonymousSessionSchema.validate(req.body);
    if (error) {
      console.error('[Anonymous Session] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { username, country, state, age } = req.body;
    const existingSession = await AnonymousSession.findOne({ username });
    if (existingSession) {
      console.error('[Anonymous Session] Username already in use:', username);
      return res.status(400).json({ msg: 'Username already in use' });
    }

    const anonymousId = `anon-${uuidv4()}`;
    const session = new AnonymousSession({
      username,
      anonymousId,
      country,
      state,
      age,
      status: 'online',
    });
    await session.save();

    console.log(`[Anonymous Session] Created for: ${username} (ID: ${anonymousId})`);
    res.json({ anonymousId, username, country, state, age });
  } catch (err) {
    console.error('[Anonymous Session] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get messages for authenticated user
router.get('/messages', auth, async (req, res) => {
  try {
    const userId = req.user || req.anonymousUser?.anonymousId;
    if (!userId) return res.status(401).json({ msg: 'User not authenticated' });

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('[Messages] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all users (registered and anonymous)
router.get('/users', auth, async (req, res) => {
  try {
    console.log('[Get Users] Fetching all users');
    const currentUserId = req.user || req.anonymousUser?.anonymousId;
    if (!currentUserId) return res.status(401).json({ msg: 'User not authenticated' });

    const registeredUsers = await User.find()
      .select('id username online country state age')
      .lean();
    const anonymousUsers = await AnonymousSession.find()
      .select('anonymousId username status country state age')
      .lean();

    const userList = [
      ...registeredUsers.map(user => ({
        id: user._id.toString(),
        username: user.username,
        online: user.online,
        isAnonymous: false,
        country: user.country,
        state: user.state,
        age: user.age,
      })),
      ...anonymousUsers.map(session => ({
        id: session.anonymousId,
        username: session.username,
        online: session.status === 'online',
        isAnonymous: true,
        country: session.country,
        state: session.state,
        age: session.age,
      })),
    ].filter(user => user.id !== currentUserId); // Exclude the current user

    // Sort users: Indian users first, then alphabetically by username
    const sortedUsers = userList.sort((a, b) => {
      const aIsIndia = a.country === 'IN';
      const bIsIndia = b.country === 'IN';
      if (aIsIndia && !bIsIndia) return -1;
      if (!aIsIndia && bIsIndia) return 1;
      return a.username.localeCompare(b.username);
    });

    console.log('[Get Users] Fetched users:', sortedUsers.length);
    res.json(sortedUsers);
  } catch (err) {
    console.error('[Get Users] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
