import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmt, sameDay, sameWeek, sameMon } from '../utils/helpers';
import { deleteGoal } from '../api/goals';
import { alert } from './modals/AlertModal';

export default function GoalsPanel() {
  const { goals, entries, setGoals, addToast } = useApp();

  const handleDelete = async (id) => {
    if (!(await alert('Delete this goal?', true, true))) return;
    try {
      await deleteGoal(id);
      setGoals(prev => prev.filter(g => g._id !== id));
      addToast('Goal deleted.');
    } catch { addToast('Failed to delete', 'err'); }
  };

  const now = new Date();
  const circ = 100.53;

  return (
    <div className="card card-scroll">
      <div className="chead">
        <div className="ctitle">GOALS</div>
        <button className="add-btn" onClick={() => window.dispatchEvent(new CustomEvent('openCreateGoal'))}><i className="fas fa-plus"></i></button>
      </div>
      <div id="goalList" role="list">
        {goals.length === 0 && <div className="empty">// no goals set</div>}
        {goals.map(g => {
          const lr = new Date(g.lastResetDate);
          const reset = (g.frequency === 'day' && !sameDay(now, lr)) ||
            (g.frequency === 'week' && !sameWeek(now, lr)) ||
            (g.frequency === 'month' && !sameMon(now, lr));
          const currentMs = reset ? 0 : (g.currentMs || 0);
          const rawPct = (currentMs / g.targetMs) * 100 || 0;
          const displayPct = Math.round(Math.min(rawPct, 999));
          const exceeded = g.type === 'atMost' && rawPct > 100;
          const ended = g.endDate && now > new Date(g.endDate);
          const pct = Math.min(100, rawPct);
          const offset = circ * (1 - pct / 100);

          return (
            <div key={g._id} className="goal-item" role="listitem">
              <div className="g-ring" aria-hidden="true">
                <svg viewBox="0 0 38 38">
                  <circle className="grb" cx="19" cy="19" r="16" />
                  <circle className={`grf${exceeded ? ' exceeded' : ''}`} cx="19" cy="19" r="16" style={{ strokeDashoffset: offset }} />
                </svg>
                <div className={`g-pct${exceeded ? ' exceeded' : ''}`}>{displayPct}%</div>
              </div>
              <div className="g-body">
                <div className="g-name">
                  {g.name}
                  {ended && <span style={{ color: 'var(--red-b)', fontSize: '8px' }}> [ENDED]</span>}
                  {exceeded && <span style={{ color: 'var(--red-b)', fontSize: '8px' }}> [OVER]</span>}
                </div>
                <div className="g-meta">{g.type === 'atLeast' ? '≥' : '≤'} {fmt(g.targetMs)} / {g.frequency} · {fmt(currentMs)} tracked{g.projectName ? ' · ' + g.projectName : ''}</div>
              </div>
              <div className="iacts">
                <button className="ia ed" onClick={() => {
                  window.dispatchEvent(new CustomEvent('openEditGoal', { detail: g }));
                }} title="Edit goal"><i className="fas fa-pen"></i></button>
                <button className="ia dl" onClick={() => handleDelete(g._id)} title="Delete goal"><i className="fas fa-trash"></i></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
