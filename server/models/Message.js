const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String }, // Optional for voice messages
  audioPath: { type: String }, // Path to audio file
  type: { type: String, enum: ['text', 'voice'], default: 'text' }, // Message type
  isAnonymous: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  reactions: { type: Map, of: Number, default: {} },
});

module.exports = mongoose.model('Message', messageSchema);
