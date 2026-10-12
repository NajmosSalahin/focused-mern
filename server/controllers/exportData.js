const Entry = require('../models/Entry');
const Project = require('../models/Project');
const Goal = require('../models/Goal');
const PomoSession = require('../models/PomoSession');
const PomoSetting = require('../models/PomoSetting');
const WeatherSnapshot = require('../models/WeatherSnapshot');

exports.exportAll = async (req, res) => {
  try {
    const [
      entries,
      projects,
      goals,
      pomoHistory,
      pomoSetting,
      weatherHistory
    ] = await Promise.all([
      Entry.find({ userId: req.userId }).lean(),
      Project.find({ userId: req.userId }).lean(),
      Goal.find({ userId: req.userId }).lean(),
      PomoSession.find({ userId: req.userId }).lean(),
      PomoSetting.findOne({ userId: req.userId }).lean(),
      WeatherSnapshot.find({ userId: req.userId }).lean()
    ]);

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      entries,
      projects,
      goals,
      pomoSessions: pomoHistory,
      weather: weatherHistory,
      pomoSetting: pomoSetting || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
