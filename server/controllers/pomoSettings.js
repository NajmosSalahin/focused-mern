const PomoSetting = require('../models/PomoSetting');

exports.get = async (req, res) => {
  try {
    let settings = await PomoSetting.findOne({ userId: req.userId });
    if (!settings) {
      settings = await PomoSetting.create({ userId: req.userId });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const settings = await PomoSetting.findOneAndUpdate(
      { userId: req.userId },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
