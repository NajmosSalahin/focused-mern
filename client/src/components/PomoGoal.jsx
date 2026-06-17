import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function PomoGoal() {
  const { pomoSessions, pomoGoalTarget, setPomoGoalTarget, addToast } = useApp();
  const [target, setTarget] = useState(pomoGoalTarget);

  useEffect(() => { setTarget(pomoGoalTarget); }, [pomoGoalTarget]);

  const today = new Date().toISOString().split('T')[0];
  const done = pomoSessions.filter(s => s.mode === 'work' && !s.skipped && new Date(s.completedAt).toISOString().split('T')[0] === today).length;
  const pct = Math.min(100, (done / target) * 100);
  const met = done >= target;

  const handleSet = () => {
    const v = parseInt(target);
    if (v >= 1 && v <= 24) {
      setPomoGoalTarget(v);
      addToast(`Daily goal set to ${v} sessions`);
    }
  };

  return (
    <div className="card">
      <div className="chead"><div className="ctitle">DAILY GOAL</div></div>
      <div className="pg-row">
        <div className="pg-count">
          <span>{done}</span>
          <span className="pg-slash"> / <span>{target}</span></span>
        </div>
        <div className="pg-target">{met ? '✓ GOAL MET!' : 'sessions'}</div>
      </div>
      <div className="pg-bar-wrap">
        <div className="pg-bar" style={{ width: pct + '%', background: met ? 'var(--green-b)' : 'var(--yellow)' }}></div>
      </div>
      <div className="pg-set">
        <button className="pg-nudge" onClick={() => { const v = Math.max(1, target - 1); setTarget(v); setPomoGoalTarget(v); }}>−</button>
        <input type="number" min="1" max="24" value={target} onChange={e => setTarget(parseInt(e.target.value) || 8)} />
        <button className="pg-nudge" onClick={() => { const v = Math.min(24, target + 1); setTarget(v); setPomoGoalTarget(v); }}>+</button>
        <button className="btn btn-s pg-set-btn" onClick={handleSet}>SET</button>
      </div>
    </div>
  );
}
