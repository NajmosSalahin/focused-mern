const msFmt = ms => {
  if (!ms) return '0m';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
const sum = arr => arr.reduce((s, v) => s + v, 0);
const mean = arr => arr.length ? sum(arr) / arr.length : 0;
const median = arr => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const std = arr => { if (arr.length < 2) return 0; const mn = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - mn) ** 2, 0) / (arr.length - 1)); };
const slopeOf = ys => { const n = ys.length; if (n < 2) return 0; const xs = ys.map((_, i) => i), mx = mean(xs), my = mean(ys), num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), den = xs.reduce((s, x) => s + (x - mx) ** 2, 0); return den ? num / den : 0; };
const PROJ_COLORS = ['#458588', '#b16286', '#689d6a', '#d79921', '#cc241d', '#98971a'];

export function generatePDFSummary(data) {
  const { entries, projects, goals, daily, projStats, dow, hourHeat, dist, kpi, insights } = data;
  const now = new Date();
  const DAYS = 30;

  if (!daily || !daily.length) {
    const win = window.open('', '_blank', 'width=860,height=400,scrollbars=yes');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>FOCUSED Report</title></head><body style="font-family:monospace;padding:40px;color:#555"><h2>No data available yet</h2><p>Start tracking time to generate reports.</p></body></html>`);
    win.document.close();
    return;
  }

  const dayData = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const found = daily.find(x => x.date === key);
    const ms = found ? found.ms : 0;
    dayData.push({ date: d, key, ms, hrs: ms / 3600000, label: i === 0 ? 'Today' : d.getDate() === 1 ? d.toLocaleString('en', { month: 'short' }) : String(d.getDate()) });
  }

  const totalMs = sum(entries.map(e => e.durationMs || 0));
  const trackedD = new Set(entries.map(e => e.startTime && new Date(e.startTime).toISOString().slice(0, 10)).filter(Boolean)).size;
  const avgDayMs = trackedD > 0 ? totalMs / trackedD : 0;

  const DOW_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowMs = dow && dow.length ? dow : Array(7).fill(0);

  const hourMs = hourHeat && hourHeat.length ? hourHeat : Array(24).fill(0);

  const projList = (projStats || []).filter(p => p.ms > 0).sort((a, b) => b.ms - a.ms);

  const taskMap = {};
  entries.forEach(e => { if (!e.task) return; taskMap[e.task] = (taskMap[e.task] || 0) + (e.durationMs || 0); });
  const topTasks = Object.entries(taskMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const durSecs = entries.map(e => (e.durationMs || 0) / 1000).filter(v => v > 0);

  const slope = slopeOf(dayData.map(d => d.hrs));

  const daySet = new Set(entries.map(e => e.startTime && new Date(e.startTime).toISOString().slice(0, 10)).filter(Boolean));
  let curS = 0; { let d = new Date(now); while (daySet.has(d.toISOString().slice(0, 10))) { curS++; d.setDate(d.getDate() - 1); } }
  let maxS = 0, runS = 0; { let d = new Date(now); for (let i = 0; i < 365; i++) { if (daySet.has(d.toISOString().slice(0, 10))) runS++; else runS = 0; maxS = Math.max(maxS, runS); d.setDate(d.getDate() - 1); } }

  // ── SVG helpers ───────────────────────────────────────────
  const W = 640, PAD = 36;
  const svgWrap = (content, h, vbW) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW || W} ${h}" width="100%" style="display:block">${content}</svg>`;
  const svgT = (x, y, txt, o = {}) => `<text x="${x}" y="${y}" font-family="Courier New,monospace" font-size="${o.sz || 10}" fill="${o.fill || '#a89984'}" font-weight="${o.b ? 700 : 400}" text-anchor="${o.anc || 'start'}" dominant-baseline="${o.base || 'auto'}">${String(txt).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  const svgR = (x, y, w, h, col, rx = 2) => w > 0 && h > 0 ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(w, 0.5).toFixed(1)}" height="${Math.max(h, 0.5).toFixed(1)}" fill="${col}" rx="${rx}"/>` : '';

  const buildDaily = () => {
    const cH = 100, cW = W - PAD * 2, top = 12, bot = 20, maxHrs = Math.max(...dayData.map(d => d.hrs), 0.1);
    const bW = Math.max(2, cW / DAYS - 2), gap = cW / DAYS, mn = mean(dayData.map(d => d.hrs));
    let els = '';
    for (let i = 1; i <= 4; i++) { const y = top + cH * (1 - i / 4); els += `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#ddd" stroke-width="0.5"/>`; els += svgT(PAD - 4, y + 3, msFmt(maxHrs * i / 4 * 3600000), { sz: 8, anc: 'end' }); }
    dayData.forEach((d, i) => { const x = PAD + gap * i + (gap - bW) / 2, bH = Math.max(d.hrs > 0 ? 2 : 0, (d.hrs / maxHrs) * cH), isToday = i === DAYS - 1, above = d.hrs > mn; els += svgR(x, top + cH - bH, bW, bH, isToday ? '#689d6a' : above ? '#8ec07c88' : '#b8d8b888', 2); if (i % 5 === 0 || i === DAYS - 1) els += svgT(x + bW / 2, top + cH + 14, d.label, { sz: 8, anc: 'middle', fill: '#888' }); });
    const avgY = top + cH - (mn / maxHrs) * cH;
    els += `<line x1="${PAD}" y1="${avgY}" x2="${W - PAD}" y2="${avgY}" stroke="#83a598" stroke-width="1" stroke-dasharray="3 3"/>`;
    els += svgT(W - PAD + 3, avgY + 3, 'avg', { sz: 8, fill: '#83a598' });
    const sl = slopeOf(dayData.map(d => d.hrs));
    if (Math.abs(sl) > 0.001) { const pts = dayData.map((d, i) => { const yv = mn + sl * (i - (DAYS - 1) / 2), x = PAD + gap * i + gap / 2, y = top + cH - Math.min(Math.max(yv / maxHrs, 0), 1) * cH; return `${x.toFixed(1)},${y.toFixed(1)}`; }); els += `<polyline points="${pts.join(' ')}" fill="none" stroke="#d79921" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.8"/>`; }
    return svgWrap(els, top + cH + bot);
  };

  const buildDonut = () => {
    if (!projList.length) return '<p style="color:#aaa;font-size:10px">No project data</p>';
    const cx = 90, cy = 80, r = 60, inner = 36, total = sum(projList.map(p => p.ms));
    let angle = -Math.PI / 2, els = '';
    projList.slice(0, 8).forEach(p => { const sw = (p.ms / total) * 2 * Math.PI, x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle), x2 = cx + r * Math.cos(angle + sw), y2 = cy + r * Math.sin(angle + sw), lg = sw > Math.PI ? 1 : 0; els += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${p.color}" opacity="0.82"/>`; angle += sw; });
    els += `<circle cx="${cx}" cy="${cy}" r="${inner}" fill="#fff"/>`;
    els += svgT(cx, cy - 5, msFmt(total), { sz: 10, anc: 'middle', fill: '#282828', b: true, base: 'middle' });
    els += svgT(cx, cy + 7, 'total', { sz: 8, anc: 'middle', fill: '#aaa', base: 'middle' });
    projList.slice(0, 8).forEach((p, i) => { const lx = 168, ly = 8 + i * 20; els += svgR(lx, ly + 2, 9, 9, p.color, 2); const nm = p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name; els += svgT(lx + 13, ly + 10, nm, { sz: 8, fill: '#666' }); els += svgT(lx + 160, ly + 10, msFmt(p.ms), { sz: 8, fill: '#282828', anc: 'end', b: true }); els += svgT(lx + 167, ly + 10, `${pct(p.ms, total)}%`, { sz: 7, fill: '#aaa' }); });
    return svgWrap(els, 170, W);
  };

  const buildDow = () => {
    const maxMs = Math.max(...dowMs, 1), bMaxW = 200, labW = 32;
    let els = '', H = DOW_NAMES.length * 24 + 8;
    DOW_NAMES.forEach((nm, i) => { const y = 4 + i * 24, bW = (dowMs[i] / maxMs) * bMaxW, isMax = dowMs[i] === Math.max(...dowMs); els += svgT(labW - 4, y + 13, nm, { sz: 9, anc: 'end', fill: '#888' }); if (bW > 0) els += svgR(labW, y + 2, bW, 14, isMax ? '#d7992188' : '#4585884d', 2); els += svgT(labW + bW + 5, y + 13, dowMs[i] ? msFmt(dowMs[i]) : '—', { sz: 9, fill: isMax ? '#d79921' : '#aaa' }); });
    return svgWrap(els, H, labW + bMaxW + 80);
  };

  const buildHeatmap = () => {
    const cW = W - PAD * 2, cSize = Math.floor(cW / 24) - 2, maxH = Math.max(...hourMs, 1);
    let els = '';
    hourMs.forEach((ms, h) => { const x = PAD + h * (cSize + 2), intens = ms / maxH, fill = ms > 0 ? `rgba(104,157,106,${(0.15 + intens * 0.85).toFixed(2)})` : '#f0ede8'; els += svgR(x, 4, cSize, 20, fill, 3); if (h % 4 === 0) els += svgT(x + cSize / 2, 34, `${String(h).padStart(2, '0')}`, { sz: 8, anc: 'middle', fill: '#aaa' }); });
    return svgWrap(els, 42);
  };

  const buildHist = () => {
    const bkts = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180], lbls = bkts.slice(0, -1).map((b, i) => `${b}-${bkts[i + 1]}`);
    const cnts = new Array(bkts.length - 1).fill(0);
    entries.forEach(e => { const m = (e.durationMs || 0) / 60000; for (let i = 0; i < bkts.length - 1; i++) { if (m >= bkts[i] && m < bkts[i + 1]) { cnts[i]++; break; } } });
    const maxC = Math.max(...cnts, 1), cH = 80, cW = W - PAD * 2, top = 8, bot = 20, bW = Math.max(3, cW / cnts.length - 3), gap = cW / cnts.length;
    let els = '';
    for (let i = 1; i <= 4; i++) { const y = top + cH * (1 - i / 4); els += `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#ddd" stroke-width="0.5"/>`; els += svgT(PAD - 4, y + 3, Math.round(maxC * i / 4), { sz: 8, anc: 'end' }); }
    cnts.forEach((c, i) => { const x = PAD + gap * i + (gap - bW) / 2, bH = Math.max(c > 0 ? 2 : 0, (c / maxC) * cH); els += svgR(x, top + cH - bH, bW, bH, '#d3869b88', 2); els += svgT(x + bW / 2, top + cH + 14, lbls[i], { sz: 7, anc: 'middle', fill: '#aaa' }); if (c > 0) els += svgT(x + bW / 2, top + cH - bH - 2, c, { sz: 7, anc: 'middle', fill: '#888' }); });
    return svgWrap(els, top + cH + bot);
  };

  const buildGoals = () => {
    if (!goals || !goals.length) return '<p style="color:#aaa;font-size:10px">No goals set</p>';
    const bMaxW = 260, labW = 130, rowH = 24;
    let els = '', H = goals.length * rowH + 8;
    goals.forEach((g, i) => { const y = 4 + i * rowH, p2 = Math.min(100, pct(g.currentMs || 0, g.targetMs || 1)), bW = p2 / 100 * bMaxW, col = p2 >= 100 ? '#b8bb2666' : p2 >= 70 ? '#d7992166' : '#45858866', nm = g.name.length > 17 ? g.name.slice(0, 16) + '…' : g.name; els += svgT(labW - 4, y + 14, nm, { sz: 9, anc: 'end', fill: '#666' }); els += svgR(labW, y + 3, bMaxW, 14, '#eee', 2); if (bW > 0) els += svgR(labW, y + 3, bW, 14, col, 2); els += svgT(labW + bMaxW + 6, y + 14, `${p2}%  ${msFmt(g.currentMs)}/${msFmt(g.targetMs)}`, { sz: 8, fill: p2 >= 100 ? '#689d6a' : '#aaa' }); });
    return svgWrap(els, H, labW + bMaxW + 200);
  };

  const kpiCard = (val, lbl, col) => `<div class="kc"><div class="kv" style="color:${col}">${val}</div><div class="kl">${lbl}</div></div>`;
  const sec = (t, col = '#458588') => `<div class="sec" style="border-left-color:${col};color:${col}">${t}</div>`;
  const card = (label, content) => `<div class="card"><div class="card-lbl">${label}</div>${content}</div>`;
  const mrow = (k, v) => `<div class="mr"><span class="mk">${k}</span><span class="mv">${v}</span></div>`;

  const peakH = hourMs.indexOf(Math.max(...hourMs));
  const bestDow = dowMs.indexOf(Math.max(...dowMs));
  const insightLines = [];
  if (slope > 0.01) insightLines.push(`<b>📈 Upward trend</b> — daily time is growing by ~${msFmt(slope * 3600000)}/day.`);
  else if (slope < -0.01) insightLines.push(`<b>📉 Downward trend</b> — daily time shrinking. Consider a focus reset.`);
  if (curS >= 7) insightLines.push(`<b>🔥 ${curS}-day streak</b> — excellent consistency, keep it up!`);
  if (curS === 0) insightLines.push(`<b>⚡ No current streak</b> — log at least one session today to restart.`);
  insightLines.push(`<b>🕐 Peak hour ${String(peakH).padStart(2, '0')}:00</b> — your brain is sharpest then. Protect it.`);
  insightLines.push(`<b>📅 ${DOW_NAMES[bestDow]} is your best day</b> (${msFmt(dowMs[bestDow])} avg).`);
  if (projects && projects.length) insightLines.push(`<b>📁 Best project: ${projList.length ? projList[0].name : '—'}</b> (${projList.length ? msFmt(projList[0].ms) : '—'})`);
  const cvVal = durSecs.length ? (std(durSecs) / (mean(durSecs) || 1) * 100).toFixed(0) : 0;
  insightLines.push(`<b>📊 Consistency (CV): ${cvVal}%</b> — ${Number(cvVal) < 30 ? 'very stable' : 'high variance in daily time'}.`);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>FOCUSED Report — ${now.toLocaleDateString()}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:11px;color:#282828;background:#fff;line-height:1.5}
.print-bar{text-align:center;padding:14px;background:#f5f0eb;border-bottom:1px solid #ddd}
.print-btn{font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:1px;background:#282828;color:#f5f0eb;border:none;padding:8px 22px;border-radius:3px;cursor:pointer;margin-right:8px}
.print-btn:hover{background:#3c3836}
.page{width:740px;margin:0 auto;padding:32px 44px 44px}
.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #282828;padding-bottom:14px;margin-bottom:20px}
.logo{font-size:24px;font-weight:900;letter-spacing:2px;color:#282828}.logo span{color:#689d6a}
.meta{font-size:9px;color:#888;text-align:right;line-height:1.8}
.kpi-row{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-bottom:20px}
.kc{background:#f9f7f4;border:1px solid #e8e2db;border-radius:4px;padding:8px 10px;text-align:center}
.kv{font-size:18px;font-weight:900;line-height:1.1;margin-bottom:2px}
.kl{font-size:8px;color:#999;letter-spacing:.5px;text-transform:uppercase}
.sec{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:16px 0 8px;padding-left:7px;border-left:3px solid #458588}
.card{background:#f9f7f4;border:1px solid #e8e2db;border-radius:4px;padding:12px;margin-bottom:10px}
.card-lbl{font-size:9px;font-weight:700;color:#999;letter-spacing:.7px;margin-bottom:8px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.math-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e8e2db;border:1px solid #e8e2db;border-radius:4px;overflow:hidden;margin-bottom:10px}
.mr{display:contents}
.mk{background:#f9f7f4;font-size:9px;color:#999;padding:5px 7px;border:none}
.mv{background:#fff;font-size:10px;font-weight:700;color:#282828;padding:5px 7px;border:none}
.tbl{width:100%;border-collapse:collapse;font-size:10px}
.tbl th{background:#f0ebe4;color:#999;font-size:8px;letter-spacing:.5px;padding:5px 8px;text-align:left;border-bottom:1px solid #e8e2db}
.tbl td{padding:5px 8px;border-bottom:1px solid #f5f0eb;color:#282828}
.tbl td.r{text-align:right;color:#689d6a;font-weight:700}
.tbl tr:nth-child(even) td{background:#faf8f5}
.insights{background:#f9f7f4;border:1px solid #e8e2db;border-radius:4px;padding:12px}
.ins{font-size:10px;color:#504945;padding:4px 0;border-bottom:1px solid #f0ebe4;line-height:1.6}
.ins:last-child{border-bottom:none}
.ins b{color:#282828}
.ftr{margin-top:28px;padding-top:10px;border-top:1px solid #e8e2db;font-size:8px;color:#aaa;display:flex;justify-content:space-between}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .print-bar{display:none}
  .page{padding:0}
  @page{margin:12mm 14mm;size:A4}
  .kc{background:#f9f7f4!important}
  .card{background:#f9f7f4!important}
  .math-grid{background:#e8e2db!important}
  .mk{background:#f9f7f4!important}
}
</style></head><body>

<div class="print-bar">
  <button class="print-btn" onclick="window.print()">⬇ SAVE AS PDF</button>
  <span style="font-size:10px;color:#888">Use "Save as PDF" in your browser's print dialog</span>
</div>

<div class="page">
  <div class="hdr">
    <div><div class="logo">FOCUS<span>ED</span></div><div style="font-size:9px;color:#aaa;margin-top:2px">Productivity Summary Report</div></div>
    <div class="meta">Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>${entries.length} sessions · ${trackedD} tracked days</div>
  </div>

  <div class="kpi-row">
    ${kpiCard(msFmt(totalMs), 'Total Tracked', '#689d6a')}
    ${kpiCard(msFmt(avgDayMs), 'Daily Avg', '#458588')}
    ${kpiCard(entries.length, 'Sessions', '#d79921')}
    ${kpiCard(curS + 'd', 'Streak', '#cc241d')}
    ${kpiCard(maxS + 'd', 'Best Streak', '#b16286')}
    ${kpiCard(projects ? projects.length : 0, 'Projects', '#689d6a')}
  </div>

  ${sec('DAILY TRACKED TIME — LAST 30 DAYS', '#458588')}
  ${card('HOURS PER DAY · green dashes = avg · yellow dashes = trend', buildDaily())}

  ${sec('PROJECT BREAKDOWN & DAY-OF-WEEK PATTERN', '#d79921')}
  <div class="two-col">
    ${card('PROJECT SPLIT (ALL TIME)', buildDonut())}
    ${card('HOURS BY DAY OF WEEK', buildDow())}
  </div>

  ${sec('HOUR-OF-DAY ACTIVITY HEATMAP', '#689d6a')}
  ${card('INTENSITY BY HOUR (00–23) — darker = more tracked time', buildHeatmap())}

  ${sec('SESSION DURATION DISTRIBUTION', '#b16286')}
  ${card('SESSIONS COUNT BY DURATION BUCKET (MINUTES)', buildHist())}

  ${goals && goals.length ? `
  ${sec('GOALS PROGRESS', '#98971a')}
  ${card('CURRENT PROGRESS TOWARD EACH GOAL', buildGoals())}
  ` : ''}

  ${sec('TOP 10 TASKS BY TIME', '#cc241d')}
  <div class="card" style="padding:0;overflow:hidden">
    <table class="tbl"><thead><tr><th>#</th><th>TASK</th><th>TIME</th><th>% OF TOTAL</th></tr></thead>
    <tbody>${topTasks.map(([task, ms], i) => `<tr><td style="color:#aaa">${i + 1}</td><td>${(task.length > 55 ? task.slice(0, 54) + '…' : task)}</td><td class="r">${msFmt(ms)}</td><td class="r">${pct(ms, totalMs)}%</td></tr>`).join('')}</tbody></table>
  </div>

  ${sec('STATISTICAL SUMMARY', '#458588')}
  <div class="math-grid">
    ${mrow('Mean session', msFmt(mean(durSecs) * 1000))}
    ${mrow('Median session', msFmt(median(durSecs) * 1000))}
    ${mrow('Std deviation', msFmt(std(durSecs) * 1000))}
    ${mrow('Longest session', msFmt(Math.max(...durSecs, 0) * 1000))}
    ${mrow('Shortest session', msFmt((Math.min(...durSecs.filter(v => v > 0)) || 0) * 1000))}
    ${mrow('Total sessions', entries.length)}
    ${mrow('Tracked days', trackedD)}
    ${mrow('Current streak', curS + ' days')}
    ${mrow('Best streak', maxS + ' days')}
    ${mrow('Peak hour', String(peakH).padStart(2, '0') + ':00')}
    ${mrow('Best weekday', DOW_NAMES[bestDow])}
    ${mrow('Daily trend', (slope >= 0 ? '+' : '') + msFmt(Math.abs(slope) * 3600000) + '/day')}
    ${mrow('Consistency CV', cvVal + '%')}
    ${mrow('Total projects', projects ? projects.length : 0)}
  </div>

  ${sec('AUTO-GENERATED INSIGHTS', '#d65d0e')}
  <div class="insights">${insightLines.map(t => `<div class="ins">${t}</div>`).join('')}</div>

  <div class="ftr"><span>FOCUSED · Productivity OS</span><span>Generated ${now.toISOString().replace('T', ' ').slice(0, 19)} UTC</span></div>
</div>

<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),600));<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=860,height=940,scrollbars=yes');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
