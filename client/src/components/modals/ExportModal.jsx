import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { exportData } from '../../api/data';
import { fmt } from '../../utils/helpers';

export default function ExportModal() {
  const { addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = async () => {
      setOpen(true);
      setLoading(true);
      try {
        const d = await exportData();
        setData(d);
      } catch {
        addToast('Failed to load export data', 'err');
      }
      setLoading(false);
    };
    document.addEventListener('click', (e) => {
      if (e.target.closest('.exp')) handler();
    });
    return () => {};
  }, [addToast]);

  const close = () => setOpen(false);

  const handlePdf = () => {
    window.open('/api/export/pdf', '_blank');
    addToast('PDF opened in new tab');
  };

  const handleJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focused-export.json';
    a.click();
    URL.revokeObjectURL(url);
    addToast('JSON downloaded!');
  };

  const entriesCount = data?.entries?.length || 0;
  const totalMs = (data?.entries || []).reduce((s, e) => s + (e.durationMs || 0), 0);
  const projCount = data?.projects?.length || 0;
  const goalCount = data?.goals?.length || 0;
  const pomoCount = data?.pomoSessions?.length || 0;
  const habitCount = data?.habits?.length || 0;
  const noteCount = data?.notes?.length || 0;

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="exportModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">EXPORT DATA</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-spinner"><i className="fas fa-spinner fa-pulse"></i> Loading…</div>
          ) : data ? (
            <div className="export-summary">
              <div className="export-stat"><span className="export-label">Entries</span><span className="export-val">{entriesCount}</span></div>
              <div className="export-stat"><span className="export-label">Time Tracked</span><span className="export-val">{fmt(totalMs)}</span></div>
              <div className="export-stat"><span className="export-label">Projects</span><span className="export-val">{projCount}</span></div>
              <div className="export-stat"><span className="export-label">Goals</span><span className="export-val">{goalCount}</span></div>
              <div className="export-stat"><span className="export-label">Pomodoros</span><span className="export-val">{pomoCount}</span></div>
              <div className="export-stat"><span className="export-label">Habits</span><span className="export-val">{habitCount}</span></div>
            </div>
          ) : (
            <div className="errmsg show">Failed to load data. Try again.</div>
          )}
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CLOSE</button>
          <button className="btn btn-p" onClick={handleJson} disabled={!data}><i className="fas fa-download"></i> EXPORT JSON</button>
        </div>
      </div>
    </div>
  );
}
