const mongoose = require('mongoose');
const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('AuditLog', AuditLogSchema);