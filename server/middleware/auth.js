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

      // Extract userId from decoded.user.id (not decoded.userId)
      const userId = decoded.user?.id;
      if (!userId) {
        console.error('[Auth Middleware] No user ID found in token');
        return res.status(401).json({ msg: 'Invalid token structure' });
      }

      const user = await User.findById(userId);
      if (!user) {
        console.error('[Auth Middleware] User not found for ID:', userId);
        return res.status(401).json({ msg: 'User not found' });
      }

      req.user = userId; // Set req.user to the userId
      req.isAdmin = user.isAdmin;
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
