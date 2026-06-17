const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }
}, { timestamps: true });

projectSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema);
