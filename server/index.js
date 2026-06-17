require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { auth } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/entries', auth, require('./routes/entries'));
app.use('/api/projects', auth, require('./routes/projects'));
app.use('/api/goals', auth, require('./routes/goals'));
app.use('/api/pomo-sessions', auth, require('./routes/pomoSessions'));
app.use('/api/pomo-settings', auth, require('./routes/pomoSettings'));
app.use('/api/habits', auth, require('./routes/habits'));
app.use('/api/habit-completions', auth, require('./routes/habitCompletions'));
app.use('/api/weather', auth, require('./routes/weather'));
app.use('/api/stats', auth, require('./routes/stats'));
app.use('/api/export', auth, require('./routes/exportData'));
app.use('/api/import', auth, require('./routes/importData'));
app.use('/api/notes', auth, require('./routes/notes'));
app.use('/api/account', auth, require('./routes/account'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
