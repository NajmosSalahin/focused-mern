const Entry = require('../models/Entry');

exports.list = async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.date) {
      const d = new Date(req.query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.startTime = { $gte: d, $lt: next };
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
    const updated = await Entry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addSegment = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
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
    const entry = await Entry.findById(req.params.id);
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
