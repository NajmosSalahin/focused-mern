import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, fmtHuman, WMO_INFO } from '../../utils/helpers';
import { generatePDFSummary } from '../../utils/pdf';
import {
  fetchKpi, fetchDaily, fetchProjects as fetchProjStats, fetchDow,
  fetchHourHeatmap, fetchPomo as fetchPomoStats, fetchDistribution,
  fetchInsights, fetchWeatherStats, fetchDetailed, fetchAllDaily, fetchAllPomo
} from '../../api/stats';

/* ── Canvas chart primitives ──────────────────────────────── */
function drawBar(ctx, x, _, w, h, color, maxH) {
  const barH = maxH > 0 ? (h / maxH) * 140 : 0;
  ctx.fillStyle = color;
  ctx.fillRect(x, 140 - barH, Math.max(w - 2, 1), Math.max(barH, 1));
}

function drawLine(ctx, pts, color, lineW) {
  if (pts.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW || 1.5;
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
}

function drawDonutChart(ctx, cx, cy, r, segments) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return;
  let angle = -Math.PI / 2;
  segments.forEach(seg => {
    const slice = (seg.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += slice;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI);
  ctx.fillStyle = '#282828';
  ctx.fill();
}

function drawHeatmapCanvas(ctx, grid, cols, rows, cellW, cellH, colors) {
  grid.forEach((val, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const idx = Math.min(Math.floor(val * colors.length), colors.length - 1);
    ctx.fillStyle = colors[idx] || colors[0];
    ctx.fillRect(col * cellW, row * cellH, cellW - 1, cellH - 1);
  });
}

function drawGridLines(ctx, W, H, top, bot, cH, maxV) {
  ctx.strokeStyle = '#3c3836';
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) {
    const y = top + cH * (1 - i / 3);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = '#665c54';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(fmtHuman(Math.round(maxV * i / 3 / 1000)), W - 2, y - 1);
  }
}

/* recharts-style 7-day moving average */
function movingAvg(arr, window) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

/* ── Heatmap helpers ──────────────────────────────────────── */
const HM_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HM_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function hmLevel(ms, max) {
  if (!ms || ms === 0) return 0;
  const h = ms / 3600000;
  if (max === 0) return 0;
  const ratio = h / max;
  if (ratio < 0.15) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.65) return 3;
  return 4;
}

