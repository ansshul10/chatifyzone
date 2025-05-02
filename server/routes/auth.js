const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const rpID = process.env.WEBAUTHN_RP_ID || 'https://chatifyzone.vercel.app';
const rpName = 'Chatify';
const expectedOrigin = process.env.CLIENT_URL || 'https://chatifyzone.vercel.app';

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  country: Joi.string().allow('').optional(),
  state: Joi.string().allow('').optional(),
  age: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 18 || num > 120) {
        return helpers.error('any.invalid');
      }
      return num.toString();
    }, 'age validation')
    .optional(),
  gender: Joi.string().valid('male', 'female', null).optional(),
});

const webauthnRegisterBeginSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  country: Joi.string().allow('').optional(),
  state: Joi.string().allow('').optional(),
  age: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 18 || num > 120) {
        return helpers.error('any.invalid');
      }
      return num.toString();
    }, 'age validation')
    .optional(),
  gender: Joi.string().valid('male', 'female', null).optional(),
});

const webauthnRegisterCompleteSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  country: Joi.string().allow('').optional(),
  state: Joi.string().allow('').optional(),
  age: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 18 || num > 120) {
        return helpers.error('any.invalid');
      }
      return num.toString();
    }, 'age validation')
    .optional(),
  gender: Joi.string().valid('male', 'female', null).optional(),
  credential: Joi.object().required(),
  challenge: Joi.string().required(),
  userID: Joi.string().required(),
});

const webauthnLoginBeginSchema = Joi.object({
  email: Joi.string().email().required(),
});

const webauthnLoginCompleteSchema = Joi.object({
  email: Joi.string().email().required(),
  credential: Joi.object().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required(),
});

const updateProfileSchema = Joi.object({
  bio: Joi.string().max(150).allow('').optional(),
  age: Joi.alternatives()
    .try(
      Joi.string()
        .pattern(/^\d+$/)
        .custom((value, helpers) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 18 || num > 120) {
            return helpers.error('any.invalid');
          }
          return value;
        }, 'age validation'),
      Joi.number()
        .integer()
        .min(18)
        .max(120)
        .custom((value, helpers) => {
          return value.toString();
        }, 'age conversion')
    )
    .optional(),
  status: Joi.string().max(30).allow('').optional(),
  allowFriendRequests: Joi.boolean().optional(),
  profileVisibility: Joi.string().valid('Public', 'Friends', 'Private').optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

const blockUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
});

const unblockUserSchema = Joi.object({
  userId: Joi.string().required(),
});

const userIdSchema = Joi.object({
  userId: Joi.string().required(),
});

const subscribeSchema = Joi.object({
  email: Joi.string().email().required(),
});

const unsubscribeSchema = Joi.object({
  token: Joi.string().required(),
});

// Helper to add activity log
const addActivityLog = async (userId, action) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          $each: [{ action, timestamp: new Date() }],
          $slice: -5, // Keep only the last 5 entries
        },
      },
    });
  } catch (err) {
    console.error('[Activity Log] Error:', err.message);
  }
};

