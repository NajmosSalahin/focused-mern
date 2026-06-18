import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { createProject } from '../../api/projects';

export default function CreateProjectModal() {
  const { setProjects, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const handler = () => {
      setName(''); setErr('');
      setOpen(true);
    };
    window.addEventListener('openCreateProject', handler);
    document.addEventListener('click', (e) => {
      if (e.target.closest('#openProjBtn')) handler();
    });
    return () => { window.removeEventListener('openCreateProject', handler); };
  }, []);

  const close = () => setOpen(false);

  const handleCreate = async () => {
    if (!name.trim()) { setErr('Project name is required.'); return; }
    setErr('');
    try {
      const created = await createProject({ name: name.trim() });
      setProjects(prev => [created, ...prev]);
      addToast('Project created!');
      close();
    } catch { addToast('Failed to create project', 'err'); }
  };

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="createProjectModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">NEW PROJECT</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          {err && <div className="errmsg show mb">{err}</div>}
          <div className="field">
            <label>Project Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Side Project" autoFocus />
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CANCEL</button>
          <button className="btn btn-p" onClick={handleCreate}>CREATE</button>
        </div>
      </div>
    </div>
  );
}
