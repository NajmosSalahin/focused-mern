const Habit = require('../models/Habit');
const HabitCompletion = require('../models/HabitCompletion');

exports.list = async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.archived === 'true') filter.archived = true;
    else if (req.query.archived === 'false') filter.archived = false;
    const habits = await Habit.find(filter).sort({ sortOrder: 1, name: 1 });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const habit = new Habit({ ...req.body, userId: req.userId });
    const saved = await habit.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { _id, userId, ...updates } = req.body;
    const updated = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Habit not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Habit not found' });
    await HabitCompletion.deleteMany({ habitId: req.params.id, userId: req.userId });
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
