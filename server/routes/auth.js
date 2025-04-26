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
});

const webauthnRegisterBeginSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
});

const webauthnRegisterCompleteSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
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
  age: Joi.number().integer().min(13).max(120).optional(),
  status: Joi.string().max(30).allow('').optional(),
  allowFriendRequests: Joi.boolean().optional(),
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

// WebAuthn registration: Begin
router.post('/webauthn/register/begin', async (req, res) => {
  try {
    console.log('[WebAuthn Register Begin] Deployed Version: Buffer Fix 2025-04-26 v2');
    console.log('[WebAuthn Register Begin] Step 1: Received request:', {
      headers: req.headers,
      body: req.body,
    });

    console.log('[WebAuthn Register Begin] Step 2: Validating request body');
    const { error } = webauthnRegisterBeginSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Register Begin] Step 2 Error: Validation failed:', {
        message: error.details[0].message,
        details: error.details,
      });
      return res.status(400).json({ msg: error.details[0].message });
    }
    console.log('[WebAuthn Register Begin] Step 2: Validation passed');

    const { username, email } = req.body;
    console.log('[WebAuthn Register Begin] Step 3: Checking for existing user:', { email, username });
    let user;
    try {
      user = await User.findOne({ $or: [{ email }, { username }] });
    } catch (dbError) {
      console.error('[WebAuthn Register Begin] Step 3 Error: Database query failed:', {
        message: dbError.message,
        stack: dbError.stack,
      });
      return res.status(500).json({ msg: 'Database error during user check' });
    }
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
      console.log('[WebAuthn Register Begin] Step 4: Options generated successfully:', {
        userID: userID.toString('base64'),
        challenge: options.challenge,
        rp: options.rp,
        user: options.user,
        pubKeyCredParams: options.pubKeyCredParams,
      });
    } catch (webauthnError) {
      console.error('[WebAuthn Register Begin] Step 4 Error: Failed to generate WebAuthn options:', {
        message: webauthnError.message,
        stack: webauthnError.stack,
      });
      return res.status(500).json({ msg: 'Failed to generate WebAuthn registration options' });
    }

    console.log('[WebAuthn Register Begin] Step 5: Preparing response');
    const response = {
      publicKey: options,
      challenge: options.challenge,
      userID: userID.toString('base64'),
      email,
      username,
    };

    console.log('[WebAuthn Register Begin] Step 6: Verifying response structure');
    if (!response.publicKey || !response.challenge || !response.userID) {
      console.error('[WebAuthn Register Begin] Step 6 Error: Invalid response structure:', response);
      return res.status(500).json({ msg: 'Server failed to prepare WebAuthn response' });
    }
    console.log('[WebAuthn Register Begin] Step 6: Response structure valid');

    console.log('[WebAuthn Register Begin] Step 7: Sending response:', response);
    res.json(response);
  } catch (err) {
    console.error('[WebAuthn Register Begin] Step 8 Error: Unexpected server error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ msg: 'Unexpected server error' });
  }
});

