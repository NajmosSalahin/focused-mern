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
    const updated = await Habit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await HabitCompletion.deleteMany({ habitId: req.params.id });
    await Habit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
