const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const { sendEmail } = require('../utils/email');
const auth = require('../middleware/auth');
const Joi = require('joi');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Newsletter schema for validation
const newsletterSchema = Joi.object({
  subject: Joi.string().min(3).max(100).required(),
  content: Joi.string().min(10).required(),
});

// Get all subscribers
router.get('/subscribers', [auth, isAdmin], async (req, res) => {
  try {
    const subscribers = await Subscriber.find();
    res.json(subscribers);
  } catch (err) {
    console.error('[Get Subscribers] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all users
router.get('/users', [auth, isAdmin], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('[Get Users] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Send newsletter to all subscribers
router.post('/send-newsletter', [auth, isAdmin], async (req, res) => {
  try {
    console.log('[Send Newsletter] Received request from admin:', req.user.email);
    const { error } = newsletterSchema.validate(req.body);
    if (error) {
      console.error('[Send Newsletter] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { subject, content } = req.body;
    const subscribers = await Subscriber.find();
    if (!subscribers.length) {
      console.error('[Send Newsletter] No subscribers found');
      return res.status(404).json({ msg: 'No subscribers found' });
    }

    const emailPromises = subscribers.map((subscriber) => {
      const unsubscribeLink = `${process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'}/unsubscribe?token=${subscriber.unsubscribeToken}`;
      const html = `
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
            .button { display: inline-block; padding: 14px 32px; background: #FF0000; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; transition: background 0.3s ease; text-align: center; }
            .button:hover { background: #CC0000; }
            .footer { text-align: center; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 12px; color: rgba(255, 255, 255, 0.5); }
            .highlight { color: #FF0000; font-weight: 600; }
            a { color: #FF0000; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .button-container { text-align: center; margin: 20px 0; }
            @media only screen and (max-width: 600px) {
              .container { margin: 20px; padding: 20px; }
              .header h1 { font-size: 22px; }
              .button { display: block; width: 100%; }
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
              <p>Hello <span class="highlight">${subscriber.name || 'Subscriber'}</span>,</p>
              <p>${content}</p>
              <div class="button-container">
                <a href="${process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'}" class="button">Visit ChatifyZone</a>
              </div>
            </div>
            <div class="footer">
              <p><a href="${unsubscribeLink}">Unsubscribe</a> from this newsletter.</p>
              <p>© ${new Date().getFullYear()} ChatifyZone. All rights reserved.</p>
              <p>Need help? Contact us at <a href="mailto:support@chatifyzone.in">support@chatifyzone.in</a></p>
            </div>
          </div>
        </body>
        </html>
      `;
      return sendEmail(subscriber.email, subject, html);
    });

    await Promise.all(emailPromises);
    console.log(`[Send Newsletter] Newsletter sent to ${subscribers.length} subscribers`);
    res.json({ msg: 'Newsletter sent successfully' });
  } catch (err) {
    console.error('[Send Newsletter] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Ban a user
router.post('/ban-user', [auth, isAdmin], async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (user.isAdmin) {
      return res.status(400).json({ msg: 'Cannot ban an admin' });
    }

    await User.findByIdAndDelete(userId);
    res.json({ msg: 'User banned successfully' });
  } catch (err) {
    console.error('[Ban User] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
