import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

const isTyping = () => {
  const el = document.activeElement;
  const tag = el?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable;
};

const overlayOpen = () => !!document.querySelector('.overlay.open, .cmd-overlay.open');

const click = (sel) => document.querySelector(sel)?.click();

// Global shortcuts documented in KeyboardShortcutsModal:
// G, P, [, ], T, Ctrl+S, Ctrl+E, Ctrl+I, Ctrl+,
export default function useHotkeys() {
  const { viewDate, setViewDate } = useApp();

  useEffect(() => {
    const handler = (e) => {
      if (e.repeat || e.altKey) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl) {
        if (key === 's') { e.preventDefault(); click('.stat-btn'); return; }
        if (key === 'e') { e.preventDefault(); click('.exp'); return; }
        if (key === 'i') { e.preventDefault(); click('.imp'); return; }
        if (key === ',' || e.key === ',') { e.preventDefault(); window.dispatchEvent(new CustomEvent('openPomoSettings')); return; }
        return;
      }

      if (isTyping() || overlayOpen()) return;

      if (key === 'g') { e.preventDefault(); window.dispatchEvent(new CustomEvent('openCreateGoal')); }
      else if (key === 'p') { e.preventDefault(); window.dispatchEvent(new CustomEvent('openCreateProject')); }
      else if (e.key === '[') { e.preventDefault(); const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }
      else if (e.key === ']') { e.preventDefault(); const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }
      else if (key === 't') { e.preventDefault(); setViewDate(new Date()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewDate, setViewDate]);
}
