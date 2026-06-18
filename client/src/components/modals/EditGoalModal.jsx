import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { updateGoal } from '../../api/goals';

export default function EditGoalModal() {
  const { projects, goals, setGoals, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [goalId, setGoalId] = useState(null);
  const [name, setName] = useState('');
  const [proj, setProj] = useState('');
  const [type, setType] = useState('atLeast');
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [freq, setFreq] = useState('day');
  const [until, setUntil] = useState('');
  const [noEnd, setNoEnd] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const handler = (e) => {
      const goal = e.detail?.goalId
        ? goals.find(g => g._id === e.detail.goalId)
        : e.detail?._id ? e.detail : null;
      if (!goal) return;
      setGoalId(goal._id);
      setName(goal.name || '');
      setProj(goal.projectId || '');
      setType(goal.type || 'atLeast');
      const totalSec = Math.round((goal.targetMs || 0) / 1000);
      setHours(String(Math.floor(totalSec / 3600)));
      setMins(String(Math.floor((totalSec % 3600) / 60)));
      setFreq(goal.frequency || 'day');
      setUntil(goal.endDate ? goal.endDate.split('T')[0] : '');
      setNoEnd(!goal.endDate);
      setErr('');
      setOpen(true);
    };
    window.addEventListener('openEditGoal', handler);
    return () => window.removeEventListener('openEditGoal', handler);
  }, [goals]);

  const close = () => setOpen(false);

  const handleSave = async () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    const ms = ((parseInt(hours) || 0) * 3600 + (parseInt(mins) || 0) * 60) * 1000;
    if (ms <= 0) { setErr('Enter a positive time target.'); return; }
    if (!noEnd && !until) { setErr('Select an end date or check no end date.'); return; }
    setErr('');
    try {
      const updated = await updateGoal(goalId, {
        name: name.trim(), type, targetMs: ms, frequency: freq,
        endDate: noEnd ? null : until,
        projectId: proj || null,
        projectName: proj ? projects.find(p => p._id === proj)?.name || null : null,
      });
      setGoals(prev => prev.map(g => g._id === goalId ? (updated || { ...g, name: name.trim() }) : g));
      addToast('Goal updated!');
      close();
    } catch { addToast('Failed to update goal', 'err'); }
  };

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="editGoalModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">EDIT GOAL</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          {err && <div className="errmsg show mb">{err}</div>}
          <div className="field">
            <label>Goal Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Code every day" />
          </div>
          <div className="field">
            <label>Track Project (optional)</label>
            <select value={proj} onChange={e => setProj(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="atLeast">At least</option>
              <option value="atMost">At most</option>
            </select>
          </div>
          <div className="field">
            <label>Target Time</label>
            <div className="frow">
              <div className="field"><input type="text" inputMode="numeric" placeholder="hrs" value={hours} onChange={e => setHours(e.target.value.replace(/\D/g, ''))} /></div>
              <div className="field"><input type="text" inputMode="numeric" placeholder="mins" value={mins} onChange={e => setMins(e.target.value.replace(/\D/g, ''))} /></div>
              <div className="field"><select value={freq} onChange={e => setFreq(e.target.value)}>
                <option value="day">/ day</option>
                <option value="week">/ week</option>
                <option value="month">/ month</option>
              </select></div>
            </div>
          </div>
          <div className="field">
            <label>Until</label>
            <input type="date" value={until} onChange={e => setUntil(e.target.value)} disabled={noEnd} />
            <label className="cb-row"><input type="checkbox" checked={noEnd} onChange={e => setNoEnd(e.target.checked)} /> No end date</label>
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CANCEL</button>
          <button className="btn btn-p" onClick={handleSave}>SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
}
