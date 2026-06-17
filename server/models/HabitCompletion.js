const mongoose = require('mongoose');

const habitCompletionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
  date: { type: String, required: true }
}, { timestamps: true });

habitCompletionSchema.index({ habitId: 1, date: 1 }, { unique: true });
habitCompletionSchema.index({ date: -1 });

module.exports = mongoose.model('HabitCompletion', habitCompletionSchema);
