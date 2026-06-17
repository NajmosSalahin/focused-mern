const HabitCompletion = require('../models/HabitCompletion');

exports.list = async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.date) filter.date = req.query.date;
    if (req.query.habitId) filter.habitId = req.query.habitId;
    const completions = await HabitCompletion.find(filter).sort({ createdAt: -1 });
    res.json(completions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { habitId, date } = req.body;
    const existing = await HabitCompletion.findOne({ userId: req.userId, habitId, date });
    if (existing) return res.json(existing);
    const completion = new HabitCompletion({ userId: req.userId, habitId, date });
    const saved = await completion.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await HabitCompletion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Completion deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.bulk = async (req, res) => {
  try {
    const items = req.body;
    const created = [];
    for (const item of items) {
      const existing = await HabitCompletion.findOne({ userId: req.userId, habitId: item.habitId, date: item.date });
      if (!existing) {
        const c = await HabitCompletion.create({ userId: req.userId, habitId: item.habitId, date: item.date });
        created.push(c);
      }
    }
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
