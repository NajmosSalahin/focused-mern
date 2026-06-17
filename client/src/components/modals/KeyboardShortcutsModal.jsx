import { useState, useEffect } from 'react';

export default function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    const customHandler = () => setOpen(true);
    document.addEventListener('click', (e) => {
      if (e.target.closest('.shortcuts-btn') || e.target.closest('[data-shortcuts-modal]')) handler();
    });
    window.addEventListener('openKeyboardShortcuts', customHandler);
    return () => window.removeEventListener('openKeyboardShortcuts', customHandler);
  }, []);

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="keyboardShortcutsModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">KEYBOARD SHORTCUTS</div>
          <button className="mcls" onClick={() => setOpen(false)}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          <div className="kb-grid">
            <div className="kb-section">
              <div className="kb-section-title">POMODORO</div>
              <div className="kb-row"><kbd>Space</kbd><span>Start / Pause timer</span></div>
              <div className="kb-row"><kbd>R</kbd><span>Reset current session</span></div>
              <div className="kb-row"><kbd>S</kbd><span>Skip to next session</span></div>
              <div className="kb-row"><kbd>1</kbd><span>Switch to Work mode</span></div>
              <div className="kb-row"><kbd>2</kbd><span>Switch to Short break</span></div>
              <div className="kb-row"><kbd>3</kbd><span>Switch to Long break</span></div>
            </div>
            <div className="kb-section">
              <div className="kb-section-title">TASK TRACKER</div>
              <div className="kb-row"><kbd>N</kbd><span>Focus task input</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>Enter</kbd><span>Start / Stop tracking</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>P</kbd><span>Pause / Resume tracker</span></div>
              <div className="kb-row"><kbd>[</kbd><span>Previous day</span></div>
              <div className="kb-row"><kbd>]</kbd><span>Next day</span></div>
              <div className="kb-row"><kbd>T</kbd><span>Jump to today</span></div>
            </div>
            <div className="kb-section">
              <div className="kb-section-title">NAVIGATION</div>
              <div className="kb-row"><kbd>G</kbd><span>New goal</span></div>
              <div className="kb-row"><kbd>P</kbd><span>New project</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>K</kbd><span>Command palette</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>,</kbd><span>Pomodoro settings</span></div>
            </div>
            <div className="kb-section">
              <div className="kb-section-title">MISC</div>
              <div className="kb-row"><kbd>`</kbd><span>Open terminal</span></div>
              <div className="kb-row"><kbd>?</kbd><span>Keyboard shortcuts panel</span></div>
              <div className="kb-row"><kbd>Esc</kbd><span>Close modal / overlay</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>S</kbd><span>Statistics &amp; analytics</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>E</kbd><span>Export data</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>I</kbd><span>Import data</span></div>
              <div className="kb-row"><kbd>Ctrl</kbd><span>+</span><kbd>L</kbd><span>Clear terminal</span></div>
            </div>
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-p" onClick={() => setOpen(false)}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}
