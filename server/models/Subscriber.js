const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(20).toString('hex'),
  },
});

module.exports = mongoose.model('Subscriber', subscriberSchema);