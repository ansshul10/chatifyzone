const mongoose = require('mongoose');

const anonymousSessionSchema = new mongoose.Schema({
  username: { type: String, required: true },
  anonymousId: { type: String, required: true, unique: true },
  country: { type: String },
  state: { type: String },
  age: { type: Number },
  status: { type: String, default: 'online' },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AnonymousSession', anonymousSessionSchema);