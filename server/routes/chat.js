const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const AnonymousSession = require('../models/AnonymousSession');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const anonymousSessionSchema = Joi.object({
  username: Joi.string().min(3).max(20).required(),
  country: Joi.string().required(),
  state: Joi.string().allow('').optional(),
  age: Joi.number().integer().min(13).max(120).required(),
});

router.post('/anonymous-session', async (req, res) => {
  try {
    const { error } = anonymousSessionSchema.validate(req.body);
    if (error) return res.status(400).json({ msg: error.details[0].message });

    const { username, country, state, age } = req.body;
    const existingSession = await AnonymousSession.findOne({ username });
    if (existingSession) return res.status(400).json({ msg: 'Username already in use' });

    const anonymousId = `anon-${uuidv4()}`;
    const session = new AnonymousSession({ username, anonymousId, country, state, age, status: 'online' });
    await session.save();

    res.json({ anonymousId, username, country, state, age });
  } catch (err) {
    console.error('[Anonymous Session] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

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

router.get('/users', auth, async (req, res) => {
  try {
    const currentUserId = req.user || req.anonymousUser?.anonymousId;
    if (!currentUserId) return res.status(401).json({ msg: 'User not authenticated' });

    const registeredUsers = await User.find().select('id username online country state age gender').lean();
    const anonymousUsers = await AnonymousSession.find().select('anonymousId username status country state age').lean();

    const userList = [
      ...registeredUsers.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        online: user.online,
        isAnonymous: false,
        country: user.country,
        state: user.state,
        age: user.age,
        gender: user.gender,
      })),
      ...anonymousUsers.map((session) => ({
        id: session.anonymousId,
        username: session.username,
        online: session.status === 'online',
        isAnonymous: true,
        country: session.country,
        state: session.state,
        age: session.age,
        gender: null,
      })),
    ].filter((user) => user.id !== currentUserId);

    const sortedUsers = userList.sort((a, b) => {
      const aIsIndia = a.country === 'IN';
      const bIsIndia = b.country === 'IN';
      if (aIsIndia && !bIsIndia) return -1;
      if (!aIsIndia && bIsIndia) return 1;
      return a.username.localeCompare(b.username);
    });

    res.json(sortedUsers);
  } catch (err) {
    console.error('[Get Users] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user || req.anonymousUser?.anonymousId;
    if (!userId) return res.status(401).json({ msg: 'User not authenticated' });

    const messages = await Message.find({ receiver: userId, readAt: null }).sort({ createdAt: -1 }).lean();

    const conversationsMap = new Map();
    for (const msg of messages) {
      const senderId = msg.sender.toString();
      if (!conversationsMap.has(senderId)) {
        conversationsMap.set(senderId, {
          senderId,
          latestMessageTime: msg.createdAt,
          unreadCount: 0,
        });
      }
      conversationsMap.get(senderId).unreadCount += 1;
    }

    const conversations = [];
    for (const [senderId, conv] of conversationsMap) {
      let sender;
      if (senderId.startsWith('anon-')) {
        sender = await AnonymousSession.findOne({ anonymousId: senderId }).lean();
        if (sender) {
          conversations.push({
            senderId,
            username: sender.username || `Anon_${senderId.slice(-4)}`,
            isAnonymous: true,
            gender: null,
            unreadCount: conv.unreadCount,
            latestMessageTime: conv.latestMessageTime,
          });
        }
      } else {
        sender = await User.findById(senderId).select('username isAnonymous gender').lean();
        if (sender) {
          conversations.push({
            senderId,
            username: sender.username,
            isAnonymous: sender.isAnonymous || false,
            gender: sender.gender,
            unreadCount: conv.unreadCount,
            latestMessageTime: conv.latestMessageTime,
          });
        }
      }
    }

    conversations.sort((a, b) => new Date(b.latestMessageTime) - new Date(a.latestMessageTime));
    console.log('[Chat] conversations: Returning conversations:', conversations);
    res.json(conversations);
  } catch (err) {
    console.error('[Get Conversations] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user || req.anonymousUser?.anonymousId;
    if (!userId) return res.status(401).json({ msg: 'User not authenticated' });

    const unreadCount = await Message.countDocuments({ receiver: userId, readAt: null });
    console.log('[Chat] unread-count: Returning unread count:', unreadCount);
    res.json({ unreadCount });
  } catch (err) {
    console.error('[Get Unread Count] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/mark-read', auth, async (req, res) => {
  try {
    const userId = req.user || req.anonymousUser?.anonymousId;
    const { senderId } = req.body;
    if (!userId) return res.status(401).json({ msg: 'User not authenticated' });
    if (!senderId) return res.status(400).json({ msg: 'Sender ID is required' });

    console.log('[Chat] mark-read: Marking messages as read for user:', userId, 'from sender:', senderId);
    const result = await Message.updateMany(
      { sender: senderId, receiver: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    console.log('[Chat] mark-read: Update result:', result);

    res.json({ msg: 'Messages marked as read', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('[Mark Read] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
