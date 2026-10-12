const Goal = require('../models/Goal');
const Entry = require('../models/Entry');
const { parseTz, startOfDay, startOfWeek, startOfMonth } = require('../utils/dates');

exports.list = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const goal = new Goal({ ...req.body, userId: req.userId });
    const saved = await goal.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { _id, userId, ...updates } = req.body;
    const updated = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Goal not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.progress = async (req, res) => {
  try {
    const tz = parseTz(req.query.tz);
    const goals = await Goal.find({ userId: req.userId });
    const now = new Date();
    const results = [];

    for (const goal of goals) {
      let reset = false;

      const dayStart = startOfDay(now, tz);
      const weekStart = startOfWeek(now, tz);
      const monthStart = startOfMonth(now, tz);

      if (goal.lastResetDate) {
        if (goal.frequency === 'day' && goal.lastResetDate < dayStart) reset = true;
        else if (goal.frequency === 'week' && goal.lastResetDate < weekStart) reset = true;
        else if (goal.frequency === 'month' && goal.lastResetDate < monthStart) reset = true;
      }

      if (reset) {
        goal.currentMs = 0;
        goal.lastResetDate = now;
      }

      let periodStart;
      if (goal.frequency === 'day') periodStart = dayStart;
      else if (goal.frequency === 'week') periodStart = weekStart;
      else periodStart = monthStart;

      const match = {};
      if (goal.projectId) match.projectId = goal.projectId;

      const entries = await Entry.find({
        userId: req.userId,
        ...match,
        startTime: { $gte: periodStart }
      });

      goal.currentMs = entries.reduce((sum, e) => sum + (e.durationMs || 0), 0);

      results.push({
        _id: goal._id,
        name: goal.name,
        type: goal.type,
        targetMs: goal.targetMs,
        frequency: goal.frequency,
        currentMs: goal.currentMs,
        endDate: goal.endDate,
        projectId: goal.projectId,
        projectName: goal.projectName,
        lastResetDate: goal.lastResetDate,
        progress: goal.targetMs > 0 ? Math.min(goal.currentMs / goal.targetMs, 1) : 0
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
