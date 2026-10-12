const PomoSession = require('../models/PomoSession');
const { parseTz, startOfDay, endOfDay } = require('../utils/dates');

exports.list = async (req, res) => {
  try {
    const tz = parseTz(req.query.tz);
    const filter = { userId: req.userId };
    if (req.query.date) {
      const d = new Date(`${req.query.date}T00:00:00Z`);
      if (!isNaN(d)) {
        const start = startOfDay(d, tz);
        filter.completedAt = { $gte: start, $lt: new Date(start.getTime() + 86400000) };
      }
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
    const tz = parseTz(req.query.tz);
    const start = startOfDay(new Date(), tz);
    const end = endOfDay(new Date(), tz);
    await PomoSession.deleteMany({ userId: req.userId, completedAt: { $gte: start, $lte: end } });
    res.json({ message: 'Today sessions deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
