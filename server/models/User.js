const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Add this
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  bio: { type: String, default: '', maxlength: 150 },
  age: { type: Number, min: 13, max: 120 },
  status: { type: String, default: 'Available', maxlength: 30 }, // Custom Status Message
  privacy: {
    allowFriendRequests: { type: Boolean, default: true },
  },
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
