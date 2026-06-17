export const fmt = (ms) => {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h, m, sec].map(u => String(u).padStart(2, '0')).join(':');
};

export const fmtMS = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const fmtHuman = (secs) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
  return `${s}s`;
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export const sameDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

export const sowk = (d) => { const r = new Date(d), dy = r.getDay(); r.setDate(r.getDate() - dy + (dy === 0 ? -6 : 1)); r.setHours(0, 0, 0, 0); return r; };

export const sameWeek = (a, b) => sameDay(sowk(new Date(a)), sowk(new Date(b)));

export const sameMon = (a, b) => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth();
};

export const dateKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export const toDateStr = (d) => {
  const dt = new Date(d);
  return dt.toISOString().split('T')[0];
};

export const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const PROJ_COLORS = ['#458588', '#b16286', '#689d6a', '#d79921', '#cc241d', '#98971a'];

export const projColor = (projects, id) => {
  const i = projects.findIndex(p => p._id === id);
  return i >= 0 ? PROJ_COLORS[i % PROJ_COLORS.length] : '#665c54';
};

export const WMO_INFO = (code) => {
  if (code === 0) return { i: 'fa-sun', c: 'clear', l: 'CLEAR', e: '☀️' };
  if (code <= 3) return { i: 'fa-cloud-sun', c: 'cloud', l: 'CLOUDY', e: '⛅' };
  if (code <= 48) return { i: 'fa-smog', c: 'fog', l: 'FOGGY', e: '🌫️' };
  if (code <= 55) return { i: 'fa-cloud-drizzle', c: 'rain', l: 'DRIZZLE', e: '🌦️' };
  if (code <= 67) return { i: 'fa-cloud-rain', c: 'rain', l: 'RAIN', e: '🌧️' };
  if (code <= 77) return { i: 'fa-snowflake', c: 'snow', l: 'SNOW', e: '❄️' };
  if (code <= 82) return { i: 'fa-cloud-showers-heavy', c: 'rain', l: 'SHOWERS', e: '🌧️' };
  if (code <= 86) return { i: 'fa-snowflake', c: 'snow', l: 'SNOW', e: '❄️' };
  return { i: 'fa-cloud-bolt', c: 'storm', l: 'STORM', e: '⛈️' };
};
