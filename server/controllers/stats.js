const Entry = require('../models/Entry');
const PomoSession = require('../models/PomoSession');
const Project = require('../models/Project');
const Goal = require('../models/Goal');
const Habit = require('../models/Habit');
const WeatherSnapshot = require('../models/WeatherSnapshot');

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function sameWeek(a, b) {
  const da = new Date(a);
  da.setDate(da.getDate() - ((da.getDay() + 6) % 7));
  const db = new Date(b);
  db.setDate(db.getDate() - ((db.getDay() + 6) % 7));
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function sameMon(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sum(arr) { return arr.reduce((s, v) => s + v, 0); }
function mean(arr) { return arr.length ? sum(arr) / arr.length : 0; }
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function slope(ys) {
  if (ys.length < 2) return 0;
  const n = ys.length;
  const xs = ys.map((_, i) => i);
  const sx = sum(xs), sy = sum(ys);
  const sxx = sum(xs.map(x => x * x));
  const sxy = sum(xs.map((x, i) => x * ys[i]));
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return m || 0;
}

function getDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function buildDateRange(range) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start;
  if (range === 'all') start = new Date(0);
  else {
    const n = parseInt(range) || 30;
    start = new Date(now);
    start.setDate(start.getDate() - n);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

async function getStreaks(filter) {
  const entries = await Entry.find(filter).sort({ startTime: 1 }).lean();
  const days = [...new Set(entries.map(e => getDateStr(new Date(e.startTime))))].sort();
  if (!days.length) return { current: 0, best: 0 };

  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (curr - prev) / 86400000;
    if (Math.round(diff) === 1) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }

  const todayStr = getDateStr(new Date());
  const yesterdayStr = getDateStr(new Date(Date.now() - 86400000));
  if (days[days.length - 1] !== todayStr && days[days.length - 1] !== yesterdayStr) {
    cur = 0;
  }

  return { current: cur, best };
}

exports.kpi = async (req, res) => {
  try {
    const range = req.query.range || '30';
    const { start, end } = buildDateRange(range);
    const filter = { startTime: { $gte: start, $lte: end } };

    const entries = await Entry.find({ ...filter, userId: req.userId }).lean();
    const pomos = await PomoSession.find({ userId: req.userId, completedAt: { $gte: start, $lte: end } }).lean();
    const allProjects = await Project.countDocuments({ userId: req.userId });
    const allGoals = await Goal.countDocuments({ userId: req.userId });

    const totalTime = sum(entries.map(e => e.durationMs || 0));
    const totalSessions = entries.length;
    const daysSet = new Set(entries.map(e => getDateStr(new Date(e.startTime))));
    const trackedDays = daysSet.size;
    const avgDaily = trackedDays ? totalTime / trackedDays : 0;
    const totalPomos = pomos.length;

    const allTime = await Entry.find({ userId: req.userId }).sort({ startTime: 1 }).lean();
    const streaks = await getStreaks({ userId: req.userId });

    res.json({
      totalTime,
      totalSessions,
      trackedDays,
      avgDaily,
      currentStreak: streaks.current,
      bestStreak: streaks.best,
      totalPomos,
      totalProjects: allProjects,
      totalGoals: allGoals
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.daily = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const entries = await Entry.find({ userId: req.userId, startTime: { $gte: start } }).lean();
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getDateStr(d);
      dayMap[key] = { date: key, label: key.slice(5), hours: 0, ms: 0 };
    }

    for (const e of entries) {
      const key = getDateStr(new Date(e.startTime));
      if (dayMap[key]) {
        dayMap[key].ms += e.durationMs || 0;
        dayMap[key].hours = +(dayMap[key].ms / 3600000).toFixed(2);
      }
    }

    res.json(Object.values(dayMap).reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.projects = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.userId, projectId: { $ne: null } }).lean();
    const map = {};
    for (const e of entries) {
      const key = e.projectId || 'none';
      if (!map[key]) map[key] = { name: e.projectName || 'Uncategorized', ms: 0, color: '#888', count: 0 };
      map[key].ms += e.durationMs || 0;
      map[key].count++;
    }
    res.json(Object.values(map).sort((a, b) => b.ms - a.ms));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.dow = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.userId }).lean();
    const dow = [0, 0, 0, 0, 0, 0, 0];
    for (const e of entries) {
      const d = new Date(e.startTime);
      const day = (d.getDay() + 6) % 7;
      dow[day] += e.durationMs || 0;
    }
    res.json(dow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.hourHeatmap = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.userId }).lean();
    const hours = new Array(24).fill(0);
    for (const e of entries) {
      const d = new Date(e.startTime);
      const h = d.getHours();
      hours[h] += e.durationMs || 0;
    }
    res.json(hours);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.pomo = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const sessions = await PomoSession.find({ userId: req.userId, completedAt: { $gte: start } }).lean();
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getDateStr(d);
      dayMap[key] = { date: key, count: 0 };
    }
    for (const s of sessions) {
      const key = getDateStr(new Date(s.completedAt));
      if (dayMap[key]) dayMap[key].count++;
    }
    res.json(Object.values(dayMap).reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.distribution = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.userId }).lean();
    const buckets = [
      { label: '0-5 min', min: 0, max: 5 * 60000 },
      { label: '5-10 min', min: 5 * 60000, max: 10 * 60000 },
      { label: '10-15 min', min: 10 * 60000, max: 15 * 60000 },
      { label: '15-20 min', min: 15 * 60000, max: 20 * 60000 },
      { label: '20-30 min', min: 20 * 60000, max: 30 * 60000 },
      { label: '30-45 min', min: 30 * 60000, max: 45 * 60000 },
      { label: '45-60 min', min: 45 * 60000, max: 60 * 60000 },
      { label: '60-90 min', min: 60 * 60000, max: 90 * 60000 },
      { label: '90-120 min', min: 90 * 60000, max: 120 * 60000 },
      { label: '120-180 min', min: 120 * 60000, max: 180 * 60000 }
    ];
    const result = buckets.map(b => ({ label: b.label, count: 0 }));
    for (const e of entries) {
      const ms = e.durationMs || 0;
      for (let i = 0; i < buckets.length; i++) {
        if (ms >= buckets[i].min && ms < buckets[i].max) {
          result[i].count++;
          break;
        }
      }
    }
    res.json({ buckets: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.insights = async (req, res) => {
  try {
    const range = parseInt(req.query.range) || 30;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - range);
    start.setHours(0, 0, 0, 0);

    const entries = await Entry.find({ userId: req.userId, startTime: { $gte: start } }).lean();
    const pomos = await PomoSession.find({ userId: req.userId, completedAt: { $gte: start } }).lean();
    const habits = await Habit.find({ userId: req.userId }).lean();

    const dailyMs = {};
    for (const e of entries) {
      const key = getDateStr(new Date(e.startTime));
      if (!dailyMs[key]) dailyMs[key] = 0;
      dailyMs[key] += e.durationMs || 0;
    }

    const vals = Object.values(dailyMs);
    const trend = slope(vals);
    const trendDir = trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable';

    const hours = new Array(24).fill(0);
    for (const e of entries) {
      const h = new Date(e.startTime).getHours();
      hours[h] += e.durationMs || 0;
    }
    const bestHour = hours.indexOf(Math.max(...hours));

    const dow = [0, 0, 0, 0, 0, 0, 0];
    for (const e of entries) {
      const d = new Date(e.startTime);
      dow[(d.getDay() + 6) % 7] += e.durationMs || 0;
    }
    const bestDow = dow.indexOf(Math.max(...dow));
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const cv = vals.length ? std(vals) / mean(vals) : 0;
    const consistency = cv < 0.5 ? 'high' : cv < 1 ? 'moderate' : 'low';

    const streaks = await getStreaks({ userId: req.userId, startTime: { $gte: start } });

    const projectMap = {};
    for (const e of entries) {
      if (e.projectName) {
        if (!projectMap[e.projectName]) projectMap[e.projectName] = 0;
        projectMap[e.projectName] += e.durationMs || 0;
      }
    }
    const topProjects = Object.entries(projectMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const habitCompletions = await require('../models/HabitCompletion').find({
      userId: req.userId,
      createdAt: { $gte: start }
    }).lean();
    const habitCounts = {};
    for (const hc of habitCompletions) {
      const h = habits.find(x => x._id.toString() === hc.habitId.toString());
      if (h) {
        if (!habitCounts[h.name]) habitCounts[h.name] = 0;
        habitCounts[h.name]++;
      }
    }
    const topHabits = Object.entries(habitCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const totalMs = sum(vals);
    const totalHours = (totalMs / 3600000).toFixed(1);

    res.json({
      trend: trendDir,
      bestHour: `${bestHour}:00`,
      bestWeekday: dayNames[bestDow],
      consistency,
      currentStreak: streaks.current,
      bestStreak: streaks.best,
      totalHours: parseFloat(totalHours),
      trackedDays: vals.length,
      totalPomos: pomos.length,
      topProjects,
      topHabits
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.detailed = async (req, res) => {
  try {
    const range = parseInt(req.query.range) || 30;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - range);
    start.setHours(0, 0, 0, 0);

    const entries = await Entry.find({ userId: req.userId, startTime: { $gte: start } }).lean();
    const durSecs = entries.map(e => (e.durationMs || 0) / 1000).filter(v => v > 0);

    const dailyMs = {};
    for (const e of entries) {
      const key = e.startTime.toISOString().slice(0, 10);
      if (!dailyMs[key]) dailyMs[key] = 0;
      dailyMs[key] += e.durationMs || 0;
    }
    const dailyVals = Object.values(dailyMs);

    const meanSec = mean(durSecs);
    const medianSec = median(durSecs);
    const stdSec = durSecs.length > 1 ? std(durSecs) : 0;
    const minSec = durSecs.length ? Math.min(...durSecs) : 0;
    const maxSec = durSecs.length ? Math.max(...durSecs) : 0;
    const dailyMean = dailyVals.length ? mean(dailyVals) : 0;
    const dailyStd = dailyVals.length > 1 ? std(dailyVals) : 0;
    const cv = meanSec > 0 ? stdSec / meanSec : 0;

    // Trend slope from daily values
    const trendSlope = dailyVals.length > 1 ? slope(dailyVals) : 0;

    // Lag-1 autocorrelation
    let autoCorr = 0;
    if (dailyVals.length > 2) {
      const lag1 = dailyVals.slice(0, -1);
      const lag0 = dailyVals.slice(1);
      const m1 = mean(lag1), m0 = mean(lag0);
      let num = 0, d1 = 0, d0 = 0;
      for (let i = 0; i < lag1.length; i++) {
        num += (lag1[i] - m1) * (lag0[i] - m0);
        d1 += (lag1[i] - m1) ** 2;
        d0 += (lag0[i] - m0) ** 2;
      }
      autoCorr = Math.sqrt(d1 * d0) > 0 ? num / Math.sqrt(d1 * d0) : 0;
    }

    // Peak hour
    const hourMs = new Array(24).fill(0);
    for (const e of entries) {
      const h = new Date(e.startTime).getHours();
      hourMs[h] += e.durationMs || 0;
    }
    const peakHour = hourMs.indexOf(Math.max(...hourMs));
    const peakHourVal = hourMs[peakHour] || 0;

    res.json({
      meanSec: +meanSec.toFixed(1),
      medianSec: +medianSec.toFixed(1),
      stdSec: +stdSec.toFixed(1),
      minSec: +minSec.toFixed(1),
      maxSec: +maxSec.toFixed(1),
      dailyMean: +dailyMean.toFixed(1),
      dailyStd: +dailyStd.toFixed(1),
      cv: +cv.toFixed(3),
      trendSlope: +trendSlope.toFixed(3),
      autoCorr: +autoCorr.toFixed(3),
      peakHour,
      peakHourVal: +peakHourVal.toFixed(1),
      totalEntries: entries.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.weather = async (req, res) => {
  try {
    const snapshots = await WeatherSnapshot.find({ userId: req.userId }).sort({ date: -1 }).limit(90).lean();
    const pairs = [];
    for (const s of snapshots) {
      const start = new Date(s.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const entries = await Entry.find({
        userId: req.userId,
        startTime: { $gte: start, $lt: end }
      }).lean();
      const totalMs = sum(entries.map(e => e.durationMs || 0));
      const hours = totalMs / 3600000;
      pairs.push({
        date: s.date,
        temp: s.temp,
        humidity: s.humidity,
        precip: s.precip,
        wind: s.wind,
        code: s.code,
        hours
      });
    }

    const valid = pairs.filter(p => p.hours > 0);
    if (valid.length < 3) {
      return res.json({ paired: valid, r: { temp: 0, humidity: 0, precip: 0, wind: 0 }, message: 'Not enough data' });
    }

    function pearsonR(xs, ys) {
      const n = xs.length;
      if (n < 2) return 0;
      const mx = mean(xs), my = mean(ys);
      let num = 0, dx2 = 0, dy2 = 0;
      for (let i = 0; i < n; i++) {
        const dx = xs[i] - mx;
        const dy = ys[i] - my;
        num += dx * dy;
        dx2 += dx * dx;
        dy2 += dy * dy;
      }
      const den = Math.sqrt(dx2 * dy2);
      return den ? num / den : 0;
    }

    const r = {
      temp: pearsonR(valid.map(p => p.temp), valid.map(p => p.hours)),
      humidity: pearsonR(valid.map(p => p.humidity), valid.map(p => p.hours)),
      precip: pearsonR(valid.map(p => p.precip), valid.map(p => p.hours)),
      wind: pearsonR(valid.map(p => p.wind), valid.map(p => p.hours))
    };

    res.json({ paired: valid, r });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
