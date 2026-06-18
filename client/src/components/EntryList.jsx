import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmt, sameDay, projColor } from '../utils/helpers';
import { deleteEntry } from '../api/entries';
import { alert } from './modals/AlertModal';

export default function EntryList() {
  const [expanded, setExpanded] = useState({});
  const { entries, viewDate, taskRunning, activeEntry, taskPaused, currentSegStart, liveElapsed, projects, setEntries, addToast } = useApp();
  const now = new Date();
  const isToday = sameDay(viewDate, now);
  const lbl = isToday ? 'TODAY' : viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  const filtered = entries.filter(e => e.startTime && sameDay(new Date(e.startTime), viewDate))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  const handleDelete = async (id) => {
    if (taskRunning && activeEntry && activeEntry._id === id) { addToast("Stop the timer first.", 'err'); return; }
    if (!(await alert('Delete this time entry?', true, true))) return;
    try {
      await deleteEntry(id);
      setEntries(prev => prev.filter(e => e._id !== id));
      addToast('Entry deleted.');
    } catch { addToast('Failed to delete', 'err'); }
  };

  const fmtT = d => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const toggleExpanded = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="card card-scroll">
      <div className="chead">
        <div className="ctitle">TIMESHEET — <b>{lbl}</b></div>
      </div>
      <div className="entries" id="entryList" role="list">
        {filtered.length === 0 && <div className="empty">// no entries for this day</div>}
        {filtered.map(e => {
          const isRunningEntry = taskRunning && activeEntry && e._id === activeEntry._id;
          const isPausedEntry = isRunningEntry && taskPaused;
          const isExpanded = expanded[e._id];
          const color = e.projectId ? projColor(projects, e.projectId) : '#665c54';
          let elapsed = e.durationMs || 0;
          if (isRunningEntry && !isPausedEntry && currentSegStart) {
            elapsed = (activeEntry?.durationMs || 0) + liveElapsed;
          }
          const segs = e.segments || [];
          const hasSegments = segs.length > 0;
          return (
            <div key={e._id} className={`entry${isPausedEntry ? ' paused' : ''}${isRunningEntry ? ' running' : ''}`} role="listitem">
              <div className="e-bar" style={{ background: color }}></div>
              <div className="e-body">
                <div className="e-task-row">
                  {hasSegments && (
                    <span className="e-chevron" onClick={() => toggleExpanded(e._id)}
                      title={isExpanded ? 'Collapse' : 'Expand segments'}>
                      <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                    </span>
                  )}
                  <span className="e-task">{e.task}</span>
                </div>
                <div className="e-meta">{e.projectName || 'no project'}</div>
              </div>
              <div className={`e-dur${isRunningEntry ? ' running' : ''}`}>{fmt(elapsed)}</div>
              <div className="e-acts">
                <button className="ea ed" onClick={() => {
                  const toEdit = new CustomEvent('openEditEntry', { detail: e });
                  window.dispatchEvent(toEdit);
                }} title="Edit entry"><i className="fas fa-pen"></i></button>
                <button className="ea dl" onClick={() => handleDelete(e._id)} title="Delete entry"><i className="fas fa-trash"></i></button>
              </div>
              {isExpanded && hasSegments && (
                <div className="e-segments">
                  {segs.map((s, i) => (
                    <div key={i} className="e-seg">
                      <span className="e-seg-idx">#{i + 1}</span>
                      <span className="e-seg-range">{fmtT(s.start)} → {fmtT(s.end)}</span>
                      <span className="e-seg-dur">{fmt(s.end - s.start)}</span>
                    </div>
                  ))}
                  <div className="e-seg e-seg-total">
                    <span>Total</span>
                    <span className="e-seg-dur">{fmt(segs.reduce((sum, s) => sum + (s.end - s.start), 0))}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
