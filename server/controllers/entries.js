const Entry = require('../models/Entry');
const { parseTz, startOfDay } = require('../utils/dates');

exports.list = async (req, res) => {
  try {
    const tz = parseTz(req.query.tz);
    const filter = { userId: req.userId };
    if (req.query.date) {
      const d = new Date(`${req.query.date}T00:00:00Z`);
      if (!isNaN(d)) {
        const start = startOfDay(d, tz);
        filter.startTime = { $gte: start, $lt: new Date(start.getTime() + 86400000) };
      }
    } else if (req.query.startDate || req.query.endDate) {
      const range = {};
      if (req.query.startDate) range.$gte = new Date(req.query.startDate);
      if (req.query.endDate) range.$lte = new Date(req.query.endDate);
      filter.startTime = range;
    }
    const entries = await Entry.find(filter).sort({ startTime: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const entry = new Entry({
      userId: req.userId,
      task: req.body.task,
      projectId: req.body.projectId || null,
      projectName: req.body.projectName || null,
      startTime: req.body.startTime || new Date(),
      endTime: req.body.endTime || null,
      durationMs: req.body.durationMs || 0,
      segments: req.body.segments || []
    });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { _id, userId, ...updates } = req.body;
    const updated = await Entry.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Entry not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addSegment = async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    const { start, end } = req.body;
    entry.segments.push({ start, end });
    entry.durationMs = entry.segments.reduce((sum, s) => sum + (s.end - s.start), 0);
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.stop = async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    entry.endTime = req.body.endTime || new Date();
    entry.durationMs = entry.segments.reduce((sum, s) => sum + (s.end - s.start), 0);
    if (entry.durationMs === 0 && entry.endTime && entry.startTime) {
      entry.durationMs = entry.endTime.getTime() - entry.startTime.getTime();
    }
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
