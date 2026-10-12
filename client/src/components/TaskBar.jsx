import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { fmt } from '../utils/helpers';

const selectStyle = { background: 'var(--bg)', border: '1px solid var(--bg2)', color: 'var(--fg)', padding: '6px 8px', borderRadius: 'var(--r)', fontFamily: 'var(--mono)', fontSize: '11px', minWidth: '100px', maxWidth: '160px', cursor: 'pointer', outline: 'none' };
const inputStyle = { flex: 1, minWidth: '120px', background: 'transparent', border: 'none', color: 'var(--fg)', fontFamily: 'var(--body)', fontSize: '15px', outline: 'none', padding: '6px 0' };

export default function TaskBar() {
  const {
    projects, taskRunning, taskPaused, activeEntry, liveElapsed,
    startTracking, stopTracking, pauseTracking, resumeTracking, addToast,
    isPomoControlled
  } = useApp();
  const [task, setTask] = useState('');
  const [proj, setProj] = useState('');
  const inputRef = useRef(null);
  const [liveMs, setLiveMs] = useState(0);
  const [editingTask, setEditingTask] = useState('');

  useEffect(() => {
    if (taskRunning && activeEntry) {
      setTask(activeEntry.task || '');
      setProj(activeEntry.projectId || '');
      setLiveMs(liveElapsed);
    } else {
      setLiveMs(0);
    }
  }, [taskRunning, activeEntry, liveElapsed]);

  useEffect(() => {
    if (!taskRunning) {
      setTask('');
      setProj('');
    }
  }, [taskRunning]);

  const handleStart = () => {
    const desc = task.trim();
    if (!desc) { addToast('Enter a task description first.', 'err'); inputRef.current?.focus(); return; }
    const pid = proj || null;
    const pname = pid ? projects.find(p => p._id === pid)?.name || null : null;
    startTracking(desc, pid, pname);
  };

  const handleStop = () => {
    stopTracking();
    setTask('');
    setProj('');
  };

  const handlePause = () => {
    if (!taskPaused) pauseTracking();
    else resumeTracking();
  };

  // Keyboard: N (focus input), Ctrl+Enter (start/stop), Ctrl+P (pause/resume)
  useEffect(() => {
    const handler = (e) => {
      if (e.repeat || e.altKey) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        if (taskRunning) handleStop();
        else if (!isPomoControlled) handleStart();
        return;
      }

      if (ctrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (taskRunning && !isPomoControlled) handlePause();
        return;
      }

      if (!ctrl && (e.key === 'n' || e.key === 'N')) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (document.querySelector('.overlay.open, .cmd-overlay.open')) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const isRunning = taskRunning && !taskPaused;
  const isPaused = taskRunning && taskPaused;

  return (
    <div className="task-bar">
      <select value={proj} onChange={e => setProj(e.target.value)} disabled={taskRunning} aria-label="Select project"
        style={selectStyle}>
        <option value="">— no project —</option>
        {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
      </select>
      <input ref={inputRef} value={task} onChange={e => setTask(e.target.value)} aria-label="Task description"
        placeholder="What are you working on right now?"
        readOnly={taskRunning}
        onKeyDown={e => { if (e.key === 'Enter' && !taskRunning) handleStart(); }}
        style={inputStyle} />
      <span className={`live${!taskRunning ? ' off' : ''}`}>{fmt(liveMs || 0)}</span>
      {isPomoControlled && <span className="pomo-badge" title="Controlled by pomodoro focus">POMO</span>}
      {!taskRunning ? (
        <button className="track-btn" onClick={handleStart} disabled={isPomoControlled}>
          <i className="fas fa-play"></i> START
        </button>
      ) : (
        <>
          <button className={`track-btn on`} onClick={handleStop}>
            <i className="fas fa-stop"></i> STOP
          </button>
          {!isPomoControlled && (
            <button className={`track-btn pause-btn${isPaused ? ' resuming' : ''}`} onClick={handlePause}>
              <i className={`fas fa-${isPaused ? 'play' : 'pause'}`}></i> {isPaused ? 'RESUME' : 'PAUSE'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
