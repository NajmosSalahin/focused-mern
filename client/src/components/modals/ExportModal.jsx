import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { exportData } from '../../api/data';
import { fmt } from '../../utils/helpers';

export default function ExportModal() {
  const { entries, projects, goals, pomoSessions, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [jsonLoading, setJsonLoading] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener('click', (e) => {
      if (e.target.closest('.exp')) handler();
    });
    return () => {};
  }, []);

  const close = () => setOpen(false);

  const handlePdf = () => {
    window.open('/api/export/pdf', '_blank');
    addToast('PDF opened in new tab');
  };

  const handleJson = useCallback(async () => {
    if (jsonLoading) return;
    setJsonLoading(true);
    try {
      const d = await exportData();
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'focused-export.json';
      a.click();
      URL.revokeObjectURL(url);
      addToast('JSON downloaded!');
    } catch {
      addToast('Failed to load export data', 'err');
    }
    setJsonLoading(false);
  }, [jsonLoading, addToast]);

  const entriesCount = entries.length;
  const totalMs = entries.reduce((s, e) => s + (e.durationMs || 0), 0);
  const projCount = projects.length;
  const goalCount = goals.length;
  const pomoCount = pomoSessions.length;

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="exportModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">EXPORT DATA</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          <div className="export-summary">
            <div className="export-stat"><span className="export-label">Entries</span><span className="export-val">{entriesCount}</span></div>
            <div className="export-stat"><span className="export-label">Time Tracked</span><span className="export-val">{fmt(totalMs)}</span></div>
            <div className="export-stat"><span className="export-label">Projects</span><span className="export-val">{projCount}</span></div>
            <div className="export-stat"><span className="export-label">Goals</span><span className="export-val">{goalCount}</span></div>
            <div className="export-stat"><span className="export-label">Pomodoros</span><span className="export-val">{pomoCount}</span></div>
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CLOSE</button>
          <button className="btn btn-p" onClick={handleJson} disabled={jsonLoading}>
            {jsonLoading ? <i className="fas fa-spinner fa-pulse"></i> : <i className="fas fa-download"></i>} {jsonLoading ? 'LOADING…' : 'EXPORT JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
