const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  password: { type: String, required: true },
  country: { type: String, required: false },
  state: { type: String, default: '' },
  age: { type: Number, min: 18, max: 120 },
  gender: { type: String, enum: ['male', 'female', null], required: false },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
  otpAttempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: '5m' }, // Auto-delete after 15 minutes
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
