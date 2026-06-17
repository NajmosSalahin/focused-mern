const mongoose = require('mongoose');

const pomoSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  work: { type: Number, default: 1500 },
  short: { type: Number, default: 300 },
  long: { type: Number, default: 900 },
  cycle: { type: Number, default: 4 },
  autoAdv: { type: Boolean, default: true },
  skipBreaks: { type: [Number], default: [] },
  customPlan: { type: [String], default: null },
  focusedTaskName: { type: String, default: null },
  focusedTaskProjectId: { type: String, default: null },
  focusedTaskProjectName: { type: String, default: null },
  soundEnabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PomoSetting', pomoSettingSchema);
