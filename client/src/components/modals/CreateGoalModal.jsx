import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { createGoal } from '../../api/goals';

export default function CreateGoalModal() {
  const { projects, setGoals, addToast } = useApp();
  const [open, setOpen] = useState(false);
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
    const handler = () => {
      setName(''); setProj(''); setType('atLeast');
      setHours(''); setMins(''); setFreq('day');
      setUntil(''); setNoEnd(false); setErr('');
      setOpen(true);
    };
    window.addEventListener('openCreateGoal', handler);
    document.getElementById('openGoalBtn')?.addEventListener('click', handler);
    return () => window.removeEventListener('openCreateGoal', handler);
  }, []);

  const close = () => setOpen(false);

  const handleCreate = async () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    const ms = ((parseInt(hours) || 0) * 3600 + (parseInt(mins) || 0) * 60) * 1000;
    if (ms <= 0) { setErr('Enter a positive time target.'); return; }
    if (!noEnd && !until) { setErr('Select an end date or check no end date.'); return; }
    setErr('');
    const pid = proj || null;
    try {
      const created = await createGoal({
        name: name.trim(), type, targetMs: ms, frequency: freq,
        endDate: noEnd ? null : until,
        currentMs: 0, lastResetDate: new Date().toISOString(),
        projectId: pid,
        projectName: pid ? projects.find(p => p._id === pid)?.name || null : null,
      });
      setGoals(prev => [created, ...prev]);
      addToast('Goal created!');
      close();
    } catch { addToast('Failed to create goal', 'err'); }
  };

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="createGoalModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">NEW GOAL</div>
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
          <button className="btn btn-p" onClick={handleCreate}>CREATE GOAL</button>
        </div>
      </div>
    </div>
  );
}
