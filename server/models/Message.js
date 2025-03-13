const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String, // Can be userId (ObjectId string) or anonymousId (e.g., 'anon-uuid')
    required: true,
  },
  receiver: {
    type: String, // Can be userId or anonymousId
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  edited: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Message', messageSchema);