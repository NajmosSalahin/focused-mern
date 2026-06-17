const mongoose = require('mongoose');

const weatherSnapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  temp: { type: Number, required: true },
  feelsLike: { type: Number, default: null },
  humidity: { type: Number, default: null },
  precip: { type: Number, default: 0 },
  wind: { type: Number, default: null },
  code: { type: Number, default: 0 },
  location: {
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    city: { type: String, default: '' }
  }
}, { timestamps: true });

weatherSnapshotSchema.index({ date: -1 });

module.exports = mongoose.model('WeatherSnapshot', weatherSnapshotSchema);
