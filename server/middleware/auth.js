const jwt = require('jsonwebtoken');
const AnonymousSession = require('../models/AnonymousSession');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const token = req.header('x-auth-token');
  const anonymousId = req.header('x-anonymous-id');

  if (!token && !anonymousId) {
    console.error('[Auth Middleware] No token or anonymous ID provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[Auth Middleware] Token decoded:', decoded);

      // Check if token is for an admin
      if (decoded.isAdmin) {
        const user = await User.findById(decoded.adminId);
        if (!user || !user.isAdmin) {
          console.error('[Auth Middleware] Admin not found or not an admin for ID:', decoded.adminId);
          return res.status(401).json({ msg: 'Invalid admin token' });
        }
        req.user = decoded.adminId; // Maintain compatibility with req.user
        req.isAdmin = true;
      } else {
        // Handle regular user token
        const userId = decoded.user?.id; // Keep existing structure for regular users
        if (!userId) {
          console.error('[Auth Middleware] No user ID found in token');
          return res.status(401).json({ msg: 'Invalid token structure' });
        }

        const user = await User.findById(userId);
        if (!user) {
          console.error('[Auth Middleware] User not found for ID:', userId);
          return res.status(401).json({ msg: 'User not found' });
        }

        req.user = userId;
        req.isAdmin = user.isAdmin;
      }
    } else if (anonymousId) {
      const session = await AnonymousSession.findOne({ anonymousId });
      if (!session) {
        console.error('[Auth Middleware] Invalid anonymous session:', anonymousId);
        return res.status(401).json({ msg: 'Invalid anonymous session' });
      }
      req.anonymousUser = session;
    }
    next();
  } catch (err) {
    console.error('[Auth Middleware] Token validation error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
