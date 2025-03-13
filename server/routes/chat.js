const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const AnonymousSession = require('../models/AnonymousSession');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/anonymous-session', async (req, res) => {
  const { username } = req.body;
  try {
    if (!username || username.length > 20) return res.status(400).json({ msg: 'Invalid username' });

    const existingSession = await AnonymousSession.findOne({ username });
    if (existingSession) return res.status(400).json({ msg: 'Username already in use' });

    const anonymousId = `anon-${uuidv4()}`;
    const session = new AnonymousSession({ username, anonymousId });
    await session.save();

    res.json({ anonymousId });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// New endpoint to get all online users
router.get('/users', auth, async (req, res) => {
  try {
    const currentUserId = req.user || req.anonymousUser?.anonymousId;
    if (!currentUserId) return res.status(401).json({ msg: 'User not authenticated' });

    const registeredUsers = await User.find({ online: true }).select('id username online');
    const anonymousUsers = await AnonymousSession.find({ status: 'online' }).select('anonymousId username status');

    const userList = [
      ...registeredUsers.map(user => ({
        id: user.id,
        username: user.username,
        isAnonymous: false,
        online: user.online,
      })),
      ...anonymousUsers.map(session => ({
        id: session.anonymousId,
        username: session.username,
        isAnonymous: true,
        online: session.status === 'online',
      })),
    ].filter(user => user.id !== currentUserId); // Exclude the current user

    res.json(userList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;