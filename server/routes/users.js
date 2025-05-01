const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const AnonymousSession = require('../models/AnonymousSession');

// POST /api/users/update-last-active
// Updates the last active time for the authenticated user (registered or anonymous)
router.post('/update-last-active', auth, async (req, res) => {
  try {
    const userId = req.user; // Set by auth middleware for registered users
    const anonymousId = req.anonymousUser?.anonymousId; // Set for anonymous users

    if (userId) {
      // Update registered user
      await User.findByIdAndUpdate(userId, { lastActive: new Date() });
    } else if (anonymousId) {
      // Update anonymous user
      await AnonymousSession.findOneAndUpdate(
        { anonymousId },
        { lastActive: new Date() }
      );
    } else {
      return res.status(401).json({ msg: 'User not authenticated' });
    }

    res.json({ msg: 'Last active time updated' });
  } catch (err) {
    console.error('[Update Last Active] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
