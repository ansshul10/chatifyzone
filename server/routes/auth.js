const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const rpID = process.env.WEBAUTHN_RP_ID || 'your-vercel-domain.vercel.app';
const rpName = 'Chatify';
const expectedOrigin = process.env.CLIENT_URL || 'https://your-vercel-domain.vercel.app';

const peste = (arr1, arr2) => {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return Infinity;
  return Math.sqrt(arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0));
};

// Password-based login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({ msg: 'This account uses biometric or face login. Please use Face ID or Face Recognition.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during login:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Password-based registration
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

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during registration:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Face recognition registration
router.post('/face/register', async (req, res) => {
  const { email, username, descriptor } = req.body;

  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ msg: 'Invalid face descriptor: A single descriptor with 128 values is required' });
    }

    user = new User({ email, username, faceDescriptors: [descriptor] });
    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during face registration:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    });
  } catch (err) {
    console.error('Face register error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Face recognition login
router.post('/face/login', async (req, res) => {
  const { email, descriptor } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    if (!user.faceDescriptors || user.faceDescriptors.length === 0) {
      return res.status(400).json({ msg: 'This account does not have face recognition enabled' });
    }

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ msg: 'Invalid face descriptor: A single descriptor with 128 values is required' });
    }

    const distance = peste(user.faceDescriptors[0], descriptor);

    if (distance > 0.4) {
      return res.status(401).json({ msg: 'Invalid face', distance });
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during face login:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json({
        token,
        user: { id: user.id, email: user.email, username: user.username },
        distance,
      });
    });
  } catch (err) {
    console.error('Face login error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// WebAuthn registration: Begin
router.post('/webauthn/register/begin', async (req, res) => {
  const { username, email } = req.body;

  try {
    if (!username || !email) {
      return res.status(400).json({ msg: 'Username and email are required' });
    }

    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with this email or username' });
    }

    const userID = crypto.randomBytes(32).toString('base64');

    const options = await generateRegistrationOptions({
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
    });

    req.session.challenge = options.challenge;
    req.session.pendingUser = { email, username, userID };
    req.session.challengeExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    console.log('WebAuthn registration options generated:', {
      sessionId: req.sessionID,
      email,
      username,
      challenge: options.challenge,
      pendingUser: req.session.pendingUser,
    });

    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during WebAuthn begin:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json(options);
    });
  } catch (err) {
    console.error('WebAuthn register begin error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// WebAuthn registration: Complete
router.post('/webauthn/register/complete', async (req, res) => {
  const { email, username, credential } = req.body;

  try {
    console.log('WebAuthn complete session data:', {
      sessionId: req.sessionID,
      sessionChallenge: req.session.challenge,
      sessionPendingUser: req.session.pendingUser,
      providedEmail: email,
      providedUsername: username,
    });

    if (
      !req.session.challenge ||
      !req.session.pendingUser ||
      req.session.pendingUser.email !== email ||
      req.session.pendingUser.username !== username ||
      req.session.challengeExpires < Date.now()
    ) {
      console.error('Invalid session data:', {
        sessionId: req.sessionID,
        sessionChallenge: req.session.challenge,
        sessionPendingUser: req.session.pendingUser,
        providedEmail: email,
        providedUsername: username,
        challengeExpired: req.session.challengeExpires < Date.now(),
      });
      return res.status(400).json({ msg: 'Invalid session or user data' });
    }

    const userID = req.session.pendingUser.userID;

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: req.session.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      console.error('WebAuthn verification failed:', verification);
      return res.status(400).json({ msg: 'Fingerprint registration failed' });
    }

    const { credentialID, publicKey, counter } = verification.registrationInfo;

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
    console.log('User registered with WebAuthn:', { email, username, userId: user.id });

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.challenge = null;
    req.session.pendingUser = null;
    req.session.challengeExpires = null;

    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session after WebAuthn complete:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    });
  } catch (err) {
    console.error('WebAuthn register complete error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// WebAuthn login: Begin
router.post('/webauthn/login/begin', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.webauthnCredentials.length) {
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
    req.session.challengeExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    console.log('WebAuthn login options generated:', {
      sessionId: req.sessionID,
      email,
      challenge: options.challenge,
    });

    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during WebAuthn login begin:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json(options);
    });
  } catch (err) {
    console.error('WebAuthn login begin error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// WebAuthn login: Complete
router.post('/webauthn/login/complete', async (req, res) => {
  const { email, credential } = req.body;

  try {
    console.log('WebAuthn login complete session data:', {
      sessionId: req.sessionID,
      sessionChallenge: req.session.challenge,
      sessionEmail: req.session.email,
      sessionWebauthnUserID: req.session.webauthnUserID,
      providedEmail: email,
    });

    if (
      !req.session.challenge ||
      req.session.email !== email ||
      !req.session.webauthnUserID ||
      req.session.challengeExpires < Date.now()
    ) {
      console.error('Invalid session data for login:', {
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
      return res.status(400).json({ msg: 'User not found' });
    }

    const credentialID = Buffer.from(credential.rawId).toString('base64');
    const credentialMatch = user.webauthnCredentials.find(
      cred => cred.credentialID === credentialID
    );
    if (!credentialMatch) {
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
      console.error('WebAuthn login verification failed:', verification);
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

    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session after WebAuthn login complete:', err);
        return res.status(500).json({ msg: 'Failed to save session' });
      }
      res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    });
  } catch (err) {
    console.error('WebAuthn login complete error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Get authenticated user data
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user)
        .select('-password -faceDescriptors -webauthnCredentials -webauthnUserID')
        .populate('friends', 'username online')
        .populate('friendRequests', 'username')
        .populate('blockedUsers', 'username');
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
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
      res.json({
        id: req.anonymousUser.anonymousId,
        username: req.anonymousUser.username,
        isAnonymous: true,
        online: req.anonymousUser.status === 'online',
      });
    }
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'No user found with this email' });
    }

    if (!user.password) {
      return res.status(400).json({ msg: 'This account uses biometric or face login. Password reset is not available.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

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

    await sendEmail(user.email, subject, html);
    res.json({ msg: 'Password reset link sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Reset password
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
    console.error('Reset password error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Get friends
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).populate('friends', 'username online');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user.friends);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Add friend
router.post('/add-friend', auth, async (req, res) => {
  const { friendUsername } = req.body;

  try {
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (friend._id.toString() === req.user) {
      return res.status(400).json({ msg: 'Cannot add yourself' });
    }

    const user = await User.findById(req.user);
    if (user.friends.includes(friend._id)) {
      return res.status(400).json({ msg: 'Already friends' });
    }

    user.friends.push(friend._id);
    await user.save();

    const updatedFriends = await User.findById(req.user).populate('friends', 'username online');
    res.json(updatedFriends.friends);
  } catch (err) {
    console.error('Add friend error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Remove friend
router.post('/remove-friend', auth, async (req, res) => {
  const { friendId } = req.body;

  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Only registered users can remove friends' });
    }

    const user = await User.findById(req.user);
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ msg: 'Friend not found' });
    }
    if (!user.friends.includes(friendId)) {
      return res.status(400).json({ msg: 'Not friends' });
    }

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    await user.save();

    const updatedFriends = await User.findById(req.user).populate('friends', 'username online');
    res.json(updatedFriends.friends);
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  const { bio, age, status, allowFriendRequests } = req.body;

  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Only registered users can update profiles' });
    }

    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (bio !== undefined) {
      user.bio = bio.substring(0, 150);
    }
    if (age !== undefined) {
      if (!Number.isInteger(age) || age < 13 || age > 120) {
        return res.status(400).json({ msg: 'Age must be an integer between 13 and 120' });
      }
      user.age = age;
    }
    if (status !== undefined) {
      user.status = status.substring(0, 30);
    }
    if (allowFriendRequests !== undefined) {
      user.privacy.allowFriendRequests = allowFriendRequests;
    }

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
    console.error('Update profile error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Only registered users have profiles' });
    }

    const user = await User.findById(req.user)
      .select('-password -faceDescriptors -webauthnCredentials -webauthnUserID')
      .populate('friends', 'username online')
      .populate('friendRequests', 'username')
      .populate('blockedUsers', 'username');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

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
    console.error('Get profile error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Delete account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    await User.deleteOne({ _id: req.user });
    req.session.destroy((err) => {
      if (err) {
        console.error('Failed to destroy session during account deletion:', err);
      }
      res.json({ msg: 'Account deleted successfully' });
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Block user
router.post('/block-user', auth, async (req, res) => {
  const { username } = req.body;

  try {
    const userToBlock = await User.findOne({ username });
    if (!userToBlock) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (userToBlock._id.toString() === req.user) {
      return res.status(400).json({ msg: 'Cannot block yourself' });
    }

    const user = await User.findById(req.user);
    if (user.blockedUsers.includes(userToBlock._id)) {
      return res.status(400).json({ msg: 'User already blocked' });
    }

    user.blockedUsers.push(userToBlock._id);
    await user.save();

    const updatedUser = await User.findById(req.user).populate('blockedUsers', 'username');
    res.json({ blockedUsers: updatedUser.blockedUsers });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// Unblock user
router.post('/unblock-user', auth, async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(req.user);
    if (!user.blockedUsers.includes(userId)) {
      return res.status(400).json({ msg: 'User not blocked' });
    }

    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
    await user.save();

    const updatedUser = await User.findById(req.user).populate('blockedUsers', 'username');
    res.json({ blockedUsers: updatedUser.blockedUsers });
  } catch (err) {
    console.error('Unblock user error:', err);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

module.exports = router;
