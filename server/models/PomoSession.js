const mongoose = require('mongoose');

const pomoSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { type: String, enum: ['work', 'short', 'long'], required: true },
  duration: { type: Number, required: true },
  skipped: { type: Boolean, default: false },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

pomoSessionSchema.index({ completedAt: -1 });

module.exports = mongoose.model('PomoSession', pomoSessionSchema);
