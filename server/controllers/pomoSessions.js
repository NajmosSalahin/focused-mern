const PomoSession = require('../models/PomoSession');

exports.list = async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.date) {
      const d = new Date(req.query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.completedAt = { $gte: d, $lt: next };
    }
    const sessions = await PomoSession.find(filter).sort({ completedAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const session = new PomoSession({
      userId: req.userId,
      mode: req.body.mode,
      duration: req.body.duration,
      skipped: req.body.skipped || false,
      completedAt: req.body.completedAt || new Date()
    });
    const saved = await session.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeToday = async (req, res) => {
  try {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    await PomoSession.deleteMany({ userId: req.userId, completedAt: { $gte: start, $lt: end } });
    res.json({ message: 'Today sessions deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