// Newsletter subscription
router.post('/subscribe', async (req, res) => {
  try {
    console.log('[Subscribe] Received subscription request for email:', req.body.email);
    const { error } = subscribeSchema.validate(req.body);
    if (error) {
      console.error('[Subscribe] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email: normalizedEmail });
    if (existingSubscriber) {
      console.error('[Subscribe] Email already subscribed:', normalizedEmail);
      return res.status(400).json({ msg: 'This email is already subscribed' });
    }

    // Save subscriber with unsubscribe token
    const subscriber = new Subscriber({ email: normalizedEmail });
    await subscriber.save();

    // Generate unsubscribe link
    const unsubscribeLink = `${process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'}/api/auth/unsubscribe?token=${subscriber.unsubscribeToken}`;

    // Send confirmation email with advanced UI
    const message = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ChatifyZone Newsletter</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background-color: #1A1A1A; font-family: 'Arial', sans-serif; color: white; line-height: 1.6; }
          .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
          .header { text-align: center; padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
          .header img { max-width: 150px; margin-bottom: 15px; }
          .header h1 { font-size: 28px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 20px 0; }
          .content p { margin-bottom: 15px; font-size: 16px; }
          .content ul { list-style: disc; margin-left: 20px; margin-bottom: 20px; }
          .content ul li { margin-bottom: 10px; }
          .button { display: inline-block; padding: 14px 32px; background: #FF0000; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; transition: background 0.3s ease; text-align: center; }
          .button:hover { background: #CC0000; }
          .warning { color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-top: 20px; }
          .footer { text-align: center; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: rgba(255, 255, 255, 0.5); }
          .highlight { color: #FF0000; font-weight: 600; }
          a { color: #FF0000; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .button-container { text-align: center; margin: 20px 0; }
          @media only screen and (max-width: 600px) {
            .container { margin: 20px; padding: 20px; }
            .header h1 { font-size: 22px; }
            .header img { max-width: 120px; }
            .button { display: block; width: 100%; }
            .content p { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ChatifyZone</h1>
          </div>
          <div class="content">
            <p>Hello <span class="highlight">${normalizedEmail}</span>,</p>
            <p>Thank you for subscribing to the ChatifyZone Newsletter! You're now part of our vibrant community, and we're thrilled to have you on board.</p>
            <p>Here's what you can expect from us:</p>
            <ul>
              <li>Real-time chat feature updates</li>
              <li>Exclusive event invitations</li>
              <li>Tips for secure and fun chatting</li>
              <li>Community highlights and stories</li>
            </ul>
            <div class="button-container">
              <a href="https://chatifyzone.vercel.app" class="button">Explore ChatifyZone Now</a>
            </div>
            <p class="warning">If you did not subscribe or wish to stop receiving our emails, you can unsubscribe at any time:</p>
            <div class="button-container">
              <a href="${unsubscribeLink}" class="button" style="background: #666666;">Unsubscribe</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ChatifyZone. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:support@chatifyzone.in">support@chatifyzone.in</a></p>
            <p>Follow us: <a href="https://x.com/chatifyzone">X</a> | <a href="https://instagram.com/chatifyzone">Instagram</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(normalizedEmail, 'ChatifyZone Newsletter Subscription', message);

    console.log(`[Subscribe] Subscription successful for: ${normalizedEmail}`);
    res.json({ msg: 'Subscribed successfully! Check your email for confirmation.' });
  } catch (err) {
    console.error('[Subscribe] Server error:', err.message);
    res.status(500).json({ msg: 'Failed to subscribe. Please try again later.' });
  }
});

// Unsubscribe from newsletter
router.get('/unsubscribe', async (req, res) => {
  try {
    console.log('[Unsubscribe] Received unsubscribe request for token:', req.query.token);
    const { error } = unsubscribeSchema.validate({ token: req.query.token });
    if (error) {
      console.error('[Unsubscribe] Validation error:', error.details[0].message);
      return res.status(400).send('Invalid unsubscribe token');
    }

    const { token } = req.query;
    const subscriber = await Subscriber.findOne({ unsubscribeToken: token });
    if (!subscriber) {
      console.error('[Unsubscribe] Subscriber not found for token:', token);
      return res.status(404).send('Subscriber not found or already unsubscribed');
    }

    // Remove subscriber
    await Subscriber.deleteOne({ unsubscribeToken: token });

    // Send unsubscription confirmation email with advanced UI
    const message = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed from ChatifyZone Newsletter</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background-color: #1A1A1A; font-family: 'Arial', sans-serif; color: white; line-height: 1.6; }
          .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
          .header { text-align: center; padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
          .header img { max-width: 150px; margin-bottom: 15px; }
          .header h1 { font-size: 28px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 20px 0; }
          .content p { margin-bottom: 15px; font-size: 16px; }
          .button { display: inline-block; padding: 14px 32px; background: #FF0000; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; transition: background 0.3s ease; text-align: center; }
          .button:hover { background: #CC0000; }
          .warning { color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-top: 20px; }
          .footer { text-align: center; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: rgba(255, 255, 255, 0.5); }
          .highlight { color: #FF0000; font-weight: 600; }
          a { color: #FF0000; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .button-container { text-align: center; margin: 20px 0; }
          @media only screen and (max-width: 600px) {
            .container { margin: 20px; padding: 20px; }
            .header h1 { font-size: 22px; }
            .header img { max-width: 120px; }
            .button { display: block; width: 100%; }
            .content p { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Unsubscribed</h1>
          </div>
          <div class="content">
            <p>Hello <span class="highlight">${subscriber.email}</span>,</p>
            <p>You have successfully unsubscribed from the ChatifyZone Newsletter. We're sorry to see you go!</p>
            <p>If this was a mistake or you'd like to rejoin our community, you can resubscribe anytime.</p>
            <div class="button-container">
              <a href="https://chatifyzone.vercel.app" class="button">Resubscribe Now</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ChatifyZone. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:support@chatifyzone.in">support@chatifyzone.in</a></p>
            <p>Follow us: <a href="https://x.com/chatifyzone">X</a> | <a href="https://instagram.com/chatifyzone">Instagram</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(subscriber.email, 'Unsubscribed from ChatifyZone Newsletter', message);

    console.log(`[Unsubscribe] Successfully unsubscribed: ${subscriber.email}`);
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background-color: #1A1A1A; font-family: 'Arial', sans-serif; color: white; line-height: 1.6; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .container { max-width: 500px; margin: 20px; background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%); border-radius: 12px; padding: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); text-align: center; }
          h1 { font-size: 24px; font-weight: 700; color: white; margin-bottom: 20px; }
          p { margin-bottom: 15px; font-size: 16px; }
          .button { display: inline-block; padding: 12px 24px; background: #FF0000; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; transition: background 0.3s ease; }
          .button:hover { background: #CC0000; }
          a { color: #FF0000; text-decoration: none; }
          a:hover { text-decoration: underline; }
          @media only screen and (max-width: 600px) {
            .container { padding: 20px; }
            h1 { font-size: 20px; }
            .button { display: block; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Unsubscribed Successfully</h1>
          <p>You have been removed from the ChatifyZone Newsletter.</p>
          <p>Want to rejoin? <a href="https://chatifyzone.vercel.app">Resubscribe here</a>.</p>
          <a href="https://chatifyzone.vercel.app" class="button">Return to ChatifyZone</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[Unsubscribe] Server error:', err.message);
    res.status(500).send('Server error. Please try again later.');
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('[Get Profile] Fetching profile for user ID:', req.user);
    const user = await User.findById(req.user)
      .select('-password -webauthnCredentials -webauthnUserID')
      .populate('friends', 'username')
      .populate('friendRequests', 'username')
      .populate('blockedUsers', 'username');
    if (!user) {
      console.error('[Get Profile] User not found:', req.user);
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log(`[Get Profile] Profile fetched for: ${user.username}`);
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio || '',
      age: user.age || null,
      status: user.status || 'Available',
      privacy: user.privacy,
      friends: user.friends,
      friendRequests: user.friendRequests,
      blockedUsers: user.blockedUsers,
      createdAt: user.createdAt,
      country: user.country,
      state: user.state,
      gender: user.gender,
      activityLog: user.activityLog,
    });
  } catch (err) {
    console.error('[Get Profile] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get user profile by ID
router.get('/profile/:userId', auth, async (req, res) => {
  try {
    console.log('[Get User Profile] Fetching profile for user ID:', req.params.userId);
    const { error } = userIdSchema.validate({ userId: req.params.userId });
    if (error) {
      console.error('[Get User Profile] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const user = await User.findById(req.params.userId)
      .select('-password -webauthnCredentials -webauthnUserID')
      .populate('friends', 'username')
      .populate('friendRequests', 'username')
      .populate('blockedUsers', 'username');
    if (!user) {
      console.error('[Get User Profile] User not found:', req.params.userId);
      return res.status(404).json({ msg: 'User not found' });
    }

    const currentUser = await User.findById(req.user);
    if (user.privacy.profileVisibility === 'Private' && req.user !== req.params.userId) {
      console.error('[Get User Profile] Profile is private:', req.params.userId);
      return res.status(403).json({ msg: 'This profile is private' });
    }
    if (
      user.privacy.profileVisibility === 'Friends' &&
      req.user !== req.params.userId &&
      !currentUser.friends.includes(req.params.userId)
    ) {
      console.error('[Get User Profile] Profile is visible to friends only:', req.params.userId);
      return res.status(403).json({ msg: 'This profile is visible to friends only' });
    }

    console.log(`[Get User Profile] Profile fetched for: ${user.username}`);
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio || '',
      age: user.age || null,
      status: user.status || 'Available',
      privacy: user.privacy,
      friends: user.friends,
      friendRequests: user.friendRequests,
      blockedUsers: user.blockedUsers,
      createdAt: user.createdAt,
      country: user.country,
      state: user.state,
      gender: user.gender,
      activityLog: user.activityLog,
    });
  } catch (err) {
    console.error('[Get User Profile] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('[Update Profile] Updating profile for user ID:', req.user, 'Request body:', req.body);
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
      console.error('[Update Profile] Validation error:', error.details[0].message, 'Request body:', req.body);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { bio, age, status, allowFriendRequests, profileVisibility } = req.body;
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (age !== undefined) updateData.age = age;
    if (status !== undefined) updateData.status = status;
    if (allowFriendRequests !== undefined) updateData['privacy.allowFriendRequests'] = allowFriendRequests;
    if (profileVisibility !== undefined) updateData['privacy.profileVisibility'] = profileVisibility;

    const user = await User.findByIdAndUpdate(
      req.user,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -webauthnCredentials -webauthnUserID');

    if (!user) {
      console.error('[Update Profile] User not found:', req.user);
      return res.status(404).json({ msg: 'User not found' });
    }

    await addActivityLog(req.user, 'Profile updated');

    console.log(`[Update Profile] Profile updated for: ${user.username}`);
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio || '',
      age: user.age || null,
      status: user.status || 'Available',
      privacy: user.privacy,
      friends: user.friends,
      friendRequests: user.friendRequests,
      blockedUsers: user.blockedUsers,
      createdAt: user.createdAt,
      country: user.country,
      state: user.state,
      gender: user.gender,
      activityLog: user.activityLog,
    });
  } catch (err) {
    console.error('[Update Profile] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    console.log('[Change Password] Changing password for user ID:', req.user);
    const { error } = changePasswordSchema.validate(req.body);
    if (error) {
      console.error('[Change Password] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user).select('+password');
    if (!user) {
      console.error('[Change Password] User not found:', req.user);
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!user.password) {
      console.error('[Change Password] Account uses biometric login only:', user.email);
      return res.status(400).json({ msg: 'This account uses biometric login.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.error('[Change Password] Current password is incorrect for:', user.email);
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await addActivityLog(req.user, 'Password changed');

    console.log(`[Change Password] Password changed for: ${user.username}`);
    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('[Change Password] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    console.log('[Delete Account] Deleting account for user ID:', req.user);
    const user = await User.findByIdAndDelete(req.user);
    if (!user) {
      console.error('[Delete Account] User not found:', req.user);
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log(`[Delete Account] Account deleted for: ${user.username}`);
    res.json({ msg: 'Account deleted successfully' });
  } catch (err) {
    console.error('[Delete Account] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Block user
router.post('/block-user', auth, async (req, res) => {
  try {
    console.log('[Block User] Blocking user for user ID:', req.user);
    const { error } = blockUserSchema.validate(req.body);
    if (error) {
      console.error('[Block User] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { username } = req.body;
    const user = await User.findById(req.user);
    const userToBlock = await User.findOne({ username });
    if (!userToBlock) {
      console.error('[Block User] User to block not found:', username);
      return res.status(404).json({ msg: 'User not found' });
    }
    if (userToBlock.id === req.user) {
      console.error('[Block User] Cannot block self:', req.user);
      return res.status(400).json({ msg: 'Cannot block yourself' });
    }
    if (user.blockedUsers.includes(userToBlock.id)) {
      console.error('[Block User] User already blocked:', username);
      return res.status(400).json({ msg: 'User already blocked' });
    }

    user.blockedUsers.push(userToBlock.id);
    if (user.friends.includes(userToBlock.id)) {
      user.friends = user.friends.filter(friendId => friendId.toString() !== userToBlock.id);
      const blockedUser = await User.findById(userToBlock.id);
      blockedUser.friends = blockedUser.friends.filter(friendId => friendId.toString() !== req.user);
      await blockedUser.save();
    }
    await user.save();

    await addActivityLog(req.user, `Blocked user: ${username}`);

    console.log(`[Block User] User blocked: ${username} by ${user.username}`);
    res.json({ msg: `User ${username} blocked successfully` });
  } catch (err) {
    console.error('[Block User] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// WebAuthn registration: Begin
router.post('/webauthn/register/begin', async (req, res) => {
  try {
    console.log('[WebAuthn Register Begin] Deployed Version: Buffer Fix 2025-04-26 v2');
    console.log('[WebAuthn Register Begin] Step 1: Received request:', req.body);

    console.log('[WebAuthn Register Begin] Step 2: Validating request body');
    const { error } = webauthnRegisterBeginSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Register Begin] Step 2 Error: Validation failed:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }
    console.log('[WebAuthn Register Begin] Step 2: Validation passed');

    const { username, email, country, state, age, gender } = req.body;
    console.log('[WebAuthn Register Begin] Step 3: Checking for existing user:', { email, username });
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.error('[WebAuthn Register Begin] Step 3 Error: User already exists:', {
        email: user.email,
        username: user.username,
        userId: user._id,
      });
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }
    console.log('[WebAuthn Register Begin] Step 3: No existing user found');

    console.log('[WebAuthn Register Begin] Step 4: Generating WebAuthn registration options');
    const userID = crypto.randomBytes(32);
    console.log('[WebAuthn Register Begin] Step 4: Generated userID (Buffer length):', userID.length);
    let options;
    try {
      options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID,
        userName: username,
        userDisplayName: username,
        attestationType: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        excludeCredentials: [],
        supportedAlgorithmIDs: [-8, -7, -257],
      });
      console.log('[WebAuthn Register Begin] Step 4: Options generated successfully');
    } catch (webauthnError) {
      console.error('[WebAuthn Register Begin] Step 4 Error: Failed to generate WebAuthn options:', webauthnError.message);
      return res.status(500).json({ msg: 'Failed to generate WebAuthn registration options' });
    }

    console.log('[WebAuthn Register Begin] Step 5: Preparing response');
    const response = {
      publicKey: options,
      challenge: options.challenge,
      userID: userID.toString('base64'),
      email,
      username,
      country,
      state,
      age,
      gender,
    };

    console.log('[WebAuthn Register Begin] Step 6: Verifying response structure');
    if (!response.publicKey || !response.challenge || !response.userID) {
      console.error('[WebAuthn Register Begin] Step 6 Error: Invalid response structure');
      return res.status(500).json({ msg: 'Server failed to prepare WebAuthn response' });
    }
    console.log('[WebAuthn Register Begin] Step 6: Response structure valid');

    console.log('[WebAuthn Register Begin] Step 7: Sending response');
    res.json(response);
  } catch (err) {
    console.error('[WebAuthn Register Begin] Step 8 Error: Unexpected server error:', err.message);
    res.status(500).json({ msg: 'Unexpected server error' });
  }
});

// WebAuthn registration: Complete
router.post('/webauthn/register/complete', async (req, res) => {
  try {
    console.log('[WebAuthn Register Complete] Received request:', req.body);
    const { error } = webauthnRegisterCompleteSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Register Complete] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, username, country, state, age, gender, credential, challenge, userID } = req.body;
    if (!challenge || !userID) {
      console.error('[WebAuthn Register Complete] Missing challenge or userID');
      return res.status(400).json({ msg: 'Missing challenge or userID' });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
      });
    } catch (verifyError) {
      console.error('[WebAuthn Register Complete] Verification error:', verifyError.message);
      return res.status(400).json({ msg: 'Fingerprint registration verification failed' });
    }

    if (!verification.verified) {
      console.error('[WebAuthn Register Complete] Verification failed for:', email);
      return res.status(400).json({ msg: 'Fingerprint registration failed' });
    }

    const registrationInfo = verification.registrationInfo || {};
    const credentialData = registrationInfo.credential || {};
    const credentialID = credentialData.id;
    const publicKey = credentialData.publicKey;
    const counter = credentialData.counter;

    if (!credentialID || !publicKey || counter === undefined) {
      console.error('[WebAuthn Register Complete] Missing credential fields');
      return res.status(500).json({ msg: 'Invalid credential data from server' });
    }

    const user = new User({
      email,
      username,
      country,
      state,
      age,
      gender,
      webauthnUserID: userID,
      webauthnCredentials: [{
        credentialID: Buffer.from(credentialID).toString('base64'),
        publicKey: Buffer.from(publicKey).toString('base64'),
        counter,
        deviceName: 'Fingerprint Authenticator',
        authenticatorType: 'fingerprint',
      }],
      activityLog: [{ action: 'Account created', timestamp: new Date() }],
    });

    await user.save();
    await addActivityLog(user.id, 'Account created');

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    await req.session.save();

    console.log(`[WebAuthn Register Complete] User registered: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age, gender: user.gender } });
  } catch (err) {
    console.error('[WebAuthn Register Complete] Server error:', err.message);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// WebAuthn login: Begin
router.post('/webauthn/login/begin', async (req, res) => {
  try {
    console.log('[WebAuthn Login Begin] Step 1: Received request:', req.body.email);
    const { error } = webauthnLoginBeginSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Login Begin] Step 1 Error: Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    console.log('[WebAuthn Login Begin] Step 2: Fetching user for email:', email);
    const user = await User.findOne({ email });
    if (!user || !user.webauthnCredentials.length) {
      console.error('[WebAuthn Login Begin] Step 2 Error: No biometric credentials found for:', email);
      return res.status(400).json({ msg: 'No biometric credentials found for this user' });
    }
    console.log('[WebAuthn Login Begin] Step 2: User found:', { userId: user._id, username: user.username });

    console.log('[WebAuthn Login Begin] Step 3: Validating webauthnCredentials');
    const allowCredentials = user.webauthnCredentials.map((cred, index) => {
      if (typeof cred.credentialID !== 'string') {
        console.error('[WebAuthn Login Begin] Step 3 Error: Invalid credentialID type at index', index, ':', typeof cred.credentialID);
        throw new Error(`Invalid credentialID type for credential at index ${index}`);
      }
      try {
        const decoded = Buffer.from(cred.credentialID, 'base64');
        console.log('[WebAuthn Login Begin] Step 3: Valid credentialID at index', index, ':', cred.credentialID.substring(0, 20) + '...');
        return {
          id: cred.credentialID,
          type: 'public-key',
        };
      } catch (base64Error) {
        console.error('[WebAuthn Login Begin] Step 3 Error: Invalid base64 credentialID at index', index, ':', cred.credentialID);
        throw new Error(`Invalid base64 format for credentialID at index ${index}`);
      }
    });
    console.log('[WebAuthn Login Begin] Step 3: allowCredentials prepared:', allowCredentials.length, 'credentials');

    console.log('[WebAuthn Login Begin] Step 4: Generating authentication options');
    let options;
    try {
      options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'required',
      });
      console.log('[WebAuthn Login Begin] Step 4: Authentication options generated:', {
        challenge: options.challenge,
        allowCredentialsCount: options.allowCredentials.length,
      });
    } catch (webauthnError) {
      console.error('[WebAuthn Login Begin] Step 4 Error: Failed to generate authentication options:', {
        message: webauthnError.message,
        stack: webauthnError.stack,
      });
      return res.status(500).json({ msg: `Failed to generate authentication options: ${webauthnError.message}` });
    }

    console.log('[WebAuthn Login Begin] Step 5: Saving session data');
    req.session.challenge = options.challenge;
    req.session.email = email;
    req.session.webauthnUserID = user.webauthnUserID;
    req.session.challengeExpires = Date.now() + 5 * 60 * 1000;

    try {
      await req.session.save();
      console.log('[WebAuthn Login Begin] Step 5: Session saved:', {
        sessionId: req.sessionID,
        challenge: options.challenge,
        webauthnUserID: user.webauthnUserID,
      });
    } catch (sessionError) {
      console.error('[WebAuthn Login Begin] Step 5 Error: Failed to save session:', sessionError.message);
      return res.status(500).json({ msg: 'Failed to save session data' });
    }

    console.log('[WebAuthn Login Begin] Step 6: Sending response');
    res.json(options);
  } catch (err) {
    console.error('[WebAuthn Login Begin] Step 7 Error: Server error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// WebAuthn login: Complete
router.post('/webauthn/login/complete', async (req, res) => {
  try {
    console.log('[WebAuthn Login Complete] Step 1: Received request:', req.body.email);
    const { error } = webauthnLoginCompleteSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Login Complete] Step 1 Error: Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, credential } = req.body;

    console.log('[WebAuthn Login Complete] Step 2: Validating session data');
    if (
      !req.session.challenge ||
      req.session.email !== email ||
      !req.session.webauthnUserID ||
      req.session.challengeExpires < Date.now()
    ) {
      console.error('[WebAuthn Login Complete] Step 2 Error: Invalid session data:', {
        sessionId: req.sessionID,
        sessionChallenge: req.session.challenge,
        sessionEmail: req.session.email,
        sessionWebauthnUserID: req.session.webauthnUserID,
        providedEmail: email,
        challengeExpired: req.session.challengeExpires < Date.now(),
      });
      return res.status(400).json({ msg: 'Invalid session or email' });
    }

    console.log('[WebAuthn Login Complete] Step 3: Fetching user for email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.error('[WebAuthn Login Complete] Step 3 Error: User not found:', email);
      return res.status(400).json({ msg: 'User not found' });
    }

    console.log('[WebAuthn Login Complete] Step 4: Matching credential');
    const credentialID = Buffer.from(credential.rawId).toString('base64');
    const credentialMatch = user.webauthnCredentials.find(
      cred => cred.credentialID === credentialID
    );
    if (!credentialMatch) {
      console.error('[WebAuthn Login Complete] Step 4 Error: Invalid credential for:', email, 'Provided credentialID:', credentialID);
      return res.status(400).json({ msg: 'Invalid credential' });
    }
    console.log('[WebAuthn Login Complete] Step 4: Credential matched:', {
      credentialID: credentialMatch.credentialID.substring(0, 20) + '...',
      counter: credentialMatch.counter,
    });

    console.log('[WebAuthn Login Complete] Step 5: Verifying authentication response');
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: req.session.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credentialMatch.credentialID, 'base64'),
        credentialPublicKey: Buffer.from(credentialMatch.publicKey, 'base64'),
        counter: credentialMatch.counter,
      },
    });

    if (!verification.verified) {
      console.error('[WebAuthn Login Complete] Step 5 Error: Verification failed for:', email);
      return res.status(400).json({ msg: 'Fingerprint authentication failed' });
    }
    console.log('[WebAuthn Login Complete] Step 5: Verification successful:', {
      newCounter: verification.authenticationInfo.newCounter,
    });

    console.log('[WebAuthn Login Complete] Step 6: Updating credential counter');
    credentialMatch.counter = verification.authenticationInfo.newCounter;
    await user.save();

    console.log('[WebAuthn Login Complete] Step 7: Generating JWT token');
    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('[WebAuthn Login Complete] Step 8: Updating session');
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.challenge = null;
    req.session.email = null;
    req.session.webauthnUserID = null;
    req.session.challengeExpires = null;
    await req.session.save();

    await addActivityLog(user.id, 'Logged in via WebAuthn');

    console.log(`[WebAuthn Login Complete] Step 9: User logged in: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age, gender: user.gender } });
  } catch (err) {
    console.error('[WebAuthn Login Complete] Step 10 Error: Server error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Password-based login
router.post('/login', async (req, res) => {
  try {
    console.log('[Password Login] Received login request:', req.body.email);
    const { error } = loginSchema.validate(req.body);
    if (error) {
      console.error('[Password Login] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.error('[Password Login] User not found for email:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (!user.password) {
      console.error('[Password Login] Account uses biometric login only:', email);
      return res.status(400).json({ msg: 'This account uses biometric login.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error('[Password Login] Password mismatch for email:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    await req.session.save();

    await addActivityLog(user.id, 'Logged in via password');

    console.log(`[Password Login] User logged in: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age, gender: user.gender } });
  } catch (err) {
    console.error('[Password Login] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Password-based registration
router.post('/register', async (req, res) => {
  try {
    console.log('[Password Register] Received registration request:', req.body);
    const { error } = registerSchema.validate(req.body);
    if (error) {
      console.error('[Password Register] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, username, password, country, state, age, gender } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.error('[Password Register] User already exists:', { email, username });
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    user = new User({ email, username, password, country, state, age, gender });
    await user.save();

    await addActivityLog(user.id, 'Account created');

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    await req.session.save();

    console.log(`[Password Register] User registered: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age, gender: user.gender } });
  } catch (err) {
    console.error('[Password Register] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('[Forgot Password] Received request for email:', req.body.email);
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      console.error('[Forgot Password] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error('[Forgot Password] User not found:', email);
      return res.status(404).json({ msg: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    await addActivityLog(user.id, 'Requested password reset');

    const resetUrl = `${process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'}/reset-password/${resetToken}`;
    const message = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background-color: #1A1A1A; font-family: 'Arial', sans-serif; color: white; line-height: 1.6; }
          .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
          .header { text-align: center; padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
          .header h1 { font-size: 28px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 20px 0; }
          .content p { margin-bottom: 15px; }
          .button { display: inline-block; padding: 14px 32px; background: #FF0000; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; transition: background 0.3s ease; text-align: center; }
          .button:hover { background: #CC0000; }
          .warning { color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-top: 20px; }
          .footer { text-align: center; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: rgba(255, 255, 255, 0.5); }
          .highlight { color: #FF0000; font-weight: 600; }
          a { color: #FF0000; text-decoration: none; }
          a:hover { text-decoration: underline; }
          @media only screen and (max-width: 600px) {
            .container { margin: 20px; padding: 20px; }
            .header h1 { font-size: 22px; }
            .button { display: block; width: 100%; }
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
            <p>© ${new Date().getFullYear()} Chatify. All rights reserved.</p>
            <p>Having issues? Contact us at <a href="mailto:support@chatify.com">support@chatify.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(user.email, 'Password Reset Request', message);

    console.log(`[Forgot Password] Password reset email sent to: ${user.email}`);
    res.json({ msg: 'Password reset email sent' });
  } catch (err) {
    console.error('[Forgot Password] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    console.log('[Reset Password] Received request for token:', req.params.token);
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      console.error('[Reset Password] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.error('[Reset Password] Invalid or expired reset token');
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await addActivityLog(user.id, 'Password reset');

    console.log(`[Reset Password] Password reset for: ${user.username}`);
    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error('[Reset Password] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
