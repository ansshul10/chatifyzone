const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  resetOtp: { type: String }, // Field for password reset OTP
  resetOtpExpires: { type: Date }, // Field for password reset OTP expiration
  resetOtpAttempts: { type: Number, default: 0 }, // Field for tracking reset OTP attempts
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bio: { type: String, default: '', maxlength: 150 },
  age: { type: Number, min: 18, max: 120 },
  country: { type: String, required: false },
  state: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', null], required: false },
  status: { type: String, default: 'Available', maxlength: 30 },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  bannedAt: { type: Date, default: null },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  privacy: {
    allowFriendRequests: { type: Boolean, default: true },
    profileVisibility: { type: String, enum: ['Public', 'Friends', 'Private'], default: 'Public' },
  },
  activityLog: [
    {
      action: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
