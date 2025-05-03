const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  registrationEnabled: {
    type: Boolean,
    default: true,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  maintenanceStartTime: {
    type: Date,
    default: null,
  },
  maintenanceDuration: {
    type: Number,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingsSchema);