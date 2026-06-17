const Entry = require('../models/Entry');
const Project = require('../models/Project');
const Goal = require('../models/Goal');
const PomoSession = require('../models/PomoSession');
const PomoSetting = require('../models/PomoSetting');
const Habit = require('../models/Habit');
const HabitCompletion = require('../models/HabitCompletion');
const WeatherSnapshot = require('../models/WeatherSnapshot');
const Note = require('../models/Note');

const MODEL_MAP = {
  entries: Entry,
  projects: Project,
  goals: Goal,
  pomoSessions: PomoSession,
  habits: Habit,
  habitCompletions: HabitCompletion,
  weather: WeatherSnapshot,
  notes: Note
};

const OLD_KEY_MAP = {
  entries: 'timeEntries',
  pomoSessions: 'pomoHistory',
  weather: 'weatherHistory'
};

function readItems(data, key) {
  return data[key] || data[OLD_KEY_MAP[key]];
}

async function clearCollection(Model, userId) {
  await Model.deleteMany({ userId });
}

async function insertMany(Model, items, userId) {
  if (!items || !items.length) return 0;
  const withUser = items.map(item => ({ ...item, userId }));
  await Model.insertMany(withUser, { ordered: false });
  return items.length;
}

async function mergeCollection(Model, items, userId) {
  if (!items || !items.length) return 0;
  let count = 0;
  for (const item of items) {
    const data = { ...item, userId };
    if (item._id) {
      const exists = await Model.findById(item._id);
      if (!exists) {
        await Model.create(data);
        count++;
      }
    } else {
      await Model.create(data);
      count++;
    }
  }
  return count;
}

exports.importData = async (req, res) => {
  try {
    const { mode, data } = req.body;
    if (!data) return res.status(400).json({ message: 'No data provided' });

    const result = {};

    const uid = req.userId;
    if (mode === 'replace') {
      for (const [key, Model] of Object.entries(MODEL_MAP)) {
        const items = readItems(data, key);
        if (items) {
          await clearCollection(Model, uid);
          const c = await insertMany(Model, items, uid);
          result[key] = c;
        } else {
          result[key] = 0;
        }
      }

      if (data.pomoSetting) {
        await PomoSetting.deleteMany({ userId: uid });
        await PomoSetting.create({ ...data.pomoSetting, userId: uid });
        result.pomoSetting = 1;
      } else {
        result.pomoSetting = 0;
      }
    } else {
      for (const [key, Model] of Object.entries(MODEL_MAP)) {
        const items = readItems(data, key);
        if (items) {
          const c = await mergeCollection(Model, items, uid);
          result[key] = c;
        } else {
          result[key] = 0;
        }
      }

      if (data.pomoSetting) {
        const existing = await PomoSetting.findOne({ userId: uid });
        if (!existing) {
          await PomoSetting.create({ ...data.pomoSetting, userId: uid });
          result.pomoSetting = 1;
        } else {
          result.pomoSetting = 0;
        }
      } else {
        result.pomoSetting = 0;
      }
    }

    res.json({ imported: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
