const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  color: { type: String, default: '#b8bb26' },
  category: { type: String, default: '' },
  archived: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  schedule: { type: String, default: 'daily' }
}, { timestamps: true });

module.exports = mongoose.model('Habit', habitSchema);
