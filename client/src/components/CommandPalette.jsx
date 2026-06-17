import { useState, useEffect, useRef, useCallback } from 'react';

const COMMANDS = [
  { id: 'focus-task', label: 'Focus current task', icon: 'fa-play', action: () => document.querySelector('.track-btn')?.click() },
  { id: 'stop-task', label: 'Stop current task', icon: 'fa-stop', action: () => { const btns = document.querySelectorAll('.track-btn'); for (const b of btns) { if (b.textContent.includes('STOP')) { b.click(); break; } } } },
  { id: 'new-project', label: 'Create new project', icon: 'fa-folder-plus', action: () => window.dispatchEvent(new CustomEvent('openCreateProject')) },
  { id: 'new-goal', label: 'Create new goal', icon: 'fa-bullseye', action: () => window.dispatchEvent(new CustomEvent('openCreateGoal')) },
  { id: 'pomo-start', label: 'Start pomodoro', icon: 'fa-clock', action: () => { const btn = document.querySelector('.pomo-start-btn'); if (btn) btn.click(); } },
  { id: 'today', label: 'Go to today', icon: 'fa-calendar-check', action: () => { const btns = document.querySelectorAll('.date-nav button'); if (btns.length >= 2) btns[1].click(); } },
  { id: 'stats', label: 'Open statistics', icon: 'fa-chart-line', action: () => { const btn = document.querySelector('.stat-btn'); if (btn) btn.click(); } },
  { id: 'import', label: 'Import data', icon: 'fa-upload', action: () => { const btn = document.querySelector('.imp'); if (btn) btn.click(); } },
  { id: 'export', label: 'Export data', icon: 'fa-download', action: () => { const btn = document.querySelector('.exp'); if (btn) btn.click(); } },
  { id: 'pomo-settings', label: 'Pomodoro settings', icon: 'fa-gear', action: () => window.dispatchEvent(new CustomEvent('openPomoSettings')) },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'fa-keyboard', action: () => window.dispatchEvent(new CustomEvent('openKeyboardShortcuts')) },
];

function fuzzyMatch(text, query) {
  const lower = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < query.length; i++) {
    if (lower[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIdx(0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const filtered = query.trim()
    ? COMMANDS.filter(c => fuzzyMatch(c.label, query.trim().toLowerCase()))
    : COMMANDS;

  const execute = useCallback((cmd) => {
    cmd.action();
    setOpen(false);
    setQuery('');
  }, []);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIdx]) execute(filtered[selectedIdx]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  if (!open) return null;

  return (
    <div className="cmd-overlay open" onClick={() => { setOpen(false); setQuery(''); }}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <span className="cmd-prompt">❯</span>
          <input ref={inputRef} className="cmd-input" placeholder="Search commands…"
            value={query} onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKey} />
        </div>
        <div className="cmd-results">
          {filtered.length === 0 && <div className="cmd-empty">No commands match</div>}
          {filtered.map((cmd, i) => (
            <div key={cmd.id} className={`cmd-item${i === selectedIdx ? ' selected' : ''}`}
              onClick={() => execute(cmd)} onMouseEnter={() => setSelectedIdx(i)}>
              <i className={`fas ${cmd.icon} cmd-item-icon`}></i>
              <span>{cmd.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
