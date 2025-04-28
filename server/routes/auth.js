const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const rpID = process.env.WEBAUTHN_RP_ID || 'chatify-10.vercel.app';
const rpName = 'Chatify';
const expectedOrigin = process.env.CLIENT_URL || 'https://chatify-10.vercel.app';

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  country: Joi.string().required(),
  state: Joi.string().allow('').optional(),
  age: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 18 || num > 120) {
        return helpers.error('any.invalid');
      }
      return num;
    }, 'age validation')
    .required(),
});

const webauthnRegisterBeginSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  country: Joi.string().required(),
  state: Joi.string().allow('').optional(),
  age: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 18 || num > 120) {
        return helpers.error('any.invalid');
      }
      return num;
    }, 'age validation')
    .required(),
});

const webauthnRegisterCompleteSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  country: Joi.string().required(),
  state: Joi.string().allow('').optional(),
  age: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 18 || num > 120) {
        return helpers.error('any.invalid');
      }
      return num;
    }, 'age validation')
    .required(),
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

const addFriendSchema = Joi.object({
  friendUsername: Joi.string().min(3).max(30).required(),
});

const removeFriendSchema = Joi.object({
  friendId: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  bio: Joi.string().max(150).allow('').optional(),
  age: Joi.string()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 18 || num > 120) {
        return helpers.error('any.invalid');
      }
      return num;
    }, 'age validation')
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
    });
  } catch (err) {
    console.error('[Get User Profile] Server error:', err.message);
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

    const { username, email, country, state, age } = req.body;
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

    const { email, username, country, state, age, credential, challenge, userID } = req.body;
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
      webauthnUserID: userID,
      webauthnCredentials: [{
        credentialID: Buffer.from(credentialID).toString('base64'),
        publicKey: Buffer.from(publicKey).toString('base64'),
        counter,
        deviceName: 'Fingerprint Authenticator',
        authenticatorType: 'fingerprint',
      }],
    });

    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    await req.session.save();

    console.log(`[WebAuthn Register Complete] User registered: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age } });
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

    console.log(`[WebAuthn Login Complete] Step 9: User logged in: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age } });
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

    console.log(`[Password Login] User logged in: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age } });
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

    const { email, username, password, country, state, age } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.error('[Password Register] User already exists:', { email, username });
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    user = new User({ email, username, password, country, state, age });
    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    await req.session.save();

    console.log(`[Password Register] User registered: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, country: user.country, state: user.state, age: user.age } });
  } catch (err) {
    console.error('[Password Register] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('[Forgot Password] Received request:', req.body.email);
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      console.error('[Forgot Password] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error('[Forgot Password] User not found:', email);
      return res.status(404).json({ msg: 'No user found with this email' });
    }

    if (!user.password) {
      console.error('[Forgot Password] Account uses biometric login:', email);
      return res.status(400).json({ msg: 'This account uses biometric login.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `<!DOCTYPE html>
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
</html>`;

    await sendEmail(user.email, subject, html);
    console.log(`[Forgot Password] Reset link sent to: ${email}`);
    res.json({ msg: 'Password reset link sent to your email' });
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

    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.error('[Reset Password] Invalid or expired token:', token);
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`[Reset Password] Password reset for: ${user.email}`);
    res.json({ msg: 'Password successfully reset' });
  } catch (err) {
    console.error('[Reset Password] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get friends
router.get('/friends', auth, async (req, res) => {
  try {
    console.log('[Get Friends] Fetching friends for user ID:', req.user);
    const user = await User.findById(req.user).populate('friends', 'username online');
    if (!user) {
      console.error('[Get Friends] User not found:', req.user);
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log(`[Get Friends] Friends fetched for: ${user.username}`);
    res.json(user.friends);
  } catch (err) {
    console.error('[Get Friends] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add friend
router.post('/add-friend', auth, async (req, res) => {
  try {
    console.log('[Add Friend] Received request:', req.body.friendUsername);
    const { error } = addFriendSchema.validate(req.body);
    if (error) {
      console.error('[Add Friend] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { friendUsername } = req.body;
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) {
      console.error('[Add Friend] Friend not found:', friendUsername);
      return res.status(404).json({ msg: 'User not found' });
    }
    if (friend._id.toString() === req.user) {
      console.error('[Add Friend] Cannot add self:', req.user);
      return res.status(400).json({ msg: 'Cannot add yourself' });
    }

    const user = await User.findById(req.user);
    if (user.friends.includes(friend._id)) {
      console.error('[Add Friend] Already friends:', friendUsername);
      return res.status(400).json({ msg: 'Already friends' });
    }

    user.friends.push(friend._id);
    await user.save();

    const updatedFriends = await User.findById(req.user).populate('friends', 'username online');
    console.log(`[Add Friend] Friend added: ${friendUsername} for user: ${user.username}`);
    res.json(updatedFriends.friends);
  } catch (err) {
    console.error('[Add Friend] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Remove friend
router.post('/remove-friend', auth, async (req, res) => {
  try {
    console.log('[Remove Friend] Received request:', req.body.friendId);
    const { error } = removeFriendSchema.validate(req.body);
    if (error) {
      console.error('[Remove Friend] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { friendId } = req.body;
    const user = await User.findById(req.user);
    const friend = await User.findById(friendId);
    if (!friend) {
      console.error('[Remove Friend] Friend not found:', friendId);
      return res.status(404).json({ msg: 'Friend not found' });
    }
    if (!user.friends.includes(friendId) && friendId !== req.user) {
      console.error('[Remove Friend] Not friends:', friendId);
      return res.status(400).json({ msg: 'Not friends' });
    }

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    await user.save();

    const updatedFriends = await User.findById(req.user).populate('friends', 'username online');
    console.log(`[Remove Friend] Friend removed: ${friendId} for user: ${user.username}`);
    res.json(updatedFriends.friends);
  } catch (err) {
    console.error('[Remove Friend] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('[Update Profile] Received request for user ID:', req.user);
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
      console.error('[Update Profile] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const user = await User.findById(req.user);
    if (!user) {
      console.error('[Update Profile] User not found:', req.user);
      return res.status(404).json({ msg: 'User not found' });
    }

    const { bio, age, status, allowFriendRequests, profileVisibility } = req.body;
    if (bio !== undefined) user.bio = bio;
    if (age !== undefined) user.age = age;
    if (status !== undefined) user.status = status;
    if (allowFriendRequests !== undefined) user.privacy.allowFriendRequests = allowFriendRequests;
    if (profileVisibility !== undefined) user.privacy.profileVisibility = profileVisibility;

    await user.save();

    console.log(`[Update Profile] Profile updated for: ${user.username}`);
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio,
      age: user.age,
      status: user.status,
      privacy: user.privacy,
      country: user.country,
      state: user.state,
    });
  } catch (err) {
    console.error('[Update Profile] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get own profile
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('[Get Profile] Fetching profile for user ID:', req.user);
    const user = await User.findById(req.user)
      .select('-password')
      .populate('friends', 'username online')
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
    });
  } catch (err) {
    console.error('[Get Profile] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    console.log('[Change Password] Received request for user ID:', req.user);
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
      console.error('[Change Password] Account uses biometric login:', user.email);
      return res.status(400).json({ msg: 'This account uses biometric login.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.error('[Change Password] Invalid current password for:', user.email);
      return res.status(400).json({ msg: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    console.log(`[Change Password] Password changed for: ${user.username}`);
    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('[Change Password] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Block user
router.post('/block-user', auth, async (req, res) => {
  try {
    console.log('[Block User] Received request:', req.body.username);
    const { error } = blockUserSchema.validate(req.body);
    if (error) {
      console.error('[Block User] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { username } = req.body;
    const userToBlock = await User.findOne({ username });
    if (!userToBlock) {
      console.error('[Block User] User not found:', username);
      return res.status(404).json({ msg: 'User not found' });
    }
    if (userToBlock._id.toString() === req.user) {
      console.error('[Block User] Cannot block self:', req.user);
      return res.status(400).json({ msg: 'Cannot block yourself' });
    }

    const user = await User.findById(req.user);
    if (user.blockedUsers.includes(userToBlock._id)) {
      console.error('[Block User] User already blocked:', username);
      return res.status(400).json({ msg: 'User already blocked' });
    }

    user.blockedUsers.push(userToBlock._id);
    user.friends = user.friends.filter(id => id.toString() !== userToBlock._id.toString());
    await user.save();

    const updatedBlockedUsers = await User.findById(req.user).populate('blockedUsers', 'username');
    console.log(`[Block User] User blocked: ${username} by: ${user.username}`);
    res.json(updatedBlockedUsers.blockedUsers);
  } catch (err) {
    console.error('[Block User] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Unblock user
router.post('/unblock-user', auth, async (req, res) => {
  try {
    console.log('[Unblock User] Received request:', req.body.userId);
    const { error } = unblockUserSchema.validate(req.body);
    if (error) {
      console.error('[Unblock User] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { userId } = req.body;
    const user = await User.findById(req.user);
    if (!user.blockedUsers.includes(userId)) {
      console.error('[Unblock User] User not blocked:', userId);
      return res.status(400).json({ msg: 'User not blocked' });
    }

    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
    await user.save();

    const updatedBlockedUsers = await User.findById(req.user).populate('blockedUsers', 'username');
    console.log(`[Unblock User] User unblocked: ${userId} by: ${user.username}`);
    res.json(updatedBlockedUsers.blockedUsers);
  } catch (err) {
    console.error('[Unblock User] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
