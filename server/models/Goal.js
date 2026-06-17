const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['atLeast', 'atMost'], default: 'atLeast' },
  targetMs: { type: Number, required: true },
  frequency: { type: String, enum: ['day', 'week', 'month'], default: 'day' },
  endDate: { type: Date, default: null },
  currentMs: { type: Number, default: 0 },
  lastResetDate: { type: Date, default: () => new Date() },
  projectId: { type: String, default: null },
  projectName: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
