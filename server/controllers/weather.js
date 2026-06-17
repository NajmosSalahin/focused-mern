const https = require('https');
const WeatherSnapshot = require('../models/WeatherSnapshot');

exports.list = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const snapshots = await WeatherSnapshot.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(days);
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const snapshot = new WeatherSnapshot({
      userId: req.userId,
      date: req.body.date,
      temp: req.body.temp,
      feelsLike: req.body.feelsLike || null,
      humidity: req.body.humidity || null,
      precip: req.body.precip || 0,
      wind: req.body.wind || null,
      code: req.body.code || 0,
      location: {
        lat: req.body.lat || null,
        lon: req.body.lon || null,
        city: req.body.city || ''
      }
    });
    const saved = await snapshot.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.location = async (req, res) => {
  try {
    const snapshot = await WeatherSnapshot.findOne({ userId: req.userId })
      .sort({ date: -1 })
      .select('location');
    res.json(snapshot ? snapshot.location : { lat: null, lon: null, city: '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.fetch = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ message: 'lat and lon required' });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m&temperature_unit=celsius&timezone=auto`;
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          res.json(JSON.parse(data));
        } catch {
          res.status(502).json({ message: 'Invalid response from weather service' });
        }
      });
    }).on('error', (err) => {
      res.status(502).json({ message: err.message });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
