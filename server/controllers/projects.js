const Project = require('../models/Project');

exports.list = async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.userId }).sort({ name: 1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const existing = await Project.findOne({ userId: req.userId, name: req.body.name });
    if (existing) return res.status(400).json({ message: 'Project name already exists' });
    const project = new Project({ userId: req.userId, name: req.body.name });
    const saved = await project.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
