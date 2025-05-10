const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

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

const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
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

const adminRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  adminSecret: Joi.string().required(),
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

const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  adminSecret: Joi.string().required(),
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
          $slice: -5,
        },
      },
    });
  } catch (err) {
    console.error('[Activity Log] Error:', err.message);
  }
};

// Generate OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Send OTP email
const sendOtpEmail = async (email, username, otp, subject = 'ChatifyZone OTP Verification') => {
  const message = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #1A1A1A; font-family: 'Arial', sans-serif; color: white; line-height: 1.6; }
        .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
        .header { text-align: center; padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .header h1 { font-size: 28px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 20px 0; }
        .content p { margin-bottom: 15px; font-size: 16px; }
        .otp { font-size: 24px; font-weight: 700; color: #FF0000; text-align: center; margin: 20px 0; }
        .warning { color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-top: 20px; }
        .footer { text-align: center; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: rgba(255, 255, 255, 0.5); }
        .highlight { color: #FF0000; font-weight: 600; }
        a { color: #FF0000; text-decoration: none; }
        a:hover { text-decoration: underline; }
        @media only screen and (max-width: 600px) {
          .container { margin: 20px; padding: 20px; }
          .header h1 { font-size: 22px; }
          .content p { font-size: 14px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${subject}</h1>
        </div>
        <div class="content">
          <p>Hello <span class="highlight">${username}</span>,</p>
          <p>Please use the following OTP to proceed with your password reset request:</p>
          <div class="otp">${otp}</div>
          <p class="warning">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ChatifyZone. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:support@chatifyzone.in">support@chatifyzone.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
  await sendEmail(email, subject, message);
};

// Send security alert email
const sendSecurityAlertEmail = async (email, username, locationDetails) => {
  const message = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ChatifyZone Security Alert</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #1A1A1A; font-family: 'Arial', sans-serif; color: white; line-height: 1.6; }
        .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
        .header { text-align: center; padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .header h1 { font-size: 28px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 20px 0; }
        .content p { margin-bottom: 15px; font-size: 16px; }
        .details { background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px; margin: 20px 0; }
        .details p { margin-bottom: 10px; }
        .warning { color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-top: 20px; }
        .footer { text-align: center; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: rgba(255, 255, 255, 0.5); }
        .highlight { color: #FF0000; font-weight: 600; }
        a { color: #FF0000; text-decoration: none; }
        a:hover { text-decoration: underline; }
        @media only screen and (max-width: 600px) {
          .container { margin: 20px; padding: 20px; }
          .header h1 { font-size: 22px; }
          .content p { font-size: 14px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Security Alert</h1>
        </div>
        <div class="content">
          <p>Hello <span class="highlight">${username}</span>,</p>
          <p>We detected multiple unsuccessful attempts to verify a password reset OTP for your ChatifyZone account. This may indicate unauthorized access attempts.</p>
          <div class="details">
            <p><strong>Details of the Attempt:</strong></p>
            <p>IP Address: ${locationDetails.ip || 'Unknown'}</p>
            <p>Location: ${locationDetails.city || 'Unknown'}, ${locationDetails.country || 'Unknown'}</p>
            <p>Time: ${new Date().toLocaleString()}</p>
          </div>
          <p>If this was not you, please secure your account by changing your password or contacting support.</p>
          <p class="warning">If you initiated this request, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ChatifyZone. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:support@chatifyzone.in">support@chatifyzone.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
  await sendEmail(email, 'ChatifyZone Security Alert', message);
};

// Check maintenance status
router.get('/maintenance-status', async (req, res) => {
  try {
    console.log('[Maintenance Status] Checking maintenance status');
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    res.json({ maintenanceMode: settings.maintenanceMode });
  } catch (err) {
    console.error('[Maintenance Status] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

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

    const existingSubscriber = await Subscriber.findOne({ email: normalizedEmail });
    if (existingSubscriber) {
      console.error('[Subscribe] Email already subscribed:', normalizedEmail);
      return res.status(400).json({ msg: 'This email is already subscribed' });
    }

    const subscriber = new Subscriber({ email: normalizedEmail });
    await subscriber.save();

    const unsubscribeLink = `${
      process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'
    }/unsubscribe?token=${subscriber.unsubscribeToken}`;

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

    await Subscriber.deleteOne({ unsubscribeToken: token });

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
      .select('-password')
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
      .select('-password')
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
    ).select('-password');

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
      console.error('[Change Password] Account uses password-less login only:', user.email);
      return res.status(400).json({ msg: 'This account does not use password-based login.' });
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
      user.friends = user.friends.filter((friendId) => friendId.toString() !== userToBlock.id);
      const blockedUser = await User.findById(userToBlock.id);
      blockedUser.friends = blockedUser.friends.filter((friendId) => friendId.toString() !== req.user);
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

// Password login
router.post('/login', async (req, res) => {
  try {
    console.log('[Login] Received login request for email:', req.body.email);
    const { error } = loginSchema.validate(req.body);
    if (error) {
      console.error('[Login] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.error('[Login] User not found for email:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (user.isBanned) {
      console.error('[Login] Attempted login by banned user:', email);
      return res.status(403).json({ msg: 'Your account is banned. Please contact support.' });
    }

    if (!user.password) {
      console.error('[Login] Account uses password-less login only:', email);
      return res.status(400).json({ msg: 'This account does not use password-based login.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error('[Login] Invalid password for email:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id, username: user.username } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    await addActivityLog(user.id, 'Logged in with password');

    console.log(`[Login] User logged in: ${user.username} (ID: ${user.id})`);
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('[Login] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Initiate password-based registration with OTP
router.post('/register/init', async (req, res) => {
  try {
    console.log('[Register Init] Received registration request:', req.body.email);

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    if (!settings.registrationEnabled) {
      console.error('[Register Init] Registration is disabled');
      return res.status(403).json({ msg: 'Registration is currently disabled' });
    }

    const { error } = registerSchema.validate(req.body);
    if (error) {
      console.error('[Register Init] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, username, password, country, state, age, gender } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.error('[Register Init] User already exists:', { email, username });
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    user = new User({
      email,
      username,
      password,
      country,
      state,
      age,
      gender,
      activityLog: [{ action: 'Account creation initiated', timestamp: new Date() }],
    });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendOtpEmail(email, username, otp);
    await addActivityLog(user.id, 'OTP sent for registration');

    console.log(`[Register Init] OTP sent to: ${email}`);
    res.json({ msg: 'OTP sent to your email. Please verify to complete registration.' });
  } catch (err) {
    console.error('[Register Init] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Verify OTP and complete registration
router.post('/register/verify-otp', async (req, res) => {
  try {
    console.log('[Verify OTP] Received OTP verification request for email:', req.body.email);
    const { error } = otpSchema.validate(req.body);
    if (error) {
      console.error('[Verify OTP] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.error('[Verify OTP] Invalid or expired OTP for email:', email);
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const payload = { user: { id: user.id, username: user.username } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    await addActivityLog(user.id, 'Account created');

    console.log(`[Verify OTP] User registered: ${user.username} (ID: ${user.id})`);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        country: user.country,
        state: user.state,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (err) {
    console.error('[Verify OTP] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Resend OTP for registration
router.post('/register/resend-otp', async (req, res) => {
  try {
    console.log('[Resend OTP] Received resend OTP request for email:', req.body.email);
    const { error } = Joi.object({
      email: Joi.string().email().required(),
    }).validate(req.body);
    if (error) {
      console.error('[Resend OTP] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error('[Resend OTP] User not found:', email);
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!user.otp || !user.otpExpires) {
      console.error('[Resend OTP] No pending OTP verification for:', email);
      return res.status(400).json({ msg: 'No pending OTP verification' });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendOtpEmail(email, user.username, otp);
    await addActivityLog(user.id, 'OTP resent for registration');

    console.log(`[Resend OTP] OTP resent to: ${email}`);
    res.json({ msg: 'OTP resent to your email.' });
  } catch (err) {
    console.error('[Resend OTP] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Initiate forgot password with OTP
router.post('/forgot-password/init', async (req, res) => {
  try {
    console.log('[Forgot Password Init] Received request for email:', req.body.email);
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      console.error('[Forgot Password Init] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error('[Forgot Password Init] User not found:', email);
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!user.password) {
      console.error('[Forgot Password Init] Account uses password-less login only:', email);
      return res.status(400).json({ msg: 'This account does not use password-based login.' });
    }

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.resetOtpAttempts = 0; // Reset attempts counter
    await user.save();

    await sendOtpEmail(email, user.username, otp, 'ChatifyZone Password Reset OTP');
    await addActivityLog(user.id, 'OTP sent for password reset');

    console.log(`[Forgot Password Init] OTP sent to: ${email}`);
    res.json({ msg: 'OTP sent to your email. Please verify to proceed with password reset.' });
  } catch (err) {
    console.error('[Forgot Password Init] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Verify OTP for forgot password
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    console.log('[Forgot Password Verify OTP] Received OTP verification request for email:', req.body.email);
    const { error } = otpSchema.validate(req.body);
    if (error) {
      console.error('[Forgot Password Verify OTP] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      console.error('[Forgot Password Verify OTP] User not found:', email);
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!user.resetOtp || !user.resetOtpExpires || user.resetOtpExpires < Date.now()) {
      console.error('[Forgot Password Verify OTP] Invalid or expired OTP for email:', email);
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    if (user.resetOtp !== otp) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();

      if (user.resetOtpAttempts >= 5) {
        const locationDetails = {
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
          city: req.headers['x-geo-city'] || 'Unknown',
          country: req.headers['x-geo-country'] || 'Unknown',
        };
        await sendSecurityAlertEmail(email, user.username, locationDetails);
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        user.resetOtpAttempts = 0;
        await user.save();
        await addActivityLog(user.id, 'Security alert sent due to multiple failed OTP attempts');
        console.error('[Forgot Password Verify OTP] Too many incorrect OTP attempts for:', email);
        return res.status(429).json({ msg: 'Too many incorrect OTP attempts. A security alert has been sent to your email.' });
      }

      await addActivityLog(user.id, 'Failed OTP attempt for password reset');
      console.error('[Forgot Password Verify OTP] Incorrect OTP for email:', email);
      return res.status(400).json({ msg: 'Incorrect OTP', attemptsLeft: 5 - user.resetOtpAttempts });
    }

    // OTP is correct, generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    const resetLink = `${
      process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'
    }/reset-password/${resetToken}`;
    const message = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ChatifyZone Password Reset</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background-color: #1A1A1A; font-family: 'Arial', sans-serif; color: white; line-height: 1.6; }
          .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
          .header { text-align: center; padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
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
            .content p { font-size: 14px; }
            .button { display: block; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hello <span class="highlight">${user.username}</span>,</p>
            <p>Your OTP has been verified. Click the button below to reset your ChatifyZone password:</p>
            <div class="button-container">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p class="warning">This link is valid for 1 hour. If you did not request a password reset, please contact support immediately.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ChatifyZone. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:support@chatifyzone.in">support@chatifyzone.in</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(email, 'ChatifyZone Password Reset', message);

    await addActivityLog(user.id, 'OTP verified for password reset');

    console.log(`[Forgot Password Verify OTP] Password reset link sent to: ${email}`);
    res.json({ msg: 'OTP verified. Password reset link sent to your email.' });
  } catch (err) {
    console.error('[Forgot Password Verify OTP] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Resend OTP for forgot password
router.post('/forgot-password/resend-otp', async (req, res) => {
  try {
    console.log('[Forgot Password Resend OTP] Received resend OTP request for email:', req.body.email);
    const { error } = Joi.object({
      email: Joi.string().email().required(),
    }).validate(req.body);
    if (error) {
      console.error('[Forgot Password Resend OTP] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error('[Forgot Password Resend OTP] User not found:', email);
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      console.error('[Forgot Password Resend OTP] No pending OTP verification for:', email);
      return res.status(400).json({ msg: 'No pending OTP verification' });
    }

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendOtpEmail(email, user.username, otp, 'ChatifyZone Password Reset OTP');
    await addActivityLog(user.id, 'OTP resent for password reset');

    console.log(`[Forgot Password Resend OTP] OTP resent to: ${email}`);
    res.json({ msg: 'OTP resent to your email.' });
  } catch (err) {
    console.error('[Forgot Password Resend OTP] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    console.log('[Reset Password] Received reset request for token:', req.params.token);
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      console.error('[Reset Password] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { password } = req.body;
    const { token } = req.params;
    const user = await User.findOne({
      resetPasswordToken: token,
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