function hmStreaks(dayMap) {
  const keys = Object.keys(dayMap).filter(k => dayMap[k].ms > 0).sort();
  if (!keys.length) return { current: 0, longest: 0, totalActiveDays: 0 };
  let longest = 1, cur = 1;
  for (let i = 1; i < keys.length; i++) {
    const diff = (new Date(keys[i]) - new Date(keys[i - 1])) / 86400000;
    if (diff === 1) { cur++; longest = Math.max(longest, cur); } else cur = 1;
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  let d = new Date(), streak = 0;
  while (true) {
    const k = d.toISOString().slice(0, 10);
    if (dayMap[k] && dayMap[k].ms > 0) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return { current: streak, longest, totalActiveDays: keys.length };
}

function hmBurnoutGaps(dayMap) {
  const gaps = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start90 = new Date(today); start90.setDate(today.getDate() - 90);
  let gapStart = null, gapLen = 0;
  for (let d = new Date(start90); d <= today; d.setDate(d.getDate() + 1)) {
    const k = d.toISOString().slice(0, 10);
    if (!dayMap[k] || dayMap[k].ms === 0) {
      if (!gapStart) gapStart = new Date(d);
      gapLen++;
    } else {
      if (gapLen >= 3) gaps.push({ start: new Date(gapStart), len: gapLen });
      gapStart = null; gapLen = 0;
    }
  }
  if (gapLen >= 3) gaps.push({ start: new Date(gapStart), len: gapLen });
  return gaps.slice(-5);
}

/* ── Component ────────────────────────────────────────────── */
const CHART_COLORS = ['#458588', '#b16286', '#689d6a', '#d79921', '#cc241d', '#98971a', '#8ec07c', '#83a598', '#d3869b', '#fabd2f'];
const HEAT_COLORS = ['#282828', '#3c3836', '#504945', '#665c54', '#7c6f64', '#928374', '#a89984', '#bdae93', '#d5c4a1', '#ebdbb2'];

export default function StatsModal() {
  const { projects, goals, pomoSessions, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState('30');
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState(null);
  const [daily, setDaily] = useState([]);
  const [projStats, setProjStats] = useState([]);
  const [dowData, setDowData] = useState([]);
  const [hourHeat, setHourHeat] = useState([]);
  const [pomoStats, setPomoStats] = useState([]);
  const [dist, setDist] = useState([]);
  const [insights, setInsights] = useState([]);
  const [detailed, setDetailed] = useState(null);
  const [weatherStats, setWeatherStats] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [entries, setStatsEntries] = useState([]);

  // Heatmap data
  const [hmDaily, setHmDaily] = useState([]);
  const [hmPomo, setHmPomo] = useState([]);

  // Animated KPI values
  const [animKpi, setAnimKpi] = useState({});

  // Tooltip state
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, html: '' });
  const chartDataRef = useRef({});
  const hideTooltip = useCallback(() => setTooltip({ show: false, x: 0, y: 0, html: '' }), []);
  const tt = useCallback((e, html) => setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html }), []);
  const ttMove = useCallback((e) => setTooltip(prev => prev.show ? { ...prev, x: e.clientX + 14, y: e.clientY - 10 } : prev), []);

  // Canvas refs
  const dailyRef = useRef(null);
  const donutRef = useRef(null);
  const dowRef = useRef(null);
  const pomoChartRef = useRef(null);
  const distRef = useRef(null);
  const hourRef = useRef(null);
  const cumulativeRef = useRef(null);
  const monthlyRef = useRef(null);
  const wdayRef = useRef(null);
  const wxDualRef = useRef(null);
  const wxDonutRef = useRef(null);
  const wxScatterRef = useRef(null);

  // Open handler
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest('.stat-btn')) { setRange('30'); setOpen(true); }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Load all stats
  useEffect(() => {
    if (!open) return;
    loadStats();
  }, [open, range]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [
        k, d, p, dw, hh, ps, di, ins, det,
        allD, allP, allE
      ] = await Promise.all([
        fetchKpi(range),
        fetchDaily(parseInt(range) || 30),
        fetchProjStats(),
        fetchDow(),
        fetchHourHeatmap(),
        fetchPomoStats(parseInt(range) || 30),
        fetchDistribution(),
        fetchInsights(range),
        fetchDetailed(range),
        fetchAllDaily(),
        fetchAllPomo(),
        import('../../api/entries').then(m => m.fetchEntries()),
      ]);
      setKpi(k || {});
      setDaily(d || []);
      setProjStats(p || []);
      setDowData(dw || []);
      setHourHeat(hh || []);
      setPomoStats(ps || []);
      setDist(di?.buckets || di || []);
      setInsights(ins || []);
      setDetailed(det || {});
      setHmDaily(allD || []);
      setHmPomo(allP || []);
      setStatsEntries(allE || []);
    } catch { addToast('Failed to load stats', 'err'); }
    setLoading(false);
    loadWeather();
  };

  const loadWeather = async () => {
    try {
      const wx = await fetchWeatherStats();
      setWeatherStats(wx);
      if (wx && wx.paired && wx.paired.length > 0) setShowWeather(true);
    } catch { /* ignore */ }
  };

  // Animate KPI values on load
  useEffect(() => {
    if (!kpi || !open) return;
    const targets = {
      total: Math.round((kpi.totalTime || 0) / 3600000 * 10) / 10,
      entries: kpi.totalSessions || 0,
      streak: kpi.currentStreak || 0,
      pomos: kpi.totalPomos || 0,
      projects: kpi.totalProjects || 0,
      days: kpi.trackedDays || 0,
    };
    const duration = 600;
    const start = performance.now();
    const initial = { total: 0, entries: 0, streak: 0, pomos: 0, projects: 0, days: 0 };
    const raf = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      const ease = 1 - (1 - t) * (1 - t);
      const current = {};
      for (const k of Object.keys(targets)) {
        current[k] = Math.round(initial[k] + (targets[k] - initial[k]) * ease);
      }
      setAnimKpi(current);
      if (t < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [kpi, open]);

  // Canvas draws
  useEffect(() => {
    if (!open || !daily.length || !dailyRef.current) return;
    const ctx = dailyRef.current.getContext('2d');
    if (!ctx) return;
    const W = dailyRef.current.width = dailyRef.current.clientWidth || 320;
    const H = dailyRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    const vals = daily.map(d => d.ms || 0);
    const maxV = Math.max(...vals, 1);
    const barW = Math.max(3, Math.floor(W / daily.length) - 2);
    const top = 8, bot = 18, cH = H - top - bot;
    drawGridLines(ctx, W, H, top, bot, cH, maxV);
    const gap = barW + 2;
    daily.forEach((d, i) => drawBar(ctx, i * gap, 0, barW, d.ms || 0, '#458588', maxV));
    // 7-day moving average line
    if (daily.length >= 7) {
      const ma = movingAvg(vals, 7);
      const pts = ma.map((v, i) => ({ x: i * gap + barW / 2, y: top + cH - (v / maxV) * cH }));
      drawLine(ctx, pts, '#d79921', 1.5);
      ctx.fillStyle = '#d79921';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('7-day avg', W - 46, 10);
    }
    chartDataRef.current.daily = { data: daily, barW, gap: barW + 2, vals, maxV };
  }, [open, daily]);

  useEffect(() => {
    if (!open || !projStats.length || !donutRef.current) return;
    const ctx = donutRef.current.getContext('2d');
    if (!ctx) return;
    const S = donutRef.current.width = Math.min(donutRef.current.clientWidth || 170, 200);
    donutRef.current.height = S;
    ctx.clearRect(0, 0, S, S);
    const segs = projStats.map((p, i) => ({ value: p.ms || 0, color: CHART_COLORS[i % CHART_COLORS.length], label: p.name }));
    drawDonutChart(ctx, S / 2, S / 2, S * 0.35, segs);
    chartDataRef.current.donut = { segs, S, cx: S / 2, cy: S / 2, r: S * 0.35 };
  }, [open, projStats]);

  useEffect(() => {
    if (!open || !dowData.length || !dowRef.current) return;
    const ctx = dowRef.current.getContext('2d');
    if (!ctx) return;
    const W = dowRef.current.width = dowRef.current.clientWidth || 320;
    const H = dowRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    const maxV = Math.max(...dowData, 1);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const barW = Math.floor((W - 10) / 7) - 2;
    const top = 8, bot = 18, cH = H - top - bot;
    ctx.strokeStyle = '#3c3836';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) { const y = top + cH * (1 - i / 3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    dowData.forEach((v, i) => {
      drawBar(ctx, 5 + i * (barW + 2), 0, barW, v || 0, '#b16286', maxV);
      ctx.fillStyle = '#a89984';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i] || '', 5 + i * (barW + 2) + barW / 2, H - 2);
    }    );
    chartDataRef.current.dow = { data: dowData, barW, gap: barW + 2, maxV, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
  }, [open, dowData]);

  useEffect(() => {
    if (!open || !pomoStats.length || !pomoChartRef.current) return;
    const ctx = pomoChartRef.current.getContext('2d');
    if (!ctx) return;
    const W = pomoChartRef.current.width = pomoChartRef.current.clientWidth || 320;
    const H = pomoChartRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    const maxV = Math.max(...pomoStats.map(p => p.count || 0), 1);
    const barW = Math.max(3, Math.floor(W / pomoStats.length) - 2);
    const top = 8, bot = 18, cH = H - top - bot;
    ctx.strokeStyle = '#3c3836';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) { const y = top + cH * (1 - i / 3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    pomoStats.forEach((p, i) => {
      drawBar(ctx, i * (barW + 2), 0, barW, p.count || 0, '#689d6a', maxV);
    });
    chartDataRef.current.pomo = { data: pomoStats, barW, gap: barW + 2, maxV };
  }, [open, pomoStats]);

  useEffect(() => {
    if (!open || !dist.length || !distRef.current) return;
    const ctx = distRef.current.getContext('2d');
    if (!ctx) return;
    const W = distRef.current.width = distRef.current.clientWidth || 320;
    const H = distRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    const items = dist.slice(0, 12);
    const maxV = Math.max(...items.map(d => d.count || 0), 1);
    const barW = Math.max(3, Math.floor(W / Math.max(items.length, 1)) - 2);
    const top = 8, bot = 24, cH = H - top - bot;
    ctx.strokeStyle = '#3c3836';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) { const y = top + cH * (1 - i / 3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    items.forEach((d, i) => {
      drawBar(ctx, i * (barW + 2), 0, barW, d.count || 0, '#d79921', maxV);
      ctx.fillStyle = '#665c54';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.label || '', i * (barW + 2) + barW / 2, H - 2);
    });
    chartDataRef.current.dist = { data: items, barW, gap: barW + 2, maxV };
  }, [open, dist]);

  useEffect(() => {
    if (!open || !hourHeat.length || !hourRef.current) return;
    const ctx = hourRef.current.getContext('2d');
    if (!ctx) return;
    const W = hourRef.current.width = hourRef.current.clientWidth || 320;
    const cols = 24, rows = 7;
    const cellW = Math.floor((W - 30) / cols);
    const cellH = 16;
    hourRef.current.height = rows * cellH + 14;
    ctx.clearRect(0, 0, W, hourRef.current.height);
    const maxV = Math.max(...hourHeat, 1);
    const norm = hourHeat.map(v => v / maxV);
    drawHeatmapCanvas(ctx, norm, cols, rows, cellW, cellH, ['#1d2021', '#3c3836', '#504945', '#665c54', '#7c6f64', '#928374', '#a89984', '#bdae93', '#d5c4a1', '#ebdbb2']);
    // Day labels (left)
    ctx.fillStyle = '#a89984';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach((lbl, i) => {
      if (lbl) ctx.fillText(lbl, W - cols * cellW - 2, i * cellH + cellH / 2 + 3);
    });
    // Hour labels (bottom)
    ctx.fillStyle = '#665c54';
    ctx.textAlign = 'center';
    for (let h = 0; h < 24; h += 3) {
      ctx.fillText(String(h).padStart(2, '0'), W - cols * cellW + h * cellW + cellW / 2, rows * cellH + 10);
    }
    chartDataRef.current.heatmap = { data: hourHeat, cols, rows, cellW, cellH, W };
  }, [open, hourHeat]);

  // Cumulative Time chart
  useEffect(() => {
    if (!open || !daily.length || !cumulativeRef.current) return;
    const ctx = cumulativeRef.current.getContext('2d');
    if (!ctx) return;
    const W = cumulativeRef.current.width = cumulativeRef.current.clientWidth || 320;
    const H = cumulativeRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    let running = 0;
    const cum = daily.map(d => { running += (d.ms || 0); return running; });
    const maxV = Math.max(...cum, 1);
    const top = 8, bot = 18, cH = H - top - bot;
    drawGridLines(ctx, W, H, top, bot, cH, maxV);
    const gap = Math.max(1, (W - 4) / Math.max(cum.length - 1, 1));
    const pts = cum.map((v, i) => ({ x: 2 + i * gap, y: top + cH - (v / maxV) * cH }));
    // Fill area under line
    if (pts.length > 0) {
      ctx.fillStyle = 'rgba(69,133,136,.15)';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, top + cH);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, top + cH);
      ctx.closePath();
      ctx.fill();
    }
    drawLine(ctx, pts, '#458588', 2);
    // Label end value
    ctx.fillStyle = '#458588';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(fmtHuman(Math.round(maxV / 1000)), W - 2, 10);
    chartDataRef.current.cumulative = { cum, gap, maxV, daily };
  }, [open, daily]);

  // Monthly Overview chart
  useEffect(() => {
    if (!open || !daily.length || !monthlyRef.current) return;
    const ctx = monthlyRef.current.getContext('2d');
    if (!ctx) return;
    const W = monthlyRef.current.width = monthlyRef.current.clientWidth || 320;
    const H = monthlyRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    const monthMap = {};
    daily.forEach(d => {
      const m = d.date ? d.date.slice(0, 7) : 'unknown';
      monthMap[m] = (monthMap[m] || 0) + (d.ms || 0);
    });
    const entries = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b));
    const vals = entries.map(([, v]) => v);
    const maxV = Math.max(...vals, 1);
    const top = 8, bot = 18, cH = H - top - bot;
    drawGridLines(ctx, W, H, top, bot, cH, maxV);
    const barW = Math.max(8, Math.floor((W - 2) / Math.max(entries.length, 1)) - 4);
    const gap = barW + 4;
    entries.forEach(([, v], i) => {
      const x = 2 + i * gap;
      drawBar(ctx, x, 0, barW, v, '#689d6a', maxV);
      const lbl = entries[i][0].slice(5);
      ctx.fillStyle = '#665c54';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x + barW / 2, H - 2);
    });
    chartDataRef.current.monthly = { entries, barW, gap: barW + 4, maxV };
  }, [open, daily]);

  // Weekday vs Weekend chart
  useEffect(() => {
    if (!open || !entries.length || !wdayRef.current) return;
    const ctx = wdayRef.current.getContext('2d');
    if (!ctx) return;
    const W = wdayRef.current.width = wdayRef.current.clientWidth || 320;
    const H = wdayRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    let wdMs = 0, wdCount = 0, weMs = 0, weCount = 0;
    entries.forEach(e => {
      if (!e.startTime || !e.durationMs) return;
      const d = new Date(e.startTime);
      const day = d.getDay();
      if (day > 0 && day < 6) { wdMs += e.durationMs; wdCount++; }
      else { weMs += e.durationMs; weCount++; }
    });
    const wdAvg = wdCount > 0 ? wdMs / wdCount : 0;
    const weAvg = weCount > 0 ? weMs / weCount : 0;
    const maxV = Math.max(wdAvg, weAvg, 1);
    const top = 8, bot = 22, cH = H - top - bot;
    const barW = 40;
    const gap = 60;
    const labels = ['Weekday', 'Weekend'];
    const colors = ['#458588', '#b16286'];
    const values = [wdAvg, weAvg];
    drawGridLines(ctx, W, H, top, bot, cH, maxV);
    values.forEach((v, i) => {
      const cx = (W - barW) / 2 + (i - 0.5) * gap;
      drawBar(ctx, cx, 0, barW, v, colors[i], maxV);
      ctx.fillStyle = '#a89984';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], cx + barW / 2, H - 2);
      ctx.fillText(fmtHuman(Math.round(v / 1000)), cx + barW / 2, top + cH * (1 - v / maxV) - 4);
    });
    // info
    ctx.fillStyle = '#665c54';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${wdCount} sessions`, (W - barW) / 2 - gap / 2, H - 2);
    ctx.fillText(`${weCount} sessions`, (W - barW) / 2 + gap / 2, H - 2);
    chartDataRef.current.wday = { wdAvg, weAvg, wdCount, weCount, maxV, barW, gap: 60 };
  }, [open, entries]);

  // Weather charts
  useEffect(() => {
    if (!open || !showWeather || !weatherStats || !wxDualRef.current) return;
    const wxDaily = weatherStats.paired || [];
    const ctx = wxDualRef.current.getContext('2d');
    if (!ctx) return;
    const W = wxDualRef.current.width = wxDualRef.current.clientWidth || 320;
    const H = wxDualRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    const maxV = Math.max(...wxDaily.map(d => Math.max(d.hours || 0, d.temp || 0)), 1);
    const barW = Math.max(3, Math.floor(W / Math.max(wxDaily.length, 1)) - 2);
    wxDaily.forEach((d, i) => {
      drawBar(ctx, i * (barW + 2), 0, barW, (d.hours || 0) * 3600000, '#458588', maxV * 3600000);
    });
    chartDataRef.current.wxDual = { data: wxDaily, barW, gap: barW + 2, maxV };
  }, [open, showWeather, weatherStats]);

  useEffect(() => {
    if (!open || !showWeather || !weatherStats || !wxDonutRef.current) return;
    const wxCat = {};
    (weatherStats.paired || []).forEach(d => {
      const code = Math.round(d.code || 0);
      const info = WMO_INFO(code);
      const cat = info.l;
      if (!wxCat[cat]) wxCat[cat] = 0;
      wxCat[cat] += d.hours || 0;
    });
    const ctx = wxDonutRef.current.getContext('2d');
    if (!ctx) return;
    const S = wxDonutRef.current.width = Math.min(wxDonutRef.current.clientWidth || 170, 200);
    wxDonutRef.current.height = S;
    ctx.clearRect(0, 0, S, S);
    const segs = Object.entries(wxCat).map(([k, v], i) => ({ value: v, color: CHART_COLORS[i % CHART_COLORS.length], label: k }));
    drawDonutChart(ctx, S / 2, S / 2, S * 0.35, segs);
    chartDataRef.current.wxDonut = { segs, S, cx: S / 2, cy: S / 2, r: S * 0.35 };
  }, [open, showWeather, weatherStats]);

  useEffect(() => {
    if (!open || !showWeather || !weatherStats || !wxScatterRef.current) return;
    const scatter = weatherStats.paired || [];
    const ctx = wxScatterRef.current.getContext('2d');
    if (!ctx) return;
    const W = wxScatterRef.current.width = wxScatterRef.current.clientWidth || 320;
    const H = wxScatterRef.current.height = 160;
    ctx.clearRect(0, 0, W, H);
    const maxX = Math.max(...scatter.map(s => s.temp || 0), 1);
    const maxY = Math.max(...scatter.map(s => s.hours || 0), 1);
    ctx.strokeStyle = '#3c3836';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) { const y = H - (H / 4) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    scatter.forEach(s => {
      const x = ((s.temp || 0) / maxX) * (W - 20) + 10;
      const y = H - ((s.hours || 0) / maxY) * (H - 20) - 10;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#458588';
      ctx.fill();
    });
    // R label
    const r = weatherStats.r?.temp || 0;
    ctx.fillStyle = '#a89984';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`r = ${r.toFixed(2)}`, W - 4, 12);
    ctx.fillText('Temp →', 0, H - 4);
    chartDataRef.current.scatter = { data: scatter, maxX, maxY, W, H };
  }, [open, showWeather, weatherStats]);

  /* ── Canvas hover handlers ─────────────────────────────── */
  const scaleX = (c) => c.width / c.clientWidth;
  const scaleY = (c) => c.height / c.clientHeight;

  const handleDailyHover = (e) => {
    const cd = chartDataRef.current.daily;
    if (!cd || !cd.data.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const i = Math.min(Math.max(Math.floor(x / cd.gap), 0), cd.data.length - 1);
    const d = cd.data[i];
    const hrs = (d.ms / 3600000).toFixed(1);
    let html = `<div class="hm-tooltip-date">${d.date}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Time</span><span class="hm-tooltip-val">${hrs}h</span></div>`;
    if (cd.data.length >= 7) {
      const ma = movingAvg(cd.vals, 7);
      html += `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">7-day avg</span><span class="hm-tooltip-val">${(ma[i] / 3600000).toFixed(1)}h</span></div>`;
    }
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleMonthlyHover = (e) => {
    const cd = chartDataRef.current.monthly;
    if (!cd || !cd.entries.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const i = Math.min(Math.max(Math.floor((x - 2) / cd.gap), 0), cd.entries.length - 1);
    const [label, val] = cd.entries[i];
    const html = `<div class="hm-tooltip-date">${label}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Time</span><span class="hm-tooltip-val">${fmtHuman(Math.round(val / 1000))}</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleWdayHover = (e) => {
    const cd = chartDataRef.current.wday;
    if (!cd) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const cx0 = (e.target.width - cd.barW) / 2 - cd.gap / 2;
    const cx1 = (e.target.width - cd.barW) / 2 + cd.gap / 2;
    let html = '';
    if (x >= cx0 && x < cx0 + cd.barW) {
      html = `<div class="hm-tooltip-date">Weekday</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Avg</span><span class="hm-tooltip-val">${fmtHuman(Math.round(cd.wdAvg / 1000))}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Sessions</span><span class="hm-tooltip-val">${cd.wdCount}</span></div>`;
    } else if (x >= cx1 && x < cx1 + cd.barW) {
      html = `<div class="hm-tooltip-date">Weekend</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Avg</span><span class="hm-tooltip-val">${fmtHuman(Math.round(cd.weAvg / 1000))}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Sessions</span><span class="hm-tooltip-val">${cd.weCount}</span></div>`;
    } else return;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleCumulativeHover = (e) => {
    const cd = chartDataRef.current.cumulative;
    if (!cd || !cd.cum.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const i = Math.min(Math.max(Math.round((x - 2) / cd.gap), 0), cd.cum.length - 1);
    const date = cd.daily[i]?.date || '';
    const html = `<div class="hm-tooltip-date">${date}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Cumulative</span><span class="hm-tooltip-val">${fmtHuman(Math.round(cd.cum[i] / 1000))}</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleDonutHover = (e, type) => {
    const cd = chartDataRef.current[type];
    if (!cd || !cd.segs.length) return;
    const rect = e.target.getBoundingClientRect();
    const sx = e.target.width / rect.width;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sx;
    const dx = mx - cd.cx, dy = my - cd.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < cd.r * 0.55 || dist > cd.r) return;
    const total = cd.segs.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return;
    let cursorAngle = Math.atan2(dy, dx) + Math.PI / 2;
    if (cursorAngle < 0) cursorAngle += 2 * Math.PI;
    let curEnd = 0;
    for (let i = 0; i < cd.segs.length; i++) {
      curEnd += (cd.segs[i].value / total) * 2 * Math.PI;
      if (cursorAngle < curEnd + 0.001) {
        const seg = cd.segs[i];
        const pct = ((seg.value / total) * 100).toFixed(1);
        const html = `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">${seg.label}</span><span class="hm-tooltip-val">${fmtHuman(Math.round(seg.value / 1000))}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Share</span><span class="hm-tooltip-val">${pct}%</span></div>`;
        setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
        return;
      }
    }
  };

  const handleDowHover = (e) => {
    const cd = chartDataRef.current.dow;
    if (!cd || !cd.data.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const i = Math.min(Math.max(Math.floor((x - 5) / cd.gap), 0), cd.data.length - 1);
    const html = `<div class="hm-tooltip-date">${cd.labels[i]}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Avg Time</span><span class="hm-tooltip-val">${fmtHuman(Math.round(cd.data[i] / 1000))}</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handlePomoHover = (e) => {
    const cd = chartDataRef.current.pomo;
    if (!cd || !cd.data.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const i = Math.min(Math.max(Math.floor(x / cd.gap), 0), cd.data.length - 1);
    const p = cd.data[i];
    const html = `<div class="hm-tooltip-date">${p.date || ''}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Sessions</span><span class="hm-tooltip-val">${p.count || 0}</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleDistHover = (e) => {
    const cd = chartDataRef.current.dist;
    if (!cd || !cd.data.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const i = Math.min(Math.max(Math.floor(x / cd.gap), 0), cd.data.length - 1);
    const d = cd.data[i];
    const html = `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">${d.label || ''}</span><span class="hm-tooltip-val">${d.count || 0}</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleHeatmapHover = (e) => {
    const cd = chartDataRef.current.heatmap;
    if (!cd || !cd.data.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const y = e.nativeEvent.offsetY * scaleY(e.target);
    const xOff = cd.W - cd.cols * cd.cellW;
    const col = Math.floor((x - xOff) / cd.cellW);
    const row = Math.floor(y / cd.cellH);
    if (col < 0 || col >= cd.cols || row < 0 || row >= cd.rows) return;
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const val = cd.data[row * cd.cols + col] || 0;
    const html = `<div class="hm-tooltip-date">${dayLabels[row]}, ${String(col).padStart(2, '0')}:00</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Hours</span><span class="hm-tooltip-val">${val.toFixed(2)}h</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleWxDualHover = (e) => {
    const cd = chartDataRef.current.wxDual;
    if (!cd || !cd.data.length) return;
    const x = e.nativeEvent.offsetX * scaleX(e.target);
    const i = Math.min(Math.max(Math.floor(x / cd.gap), 0), cd.data.length - 1);
    const d = cd.data[i];
    let html = `<div class="hm-tooltip-date">${d.date || ''}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Hours</span><span class="hm-tooltip-val">${(d.hours || 0).toFixed(1)}h</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Temp</span><span class="hm-tooltip-val">${d.temp != null ? d.temp + '°C' : '--'}</span></div>`;
    if (d.humidity != null) html += `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Humidity</span><span class="hm-tooltip-val">${d.humidity}%</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  const handleWxScatterHover = (e) => {
    const cd = chartDataRef.current.scatter;
    if (!cd || !cd.data.length) return;
    const rect = e.target.getBoundingClientRect();
    const sx = e.target.width / rect.width;
    const sy = e.target.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    let best = -1, bestD = Infinity;
    cd.data.forEach((d, i) => {
      const px = ((d.temp || 0) / cd.maxX) * (cd.W - 20) + 10;
      const py = cd.H - ((d.hours || 0) / cd.maxY) * (cd.H - 20) - 10;
      const dist = Math.hypot(mx - px, my - py);
      if (dist < bestD) { bestD = dist; best = i; }
    });
    if (best < 0 || bestD > 20) return;
    const d = cd.data[best];
    const html = `<div class="hm-tooltip-date">${d.date || ''}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Temp</span><span class="hm-tooltip-val">${d.temp != null ? d.temp + '°C' : '--'}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Hours</span><span class="hm-tooltip-val">${(d.hours || 0).toFixed(1)}h</span></div>`;
    setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
  };

  /* ── Handlers ──────────────────────────────────────────── */
  const handlePdf = () => {
    if (!daily.length) { addToast('Load some stats first', 'err'); return; }
    generatePDFSummary({
      entries,
      projects,
      goals,
      daily,
      projStats,
      dow: dowData,
      hourHeat,
      dist,
      kpi,
      insights,
      detailed,
    });
    addToast('PDF report opened in new tab');
  };

  const [weatherBusy, setWeatherBusy] = useState(false);

  const handleEnableWeather = () => {
    if (!navigator.geolocation) { addToast('Geolocation not available', 'err'); return; }
    setWeatherBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { fetchForecast, saveWeather } = await import('../../api/weather');
          const forecast = await fetchForecast(pos.coords.latitude, pos.coords.longitude);
          if (forecast?.current) {
            const cur = forecast.current;
            await saveWeather({
              date: new Date().toISOString().slice(0, 10),
              temp: cur.temperature_2m,
              humidity: cur.relative_humidity_2m,
              precip: cur.precipitation || 0,
              wind: cur.wind_speed_10m || 0,
              code: cur.weather_code,
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
          }
          loadWeather();
          addToast('Weather data enabled!');
        } catch { addToast('Failed to fetch weather', 'err'); }
        setWeatherBusy(false);
      },
      () => { addToast('Location access denied or timed out', 'err'); setWeatherBusy(false); },
      { timeout: 20000, enableHighAccuracy: false }
    );
  };

  /* ── Heatmap grid render ───────────────────────────────── */
  const renderHeatmapGrid = () => {
    const dayMap = {};
    const hmPomoMap = {};

    // Merge daily + pomo data into dayMap
    hmDaily.forEach(d => {
      const key = d.date || d.label;
      if (key) {
        if (!dayMap[key]) dayMap[key] = { ms: 0, pomos: 0 };
        dayMap[key].ms = d.ms || 0;
      }
    });
    hmPomo.forEach(d => {
      const key = d.date;
      if (key) {
        if (!dayMap[key]) dayMap[key] = { ms: 0, pomos: 0 };
        dayMap[key].pomos = d.count || 0;
      }
    });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);

    // Date range: last 52 weeks aligned to Sunday
    const end = new Date(today); end.setDate(end.getDate() - end.getDay() + 6);
    const start = new Date(end); start.setDate(end.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    let maxMs = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (dayMap[k]) maxMs = Math.max(maxMs, dayMap[k].ms);
    }

    // Build weeks
    const weeks = [];
    let week = [];
    const cur = new Date(start);
    for (let i = 0; i < cur.getDay(); i++) week.push(null);
    for (; cur <= end; cur.setDate(cur.getDate() + 1)) {
      week.push(new Date(cur));
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

    // Month labels
    let lastMonth = -1;
    const monthLabels = weeks.map(wk => {
      const firstReal = wk.find(d => d);
      const m = firstReal ? firstReal.getMonth() : -1;
      const lbl = (m !== lastMonth && firstReal) ? HM_MONTHS[m] : '';
      if (m !== lastMonth && firstReal) lastMonth = m;
      return lbl;
    });

    // Streaks
    const streaks = hmStreaks(dayMap);
    const hourMs = new Array(24).fill(0);
    entries.forEach(e => {
      if (!e.startTime || !e.durationMs) return;
      const h = new Date(e.startTime).getHours();
      hourMs[h] += e.durationMs;
    });
    const bestHourIdx = hourMs.indexOf(Math.max(...hourMs));
    const bestHourStr = bestHourIdx >= 0 ? (bestHourIdx % 12 || 12) + (bestHourIdx >= 12 ? 'PM' : 'AM') : '--';
    let rangePomos = 0, rangeMs = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (dayMap[k]) { rangePomos += dayMap[k].pomos || 0; rangeMs += dayMap[k].ms || 0; }
    }

    // Trend (last 7 days)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      last7.push({ label: HM_DAYS[d.getDay()].slice(0, 3), ms: dayMap[k]?.ms || 0, isToday: i === 0 });
    }
    const maxDay = Math.max(...last7.map(d => d.ms), 1);

    // Burnout
    const gaps = hmBurnoutGaps(dayMap);

    /* ── Tooltip handlers ───────────────────────────────── */
    const showTooltip = (e, key, data) => {
      const d = new Date(key + 'T00:00:00');
      const hrs = data ? (data.ms / 3600000).toFixed(1) : '0.0';
      const pomos = data ? data.pomos : 0;
      const html = `<div class="hm-tooltip-date">${HM_DAYS[d.getDay()]}, ${HM_MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}</div>
        <div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Tracked</span><span class="hm-tooltip-val">${hrs}h</span></div>
        <div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Pomodoros</span><span class="hm-tooltip-val">${pomos}</span></div>`;
      setTooltip({ show: true, x: e.clientX + 14, y: e.clientY - 10, html });
    };

    const moveTooltip = (e) => {
      setTooltip(prev => ({ ...prev, x: e.clientX + 14, y: e.clientY - 10 }));
    };

    const hideTooltip = () => setTooltip({ show: false, x: 0, y: 0, html: '' });

    return (
      <div className="hm-section" style={{ overflowX: 'auto' }}>
        {/* Month labels */}
        <div className="hm-months">
          {weeks.map((wk, i) => (
            <div key={i} className="hm-month-lbl" style={{ width: '14px' }}>{monthLabels[i]}</div>
          ))}
        </div>
        <div className="hm-body">
          {/* Day labels */}
          <div className="hm-day-labels">
            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((lbl, i) => (
              <div key={i} className="hm-day-lbl">{lbl}</div>
            ))}
          </div>
          {/* Grid */}
          <div className="hm-weeks">
            {weeks.map((wk, wi) => (
              <div key={wi} className="hm-week">
                {wk.map((day, di) => {
                  if (!day) return <div key={di} className="hm-cell empty"></div>;
                  const k = day.toISOString().slice(0, 10);
                  const isFuture = day > today;
                  const data = dayMap[k];
                  const lvl = isFuture ? 'future' : hmLevel(data ? data.ms : 0, maxMs / 3600000);
                  const cls = `hm-cell${isFuture ? ' future' : ' l' + lvl}${k === todayKey ? ' today-cell' : ''}${!isFuture && !dayMap[k] ? ' l0' : ''}`;
                  return (
                    <div key={di} className={cls}
                      onMouseEnter={(e) => !isFuture && showTooltip(e, k, data)}
                      onMouseMove={(e) => !isFuture && moveTooltip(e)}
                      onMouseLeave={() => hideTooltip()}></div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="hm-legend">
          <span>Less</span>
          <div className="hm-legend-cells">
            {['l0', 'l1', 'l2', 'l3', 'l4'].map(cls => (
              <div key={cls} className={`hm-cell ${cls}`} style={{ cursor: 'default' }}></div>
            ))}
          </div>
          <span>More</span>
        </div>
        {/* Stats */}
        <div className="hm-stats-row">
          <div className="hm-stat-card streak"><div className="hm-stat-val">{streaks.current}</div><div className="hm-stat-lbl">Current Streak</div><div className="hm-stat-sub">days</div></div>
          <div className="hm-stat-card best"><div className="hm-stat-val">{streaks.longest}</div><div className="hm-stat-lbl">Best Streak</div><div className="hm-stat-sub">all time</div></div>
          <div className="hm-stat-card active"><div className="hm-stat-val">{streaks.totalActiveDays}</div><div className="hm-stat-lbl">Active Days</div><div className="hm-stat-sub">this year</div></div>
          <div className="hm-stat-card pomo"><div className="hm-stat-val">{rangePomos}</div><div className="hm-stat-lbl">Pomodoros</div><div className="hm-stat-sub">{(rangeMs / 3600000).toFixed(1)}h tracked</div></div>
          <div className="hm-stat-card hour"><div className="hm-stat-val">{bestHourStr}</div><div className="hm-stat-lbl">Best Hour</div><div className="hm-stat-sub">peak focus</div></div>
        </div>
        {/* Trend bars */}
        <div className="hm-trend">
          <div className="hm-trend-title">LAST 7 DAYS</div>
          {last7.map(d => {
            const hrs = d.ms > 0 ? (d.ms / 3600000).toFixed(1) + 'h' : '—';
            const pctW = Math.round((d.ms / maxDay) * 100);
            return (
              <div key={d.label} className={`hm-bar-row${d.isToday ? ' hm-bar-today' : ''}`}>
                <div className="hm-bar-lbl">{d.label}</div>
                <div className="hm-bar-track"><div className="hm-bar-fill" style={{ width: pctW + '%' }}></div></div>
                <div className="hm-bar-val">{hrs}</div>
              </div>
            );
          })}
        </div>
        {/* Burnout */}
        <div className="hm-burnout">
          <div className="hm-burnout-title">BURNOUT GAPS (last 90 days)</div>
          {gaps.length > 0 ? gaps.map((g, i) => {
            const endD = new Date(g.start); endD.setDate(g.start.getDate() + g.len - 1);
            return <span key={i} className="hm-gap-chip"><i className="fas fa-triangle-exclamation"></i> {g.len}-day gap · {HM_MONTHS[g.start.getMonth()]} {g.start.getDate()}–{endD.getDate()}</span>;
          }) : <span className="hm-no-gaps">✓ No burnout gaps in last 90 days</span>}
        </div>
      </div>
    );
  };

  /* ── Icons for KPI cards ──────────────────────────────── */
  const kpiIcon = (i) => ['fa-clock', 'fa-list-check', 'fa-calendar-check', 'fa-fire', 'fa-folder', 'fa-chart-simple'][i] || 'fa-circle';

  const ranges = [
    { key: '7', label: '7D' },
    { key: '14', label: '14D' },
    { key: '30', label: '30D' },
    { key: '90', label: '90D' },
    { key: 'all', label: 'ALL' },
  ];

  const toggleWeather = () => setShowWeather(prev => !prev);

  /* ═══════════════════════════════════════════════════════ *
   * RENDER                                                  *
   * ═══════════════════════════════════════════════════════ */
  if (!open) return <div className="overlay" style={{ display: 'none' }}></div>;

  return (
    <div className={`overlay stats-overlay${open ? ' open' : ''}`} data-no-overlay-close>
      <div className="modal stats-modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle"><i className="fas fa-chart-line"></i> STATISTICS</div>
          <button className="mcls" onClick={() => setOpen(false)}><i className="fas fa-times"></i></button>
        </div>

        <div className="modal-body stats-body">
          {/* ── Range tabs ──────────────────────────────── */}
          <div className="stats-ranges">
            {ranges.map(r => (
              <button key={r.key} className={`stats-range-tab${range === r.key ? ' on' : ''}`} onClick={() => setRange(r.key)}>{r.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="stats-skel">
              <div className="stats-skel-row">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="stats-skel-card"><div className="stats-skel-line"></div><div className="stats-skel-line"></div></div>)}
              </div>
              <div className="stats-skel-block"></div>
            </div>
          ) : (
            <>
              {/* ── KPI row ───────────────────────────────── */}
              <div className="stats-kpi-row">
                {[
                  { val: animKpi.total + 'h', lbl: 'Total Time', sub: kpi ? fmt(kpi.totalTime || 0) : '--' },
                  { val: animKpi.entries, lbl: 'Sessions', sub: kpi ? (kpi.totalSessions || 0) + ' total' : '' },
                  { val: animKpi.streak + 'd', lbl: 'Streak', sub: kpi ? 'best: ' + (kpi.bestStreak || 0) + 'd' : '' },
                  { val: animKpi.pomos, lbl: 'Pomodoros', sub: kpi ? (kpi.totalPomos || 0) + ' sessions' : '' },
                  { val: animKpi.projects, lbl: 'Projects', sub: projects ? projects.length + ' active' : '' },
                  { val: animKpi.days, lbl: 'Days Active', sub: kpi ? 'this period' : '' },
                ].map((item, i) => (
                  <div key={i} className="stats-kpi-card">
                    <div className="stats-kpi-top">
                      <div className="stats-kpi-val">{item.val}</div>
                      <div className="stats-kpi-icon"><i className={`fas ${kpiIcon(i)}`}></i></div>
                    </div>
                    <div className="stats-kpi-lbl">{item.lbl}</div>
                    <div className="stats-kpi-sub">{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* ── Charts section ──────────────────────────── */}
              <div className="stats-section">
                <div className="stats-section-title"><i className="fas fa-chart-bar"></i> Charts</div>
                <div className="stats-section-body">
                  <div className="stats-charts-grid">
                    <div className="stats-chart-card wide">
                      <div className="stats-chart-title">Daily Time <span className="stats-chart-sub">+ 7-day avg</span></div>
                      <canvas ref={dailyRef} className="stats-chart-canvas" height="160"
                        onMouseMove={handleDailyHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card">
                      <div className="stats-chart-title">Monthly Overview <span className="stats-chart-sub">total focus hours by month</span></div>
                      <canvas ref={monthlyRef} className="stats-chart-canvas" height="160"
                        onMouseMove={handleMonthlyHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card">
                      <div className="stats-chart-title">Weekday vs Weekend <span className="stats-chart-sub">avg daily session per day type</span></div>
                      <canvas ref={wdayRef} className="stats-chart-canvas" height="160"
                        onMouseMove={handleWdayHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card">
                      <div className="stats-chart-title">Cumulative Time <span className="stats-chart-sub">running cumulative total</span></div>
                      <canvas ref={cumulativeRef} className="stats-chart-canvas" height="160"
                        onMouseMove={handleCumulativeHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card">
                      <div className="stats-chart-title">Projects <span className="stats-chart-sub">focus time by project</span></div>
                      <canvas ref={donutRef} className="stats-chart-canvas" height="170"
                        onMouseMove={(e) => handleDonutHover(e, 'donut')}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card">
                      <div className="stats-chart-title">Day of Week <span className="stats-chart-sub">avg focus per day of week</span></div>
                      <canvas ref={dowRef} className="stats-chart-canvas" height="160"
                        onMouseMove={handleDowHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card">
                      <div className="stats-chart-title">Pomodoros <span className="stats-chart-sub">pomo sessions per day</span></div>
                      <canvas ref={pomoChartRef} className="stats-chart-canvas" height="160"
                        onMouseMove={handlePomoHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card">
                      <div className="stats-chart-title">Duration Distribution <span className="stats-chart-sub">spread of session lengths</span></div>
                      <canvas ref={distRef} className="stats-chart-canvas" height="160"
                        onMouseMove={handleDistHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                    <div className="stats-chart-card wide">
                      <div className="stats-chart-title">Hour Heatmap <span className="stats-chart-sub">hour × day-of-week matrix</span></div>
                      <canvas ref={hourRef} className="stats-chart-canvas" height="126"
                        onMouseMove={handleHeatmapHover}
                        onMouseLeave={hideTooltip}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Heatmap section ─────────────────────────── */}
              <div className="stats-section">
                <div className="stats-section-title"><i className="fas fa-fire"></i> Activity Heatmap</div>
                <div className="stats-section-body">
                  {renderHeatmapGrid()}
                </div>
              </div>

              {/* ── Summary section ─────────────────────────── */}
              <div className="stats-section">
                <div className="stats-section-title"><i className="fas fa-calculator"></i> Statistical Summary</div>
                <div className="stats-section-body">
                  {/* KPI summary grid */}
                  <div className="stats-summary-grid" style={{ marginBottom: 10 }}>
                    {[
                      { label: 'Total Entries', value: kpi?.totalSessions || 0 },
                      { label: 'Total Time', value: kpi ? fmt(kpi.totalTime || 0) : '--' },
                      { label: 'Daily Avg', value: kpi?.avgDaily ? fmtHuman(Math.round(kpi.avgDaily / 1000)) : '--' },
                      { label: 'Active Days', value: kpi?.trackedDays || 0 },
                      { label: 'Current Streak', value: (kpi?.currentStreak || 0) + ' days' },
                      { label: 'Longest Streak', value: (kpi?.bestStreak || 0) + ' days' },
                      { label: 'Pomo Sessions', value: kpi?.totalPomos || 0 },
                      { label: 'Projects', value: projects.length },
                    ].map((item, i) => (
                      <div key={i} className="stats-summary-item">
                        <div className="stats-summary-label">{item.label}</div>
                        <div className="stats-summary-value">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed stats */}
                  {detailed && (
                    <>
                      <div className="stats-summary-label" style={{ marginBottom: 6 }}>
                        Session statistics (mean, median, stddev in seconds)
                      </div>
                      <div className="stats-detail-grid">
                        {[
                          { label: 'Mean Session', value: detailed.meanSec ? fmtHuman(Math.round(detailed.meanSec)) : '--', cls: 'neutral' },
                          { label: 'Median Session', value: detailed.medianSec ? fmtHuman(Math.round(detailed.medianSec)) : '--', cls: 'neutral' },
                          { label: 'Std Deviation', value: detailed.stdSec ? fmtHuman(Math.round(detailed.stdSec)) : '--', cls: detailed.cv < 0.5 ? 'good' : detailed.cv < 1 ? 'warn' : 'bad' },
                          { label: 'Longest Session', value: detailed.maxSec ? fmtHuman(Math.round(detailed.maxSec)) : '--', cls: 'good' },
                          { label: 'Shortest Session', value: detailed.minSec ? fmtHuman(Math.round(detailed.minSec)) : '--', cls: 'bad' },
                          { label: 'Daily Mean', value: detailed.dailyMean ? fmtHuman(Math.round(detailed.dailyMean / 1000)) : '--', cls: 'neutral' },
                          { label: 'Day-to-Day σ', value: detailed.dailyStd ? fmtHuman(Math.round(detailed.dailyStd / 1000)) : '--', cls: detailed.cv < 0.5 ? 'good' : 'warn' },
                          { label: 'CV (consistency)', value: detailed.cv ? (detailed.cv * 100).toFixed(1) + '%' : '--', cls: detailed.cv < 0.5 ? 'good' : detailed.cv < 1 ? 'warn' : 'bad' },
                          { label: 'Trend Slope', value: detailed.trendSlope ? (detailed.trendSlope > 0 ? '+' : '') + fmtHuman(Math.abs(detailed.trendSlope * 3600)) + '/day' : '--', cls: detailed.trendSlope > 0 ? 'good' : detailed.trendSlope < 0 ? 'bad' : 'neutral' },
                          { label: 'Auto-correlation', value: detailed.autoCorr ? detailed.autoCorr.toFixed(2) : '--', cls: Math.abs(detailed.autoCorr) > 0.3 ? 'warn' : 'good' },
                          { label: 'Peak Hour', value: detailed.peakHour !== undefined ? String(detailed.peakHour).padStart(2, '0') + ':00' : '--', cls: 'neutral' },
                          { label: 'Entries', value: detailed.totalEntries || 0, cls: 'neutral' },
                        ].map((item, i) => (
                          <div key={i} className={`stats-detail-item ${item.cls}`}>
                            <div className="stats-detail-label">{item.label}</div>
                            <div className="stats-detail-value">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Insights section ────────────────────────── */}
              {insights.length > 0 && (
                <div className="stats-section">
                  <div className="stats-section-title"><i className="fas fa-lightbulb"></i> Insights</div>
                  <div className="stats-section-body">
                    <div className="stats-insights">
                      {insights.map((ins, i) => (
                        <div key={i} className="stats-insight">
                          <div className={`stats-insight-icon ${ins.icon || 'info'}`}>
                            <i className={`fas fa-${ins.icon || 'info-circle'}`}></i>
                          </div>
                          <div className="stats-insight-text">{ins.text}</div>
                        </div>
                      ))}
                      {/* Additional client-side insights */}
                      {detailed && (
                        <>
                          {detailed.cv < 0.5 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon consistency"><i className="fas fa-balance-scale"></i></div>
                              <div className="stats-insight-text">High consistency (CV = {(detailed.cv * 100).toFixed(1)}%) — your daily routine is very stable.</div>
                            </div>
                          )}
                          {detailed.cv >= 0.5 && detailed.cv < 1 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon consistency"><i className="fas fa-balance-scale"></i></div>
                              <div className="stats-insight-text">Moderate consistency — try a fixed daily schedule to reduce variance.</div>
                            </div>
                          )}
                          {detailed.cv >= 1 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon consistency"><i className="fas fa-exclamation-triangle"></i></div>
                              <div className="stats-insight-text">High variance in daily time — consider setting a minimum daily focus target.</div>
                            </div>
                          )}
                          {detailed.trendSlope > 0.1 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon trend-up"><i className="fas fa-arrow-up"></i></div>
                              <div className="stats-insight-text">Upward trend detected — your focus time is growing! Keep the momentum.</div>
                            </div>
                          )}
                          {detailed.trendSlope < -0.1 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon trend-down"><i className="fas fa-arrow-down"></i></div>
                              <div className="stats-insight-text">Downward trend — your focus time has been decreasing. Try a focus reset.</div>
                            </div>
                          )}
                          {Math.abs(detailed.autoCorr) > 0.3 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon info"><i className="fas fa-chart-line"></i></div>
                              <div className="stats-insight-text">Today's focus time correlates with yesterday's (r = {detailed.autoCorr.toFixed(2)}). Build momentum!</div>
                            </div>
                          )}
                          {kpi?.currentStreak > 0 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon streak"><i className="fas fa-fire"></i></div>
                              <div className="stats-insight-text">{kpi.currentStreak}-day streak! Keep showing up every day to build momentum.</div>
                            </div>
                          )}
                          {kpi?.currentStreak === 0 && kpi?.bestStreak > 0 && (
                            <div className="stats-insight">
                              <div className="stats-insight-icon streak"><i className="fas fa-undo"></i></div>
                              <div className="stats-insight-text">No current streak ({kpi.bestStreak}d best). Log at least one session today to restart.</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Project Ranking section ──────────────────── */}
              {projStats.length > 0 && (
                <div className="stats-section">
                  <div className="stats-section-title"><i className="fas fa-ranking-star"></i> Project Ranking</div>
                  <div className="stats-section-body">
                    <div className="pr-list">
                      {projStats.slice(0, 8).map((p, i) => {
                        const pct = Math.max((p.ms / Math.max(...projStats.map(x => x.ms), 1)) * 100, 3);
                        return (
                          <div key={i} className="pr-row"
                            onMouseEnter={(e) => tt(e, `<div class="hm-tooltip-date">#${i+1} ${p.name}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Time</span><span class="hm-tooltip-val">${fmtHuman(Math.round((p.ms||0)/1000))}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Sessions</span><span class="hm-tooltip-val">${p.count||0}</span></div>`)}
                            onMouseMove={ttMove}
                            onMouseLeave={hideTooltip}>
                            <div className="pr-rank">{i + 1}</div>
                            <div className="pr-bar-wrap">
                              <div className="pr-bar" style={{ width: pct + '%', background: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                            </div>
                            <div className="pr-name">{p.name}</div>
                            <div className="pr-time">{fmtHuman(Math.round((p.ms || 0) / 1000))}</div>
                            <div className="pr-count">{p.count || 0} sessions</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Goal Progress section ────────────────────── */}
              {goals && goals.length > 0 && (
                <div className="stats-section">
                  <div className="stats-section-title"><i className="fas fa-bullseye"></i> Goal Progress</div>
                  <div className="stats-section-body">
                    <div className="gp-grid">
                      {goals.map((g, i) => {
                        const pct = g.targetMs > 0 ? Math.min((g.currentMs / g.targetMs) * 100, 100) : 0;
                        const isComplete = pct >= 100;
                        const deadline = g.endDate ? new Date(g.endDate) : null;
                        const isOverdue = deadline && deadline < new Date();
                        return (
                          <div key={g._id || i} className={`gp-card${isComplete ? ' gp-done' : ''}${isOverdue ? ' gp-overdue' : ''}`}
                            onMouseEnter={(e) => {
                              let h = `<div class="hm-tooltip-date">${g.name}</div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Progress</span><span class="hm-tooltip-val">${Math.round(pct)}%</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Status</span><span class="hm-tooltip-val">${fmt(g.currentMs||0)} / ${fmt(g.targetMs||0)}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Frequency</span><span class="hm-tooltip-val">${g.frequency||'day'}</span></div>`;
                              if (deadline) h += `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Deadline</span><span class="hm-tooltip-val">${deadline.toLocaleDateString()}${isOverdue ? ' ⚠ OVERDUE' : ''}</span></div>`;
                              tt(e, h);
                            }}
                            onMouseMove={ttMove}
                            onMouseLeave={hideTooltip}>
                            <div className="gp-head">
                              <div className="gp-name">{g.name}</div>
                              <div className="gp-pct">{Math.round(pct)}%</div>
                            </div>
                            <div className="gp-track">
                              <div className="gp-bar" style={{ width: Math.round(pct) + '%' }}></div>
                            </div>
                            <div className="gp-meta">
                              <span>{fmt(g.currentMs || 0)} / {fmt(g.targetMs || 0)}</span>
                              <span className="gp-freq">{g.frequency || 'day'}</span>
                            </div>
                            {deadline && (
                              <div className="gp-deadline">
                                <i className="fas fa-calendar"></i> {deadline.toLocaleDateString()}
                                {isOverdue && <span className="gp-overdue-tag">OVERDUE</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Pomodoro Analytics section ─────────────── */}
              {pomoSessions && pomoSessions.length > 0 && (
                <div className="stats-section">
                  <div className="stats-section-title"><i className="fas fa-clock"></i> Pomodoro Analytics</div>
                  <div className="stats-section-body">
                    <div className="pa-grid">
                      {(() => {
                        const total = pomoSessions.length;
                        const skipped = pomoSessions.filter(s => s.skipped).length;
                        const completed = total - skipped;
                        const byMode = {};
                        pomoSessions.filter(s => !s.skipped).forEach(s => {
                          byMode[s.mode] = (byMode[s.mode] || 0) + 1;
                        });
                        const totalDur = pomoSessions.reduce((s, p) => s + (p.duration || 0), 0);
                        const avgDur = completed > 0 ? Math.round(totalDur / completed) : 0;
                        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                        const uniqueDays = new Set(pomoSessions.map(s => s.completedAt ? new Date(s.completedAt).toISOString().slice(0, 10) : '')).size;
                        const dailyAvg = uniqueDays > 0 ? (total / uniqueDays).toFixed(1) : '0';
                        return (
                          <>
                            <div className="pa-card"
                              onMouseEnter={(e) => tt(e, `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Total Sessions</span><span class="hm-tooltip-val">${total}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Completed</span><span class="hm-tooltip-val">${completed}</span></div>`)}
                              onMouseMove={ttMove}
                              onMouseLeave={hideTooltip}>
                              <div className="pa-val">{total}</div>
                              <div className="pa-lbl">Total Sessions</div>
                            </div>
                            <div className="pa-card"
                              onMouseEnter={(e) => tt(e, `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Completion Rate</span><span class="hm-tooltip-val">${completionRate}%</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Completed</span><span class="hm-tooltip-val">${completed} of ${total}</span></div>`)}
                              onMouseMove={ttMove}
                              onMouseLeave={hideTooltip}>
                              <div className="pa-val">{completionRate}%</div>
                              <div className="pa-lbl">Completion Rate</div>
                              <div className="pa-track"><div className="pa-bar" style={{ width: completionRate + '%' }}></div></div>
                            </div>
                            <div className="pa-card"
                              onMouseEnter={(e) => tt(e, `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Skipped</span><span class="hm-tooltip-val">${skipped}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Of Total</span><span class="hm-tooltip-val">${total}</span></div>`)}
                              onMouseMove={ttMove}
                              onMouseLeave={hideTooltip}>
                              <div className="pa-val">{skipped}</div>
                              <div className="pa-lbl">Skipped</div>
                            </div>
                            <div className="pa-card"
                              onMouseEnter={(e) => tt(e, `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Avg Duration</span><span class="hm-tooltip-val">${fmtHuman(avgDur)}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Total Time</span><span class="hm-tooltip-val">${fmtHuman(Math.round(totalDur/1000))}</span></div>`)}
                              onMouseMove={ttMove}
                              onMouseLeave={hideTooltip}>
                              <div className="pa-val">{fmtHuman(avgDur)}</div>
                              <div className="pa-lbl">Avg Duration</div>
                            </div>
                            <div className="pa-card"
                              onMouseEnter={(e) => tt(e, `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Daily Avg</span><span class="hm-tooltip-val">${dailyAvg}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Active Days</span><span class="hm-tooltip-val">${uniqueDays}</span></div>`)}
                              onMouseMove={ttMove}
                              onMouseLeave={hideTooltip}>
                              <div className="pa-val">{dailyAvg}</div>
                              <div className="pa-lbl">Daily Avg</div>
                            </div>
                            <div className="pa-card"
                              onMouseEnter={(e) => tt(e, `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Active Days</span><span class="hm-tooltip-val">${uniqueDays}</span></div><div class="hm-tooltip-row"><span class="hm-tooltip-lbl">Total Sessions</span><span class="hm-tooltip-val">${total}</span></div>`)}
                              onMouseMove={ttMove}
                              onMouseLeave={hideTooltip}>
                              <div className="pa-val">{uniqueDays}</div>
                              <div className="pa-lbl">Active Days</div>
                            </div>
                            {Object.entries(byMode).length > 0 && (
                              <div className="pa-card pa-mode-breakdown"
                                onMouseEnter={(e) => {
                                  let h = '<div class="hm-tooltip-date">Breakdown by Mode</div>';
                                  Object.entries(byMode).forEach(([m, c]) => { h += `<div class="hm-tooltip-row"><span class="hm-tooltip-lbl">${m}</span><span class="hm-tooltip-val">${c}</span></div>`; });
                                  tt(e, h);
                                }}
                                onMouseMove={ttMove}
                                onMouseLeave={hideTooltip}>
                                <div className="pa-lbl">By Mode</div>
                                {Object.entries(byMode).map(([mode, count]) => (
                                  <div key={mode} className="pa-mode-row">
                                    <span className="pa-mode-name">{mode}</span>
                                    <span className="pa-mode-count">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Weather section ─────────────────────────── */}
              <div className="stats-section">
                <div className="stats-section-title"><i className="fas fa-cloud-sun"></i> Weather × Productivity</div>
                <div className="stats-section-body">
                  {showWeather && weatherStats && weatherStats.paired && weatherStats.paired.length > 0 ? (
                    <>
                      <div className="stats-charts-grid">
                        <div className="stats-chart-card">
                          <div className="stats-chart-title">Daily Hours + Temperature <span className="stats-chart-sub">focus hours + temperature overlay</span></div>
                          <canvas ref={wxDualRef} className="stats-chart-canvas" height="160"
                            onMouseMove={handleWxDualHover}
                            onMouseLeave={hideTooltip}></canvas>
                        </div>
                        <div className="stats-chart-card">
                          <div className="stats-chart-title">Weather Category <span className="stats-chart-sub">focus hours by weather condition</span></div>
                          <canvas ref={wxDonutRef} className="stats-chart-canvas" height="170"
                            onMouseMove={(e) => handleDonutHover(e, 'wxDonut')}
                            onMouseLeave={hideTooltip}></canvas>
                        </div>
                        <div className="stats-chart-card">
                          <div className="stats-chart-title">Temp vs Focus Time <span className="stats-chart-sub">temperature vs focus correlation</span></div>
                          <canvas ref={wxScatterRef} className="stats-chart-canvas" height="160"
                            onMouseMove={handleWxScatterHover}
                            onMouseLeave={hideTooltip}></canvas>
                        </div>
                        <div className="stats-chart-card">
                          <div className="stats-chart-title">Correlations</div>
                          <div style={{ padding: '4px 0', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--fg-dim)' }}>
                            {weatherStats.r ? Object.entries(weatherStats.r).map(([k, v]) => {
                              const a = Math.abs(v);
                              const col = a > 0.5 ? (v > 0 ? '#b8bb26' : '#fb4934') : a > 0.2 ? '#d79921' : '#665c54';
                              return <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                <span style={{ textTransform: 'capitalize' }}>{k}</span>
                                <span style={{ color: col, fontWeight: 700 }}>{v.toFixed(3)}</span>
                              </div>;
                            }) : <div>No correlation data</div>}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--fg-dim)', marginBottom: 10 }}>
                        <i className="fas fa-cloud-sun" style={{ marginRight: 6 }}></i>
                        Enable location access to track how weather affects your focus.
                      </p>
                      <button className="btn btn-p" onClick={handleEnableWeather} disabled={weatherBusy}>
                        {weatherBusy ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-location-dot"></i>} {weatherBusy ? 'Detecting location…' : 'ENABLE WEATHER STATS'}
                      </button>
                      {weatherStats && weatherStats.paired && weatherStats.paired.length > 0 && (
                        <button className="btn btn-s" onClick={toggleWeather} style={{ marginLeft: 8 }}>
                          SHOW DATA ({weatherStats.paired.length} days)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="mfoot">
          <button className="btn btn-s" onClick={() => setOpen(false)}><i className="fas fa-times"></i> CLOSE</button>
          <button className="btn btn-p" onClick={handlePdf} disabled={loading || !daily.length}>
            <i className="fas fa-file-pdf"></i> PDF REPORT
          </button>
        </div>
      </div>

      {/* ── Heatmap tooltip (fixed overlay) ──────────────── */}
      <div className={`hm-tooltip${tooltip.show ? ' show' : ''}`}
        style={{ left: tooltip.x + 'px', top: tooltip.y + 'px' }}
        dangerouslySetInnerHTML={{ __html: tooltip.html }}>
      </div>
    </div>
  );
}
