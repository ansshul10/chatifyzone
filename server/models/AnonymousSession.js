const mongoose = require('mongoose');

const anonymousSessionSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    maxlength: 20,
  },
  anonymousId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h', // Auto-expire after 24 hours
  },
});

module.exports = mongoose.model('AnonymousSession', anonymousSessionSchema);