// WebAuthn registration: Complete
// WebAuthn registration: Complete
router.post('/webauthn/register/complete', async (req, res) => {
  try {
    console.log('[WebAuthn Register Complete] Received request:', req.body);
    const { error } = webauthnRegisterCompleteSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Register Complete] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, username, credential, challenge, userID } = req.body;
    if (!challenge || !userID) {
      console.error('[WebAuthn Register Complete] Missing challenge or userID:', { challenge, userID });
      return res.status(400).json({ msg: 'Missing challenge or userID' });
    }

    console.log('[WebAuthn Register Complete] Verifying credential with userID:', userID);
    console.log('[WebAuthn Register Complete] Credential structure:', {
      id: credential.id,
      rawId: credential.rawId,
      type: credential.type,
      response: {
        attestationObject: credential.response.attestationObject?.substring(0, 50) + '...',
        clientDataJSON: credential.response.clientDataJSON?.substring(0, 50) + '...',
        transports: credential.response.transports,
        publicKeyAlgorithm: credential.response.publicKeyAlgorithm,
        publicKey: credential.response.publicKey?.substring(0, 50) + '...',
        authenticatorData: credential.response.authenticatorData?.substring(0, 50) + '...',
      },
      clientExtensionResults: credential.clientExtensionResults,
      authenticatorAttachment: credential.authenticatorAttachment,
    });

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
      });
    } catch (verifyError) {
      console.error('[WebAuthn Register Complete] Verification error:', {
        message: verifyError.message,
        stack: verifyError.stack,
      });
      return res.status(400).json({ msg: 'Fingerprint registration verification failed', details: verifyError.message });
    }

    console.log('[WebAuthn Register Complete] Verification result:', verification);

    if (!verification.verified) {
      console.error('[WebAuthn Register Complete] Verification failed for:', email, verification);
      return res.status(400).json({ msg: 'Fingerprint registration failed', details: verification });
    }

    const registrationInfo = verification.registrationInfo || {};
    const credentialData = registrationInfo.credential || {};
    const credentialID = credentialData.id;
    const publicKey = credentialData.publicKey;
    const counter = credentialData.counter;

    if (!credentialID || !publicKey || counter === undefined) {
      console.error('[WebAuthn Register Complete] Missing credential fields:', {
        credentialID,
        publicKey,
        counter,
        registrationInfo,
        credentialData,
      });
      return res.status(500).json({ msg: 'Invalid credential data from server' });
    }

    console.log('[WebAuthn Register Complete] Extracted credential data:', {
      credentialID,
      publicKey: Buffer.from(publicKey).toString('base64').substring(0, 50) + '...',
      counter,
    });

    const user = new User({
      email,
      username,
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
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error('[WebAuthn Register Complete] Server error:', err.message, err.stack);
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
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error('[Password Login] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Password-based registration
router.post('/register', async (req, res) => {
  try {
    console.log('[Password Register] Received registration request:', req.body.email, req.body.username);
    const { error } = registerSchema.validate(req.body);
    if (error) {
      console.error('[Password Register] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, username, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.error('[Password Register] User already exists:', { email, username });
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    user = new User({ email, username, password });
    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    await req.session.save();

    console.log(`[Password Register] User registered: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error('[Password Register] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// WebAuthn login: Begin
router.post('/webauthn/login/begin', async (req, res) => {
  try {
    console.log('[WebAuthn Login Begin] Received request:', req.body.email);
    const { error } = webauthnLoginBeginSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Login Begin] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.webauthnCredentials.length) {
      console.error('[WebAuthn Login Begin] No biometric credentials found for:', email);
      return res.status(400).json({ msg: 'No biometric credentials found for this user' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.webauthnCredentials.map(cred => ({
        id: Buffer.from(cred.credentialID, 'base64'),
        type: 'public-key',
      })),
      userVerification: 'required',
    });

    req.session.challenge = options.challenge;
    req.session.email = email;
    req.session.webauthnUserID = user.webauthnUserID;
    req.session.challengeExpires = Date.now() + 5 * 60 * 1000;

    await req.session.save();

    console.log(`[WebAuthn Login Begin] Generated options for ${user.username}:`, {
      sessionId: req.sessionID,
      challenge: options.challenge,
    });

    res.json(options);
  } catch (err) {
    console.error('[WebAuthn Login Begin] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// WebAuthn login: Complete
router.post('/webauthn/login/complete', async (req, res) => {
  try {
    console.log('[WebAuthn Login Complete] Received request:', req.body.email);
    const { error } = webauthnLoginCompleteSchema.validate(req.body);
    if (error) {
      console.error('[WebAuthn Login Complete] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { email, credential } = req.body;

    if (
      !req.session.challenge ||
      req.session.email !== email ||
      !req.session.webauthnUserID ||
      req.session.challengeExpires < Date.now()
    ) {
      console.error('[WebAuthn Login Complete] Invalid session data:', {
        sessionId: req.sessionID,
        sessionChallenge: req.session.challenge,
        sessionEmail: req.session.email,
        sessionWebauthnUserID: req.session.webauthnUserID,
        providedEmail: email,
        challengeExpired: req.session.challengeExpires < Date.now(),
      });
      return res.status(400).json({ msg: 'Invalid session or email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error('[WebAuthn Login Complete] User not found:', email);
      return res.status(400).json({ msg: 'User not found' });
    }

    const credentialID = Buffer.from(credential.rawId).toString('base64');
    const credentialMatch = user.webauthnCredentials.find(
      cred => cred.credentialID === credentialID
    );
    if (!credentialMatch) {
      console.error('[WebAuthn Login Complete] Invalid credential for:', email);
      return res.status(400).json({ msg: 'Invalid credential' });
    }

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
      console.error('[WebAuthn Login Complete] Verification failed for:', email);
      return res.status(400).json({ msg: 'Fingerprint authentication failed' });
    }

    credentialMatch.counter = verification.authenticationInfo.newCounter;
    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.challenge = null;
    req.session.email = null;
    req.session.webauthnUserID = null;
    req.session.challengeExpires = null;
    await req.session.save();

    console.log(`[WebAuthn Login Complete] User logged in: ${user.username} (ID: ${user.id})`);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error('[WebAuthn Login Complete] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get authenticated user data
router.get('/me', auth, async (req, res) => {
  try {
    console.log('[Get User] Fetching user data for ID:', req.user);
    if (req.user) {
      const user = await User.findById(req.user)
        .select('-password -webauthnCredentials -webauthnUserID')
        .populate('friends', 'username online')
        .populate('friendRequests', 'username')
        .populate('blockedUsers', 'username');
      if (!user) {
        console.error('[Get User] User not found:', req.user);
        return res.status(404).json({ msg: 'User not found' });
      }

      console.log(`[Get User] User data fetched: ${user.username} (ID: ${user.id})`);
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        online: user.online,
        friends: user.friends,
        friendRequests: user.friendRequests,
        blockedUsers: user.blockedUsers,
      });
    } else if (req.anonymousUser) {
      console.log(`[Get User] Anonymous user data fetched: ${req.anonymousUser.username}`);
      res.json({
        id: req.anonymousUser.anonymousId,
        username: req.anonymousUser.username,
        isAnonymous: true,
        online: req.anonymousUser.status === 'online',
      });
    }
  } catch (err) {
    console.error('[Get User] Server error:', err.message);
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

    const { bio, age, status, allowFriendRequests } = req.body;
    if (bio !== undefined) user.bio = bio;
    if (age !== undefined) user.age = age;
    if (status !== undefined) user.status = status;
    if (allowFriendRequests !== undefined) user.privacy.allowFriendRequests = allowFriendRequests;

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
    });
  } catch (err) {
    console.error('[Update Profile] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('[Get Profile] Fetching profile for user ID:', req.user);
    const user = await User.findById(req.user)
      .select('-password -webauthnCredentials -webauthnUserID')
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
      status: user.status,
      privacy: user.privacy,
      friends: user.friends,
      friendRequests: user.friendRequests,
      blockedUsers: user.blockedUsers,
    });
  } catch (err) {
    console.error('[Get Profile] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
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

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.error('[Change Password] Current password incorrect:', req.user);
      return res.status(400).json({ msg: 'Current password is incorrect' });
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

// Delete account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    console.log('[Delete Account] Received request for user ID:', req.user);
    const user = await User.findById(req.user);
    if (!user) {
      console.error('[Delete Account] User not found:', req.user);
      return res.status(404).json({ msg: 'User not found' });
    }

    await User.deleteOne({ _id: req.user });
    req.session.destroy((err) => {
      if (err) console.error('[Delete Account] Failed to destroy session:', err.message);
      console.log(`[Delete Account] Account deleted for: ${user.username}`);
      res.json({ msg: 'Account deleted successfully' });
    });
  } catch (err) {
    console.error('[Delete Account] Server error:', err.message);
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
    await user.save();

    const updatedUser = await User.findById(req.user).populate('blockedUsers', 'username');
    console.log(`[Block User] User blocked: ${username} by: ${user.username}`);
    res.json({ blockedUsers: updatedUser.blockedUsers });
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

    const updatedUser = await User.findById(req.user).populate('blockedUsers', 'username');
    console.log(`[Unblock User] User unblocked: ${userId} by: ${user.username}`);
    res.json({ blockedUsers: updatedUser.blockedUsers });
  } catch (err) {
    console.error('[Unblock User] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Debug endpoint to check library version
router.get('/debug', (req, res) => {
  const webauthnVersion = require('@simplewebauthn/server/package.json').version;
  res.json({ webauthnVersion });
});

module.exports = router;
