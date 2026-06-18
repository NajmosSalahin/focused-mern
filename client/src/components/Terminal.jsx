import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import * as entriesApi from '../api/entries';

const ASCII_LOGO_ROWS = [
  [' _____  ___    ____  _   _  ____  _____  ____ ', '#fabd2f'],
  ['|  ___| / _ \\  / ___|| | | |/ ___||  ___||  _ \\ ', '#fabd2f'],
  ['| |_   | | | || |    | | | |\\___ \\|  _|  | | | |','#fe8019'],
  ['|  _|  | |_| || |___ | |_| | ___) || |___| |_| |', '#fe8019'],
  ['|_|     \\___/ \\____| \\___/  |____/ |_____|____/ ', '#d65d0e'],
];

const PROJ_COLORS = ['#fb4934','#b8bb26','#fabd2f','#83a598','#d3869b','#8ec07c','#fe8019','#458588'];

export default function Terminal() {
  const app = useApp();
  const {
    entries, projects, goals, pomoSessions, pomoSettings, pomoGoalTarget,
    loading, viewDate,
    pomoRunning, pomoSec, pomoMode, sessionsD, skipToNext,
    taskRunning, taskPaused, activeEntry,
    startPomo, pausePomo, resetPomo, setPomoMode,
    startTracking, stopTracking, pauseTracking, resumeTracking,
    setEntries, setGoals, addToast,
    clock24h,
  } = app;

  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const historyRef = useRef([]);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const bootedRef = useRef(false);
  const nowRef = useRef(new Date());

  const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const fmtSz = b => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}K` : `${(b/1048576).toFixed(1)}M`;

  const fmtMS = ms => {
    if (!ms || ms < 0) return '0m';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const fmtDate = d => d.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric',year:'numeric'});

  const ruler = (ch='─', n=44) => ch.repeat(n);

  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const sameWeek = (a, b) => {
    const s = new Date(b); s.setDate(b.getDate() - b.getDay() + 1); s.setHours(0,0,0,0);
    const e = new Date(s); e.setDate(s.getDate() + 7);
    return a >= s && a < e;
  };

  const sameMon = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  const totalMs = arr => arr.reduce((s,e) => s + (e.durationMs || 0), 0);

  const projColor = pid => {
    const idx = projects.findIndex(p => p._id === pid);
    return idx >= 0 ? PROJ_COLORS[idx % PROJ_COLORS.length] : '#a89984';
  };

  const termLine = useCallback((html, cls = 'tl-out') => {
    setLines(prev => [...prev, { html, cls }]);
  }, []);

  const termBlank = useCallback(() => termLine('', 'tl-empty'), [termLine]);

  const termPs1Echo = useCallback((cmd) => {
    termLine(
      `<span class="tp-user">focus</span><span class="tp-at">@</span><span class="tp-host">local</span><span class="tp-sep">:</span><span class="tp-dir">~/focus</span><span class="tp-dollar"> $</span>${escHtml(cmd)}`,
      'tl-cmd'
    );
  }, [termLine]);

  const bootBanner = useCallback(() => {
    const now = new Date();
    nowRef.current = now;
    const logoHtml = `<div id="termLogoWrap" style="transform-origin:left top;white-space:pre;line-height:1.3;margin-bottom:2px;">${ASCII_LOGO_ROWS.map(([text, color]) =>
      `<div style="color:${color};font-family:'JetBrains Mono',monospace;font-size:12.5px;">${escHtml(text)}</div>`
    ).join('')}</div>`;
    const todayMs = entries.reduce((s,e) => s + (e.durationMs || 0), 0);
    const newLines = [
      { html: logoHtml, cls: '' },
      { html: '', cls: 'tl-empty' },
      { html: `  ${now.toDateString()}  ${now.toLocaleTimeString()}  ·  ${entries.length} entries  ·  ${fmtMS(todayMs)} total`, cls: 'tl-out' },
      { html: '  type <span style="color:#8ec07c">help</span> for commands  ·  <span style="color:#8ec07c">Tab</span> autocomplete  ·  <span style="color:#8ec07c">↑↓</span> history', cls: 'tl-out' },
      { html: '', cls: 'tl-empty' },
    ];
    setLines(newLines);
    bootedRef.current = true;
  }, [entries, fmtMS]);

  useEffect(() => {
    if (!open) return;
    const wrap = document.getElementById('termLogoWrap');
    if (!wrap) return;
    requestAnimationFrame(() => {
      const avail = (wrap.parentElement?.clientWidth || 600) - 8;
      const actual = wrap.scrollWidth;
      if (actual > avail && avail > 0) {
        const ratio = avail / actual;
        wrap.style.transform = `scale(${ratio})`;
        wrap.style.marginBottom = `${-(wrap.scrollHeight * (1 - ratio))}px`;
      }
    });
  }, [lines, open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '`' && !(e.ctrlKey || e.metaKey || e.altKey)) {
        e.preventDefault();
        setOpen(prev => {
          if (!prev) bootedRef.current = false;
          return !prev;
        });
        setInput('');
        setHistIdx(-1);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      if (!bootedRef.current) bootBanner();
    }
  }, [open, bootBanner]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView();
  }, [open, lines]);

  const CMDS = useRef({}).current;
  const reg = useCallback((names, fn, meta = {}) => {
    (Array.isArray(names) ? names : [names]).forEach(n => { CMDS[n] = { fn, ...meta }; });
  }, [CMDS]);

  useEffect(() => {
    const c = {};

    const r = (names, fn, meta = {}) => {
      (Array.isArray(names) ? names : [names]).forEach(n => { c[n] = { fn, ...meta }; });
    };

    const tl = (html, cls) => termLine(html, cls);
    const tb = () => termBlank();
    const h = tag => `<span style="color:${tag.color};font-weight:700">${tag.label}</span>`;
    const v = val => `<span style="color:#ebdbb2">${val}</span>`;

    r('help', ({ args }) => {
      const target = args[0];
      if (target && c[target]) {
        tb();
        tl(`  <span style="color:#fabd2f;font-weight:700">${escHtml(target)}</span>  <span style="color:#a89984">${c[target].desc || '—'}</span>`);
        if (c[target].usage) tl(`  <span style="color:#665c54">usage:</span>  <span style="color:#8ec07c">${escHtml(c[target].usage)}</span>`);
        tb(); return;
      }
      const W = 60;
      const bar = () => `  <span style="color:#3c3836">${'─'.repeat(W)}</span>`;
      const sec = (title, col = '#d3869b') => {
        const pad = Math.max(0, W - title.length - 2);
        return `  <span style="color:${col};font-weight:700;letter-spacing:.3px">${title}</span>  <span style="color:#3c3836">${'─'.repeat(pad)}</span>`;
      };
      const row = (cmd, desc, indent = 2) => {
        const sp = Math.max(2, 30 - indent - cmd.length);
        return `${' '.repeat(indent)}<span style="color:#8ec07c">${escHtml(cmd)}</span>${' '.repeat(sp)}<span style="color:#a89984">${escHtml(desc)}</span>`;
      };
      const dim = t => `  <span style="color:#504945">${escHtml(t)}</span>`;
      const row2 = (c1, d1, c2, d2) => {
        const sp1 = Math.max(2, 22 - c1.length);
        const sp2 = Math.max(2, 18 - d1.length);
        return `  <span style="color:#8ec07c">${escHtml(c1)}</span>${' '.repeat(sp1)}<span style="color:#a89984">${escHtml(d1)}</span>${' '.repeat(sp2)}<span style="color:#458588">${escHtml(c2)}</span>  <span style="color:#665c54">${escHtml(d2)}</span>`;
      };

      tb(); tl(`  <span style="color:#504945">${'─'.repeat(Math.floor((W-14)/2))} FOCUSED TERM ${'─'.repeat(Math.ceil((W-14)/2))}</span>`,'tl-head'); tb();
      tl(sec('TRACKING','#b8bb26'));
      tl(row('track <task> [#project]', 'Start time tracking'));
      tl(row('stop', 'Stop current session'));
      tl(row('pause / resume', 'Toggle pause on session'));
      tl(row('status', 'Live status + today total'));
      tb();
      tl(sec('DATA','#fe8019'));
      tl(row('add <task> <dur> [#proj]', 'Log manual entry (e.g. 1h30m, 45m)'));
      tl(row('entries [yesterday|date]', 'List entries for a day'));
      tl(row('total [today|week|month]', 'Tracked time summary + breakdown'));
      tl(row('delete <index>', 'Remove a today entry by index'));
      tl(row('note <text>', 'Save timestamped note'));
      tb();
      tl(sec('POMODORO','#fb4934'));
      tl(row2('start / pause / reset', 'Timer controls', 'skip', 'Skip session'));
      tl(row2('work / short / long', 'Switch mode', 'pomo', 'Session log'));
      tb();
      tl(sec('DATA VIEWS','#b8bb26'));
      tl(row2('today', 'Today\'s summary', 'week', 'Weekly breakdown'));
      tl(row2('statsum', 'Text statistics', 'log', 'Session log'));
      tb();
      tl(sec('SYSTEM','#83a598'));
      tl(row2('neofetch', 'System info', 'cal', 'Calendar'));
      tl(row2('date / whoami', 'Date/user', 'keys', 'Keyboard shortcuts'));
      tl(row2('history', 'Cmd history', 'man <cmd>', 'Command manual'));
      tl(row2('env', 'Environment vars', 'df', 'Storage usage'));
      tb();
      tl(sec('TOOLS','#d3869b'));
      tl(row('open <name>', 'Open any panel by name'));
      tl(dim('  names: stats · import · export'));
      tl(row2('find <query>', 'Search entries', 'weather', 'Current conditions'));
      tl(row2('echo <text>', 'Print text', 'version', 'Version info'));
      tl(row2('clear', 'Clear terminal', 'exit', 'Close terminal'));
      tb();
      tl(`  <span style="color:#504945">${'─'.repeat(W)}</span>`);
      tl(`  <span style="color:#665c54">help <cmd></span>  <span style="color:#3c3836">detailed usage</span>  <span style="color:#504945">·</span>  <span style="color:#665c54">Tab</span>  <span style="color:#3c3836">autocomplete</span>  <span style="color:#504945">·</span>  <span style="color:#665c54">↑↓</span>  <span style="color:#3c3836">history</span>`);
      tb();
    }, { desc: 'Show available commands', usage: 'help [command]' });

    r(['start'], ({ args }) => {
      startPomo();
      tl(`  <span style="color:#b8bb26">✓</span> <span style="color:#a89984">timer started — ${pomoMode.toUpperCase()} · ${fmtMS(pomoSec * 1000)} remaining</span>`);
    }, { desc: 'Start the pomodoro timer' });

    r(['pause'], () => {
      pausePomo();
      tl(`  <span style="color:#fabd2f">⏸</span> <span style="color:#a89984">timer paused at ${fmtMS(pomoSec * 1000)}</span>`);
    }, { desc: 'Pause the pomodoro timer' });

    r(['reset'], () => {
      resetPomo();
      const dur = pomoSettings[pomoMode] || pomoSec;
      tl(`  <span style="color:#fabd2f">↺</span> <span style="color:#a89984">timer reset to ${fmtMS(dur * 1000)}</span>`);
    }, { desc: 'Reset current session' });

    r(['skip'], () => {
      skipToNext();
      tl(`  <span style="color:#83a598">⏭</span> <span style="color:#a89984">skipped to next session</span>`);
    }, { desc: 'Skip to the next session' });

    ['work','short','long'].forEach(m => {
      r(m, () => {
        setPomoMode(m);
        tl(`  <span style="color:#8ec07c">→</span> <span style="color:#a89984">mode set to <b>${m.toUpperCase()}</b></span>`);
      }, { desc: `Switch to ${m} mode` });
    });

    r('status', () => {
      const now = new Date();
      const todayMs = entries.filter(e => sameDay(new Date(e.startTime), now)).reduce((s,e) => s + (e.durationMs || 0), 0);
      tb();
      tl(`<span style="color:#665c54">  ${ruler()}</span>`);
      const pState = pomoRunning
        ? `<span style="color:#b8bb26">RUNNING</span>`
        : `<span style="color:#665c54">PAUSED</span>`;
      const tState = taskRunning
        ? `<span style="color:#b8bb26">● ${escHtml(activeEntry?.task || 'tracking')}</span>`
        : `<span style="color:#665c54">idle</span>`;
      tl(`  <span style="color:#a89984">timer   </span><span style="color:#ebdbb2">${pomoMode.toUpperCase()} ${fmtMS(pomoSec * 1000)}</span>  ${pState}`);
      tl(`  <span style="color:#a89984">tracker </span>${tState}`);
      tl(`  <span style="color:#a89984">today   </span><span style="color:#fabd2f">${fmtMS(todayMs)}</span>  <span style="color:#665c54">${entries.filter(e => sameDay(new Date(e.startTime), now)).length} entries</span>`);
      tl(`  <span style="color:#a89984">sessions</span><span style="color:#ebdbb2">${sessionsD}</span> completed`);
      tl(`<span style="color:#665c54">  ${ruler()}</span>`);
      tb();
    }, { desc: 'Show live timer and tracker status' });

    r('pomo', () => {
      tb();
      tl(`<span style="color:#d3869b">── pomodoro ───────────────────────────────</span>`,'tl-head');
      tl(`  <span style="color:#a89984">mode      </span><span style="color:#ebdbb2">${pomoMode.toUpperCase()}</span>  ${pomoRunning ? '<span style="color:#b8bb26">running</span>' : '<span style="color:#665c54">paused</span>'}`);
      tl(`  <span style="color:#a89984">remaining </span><span style="color:#fabd2f">${fmtMS(pomoSec * 1000)}</span>  <span style="color:#665c54">of ${fmtMS((pomoSettings[pomoMode] || pomoSec) * 1000)}</span>`);
      tl(`  <span style="color:#a89984">sessions  </span><span style="color:#ebdbb2">${sessionsD}</span> today`);
      tl(`  <span style="color:#a89984">auto-adv  </span><span style="color:#ebdbb2">${pomoSettings.autoAdv ? 'on' : 'off'}</span>`);
      tl(`  <span style="color:#a89984">work      </span><span style="color:#ebdbb2">${Math.floor(pomoSettings.work / 60)}m</span>  <span style="color:#a89984">short</span> <span style="color:#ebdbb2">${Math.floor(pomoSettings.short / 60)}m</span>  <span style="color:#a89984">long</span> <span style="color:#ebdbb2">${Math.floor(pomoSettings.long / 60)}m</span>`);
      tb();
    }, { desc: 'Show pomodoro state and settings' });

    r('log', () => {
      const todayPomo = pomoSessions.filter(s => sameDay(new Date(s.completedAt ? new Date(s.completedAt) : new Date()), nowRef.current));
      if (!todayPomo.length) { tl(`  <span style="color:#665c54">no sessions logged today</span>`); return; }
      tb();
      tl(`<span style="color:#d3869b">── session log · today ────────────────────</span>`,'tl-head');
      todayPomo.forEach((s, i) => {
        const col = s.mode === 'work' ? '#fb4934' : s.mode === 'short' ? '#b8bb26' : '#83a598';
        const at = s.completedAt ? new Date(s.completedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
        tl(`  <span style="color:#665c54">${String(i+1).padStart(2)}.</span>  <span style="color:${col}">${(s.mode || '?').padEnd(7)}</span><span style="color:#fabd2f">${fmtMS(s.duration * 1000 || 0)}</span>  <span style="color:#665c54">${at}</span>`);
      });
      const wc = todayPomo.filter(s => s.mode === 'work').length;
      tl(`  <span style="color:#665c54">─── ${wc} work · ${todayPomo.length - wc} break</span>`);
      tb();
    }, { desc: 'Show today\'s pomodoro session log' });

    r('today', () => {
      const now = nowRef.current;
      const todayE = entries.filter(e => sameDay(new Date(e.startTime), now));
      const total = totalMs(todayE);
      tb();
      tl(`<span style="color:#d3869b">── today · ${now.toDateString()} ──────────────────</span>`,'tl-head');
      if (!todayE.length) { tl(`  <span style="color:#665c54">no entries yet</span>`); tb(); return; }
      todayE.forEach((e, i) => {
        const proj = projects.find(p => p._id === e.projectId);
        tl(`  <span style="color:#665c54">${String(i+1).padStart(2)}.</span> <span style="color:#ebdbb2">${escHtml(e.task || '?')}</span>  <span style="color:#fabd2f">${fmtMS(e.durationMs || 0)}</span>${proj ? `  <span style="color:#83a598">${escHtml(proj.name)}</span>` : ''}`);
      });
      tl(`<span style="color:#665c54">  ${'─'.repeat(44)}</span>`);
      tl(`  <span style="color:#a89984">total</span>  <span style="color:#fabd2f">${fmtMS(total)}</span>  <span style="color:#665c54">${todayE.length} entries</span>`);
      tb();
    }, { desc: 'Show today\'s entries and total' });

    r('week', () => {
      const now = nowRef.current;
      const weekE = entries.filter(e => sameWeek(new Date(e.startTime), now));
      const total = totalMs(weekE);
      const byDay = {};
      weekE.forEach(e => { const d = new Date(e.startTime).toDateString(); byDay[d] = (byDay[d] || 0) + (e.durationMs || 0); });
      tb();
      tl(`<span style="color:#d3869b">── this week ──────────────────────────────</span>`,'tl-head');
      Object.entries(byDay).forEach(([d, ms]) => {
        const pct = Math.round(ms / Math.max(...Object.values(byDay), 1) * 20);
        const bar = '█'.repeat(pct) + '░'.repeat(20 - pct);
        tl(`  <span style="color:#a89984">${d.slice(0,10)}</span>  <span style="color:#83a598">${bar}</span>  <span style="color:#fabd2f">${fmtMS(ms)}</span>`);
      });
      tl(`<span style="color:#665c54">  ${'─'.repeat(44)}</span>`);
      tl(`  <span style="color:#a89984">week total</span>  <span style="color:#fabd2f">${fmtMS(total)}</span>  <span style="color:#665c54">${weekE.length} entries</span>`);
      tb();
    }, { desc: 'Weekly breakdown by day' });

    r(['statsum','summary'], () => {
      const now = nowRef.current;
      const todayE = entries.filter(e => sameDay(new Date(e.startTime), now));
      const weekE = entries.filter(e => sameWeek(new Date(e.startTime), now));
      const monthE = entries.filter(e => sameMon(new Date(e.startTime), now));
      const days = new Set(entries.map(e => new Date(e.startTime).toDateString()));
      const avg = days.size ? Math.round(totalMs(entries) / days.size) : 0;
      tb();
      tl(`<span style="color:#d3869b">── statistics ─────────────────────────────</span>`,'tl-head');
      [
        ['today', fmtMS(totalMs(todayE)), `${todayE.length} entries`],
        ['this week', fmtMS(totalMs(weekE)), `${weekE.length} entries`],
        ['this month', fmtMS(totalMs(monthE)), `${monthE.length} entries`],
        ['all time', fmtMS(totalMs(entries)), `${entries.length} entries`],
        ['daily avg', fmtMS(avg), `over ${days.size} days`],
      ].forEach(([lbl, val, sub]) => {
        tl(`  <span style="color:#a89984">${lbl.padEnd(12)}</span><span style="color:#fabd2f">${val.padEnd(12)}</span><span style="color:#665c54">${sub}</span>`);
      });
      tl(`  <span style="color:#a89984">projects</span>    <span style="color:#ebdbb2">${projects.length}</span>`);
      tl(`  <span style="color:#a89984">goals</span>       <span style="color:#ebdbb2">${goals.length}</span>`);
      tb();
    }, { desc: 'Detailed time statistics' });

    r(['track'], ({ args }) => {
      if (taskRunning) {
        tl(`  <span style="color:#fb4934">✗ Already tracking: <strong>${escHtml(activeEntry?.task || '')}</strong></span>`);
        tl(`  <span style="color:#665c54">  use <span style="color:#fabd2f">stop</span> first</span>`);
        return;
      }
      const raw = args.join(' ');
      const projM = raw.match(/#(\S+)/);
      const task = raw.replace(/#\S+/, '').trim();
      if (!task) { tl(`  <span style="color:#fb4934">Usage: track &lt;task&gt; [#project]</span>`); return; }
      const proj = projM ? projects.find(p => p.name.toLowerCase().includes(projM[1].toLowerCase())) : null;
      startTracking(task, proj?._id || null, proj?.name || null);
      tl(`  <span style="color:#b8bb26">▶ Tracking: <strong style="color:#ebdbb2">${escHtml(task)}</strong>${proj ? ' · ' + escHtml(proj.name) : ''}</span>`);
    }, { desc: 'Start time tracking', usage: 'track <task> [#project]' });

    r('stop', () => {
      if (!taskRunning) { tl(`  <span style="color:#665c54">No active session.</span>`); return; }
      const t = activeEntry?.task || '';
      stopTracking();
      tl(`  <span style="color:#fb4934">■ Stopped: <strong style="color:#ebdbb2">${escHtml(t)}</strong></span>`);
    }, { desc: 'Stop current time tracking' });

    r(['pause','resume'], () => {
      if (!taskRunning && !taskPaused) { tl(`  <span style="color:#665c54">No active session.</span>`); return; }
      if (taskPaused) {
        resumeTracking();
        tl(`  <span style="color:#b8bb26">Resumed: <strong style="color:#ebdbb2">${escHtml(activeEntry?.task || '')}</strong></span>`);
      } else {
        pauseTracking();
        tl(`  <span style="color:#fabd2f">Paused: <strong style="color:#ebdbb2">${escHtml(activeEntry?.task || '')}</strong></span>`);
      }
    }, { desc: 'Pause or resume current tracking' });

    r(['st'], () => {
      tb();
      if (taskRunning) {
        const ms = activeEntry?.durationMs || 0;
        tl(`  <span style="color:#b8bb26">▶ RUNNING</span>  <span style="color:#ebdbb2">${escHtml(activeEntry?.task || '')}</span>`);
        if (activeEntry?.projectName) tl(`  <span style="color:#665c54">  project: ${escHtml(activeEntry.projectName)}</span>`);
        tl(`  <span style="color:#665c54">  elapsed: <span style="color:#fabd2f">${fmtMS(ms)}</span></span>`);
      } else if (taskPaused) {
        tl(`  <span style="color:#fabd2f">⏸ PAUSED</span>  ${escHtml(activeEntry?.task || '')}`);
      } else {
        tl(`  <span style="color:#665c54">■ No active session</span>`);
      }
      const todayMs = entries.filter(e => sameDay(new Date(e.startTime), new Date())).reduce((s,e)=>s+(e.durationMs||0),0);
      tl(`  <span style="color:#665c54">  today total: <span style="color:#83a598">${fmtMS(todayMs)}</span></span>`);
      tb();
    }, { desc: 'Show current tracking status and today total' });

    r('add', ({ args }) => {
      const raw = args.join(' ');
      const durM = raw.match(/(\d+(?:\.\d+)?)(h|m)(?:(\d+)m)?/i);
      if (!durM) {
        tl(`  <span style="color:#fb4934">Usage: add &lt;task&gt; &lt;duration&gt; [#project]</span>`);
        tl(`  <span style="color:#665c54">  e.g. add deep work 1h30m #research</span>`);
        return;
      }
      let ms = 0;
      if (durM[2].toLowerCase() === 'h') {
        ms = (parseFloat(durM[1]) * 3600 + (parseInt(durM[3]||0) * 60)) * 1000;
      } else {
        ms = parseFloat(durM[1]) * 60000;
      }
      if (ms < 60000) { tl(`  <span style="color:#fb4934">Duration too short (minimum 1m)</span>`); return; }
      const projM = raw.match(/#(\S+)/);
      const proj = projM ? projects.find(p => p.name.toLowerCase().includes(projM[1].toLowerCase())) : null;
      const task = raw.replace(/\d+(?:\.\d+)?(?:h|m)(?:\d+m)?/i,'').replace(/#\S+/,'').trim();
      if (!task) { tl(`  <span style="color:#fb4934">Task name is required.</span>`); return; }
      const end = new Date();
      const start = new Date(end - ms);
      entriesApi.createEntry({ task, projectId: proj?._id || null, projectName: proj?.name || null, startTime: start.toISOString(), endTime: end.toISOString(), durationMs: ms })
        .then(created => { if (created) setEntries(prev => [created, ...prev]); })
        .catch(() => {});
      tl(`  <span style="color:#b8bb26">+ Added: <strong style="color:#ebdbb2">${escHtml(task)}</strong> — ${fmtMS(ms)}${proj ? ' · ' + escHtml(proj.name) : ''}</span>`);
    }, { desc: 'Add a manual entry', usage: 'add <task> <duration> [#project]' });

    r(['entries','ls','tasks'], ({ args }) => {
      const dateArg = args[0];
      let date = new Date();
      if (dateArg === 'yesterday') { date.setDate(date.getDate() - 1); }
      else if (dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)) { date = new Date(dateArg + 'T12:00:00'); }
      const dayEs = entries.filter(e => sameDay(new Date(e.startTime), date)).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
      const label = sameDay(date, new Date()) ? 'Today' : date.toDateString();
      tb();
      tl(`<span style="color:#d3869b">── ${label} · ${dayEs.length} entries ────────────────────</span>`,'tl-head');
      if (!dayEs.length) { tl(`  <span style="color:#504945">no entries</span>`); tb(); return; }
      dayEs.forEach((e, i) => {
        const t = new Date(e.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        const col = projColor(e.projectId);
        tl(`  <span style="color:#504945">${String(i+1).padStart(2)}</span>  <span style="color:#665c54">${t}</span>  <span style="color:${col}">●</span> <span style="color:#ebdbb2">${escHtml(e.task || '—')}</span>  <span style="color:#83a598">${fmtMS(e.durationMs || 0)}</span>`);
      });
      const ttl = totalMs(dayEs);
      tl(`  <span style="color:#665c54">  ─────────────────────────── total: <span style="color:#fabd2f">${fmtMS(ttl)}</span></span>`);
      tb();
    }, { desc: 'List entries for today or a date', usage: 'entries [yesterday|YYYY-MM-DD]' });

    r(['total','sum'], ({ args }) => {
      const period = args[0] || 'today';
      const now = nowRef.current;
      let filtered, label;
      if (period === 'today') { filtered = entries.filter(e => sameDay(new Date(e.startTime), now)); label = 'Today'; }
      else if (period === 'week') { const mon = new Date(now); mon.setDate(now.getDate()-now.getDay()+1); mon.setHours(0,0,0,0); filtered = entries.filter(e => new Date(e.startTime) >= mon); label = 'This week'; }
      else if (period === 'month') { const m1 = new Date(now.getFullYear(),now.getMonth(),1); filtered = entries.filter(e => new Date(e.startTime) >= m1); label = 'This month'; }
      else if (period === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); filtered = entries.filter(e => sameDay(new Date(e.startTime), y)); label = 'Yesterday'; }
      else { filtered = entries; label = 'All time'; }
      const ms = totalMs(filtered);
      tb();
      tl(`  <span style="color:#a89984">${label}:</span>  <span style="color:#fabd2f;font-size:inherit">${fmtMS(ms)}</span>  <span style="color:#665c54">(${filtered.length} sessions)</span>`);
      const byProj = {};
      filtered.forEach(e => { const k = e.projectName || '(no project)'; byProj[k] = (byProj[k] || 0) + (e.durationMs || 0); });
      Object.entries(byProj).sort((a,b) => b[1] - a[1]).slice(0,5).forEach(([name, ms2]) => {
        tl(`  <span style="color:#504945">  ${escHtml(name)}</span>  <span style="color:#83a598">${fmtMS(ms2)}</span>`);
      });
      tb();
    }, { desc: 'Show tracked time totals', usage: 'total [today|yesterday|week|month|all]' });

    r(['find','grep'], ({ args }) => {
      const q = args.join(' ').toLowerCase().trim();
      if (!q) { tl(`  usage: find &lt;keyword&gt;`,'tl-err'); return; }
      const hits = entries.filter(e => (e.task || '').toLowerCase().includes(q));
      tb();
      tl(`<span style="color:#d3869b">── find "${escHtml(q)}" — ${hits.length} result(s) ──────────</span>`,'tl-head');
      if (!hits.length) { tl(`  <span style="color:#665c54">no matches</span>`); tb(); return; }
      hits.slice(-20).forEach(e => {
        const d = new Date(e.startTime).toLocaleDateString();
        const hl = escHtml(e.task || '').replace(new RegExp(escHtml(q),'gi'), m => `<span style="color:#fabd2f;font-weight:700">${m}</span>`);
        tl(`  <span style="color:#665c54">${d}</span>  ${hl}  <span style="color:#83a598">${fmtMS(e.durationMs || 0)}</span>`);
      });
      if (hits.length > 20) tl(`  <span style="color:#665c54">... ${hits.length - 20} more not shown</span>`);
      tb();
    }, { desc: 'Search entries by keyword', usage: 'find <keyword>' });

    r(['projects','proj'], () => {
      if (!projects.length) { tl(`  <span style="color:#665c54">no projects — create one with the + button</span>`); return; }
      tb();
      tl(`<span style="color:#d3869b">── projects ───────────────────────────────</span>`,'tl-head');
      const sorted = projects.map(p => ({
        ...p, total: entries.filter(e => e.projectId === p._id).reduce((s,e) => s + (e.durationMs || 0), 0),
        count: entries.filter(e => e.projectId === p._id).length,
      })).sort((a,b) => b.total - a.total);
      const maxT = Math.max(...sorted.map(p => p.total), 1);
      sorted.forEach((p, i) => {
        const bar = '█'.repeat(Math.round(p.total / maxT * 16)) + '░'.repeat(16 - Math.round(p.total / maxT * 16));
        const col = PROJ_COLORS[i % PROJ_COLORS.length];
        tl(`  <span style="color:${col}">●</span> <span style="color:#ebdbb2">${escHtml(p.name).padEnd(20)}</span><span style="color:#83a598">${bar}</span>  <span style="color:#fabd2f">${fmtMS(p.total)}</span>  <span style="color:#665c54">${p.count} entries</span>`);
      });
      tb();
    }, { desc: 'List projects with time totals' });

    r(['goals','goal'], () => {
      if (!goals.length) { tl(`  <span style="color:#665c54">no goals — create one with the + button</span>`); return; }
      const now = nowRef.current;
      tb();
      tl(`<span style="color:#d3869b">── goals ──────────────────────────────────</span>`,'tl-head');
      goals.forEach(g => {
        const relevant = entries.filter(e => {
          if (g.projectId && e.projectId !== g.projectId) return false;
          const d = new Date(e.startTime);
          return g.freq === 'day' ? sameDay(d, now) : g.freq === 'week' ? sameWeek(d, now) : sameMon(d, now);
        });
        const done = totalMs(relevant) / 1000;
        const target = g.targetSecs || 3600;
        const pct = Math.min(100, Math.round(done / target * 100));
        const filled = Math.round(pct / 5);
        const bar = `${'█'.repeat(filled)}${'░'.repeat(20 - filled)}`;
        const col = pct >= 100 ? '#b8bb26' : pct >= 50 ? '#fabd2f' : '#fb4934';
        tl(`  <span style="color:#ebdbb2">${escHtml(g.name)}</span>  <span style="color:#665c54">${g.type === 'atLeast' ? '≥' : '≤'} ${fmtMS(target * 1000)} /${g.freq}</span>`);
        tl(`  <span style="color:${col}">${bar}</span>  <span style="color:${col}">${pct}%</span>  <span style="color:#665c54">${fmtMS(done * 1000)} done</span>`);
        tb();
      });
    }, { desc: 'Show goal progress' });

    r('top', () => {
      const now = nowRef.current;
      const todayMs = entries.filter(e => sameDay(new Date(e.startTime), now)).reduce((s,e) => s + (e.durationMs || 0), 0);
      tb();
      tl(`<span style="color:#d3869b">── top — focus processes ──────────────────</span>`,'tl-head');
      tl(`  <span style="color:#665c54">PID   TASK                        TIME      STATE</span>`);
      tl(`<span style="color:#665c54">  ${ruler()}</span>`);
      if (taskRunning && activeEntry) {
        tl(`  <span style="color:#fabd2f">0001  ${escHtml((activeEntry.task || '?').slice(0,28)).padEnd(28)}  ${fmtMS(activeEntry.durationMs || 0).padEnd(8)}  <span style="color:#b8bb26">running</span></span>`);
      }
      tl(`  <span style="color:#83a598">0002  pomodoro-timer              ${fmtMS(pomoSec * 1000).padEnd(8)}  ${pomoRunning ? '<span style="color:#b8bb26">running</span>' : '<span style="color:#665c54">sleeping</span>'}</span>`);
      tl(`  <span style="color:#a89984">0003  storage-sync                background  <span style="color:#665c54">idle</span></span>`);
      tl(`  <span style="color:#a89984">0004  weather-poller              10min       <span style="color:#665c54">idle</span></span>`);
      tl(`<span style="color:#665c54">  ${'─'.repeat(44)}</span>`);
      tl(`  <span style="color:#665c54">today: ${fmtMS(todayMs)}  ·  ${sessionsD} sessions  ·  mem: ${fmtSz(0)}</span>`);
      tb();
    }, { desc: 'Show running processes / active tasks' });

    r('delete', ({ args }) => {
      if (!args[0]) { tl(`  <span style="color:#fb4934">Usage: delete &lt;entry-id&gt;</span>`); return; }
      const today = entries.filter(e => sameDay(new Date(e.startTime), new Date())).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
      const idx = parseInt(args[0]) - 1;
      if (isNaN(idx) || idx < 0 || idx >= today.length) { tl(`  <span style="color:#fb4934">Index out of range.</span>`); return; }
      const entry = today[idx];
      if (taskRunning && activeEntry?._id === entry._id) { tl(`  <span style="color:#fb4934">Cannot delete a running entry.</span>`); return; }
      const id = entry._id;
      entriesApi.deleteEntry(id).then(() => {
        setEntries(prev => prev.filter(e => e._id !== id));
      }).catch(() => {});
      tl(`  <span style="color:#fb4934">✗ Deleted: <strong>${escHtml(entry.task)}</strong> (${fmtMS(entry.durationMs)})</span>`);
    }, { desc: 'Delete a today entry by index', usage: 'delete <index> (from entries list)' });

    r('note', ({ args }) => {
      const text = args.join(' ').trim();
      if (!text) { tl(`  <span style="color:#fb4934">Usage: note &lt;text&gt;</span>`); return; }
      entriesApi.createEntry({ task: `📝 ${text}`, projectId: null, projectName: null, startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMs: 0, isNote: true })
        .then(created => { if (created) setEntries(prev => [created, ...prev]); })
        .catch(() => {});
      tl(`  <span style="color:#83a598">📝 Note saved: <em style="color:#a89984">${escHtml(text)}</em></span>`);
    }, { desc: 'Save a timestamped note', usage: 'note <text>' });

    r('open', ({ args }) => {
      const name = args[0]?.toLowerCase();
      const map = { stats: 'statsModal', import: 'importModal', export: 'exportModal' };
      const id = map[name];
      if (!id) { tl(`  <span style="color:#fb4934">Unknown panel. Try: stats, import, export</span>`); return; }
      tl(`  <span style="color:#8ec07c">→ opening ${name}…</span>`);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.classList.add('open');
      }, 180);
    }, { desc: 'Open a UI panel', usage: 'open <stats|import|export>' });

    r('stats', () => {
      const el = document.getElementById('statsModal');
      if (el) el.classList.add('open');
      tl(`  <span style="color:#8ec07c">→ opening statistics…</span>`);
    }, { desc: 'Open statistics panel' });

    r('import', () => {
      const el = document.getElementById('importModal');
      if (el) el.classList.add('open');
      tl(`  <span style="color:#8ec07c">→ opening import…</span>`);
    }, { desc: 'Open import panel' });

    r('export', () => {
      const el = document.getElementById('exportModal');
      if (el) el.classList.add('open');
      tl(`  <span style="color:#8ec07c">→ opening export…</span>`);
    }, { desc: 'Open export panel' });

    r(['keys','shortcuts','keybinds'], () => {
      const sec = (title, col) => tl(`<span style="color:${col};font-weight:700">  ── ${title} ${'─'.repeat(Math.max(0,38-title.length))}</span>`,'tl-head');
      const row = (keys, desc) => {
        const k = keys.map(k => `<span style="color:#fabd2f;font-weight:700">${k}</span>`).join(' <span style="color:#665c54">+</span> ');
        tl(`    ${k}  <span style="color:#a89984">${desc}</span>`);
      };
      tb();
      tl(`<span style="color:#d3869b">  FOCUS KEYBOARD SHORTCUTS  ─────────────────────</span>`,'tl-head'); tb();
      sec('POMODORO TIMER','#fb4934');
      row(['Space'], 'Start / Pause timer');
      row(['R'], 'Reset current session');
      row(['S'], 'Skip to next session');
      row(['1'], 'Switch → Work mode');
      row(['2'], 'Switch → Short break');
      row(['3'], 'Switch → Long break');
      tb();
      sec('TASK TRACKER','#b8bb26');
      row(['N'], 'Focus task input field');
      row(['Ctrl','Enter'], 'Start / Stop time tracking');
      row(['Ctrl','P'], 'Pause / Resume tracker');
      row(['['], 'Previous day');
      row(['}'], 'Next day');
      row(['T'], 'Jump to today');
      tb();
      sec('TERMINAL','#8ec07c');
      row(['`'], 'Toggle terminal');
      row(['↑ / ↓'], 'Navigate command history');
      row(['Tab'], 'Autocomplete command');
      row(['Ctrl','L'], 'Clear terminal');
      row(['Ctrl','C'], 'Cancel current input');
      tb();
      sec('NAVIGATION','#83a598');
      row(['G'], 'New goal');
      row(['P'], 'New project');
      row(['Ctrl','K'], 'Command palette');
      row(['Ctrl',','], 'Timer settings');
      tb();
      sec('PANELS & MODALS','#d3869b');
      row(['?'], 'Keyboard shortcuts panel');
      row(['Esc'], 'Close modal / overlay');
      row(['Ctrl','S'], 'Statistics & analytics');
      row(['Ctrl','E'], 'Export data');
      row(['Ctrl','I'], 'Import data');
      tb();
    }, { desc: 'Show all keyboard shortcuts' });

    r('neofetch', () => {
      const now = nowRef.current;
      const upSec = Math.floor((Date.now() - now.getTime()) / 1000);
      const upStr = upSec < 60 ? `${upSec}s` : upSec < 3600 ? `${Math.floor(upSec/60)}m ${upSec%60}s` : `${Math.floor(upSec/3600)}h ${Math.floor((upSec%3600)/60)}m`;
      const ua = navigator.userAgent;
      const cores = navigator.hardwareConcurrency || '?';
      const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GiB` : 'unknown';
      const res = `${screen.width}x${screen.height}`;
      const lang = navigator.language || 'en-US';
      const plat = ua.includes('Win') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Unknown';
      const pkgs = entries.length + projects.length + goals.length;
      const logoHtml = `<div id="termLogoWrap" style="transform-origin:left top;white-space:pre;line-height:1.3;margin-bottom:4px;">${ASCII_LOGO_ROWS.map(([text, color]) =>
        `<div style="color:${color};font-family:'JetBrains Mono',monospace;font-size:12.5px;">${escHtml(text)}</div>`
      ).join('')}</div>`;
      const infoRows = [
        `<span style="color:#fabd2f;font-weight:700">focus</span><span style="color:#665c54">@</span><span style="color:#8ec07c;font-weight:700">local</span>`,
        `<span style="color:#504945">${'─'.repeat(30)}</span>`,
        `${h({label:'OS',color:'#fabd2f'})}          ${v(plat)}`,
        `${h({label:'Kernel',color:'#fabd2f'})}      ${v('focusos ' + (navigator.platform || plat).toLowerCase())}`,
        `${h({label:'Uptime',color:'#fabd2f'})}      ${v(upStr)}`,
        `${h({label:'Packages',color:'#fabd2f'})}    ${v(pkgs + ' (entries+proj+goals)')}`,
        `${h({label:'Shell',color:'#fabd2f'})}       ${v('focusbash 2.0')}`,
        `${h({label:'Resolution',color:'#fabd2f'})}  ${v(res)}`,
        `${h({label:'Terminal',color:'#fabd2f'})}    ${v('focus-terminal')}`,
        `${h({label:'CPU',color:'#fabd2f'})}         ${v(cores + '-core (logical)')}`,
        `${h({label:'Memory',color:'#fabd2f'})}      ${v(mem)}`,
        `${h({label:'Locale',color:'#fabd2f'})}      ${v(lang)}`,
        ``,
        `<span style="background:#282828;color:#282828"> ▌</span><span style="background:#cc241d;color:#cc241d"> ▌</span><span style="background:#98971a;color:#98971a"> ▌</span><span style="background:#d79921;color:#d79921"> ▌</span><span style="background:#458588;color:#458588"> ▌</span><span style="background:#b16286;color:#b16286"> ▌</span><span style="background:#689d6a;color:#689d6a"> ▌</span><span style="background:#a89984;color:#a89984"> ▌</span>`,
        `<span style="background:#928374;color:#928374"> ▌</span><span style="background:#fb4934;color:#fb4934"> ▌</span><span style="background:#b8bb26;color:#b8bb26"> ▌</span><span style="background:#fabd2f;color:#fabd2f"> ▌</span><span style="background:#83a598;color:#83a598"> ▌</span><span style="background:#d3869b;color:#d3869b"> ▌</span><span style="background:#8ec07c;color:#8ec07c"> ▌</span><span style="background:#ebdbb2;color:#ebdbb2"> ▌</span>`,
      ];
      setLines(prev => [...prev, { html: logoHtml, cls: '' }, { html: '', cls: 'tl-empty' }]);
      infoRows.forEach(row => tl(`  ${row}`));
      tb();
    }, { desc: 'Display system info with FOCUSED logo' });

    r('cal', () => {
      const now = nowRef.current;
      const y = now.getFullYear(), mo = now.getMonth();
      const days = new Date(y, mo+1, 0).getDate();
      let firstDow = new Date(y, mo, 1).getDay();
      firstDow = (firstDow + 6) % 7;
      const tracked = new Set(entries.filter(e => sameMon(new Date(e.startTime), now)).map(e => new Date(e.startTime).getDate()));
      const mName = now.toLocaleDateString('en', {month:'long',year:'numeric'});
      tb();
      tl(`<span style="color:#d3869b">  ${mName.toUpperCase()}</span>`,'tl-head');
      tl(`<span style="color:#665c54">  Mo  Tu  We  Th  Fr  Sa  Su</span>`);
      let row = '  ' + '    '.repeat(firstDow);
      for (let d = 1; d <= days; d++) {
        const isToday = d === now.getDate();
        const hasTr = tracked.has(d);
        const col = isToday ? '#fabd2f' : hasTr ? '#b8bb26' : '#ebdbb2';
        const sym = isToday ? '◆' : hasTr ? '●' : ' ';
        row += `<span style="color:${col}">${String(d).padStart(2)}${sym} </span>`;
        const dow = (firstDow + d - 1) % 7;
        if (dow === 6 || d === days) { tl(row); row = '  '; }
      }
      tb();
      tl(`  <span style="color:#fabd2f">◆</span> today  <span style="color:#b8bb26">●</span> tracked`);
      tb();
    }, { desc: 'Show calendar for current month' });

    r('date', () => {
      const n = new Date();
      tl(`  <span style="color:#ebdbb2">${n.toDateString()}  ${n.toLocaleTimeString()}  UTC${n.getTimezoneOffset()<0?'+':''}${-n.getTimezoneOffset()/60}</span>`);
    }, { desc: 'Print current date and time' });

    r('whoami', () => {
      tl(`  <span style="color:#fabd2f">focus</span>`);
    }, { desc: 'Print current user' });

    r('env', () => {
      tb();
      tl(`<span style="color:#d3869b">── environment ────────────────────────────</span>`,'tl-head');
      [
        ['WORK_MINS', String(Math.floor(pomoSettings.work / 60))],
        ['SHORT_MINS', String(Math.floor(pomoSettings.short / 60))],
        ['LONG_MINS', String(Math.floor(pomoSettings.long / 60))],
        ['CYCLE', String(pomoSettings.cycle || 4)],
        ['AUTO_ADV', pomoSettings.autoAdv ? '1' : '0'],
        ['POMO_GOAL', String(pomoGoalTarget)],
        ['TIMESHEET', String(entries.length)],
        ['PROJECTS', String(projects.length)],
        ['GOALS', String(goals.length)],
        ['CLOCK_MODE', clock24h ? '24h' : '12h'],
      ].forEach(([k, val]) => tl(`  <span style="color:#83a598">${k.padEnd(16)}</span><span style="color:#ebdbb2">=${val}</span>`));
      tb();
    }, { desc: 'Show current settings and environment' });

    r('df', () => {
      const used = 0; // localStorage not directly accessible for size in this context
      const quota = 5 * 1024 * 1024;
      const pct = 0;
      tb();
      tl(`<span style="color:#d3869b">── storage usage ──────────────────────────</span>`,'tl-head');
      tl(`  <span style="color:#a89984">Filesystem   Size    Used    Avail   Use%</span>`);
      tl(`  <span style="color:#665c54">${'─'.repeat(44)}</span>`);
      tl(`  <span style="color:#ebdbb2">localStorage </span><span style="color:#a89984">5.0M</span>    <span style="color:#fabd2f">0B</span><span style="color:#a89984">5.0M</span><span style="color:#b8bb26">0%</span>`);
      tb();
    }, { desc: 'Show storage usage' });

    r('uptime', () => {
      const secs = Math.floor((Date.now() - nowRef.current.getTime()) / 1000);
      const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
      const n = new Date();
      tl(`  <span style="color:#a89984">${n.toLocaleTimeString()}  up ${h > 0 ? h + 'h ' : ''}${m}m ${s}s  ·  load: pomodoro ${pomoRunning ? 'active' : 'idle'}</span>`);
    }, { desc: 'Show session uptime' });

    r('echo', ({ args }) => {
      tl(`  ${escHtml(args.join(' '))}`,'tl-sub');
    }, { desc: 'Print text to terminal', usage: 'echo <text>' });

    r('man', ({ args }) => {
      const cmd = args[0];
      if (!cmd) { tl(`  usage: man &lt;command&gt;`,'tl-err'); return; }
      if (!c[cmd]) { tl(`  <span style="color:#fb4934">no manual entry for '${escHtml(cmd)}'</span>  (try 'help')`,'tl-err'); return; }
      const entry = c[cmd];
      tb();
      tl(`<span style="color:#d3869b">MAN(1)  FOCUS TERMINAL  MAN(1)</span>`,'tl-head');
      tb();
      tl(`<span style="color:#fabd2f">NAME</span>`);
      tl(`       ${cmd} — ${entry.desc || 'no description'}`);
      if (entry.usage) { tb(); tl(`<span style="color:#fabd2f">SYNOPSIS</span>`); tl(`       ${entry.usage}`); }
      tb();
    }, { desc: 'Show manual page for a command', usage: 'man <command>' });

    r('version', () => {
      tl(`  <span style="color:#fabd2f">FOCUS</span> <span style="color:#b8bb26">v2.0</span>  pomodoro + time tracker`);
      tl(`  <span style="color:#665c54">focusbash 2.0  ·  gruvbox dark  ·  JetBrains Mono</span>`);
    }, { desc: 'Show version info' });

    r('history', () => {
      const h = historyRef.current;
      if (!h.length) { tl(`  <span style="color:#665c54">no history</span>`); return; }
      tb();
      tl(`<span style="color:#d3869b">── command history ────────────────────────</span>`,'tl-head');
      [...h].reverse().forEach((cmd, i) => {
        tl(`  <span style="color:#665c54">${String(i+1).padStart(4)}</span>  <span style="color:#ebdbb2">${escHtml(cmd)}</span>`);
      });
      tb();
    }, { desc: 'Show command history' });

    r(['clear','cls'], () => { bootBanner(); }, { desc: 'Clear terminal' });

    r(['exit','quit','q'], () => { setOpen(false); }, { desc: 'Close terminal' });

    Object.assign(CMDS, c);
  }, [CMDS, entries, projects, goals, pomoSessions, pomoRunning, pomoSec, pomoMode, pomoSettings, pomoGoalTarget, sessionsD, taskRunning, taskPaused, activeEntry, clock24h, termLine, startPomo, pausePomo, resetPomo, setPomoMode, startTracking, stopTracking, pauseTracking, resumeTracking, bootBanner, fmtMS, escHtml, projColor]);

  const termExec = useCallback((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    historyRef.current.unshift(trimmed);
    setHistIdx(-1);
    if (historyRef.current.length > 200) historyRef.current.pop();
    termPs1Echo(trimmed);
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (CMDS[cmd]) {
      CMDS[cmd].fn({ args, raw: trimmed });
    } else {
      termLine(`  <span style="color:#fb4934">focusbash: command not found: ${escHtml(cmd)}</span>  <span style="color:#665c54">— try <span style="color:#8ec07c">help</span></span>`,'tl-err');
    }
  }, [CMDS, termPs1Echo, termLine, escHtml]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter') {
      termExec(input);
      setInput('');
      setHistIdx(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = historyRef.current;
      const next = histIdx + 1;
      if (next < h.length) {
        setHistIdx(next);
        setInput(h[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) {
        setHistIdx(histIdx - 1);
        setInput(historyRef.current[histIdx - 1]);
      } else if (histIdx === 0) {
        setHistIdx(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const partial = input.toLowerCase().split(' ')[0];
      const isFirst = !input.includes(' ');
      if (isFirst) {
        const matches = [...new Set(Object.keys(CMDS))].filter(c => c.startsWith(partial));
        if (matches.length === 1) setInput(matches[0]);
        else if (matches.length > 1) {
          termLine(`  <span style="color:#a89984">${matches.sort().join('  ')}</span>`);
        }
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      bootBanner();
    } else if (e.ctrlKey && e.key === 'c') {
      setInput('');
    }
  }, [input, histIdx, termExec, CMDS, termLine, bootBanner]);

  if (!open) return null;

  return (
    <div className="term-overlay open" onClick={(e) => { if (e.target.classList.contains('term-overlay')) setOpen(false); }}>
      <div className="term-window" onClick={() => inputRef.current?.focus()}>
        <div className="term-titlebar">
          <div className="term-dots">
            <span className="term-dot tdclose" onClick={() => setOpen(false)} title="Close (`)"></span>
            <span className="term-dot tdmin"></span>
            <span className="term-dot tdmax"></span>
          </div>
          <span className="term-title-text">focus@arch — bash</span>
          <div style={{width:'52px'}}></div>
        </div>
        <div className="term-output">
          {lines.map((line, i) => (
            <div key={i} className={`term-line ${line.cls}`} dangerouslySetInnerHTML={{__html: line.html}} />
          ))}
          <div ref={endRef} />
        </div>
        <div className="term-input-row">
          <span className="term-ps1">
            <span className="tp-user">focus</span><span className="tp-at">@</span><span className="tp-host">arch</span><span className="tp-sep">:</span><span className="tp-tilde">~</span><span className="tp-dollar">$</span>
          </span>
          <input ref={inputRef} className="term-input" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            onBlur={() => setTimeout(() => inputRef.current?.focus(), 10)} />
        </div>
      </div>
    </div>
  );
}
