const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const cron = require('node-cron');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const Post = require('../models/Post');
const AuditLog = require('../models/AuditLog');
const Newsletter = require('../models/Newsletter');
const Announcement = require('../models/Announcement');
const Setting = require('../models/Setting');
const { sendEmail } = require('../utils/email');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if (!user || !user.isAdmin) {
      console.error('[Admin Check] Admin access required for user ID:', req.user);
      return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('[Admin Check] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Validation schemas
const newsletterSchema = Joi.object({
  subject: Joi.string().min(3).max(100).required(),
  content: Joi.string().min(10).required(),
  scheduledDate: Joi.date().allow(null).optional(),
});

const maintenanceSchema = Joi.object({
  maintenanceMode: Joi.boolean().required(),
  maintenanceStartTime: Joi.date().when('maintenanceMode', {
    is: true,
    then: Joi.date().required(),
    otherwise: Joi.date().optional(),
  }),
  maintenanceDuration: Joi.number().when('maintenanceMode', {
    is: true,
    then: Joi.number().min(1).required(),
    otherwise: Joi.number().optional(),
  }),
});

const roleSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('user', 'moderator', 'admin').required(),
});

const postSchema = Joi.object({
  postId: Joi.string().required(),
});

const userIdSchema = Joi.object({
  userId: Joi.string().required(),
});

const announcementSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  content: Joi.string().min(10).required(),
});

const settingsSchema = Joi.object({
  registrationEnabled: Joi.boolean().required(),
});

const bulkActionSchema = Joi.object({
  userIds: Joi.array().items(Joi.string()).min(1).required(),
  action: Joi.string().valid('ban', 'delete').required(),
});

