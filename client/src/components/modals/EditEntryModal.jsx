import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { updateEntry } from '../../api/entries';

export default function EditEntryModal() {
  const { projects, entries, reloadEntries, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [entryId, setEntryId] = useState(null);
  const [task, setTask] = useState('');
  const [proj, setProj] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const handler = (e) => {
      const entry = e.detail?.entryId
        ? entries.find(en => en._id === e.detail.entryId)
        : e.detail?._id ? e.detail : null;
      if (!entry) return;
      setEntryId(entry._id);
      setTask(entry.task || '');
      setProj(entry.projectId || '');
      setErr('');
      setOpen(true);
    };
    window.addEventListener('openEditEntry', handler);
    return () => window.removeEventListener('openEditEntry', handler);
  }, [entries]);

  const close = () => setOpen(false);

  const handleSave = async () => {
    if (!task.trim()) { setErr('Task description is required.'); return; }
    setErr('');
    try {
      await updateEntry(entryId, {
        task: task.trim(),
        projectId: proj || null,
        projectName: proj ? projects.find(p => p._id === proj)?.name || null : null,
      });
      await reloadEntries();
      addToast('Entry updated!');
      close();
    } catch { addToast('Failed to update entry', 'err'); }
  };

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="editEntryModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">EDIT ENTRY</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          {err && <div className="errmsg show mb">{err}</div>}
          <div className="field">
            <label>Task Description</label>
            <input type="text" value={task} onChange={e => setTask(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Project</label>
            <select value={proj} onChange={e => setProj(e.target.value)}>
              <option value="">No Project</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CANCEL</button>
          <button className="btn btn-p" onClick={handleSave}>SAVE</button>
        </div>
      </div>
    </div>
  );
}
