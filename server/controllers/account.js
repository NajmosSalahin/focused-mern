const Entry = require('../models/Entry');
const Project = require('../models/Project');
const Goal = require('../models/Goal');
const PomoSession = require('../models/PomoSession');
const PomoSetting = require('../models/PomoSetting');
const WeatherSnapshot = require('../models/WeatherSnapshot');

exports.deleteAllData = async (req, res) => {
  try {
    const userId = req.userId;
    await Promise.all([
      Entry.deleteMany({ userId }),
      Project.deleteMany({ userId }),
      Goal.deleteMany({ userId }),
      PomoSession.deleteMany({ userId }),
      PomoSetting.deleteMany({ userId }),
      WeatherSnapshot.deleteMany({ userId }),
    ]);
    res.json({ message: 'All data deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
