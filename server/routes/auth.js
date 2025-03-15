const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    user = new User({ email, username, password });
    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user).select('-password');
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      res.json({ id: user.id, email: user.email, username: user.username, online: user.online });
    } else if (req.anonymousUser) {
      res.json({
        id: req.anonymousUser.anonymousId,
        username: req.anonymousUser.username,
        isAnonymous: true,
        online: req.anonymousUser.status === 'online',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Forgot Password - Send reset link
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'No user found with this email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    // Send email with enhanced HTML template
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Password Reset</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background-color: #1A1A1A;
            font-family: 'Arial', sans-serif;
            color: white;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            text-align: center;
            padding-bottom: 30px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .content {
            padding: 20px 0;
          }
          .content p {
            margin-bottom: 15px;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: #FF0000;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            transition: background 0.3s ease;
            text-align: center;
          }
          .button:hover {
            background: #CC0000;
          }
          .warning {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            padding-top: 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
          }
          .highlight {
            color: #FF0000;
            font-weight: 600;
          }
          a {
            color: #FF0000;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          @media only screen and (max-width: 600px) {
            .container {
              margin: 20px;
              padding: 20px;
            }
            .header h1 {
              font-size: 22px;
            }
            .button {
              display: block;
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello <span class="highlight">${user.username}</span>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Your Password</a>
            <p class="warning">This link will expire in <span class="highlight">1 hour</span>. 
              If you didn't request this reset, please ignore this email or contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Application. All rights reserved.</p>
            <p>Having issues? Contact us at <a href="mailto:support@chatify.com">support@chatify.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(user.email, subject, html); // Updated to use html instead of text
    res.json({ msg: 'Password reset link sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Reset Password - Change password with token
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: 'Password successfully reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get user's friends
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('friends', 'username online');
    res.json(user.friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add a friend
router.post('/add-friend', auth, async (req, res) => {
  const { friendUsername } = req.body;
  try {
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) return res.status(404).json({ msg: 'User not found' });
    if (friend._id.toString() === req.user.userId) return res.status(400).json({ msg: 'Cannot add yourself' });

    const user = await User.findById(req.user.userId);
    if (user.friends.includes(friend._id)) return res.status(400).json({ msg: 'Already friends' });

    user.friends.push(friend._id);
    await user.save();
    const updatedFriends = await User.findById(req.user.userId).populate('friends', 'username online');
    res.json(updatedFriends.friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/remove-friend', auth, async (req, res) => {
  const { friendId } = req.body;
  try {
    if (!req.user) return res.status(401).json({ msg: 'Only registered users can remove friends' });

    const user = await User.findById(req.user);
    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ msg: 'Friend not found' });
    if (!user.friends.includes(friendId)) return res.status(400).json({ msg: 'Not friends' });

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    user.activityLog.push({ action: `Removed ${friend.username} as a friend` });
    await user.save();

    const updatedFriends = await User.findById(req.user).populate('friends', 'username online status');
    res.json(updatedFriends.friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update profile with status and privacy settings
router.put('/profile', auth, async (req, res) => {
  const { bio, age, status, showOnlineStatus, allowFriendRequests } = req.body;

  try {
    if (!req.user) return res.status(401).json({ msg: 'Only registered users can update profiles' });

    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (bio !== undefined) user.bio = bio.substring(0, 150);
    if (age !== undefined) {
      if (!Number.isInteger(age) || age < 13 || age > 120) {
        return res.status(400).json({ msg: 'Age must be an integer between 13 and 120' });
      }
      user.age = age;
    }
    if (status !== undefined) user.status = status.substring(0, 30);
    if (showOnlineStatus !== undefined) user.privacy.showOnlineStatus = showOnlineStatus;
    if (allowFriendRequests !== undefined) user.privacy.allowFriendRequests = allowFriendRequests;

    await user.save();
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio,
      age: user.age,
      status: user.status,
      privacy: user.privacy,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get profile with all new fields
router.get('/profile', auth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Only registered users have profiles' });

    const user = await User.findById(req.user)
      .select('-password')
      .populate('friends', 'username online status')
      .populate('friendRequests', 'username') // If friend requests are used
      .populate('blockedUsers', 'username'); // Populate blockedUsers
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio || '',
      age: user.age || null,
      status: user.status,
      privacy: user.privacy,
      friends: user.friends,
      friendRequests: user.friendRequests, // Added for consistency
      blockedUsers: user.blockedUsers,
      activityLog: user.activityLog.slice(-5), // Last 5 actions
      stats: user.stats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/delete-account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    await User.deleteOne({ _id: req.user });
    res.json({ msg: 'Account deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Block a user
router.post('/block-user', auth, async (req, res) => {
  const { username } = req.body;
  try {
    const userToBlock = await User.findOne({ username });
    if (!userToBlock) return res.status(404).json({ msg: 'User not found' });
    if (userToBlock._id.toString() === req.user) return res.status(400).json({ msg: 'Cannot block yourself' });

    const user = await User.findById(req.user);
    if (user.blockedUsers.includes(userToBlock._id)) return res.status(400).json({ msg: 'User already blocked' });

    user.blockedUsers.push(userToBlock._id);
    user.activityLog.push({ action: `Blocked ${username}` });
    await user.save();
    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Unblock a user
router.post('/unblock-user', auth, async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findById(req.user);
    if (!user.blockedUsers.includes(userId)) return res.status(400).json({ msg: 'User not blocked' });

    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
    const unblockedUser = await User.findById(userId);
    user.activityLog.push({ action: `Unblocked ${unblockedUser.username}` });
    await user.save();
    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get blocked users with details
router.get('/blocked-users', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).populate('blockedUsers', 'username');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json(user.blockedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});
router.post('/increment-messages', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    user.stats.messagesSent += 1;
    user.activityLog.push({ action: 'Sent a message' });
    await user.save();
    res.json(user.stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
