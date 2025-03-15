// server/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String, required: true },
  isAnonymous: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  reactions: { type: Map, of: Number, default: {} }, // Added for reactions
});

module.exports = mongoose.model('Message', messageSchema);
