const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true }
}, { _id: false });

const entrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task: { type: String, required: true },
  projectId: { type: String, default: null },
  projectName: { type: String, default: null },
  segments: [segmentSchema],
  durationMs: { type: Number, default: 0 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null }
}, { timestamps: true });

entrySchema.index({ startTime: -1 });
entrySchema.index({ projectId: 1 });

module.exports = mongoose.model('Entry', entrySchema);
