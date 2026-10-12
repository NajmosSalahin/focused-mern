require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { auth } = require('./middleware/auth');

const app = express();

// Render (and most PaaS hosts) terminate TLS at a proxy; without this every
// request is keyed on the proxy's IP and rate limiting becomes a no-op.
app.set('trust proxy', 1);

// The SPA is served same-origin and Vite proxies /api in dev, so cross-origin
// access only needs to be granted to explicitly configured origins.
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://focused-4l3h.onrender.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
    "script-src 'self' 'unsafe-inline'; " +
    "connect-src 'self' https://api.open-meteo.com https://nominatim.openstreetmap.org https://ipapi.co"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

if (!process.env.BREVO_API_KEY) {
  if (process.env.NODE_ENV !== 'production') console.warn('⚠ BREVO_API_KEY not set — emails will be logged to console only');
} else {
  console.log('✓ Brevo API configured');
}

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/entries', auth, require('./routes/entries'));
app.use('/api/projects', auth, require('./routes/projects'));
app.use('/api/goals', auth, require('./routes/goals'));
app.use('/api/pomo-sessions', auth, require('./routes/pomoSessions'));
app.use('/api/pomo-settings', auth, require('./routes/pomoSettings'));
app.use('/api/weather', auth, require('./routes/weather'));
app.use('/api/stats', auth, require('./routes/stats'));
app.use('/api/export', auth, require('./routes/exportData'));
app.use('/api/import', auth, require('./routes/importData'));
app.use('/api/account', auth, require('./routes/account'));

app.use(express.static(path.join(__dirname, '..', 'client', 'dist'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));
app.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'text/xml');
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'sitemap.xml'));
});
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
