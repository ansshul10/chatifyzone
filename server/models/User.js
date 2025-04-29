const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  password: { type: String }, // Optional, only for password-based authentication
  online: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  bio: { type: String, default: '', maxlength: 150 },
  age: { type: Number, min: 18, max: 120 },
  country: { type: String, required: true },
  state: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female'], required: true }, // New gender field
  status: { type: String, default: 'Available', maxlength: 30 },
  privacy: {
    allowFriendRequests: { type: Boolean, default: true },
  },
  webauthnUserID: { type: String }, // Stores base64-encoded userID for WebAuthn
  webauthnCredentials: [{
    credentialID: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true },
    deviceName: { type: String },
    authenticatorType: { type: String, default: 'fingerprint' },
  }],
});

// Hash password before saving if it exists and is modified
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    console.log(`[User Model] Hashing password for user: ${this.email}`);
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