// Get settings (public route for Maintenance.js)
router.get('/settings/public', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({
        registrationEnabled: true,
        maintenanceMode: false,
        maintenanceStartTime: null,
        maintenanceDuration: null,
      });
      await settings.save();
    }
    res.json({
      registrationEnabled: settings.registrationEnabled,
      maintenanceMode: settings.maintenanceMode,
      maintenanceStartTime: settings.maintenanceStartTime,
      maintenanceDuration: settings.maintenanceDuration,
    });
  } catch (err) {
    console.error('[Get Public Settings] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all subscribers
router.get('/subscribers', [auth, isAdmin], async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });
    res.json(subscribers);
  } catch (err) {
    console.error('[Get Subscribers] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Remove a subscriber
router.delete('/subscribers/:id', [auth, isAdmin], async (req, res) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ msg: 'Subscriber not found' });
    }
    await Subscriber.findByIdAndDelete(req.params.id);
    await AuditLog.create({
      action: 'remove_subscriber',
      adminId: req.user,
      details: { subscriberId: req.params.id, email: subscriber.email },
    });
    res.json({ msg: 'Subscriber removed successfully' });
  } catch (err) {
    console.error('[Remove Subscriber] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all users
router.get('/users', [auth, isAdmin], async (req, res) => {
  try {
    const users = await User.find({ isBanned: { $ne: true } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('[Get Users] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all banned users
router.get('/banned-users', [auth, isAdmin], async (req, res) => {
  try {
    const bannedUsers = await User.find({ isBanned: true }).select('username email bannedAt').sort({ bannedAt: -1 });
    res.json(bannedUsers);
  } catch (err) {
    console.error('[Get Banned Users] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Ban a user
router.post('/ban-user', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = userIdSchema.validate(req.body);
    if (error) {
      console.error('[Ban User] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (user.isAdmin) {
      return res.status(400).json({ msg: 'Cannot ban an admin' });
    }
    if (user.isBanned) {
      return res.status(400).json({ msg: 'User is already banned' });
    }

    user.isBanned = true;
    user.bannedAt = new Date();
    await user.save();
    await AuditLog.create({
      action: 'ban_user',
      adminId: req.user,
      details: { userId, email: user.email },
    });
    res.json({ msg: 'User banned successfully' });
  } catch (err) {
    console.error('[Ban User] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Unban a user
router.post('/unban-user', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = userIdSchema.validate(req.body);
    if (error) {
      console.error('[Unban User] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (!user.isBanned) {
      return res.status(400).json({ msg: 'User is not banned' });
    }

    user.isBanned = false;
    user.bannedAt = null;
    await user.save();
    await AuditLog.create({
      action: 'unban_user',
      adminId: req.user,
      details: { userId, email: user.email },
    });
    res.json({ msg: 'User unbanned successfully', user });
  } catch (err) {
    console.error('[Unban User] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update user role
router.post('/update-role', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = roleSchema.validate(req.body);
    if (error) {
      console.error('[Update Role] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { userId, role } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (user._id.toString() === req.user) {
      return res.status(400).json({ msg: 'Cannot change your own role' });
    }

    user.role = role;
    await user.save();
    await AuditLog.create({
      action: 'update_role',
      adminId: req.user,
      details: { userId, newRole: role },
    });
    res.json({ msg: `User role updated to ${role}` });
  } catch (err) {
    console.error('[Update Role] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all posts
router.get('/posts', [auth, isAdmin], async (req, res) => {
  try {
    const posts = await Post.find().populate('user', 'username email').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error('[Get Posts] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete a post
router.delete('/posts/:id', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = postSchema.validate({ postId: req.params.id });
    if (error) {
      console.error('[Delete Post] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    await Post.findByIdAndDelete(req.params.id);
    await AuditLog.create({
      action: 'delete_post',
      adminId: req.user,
      details: { postId: req.params.id },
    });
    res.json({ msg: 'Post deleted successfully' });
  } catch (err) {
    console.error('[Delete Post] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get analytics
router.get('/analytics', [auth, isAdmin], async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isBanned: { $ne: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]);

    const postEngagement = await Post.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]);

    const [userCount, subscriberCount, postCount, recentUsers] = await Promise.all([
      User.countDocuments({ isBanned: { $ne: true } }),
      Subscriber.countDocuments(),
      Post.countDocuments(),
      User.find({ isBanned: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email createdAt'),
    ]);

    res.json({
      userCount,
      subscriberCount,
      postCount,
      recentUsers,
      userGrowth,
      postEngagement,
    });
  } catch (err) {
    console.error('[Get Analytics] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Send newsletter to all subscribers
router.post('/send-newsletter', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = newsletterSchema.validate(req.body);
    if (error) {
      console.error('[Send Newsletter] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { subject, content, scheduledDate } = req.body;

    const newsletter = new Newsletter({
      subject,
      content,
      scheduledDate,
      createdBy: req.user,
      status: scheduledDate && new Date(scheduledDate) > new Date() ? 'scheduled' : 'pending',
    });
    await newsletter.save();

    if (!scheduledDate || new Date(scheduledDate) <= new Date()) {
      const subscribers = await Subscriber.find();
      if (!subscribers.length) {
        newsletter.status = 'failed';
        await newsletter.save();
        return res.status(404).json({ msg: 'No subscribers found' });
      }

      const emailPromises = subscribers.map((subscriber) => {
        const unsubscribeToken = jwt.sign(
          { id: subscriber._id },
          process.env.JWT_SECRET || 'your_jwt_secret',
          { expiresIn: '30d' }
        );
        const unsubscribeLink = `${
          process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'
        }/unsubscribe?token=${unsubscribeToken}`;
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
      newsletter.status = 'sent';
      await newsletter.save();
      await AuditLog.create({
        action: 'send_newsletter',
        adminId: req.user,
        details: { subject, subscriberCount: subscribers.length },
      });
      res.json({ msg: 'Newsletter sent successfully', newsletter });
    } else {
      await AuditLog.create({
        action: 'schedule_newsletter',
        adminId: req.user,
        details: { subject, scheduledDate },
      });
      res.json({ msg: 'Newsletter scheduled successfully', newsletter });
    }
  } catch (err) {
    console.error('[Send Newsletter] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Schedule newsletter sending task (runs every minute)
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const newsletters = await Newsletter.find({
      status: 'scheduled',
      scheduledDate: { $lte: now },
    });

    for (const newsletter of newsletters) {
      const subscribers = await Subscriber.find();
      const emailPromises = subscribers.map((subscriber) => {
        const unsubscribeToken = jwt.sign(
          { id: subscriber._id },
          process.env.JWT_SECRET || 'your_jwt_secret',
          { expiresIn: '30d' }
        );
        const unsubscribeLink = `${
          process.env.CLIENT_URL || 'https://chatifyzone.vercel.app'
        }/unsubscribe?token=${unsubscribeToken}`;
        const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${newsletter.subject}</title>
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
                <h1>${newsletter.subject}</h1>
              </div>
              <div class="content">
                <p>Hello <span class="highlight">${subscriber.name || 'Subscriber'}</span>,</p>
                <p>${newsletter.content}</p>
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
        return sendEmail(subscriber.email, newsletter.subject, html);
      });

      await Promise.all(emailPromises);
      newsletter.status = 'sent';
      await newsletter.save();

      await AuditLog.create({
        action: 'send_scheduled_newsletter',
        adminId: newsletter.createdBy,
        details: { subject: newsletter.subject, subscriberCount: subscribers.length },
      });
    }
  } catch (err) {
    console.error('[Scheduled Newsletter] Error:', err.message);
  }
});

// Get scheduled newsletters
router.get('/scheduled-newsletters', [auth, isAdmin], async (req, res) => {
  try {
    const newsletters = await Newsletter.find({ status: 'scheduled', scheduledDate: { $gt: new Date() } }).sort({
      scheduledDate: 1,
    });
    res.json(newsletters);
  } catch (err) {
    console.error('[Get Scheduled Newsletters] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create announcement
router.post('/announcements', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = announcementSchema.validate(req.body);
    if (error) {
      console.error('[Create Announcement] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { title, content } = req.body;
    const announcement = new Announcement({ title, content, createdBy: req.user });
    await announcement.save();
    await AuditLog.create({
      action: 'create_announcement',
      adminId: req.user,
      details: { announcementId: announcement._id, title },
    });
    res.json({ msg: 'Announcement created successfully', announcement });
  } catch (err) {
    console.error('[Create Announcement] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all announcements (public route)
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(5);
    res.json(announcements);
  } catch (err) {
    console.error('[Get Announcements] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get audit logs
router.get('/audit-logs', [auth, isAdmin], async (req, res) => {
  try {
    const auditLogs = await AuditLog.find().populate('adminId', 'username').sort({ createdAt: -1 }).limit(100);
    res.json(auditLogs);
  } catch (err) {
    console.error('[Get Audit Logs] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get settings
router.get('/settings', [auth, isAdmin], async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({
        registrationEnabled: true,
        maintenanceMode: false,
        maintenanceStartTime: null,
        maintenanceDuration: null,
      });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    console.error('[Get Settings] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update settings
router.post('/settings', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = settingsSchema.validate(req.body);
    if (error) {
      console.error('[Update Settings] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({
        registrationEnabled: req.body.registrationEnabled,
        maintenanceMode: false,
        maintenanceStartTime: null,
        maintenanceDuration: null,
      });
    } else {
      settings.registrationEnabled = req.body.registrationEnabled;
    }
    await settings.save();
    await AuditLog.create({
      action: 'update_settings',
      adminId: req.user,
      details: { registrationEnabled: req.body.registrationEnabled },
    });
    res.json({ msg: 'Settings updated successfully', settings });
  } catch (err) {
    console.error('[Update Settings] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Toggle maintenance mode
router.post('/toggle-maintenance', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = maintenanceSchema.validate(req.body);
    if (error) {
      console.error('[Toggle Maintenance] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { maintenanceMode, maintenanceStartTime, maintenanceDuration } = req.body;
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({
        registrationEnabled: true,
        maintenanceMode: false,
        maintenanceStartTime: null,
        maintenanceDuration: null,
      });
    }

    settings.maintenanceMode = maintenanceMode;
    settings.maintenanceStartTime = maintenanceMode ? maintenanceStartTime : null;
    settings.maintenanceDuration = maintenanceMode ? maintenanceDuration : null;

    await settings.save();

    if (maintenanceMode && maintenanceStartTime && maintenanceDuration) {
      const endTime = new Date(new Date(maintenanceStartTime).getTime() + maintenanceDuration * 60 * 1000);
      cron.schedule(
        `${endTime.getMinutes()} ${endTime.getHours()} ${endTime.getDate()} ${endTime.getMonth() + 1} *`,
        async () => {
          try {
            settings.maintenanceMode = false;
            settings.maintenanceStartTime = null;
            settings.maintenanceDuration = null;
            await settings.save();
            await AuditLog.create({
              action: 'end_maintenance',
              adminId: req.user,
              details: { endTime: new Date() },
            });
            // Emit WebSocket event to notify clients
            const io = req.app.get('io');
            io.emit('maintenance-ended', { maintenanceMode: false });
          } catch (err) {
            console.error('[End Maintenance] Error:', err.message);
          }
        },
        { scheduled: true, timezone: 'UTC' }
      );
    }

    await AuditLog.create({
      action: maintenanceMode ? 'enable_maintenance' : 'disable_maintenance',
      adminId: req.user,
      details: maintenanceMode
        ? { maintenanceStartTime, maintenanceDuration }
        : { maintenanceEndTime: new Date() },
    });

    res.json({ msg: `Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'} successfully`, settings });
  } catch (err) {
    console.error('[Toggle Maintenance] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Bulk action (ban/delete users)
router.post('/bulk-action', [auth, isAdmin], async (req, res) => {
  try {
    const { error } = bulkActionSchema.validate(req.body);
    if (error) {
      console.error('[Bulk Action] Validation error:', error.details[0].message);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { userIds, action } = req.body;

    if (action === 'ban') {
      const users = await User.find({ _id: { $in: userIds }, isAdmin: false, isBanned: false });
      if (!users.length) {
        return res.status(404).json({ msg: 'No valid users found to ban' });
      }
      await User.updateMany(
        { _id: { $in: userIds }, isAdmin: false },
        { isBanned: true, bannedAt: new Date() }
      );
      await AuditLog.create({
        action: 'bulk_ban_users',
        adminId: req.user,
        details: { userIds, count: users.length },
      });
      res.json({ msg: `${users.length} users banned successfully` });
    } else if (action === 'delete') {
      const users = await User.find({ _id: { $in: userIds }, isAdmin: false });
      if (!users.length) {
        return res.status(404).json({ msg: 'No valid users found to delete' });
      }
      await User.deleteMany({ _id: { $in: userIds }, isAdmin: false });
      await AuditLog.create({
        action: 'bulk_delete_users',
        adminId: req.user,
        details: { userIds, count: users.length },
      });
      res.json({ msg: `${users.length} users deleted successfully` });
    } else {
      return res.status(400).json({ msg: 'Invalid action' });
    }
  } catch (err) {
    console.error('[Bulk Action] Server error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
