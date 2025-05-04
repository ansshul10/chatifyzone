const jwt = require('jsonwebtoken');
const AnonymousSession = require('../models/AnonymousSession');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const token = req.header('x-auth-token');
  const anonymousId = req.header('x-anonymous-id');

  // Log headers for debugging
  console.log('[Auth Middleware] Headers received:', { token, anonymousId });

  if (!token && !anonymousId) {
    console.error('[Auth Middleware] No token or anonymous ID provided');
    return res.status(401).json({ msg: 'No token or anonymous ID, authorization denied' });
  }

  try {
    // Prioritize anonymousId if present
    if (anonymousId) {
      console.log('[Auth Middleware] Processing anonymous ID:', anonymousId);
      const session = await AnonymousSession.findOne({ anonymousId });
      if (!session) {
        console.error('[Auth Middleware] Invalid anonymous session:', anonymousId);
        return res.status(401).json({ msg: 'Invalid anonymous session' });
      }
      req.anonymousUser = session;
      console.log('[Auth Middleware] Anonymous session validated:', session.anonymousId);
      return next(); // Proceed without checking token
    }

    // Handle token-based authentication
    if (token) {
      console.log('[Auth Middleware] Processing token');
      // Basic token format validation
      if (!token.includes('.')) {
        console.error('[Auth Middleware] Token malformed: does not contain valid JWT structure');
        return res.status(401).json({ msg: 'Token is malformed' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[Auth Middleware] Token decoded:', decoded);

      // Check if token is for an admin
      if (decoded.isAdmin) {
        const user = await User.findById(decoded.adminId);
        if (!user || !user.isAdmin) {
          console.error('[Auth Middleware] Admin not found or not an admin for ID:', decoded.adminId);
          return res.status(401).json({ msg: 'Invalid admin token' });
        }
        req.user = decoded.adminId;
        req.isAdmin = true;
      } else {
        // Handle regular user token
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

        req.user = userId;
        req.isAdmin = user.isAdmin;
      }
      console.log('[Auth Middleware] User authenticated:', req.user);
    }

    next();
  } catch (err) {
    console.error('[Auth Middleware] Token validation error:', err.message, { token });
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};
