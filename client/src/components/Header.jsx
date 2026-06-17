import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';


import { useApp } from '../context/AppContext';
import { fmt, sameDay, sameWeek, sameMon, WMO_INFO } from '../utils/helpers';

export default function Header() {
  const { viewDate, setViewDate, clock24h, setClock24h, entries, taskRunning, taskStart, liveElapsed, activeEntry, addToast, weatherVisible } = useApp();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
    setProfileOpen(false);
  };
  const [time, setTime] = useState(new Date());

  const [weatherData, setWeatherData] = useState(null);
  const [locSearch, setLocSearch] = useState('');
  const [locResults, setLocResults] = useState([]);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [weatherLoc, setWeatherLoc] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wxLoc')) || { city: 'Detecting…' }; } catch { return { city: 'Detecting…' }; }
  });

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch weather
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m&temperature_unit=celsius&timezone=auto`);
      const d = await res.json();
      setWeatherData(d.current);
      // Auto-save daily snapshot for stats
      const today = new Date().toISOString().slice(0, 10);
      if (!localStorage.getItem('wxSaved_' + today) && d.current) {
        const cur = d.current;
        try {
          const { saveWeather } = await import('../api/weather');
          await saveWeather({
            date: today,
            temp: cur.temperature_2m,
            humidity: cur.relative_humidity_2m,
            precip: cur.precipitation || 0,
            wind: cur.wind_speed_10m || 0,
            code: cur.weather_code,
            lat,
            lon,
          });
          localStorage.setItem('wxSaved_' + today, '1');
        } catch { /* silent */ }
      }
    } catch { setWeatherData(null); }
  }, []);

  useEffect(() => {
    const loc = weatherLoc;
    if (loc.lat != null) fetchWeather(loc.lat, loc.lon);
  }, [weatherLoc, fetchWeather]);

  // Search location
  const searchLoc = useCallback(async (q) => {
    if (q.length < 2) { setLocResults([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`);
      const data = await res.json();
      setLocResults(data);
    } catch { setLocResults([]); }
  }, []);

  const selectLoc = (r) => {
    const a = r.address;
    const city = a.city || a.town || a.village || a.county || a.state || r.display_name.split(',')[0];
    const loc = { lat: parseFloat(r.lat), lon: parseFloat(r.lon), city };
    setWeatherLoc(loc);
    localStorage.setItem('wxLoc', JSON.stringify(loc));
    setShowLocPicker(false);
    setLocSearch('');
    setLocResults([]);
    fetchWeather(loc.lat, loc.lon);
  };

  // Totals
  const now = new Date();
  let td = 0, wk = 0, mo = 0;
  entries.forEach(e => {
    if (!e.startTime || typeof e.durationMs !== 'number') return;
    const d = new Date(e.startTime);
    if (sameDay(d, now)) td += e.durationMs;
    if (sameWeek(d, now)) wk += e.durationMs;
    if (sameMon(d, now)) mo += e.durationMs;
  });
  if (taskRunning && taskStart) {
    const el = liveElapsed;
    if (sameDay(taskStart, now)) td += el;
    if (sameWeek(taskStart, now)) wk += el;
    if (sameMon(taskStart, now)) mo += el;
  }
  const weekDays = new Set();
  entries.forEach(e => { if (e.startTime && sameWeek(new Date(e.startTime), now)) weekDays.add(new Date(e.startTime).toDateString()); });
  if (taskRunning && taskStart && sameWeek(taskStart, now)) weekDays.add(taskStart.toDateString());
  const daysTracked = Math.max(1, weekDays.size);
  const dayAvg = Math.round(wk / daysTracked);

  const pad = v => String(v).padStart(2, '0');
  const h = time.getHours(), m = time.getMinutes(), s = time.getSeconds();
  const timeStr = clock24h
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(h % 12 || 12)}:${pad(m)}:${pad(s)} ${h >= 12 ? 'PM' : 'AM'}`;

  const wxInfo = weatherData ? WMO_INFO(weatherData.weather_code) : null;
  const todayStr = viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday = sameDay(viewDate, now);

  const navStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--mono)', fontSize: '12px' };
  const navBtn = { background: 'var(--bg1)', border: '1px solid var(--bg2)', color: 'var(--fg-dim)', width: '28px', height: '28px', borderRadius: 'var(--r)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' };

  return (
    <div className="header">
      <div className="header-row1">
        <div className="logo">FOCUS <em>/ pomodoro + tracker</em></div>
        <div className="header-spacer"></div>
        <div className="profile-menu" ref={profileRef}>
          <button className="profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
            <i className="fas fa-user-circle"></i>
          </button>
          {profileOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <strong>{user?.displayName || 'User'}</strong>
                <span className="profile-dropdown-email">{user?.email}</span>
              </div>
              <div className="profile-dropdown-divider"></div>
              <button className="profile-dropdown-item" onClick={() => openModal('profileModal')}>
                <i className="fas fa-user"></i> Profile
              </button>
              <button className="profile-dropdown-item" onClick={() => openModal('settingsModal')}>
                <i className="fas fa-cog"></i> Settings
              </button>
              <div className="profile-dropdown-divider"></div>
              <button className="profile-dropdown-item profile-dropdown-logout" onClick={logout}>
                <i className="fas fa-sign-out-alt"></i> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="header-row2">
        <div className="date-nav">
          <button style={navBtn} onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="date-label">{todayStr}</span>
          <button style={navBtn} onClick={() => setViewDate(new Date())}>
            <i className="fas fa-calendar-check"></i>
          </button>
          <button style={navBtn} onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        <div className="hw-chip" style={{ cursor: 'pointer' }} onClick={() => setClock24h(!clock24h)}>
          <span className="hw-clock">{timeStr}</span>
        </div>
        {weatherVisible && (
          <div className="hw-chip hw-weather-chip">
            {wxInfo ? <i className={`hw-icon fas ${wxInfo.i} ${wxInfo.c}`}></i> : <i className="hw-icon fas fa-circle-notch fa-spin loading"></i>}
            <span className="hw-temp">{weatherData ? `${Math.round(weatherData.temperature_2m)}°C` : '--°C'}</span>
            <span className="hw-sep">·</span>
            <i className="fas fa-droplet hw-hum" style={{ fontSize: '9px' }}></i>
            <span className="hw-hum">{weatherData ? `${weatherData.relative_humidity_2m}%` : '--%'}</span>
            <span className="hw-sep">·</span>
            <span className="hw-cond">{wxInfo ? wxInfo.l : '--'}</span>
            <span className="hw-sep">·</span>
            <i className="fas fa-location-dot hw-hum" style={{ fontSize: '9px' }}></i>
            <span className="hw-city">{weatherLoc.city || '--'}</span>
            <button className="hw-loc-btn" onClick={(e) => { e.stopPropagation(); setShowLocPicker(!showLocPicker); }}>
              <i className="fas fa-pen"></i>
            </button>
            {showLocPicker && (
              <div className="hw-picker">
                <input className="hw-search" placeholder="Search city…" value={locSearch}
                  onChange={e => { setLocSearch(e.target.value); searchLoc(e.target.value); }} />
                <div className="hw-results">
                  {locResults.length === 0 && locSearch.length < 2 && <div className="hw-result-item hw-result-hint">Type to search…</div>}
                  {locResults.map((r, i) => {
                    const a = r.address;
                    const city = a.city || a.town || a.village || a.county || a.state || '';
                    const sub = [a.state, a.country].filter(Boolean).join(', ');
                    return (
                      <div key={i} className="hw-result-item" onClick={() => selectLoc(r)}>
                        <strong>{city}</strong><span className="hw-result-sub">{sub}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="header-row3">
        <div className="totals">
          <div className="chip"><span className="lbl">TODAY</span><span className="val">{fmt(td)}</span></div>
          <div className="chip"><span className="lbl">WEEK</span><span className="val">{fmt(wk)}</span></div>
          <div className="chip"><span className="lbl">MONTH</span><span className="val">{fmt(mo)}</span></div>
          <div className="chip avg"><span className="lbl">D.AVG</span><span className="val">{fmt(dayAvg)}</span></div>
        </div>
      </div>
    </div>
  );
}
