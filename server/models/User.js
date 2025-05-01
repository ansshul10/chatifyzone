const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  password: { type: String },
  online: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bio: { type: String, default: '', maxlength: 150 },
  age: { type: Number, min: 18, max: 120 },
  country: { type: String, required: false }, // Made optional
  state: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', null], required: false }, // Made optional
  status: { type: String, default: 'Available', maxlength: 30 },
  privacy: {
    allowFriendRequests: { type: Boolean, default: true },
    profileVisibility: { type: String, enum: ['Public', 'Friends', 'Private'], default: 'Public' },
  },
  activityLog: [{
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  webauthnUserID: { type: String },
  webauthnCredentials: [
    {
      credentialID: { type: String, required: true },
      publicKey: { type: String, required: true },
      counter: { type: Number, required: true },
      deviceName: { type: String },
      authenticatorType: { type: String, default: 'fingerprint' },
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
