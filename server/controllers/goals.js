const Goal = require('../models/Goal');
const Entry = require('../models/Entry');

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
    const updated = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Goal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.progress = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.userId });
    const now = new Date();
    const results = [];

    for (const goal of goals) {
      let reset = false;

      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (goal.lastResetDate) {
        if (goal.frequency === 'day' && goal.lastResetDate < startOfDay) reset = true;
        else if (goal.frequency === 'week' && goal.lastResetDate < startOfWeek) reset = true;
        else if (goal.frequency === 'month' && goal.lastResetDate < startOfMonth) reset = true;
      }

      if (reset) {
        goal.currentMs = 0;
        goal.lastResetDate = now;
      }

      let periodStart;
      if (goal.frequency === 'day') periodStart = startOfDay;
      else if (goal.frequency === 'week') periodStart = startOfWeek;
      else periodStart = startOfMonth;

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
