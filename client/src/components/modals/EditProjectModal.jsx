import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { updateProject } from '../../api/projects';

export default function EditProjectModal() {
  const { projects, setProjects, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [projId, setProjId] = useState(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const handler = (e) => {
      const pid = e.detail?.projectId;
      const proj = projects.find(p => p._id === pid);
      if (!proj) return;
      setProjId(pid);
      setName(proj.name || '');
      setErr('');
      setOpen(true);
    };
    window.addEventListener('openEditProject', handler);
    return () => window.removeEventListener('openEditProject', handler);
  }, [projects]);

  const close = () => setOpen(false);

  const handleSave = async () => {
    if (!name.trim()) { setErr('Project name is required.'); return; }
    setErr('');
    try {
      const updated = await updateProject(projId, { name: name.trim() });
      setProjects(prev => prev.map(p => p._id === projId ? (updated || { ...p, name: name.trim() }) : p));
      addToast('Project updated!');
      close();
    } catch { addToast('Failed to update project', 'err'); }
  };

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="editProjectModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">EDIT PROJECT</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          {err && <div className="errmsg show mb">{err}</div>}
          <div className="field">
            <label>Project Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
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
