import { useApp } from '../context/AppContext';
import { fmt, PROJ_COLORS } from '../utils/helpers';
import { deleteProject } from '../api/projects';
import { alert } from './modals/AlertModal';

export default function ProjectsPanel() {
  const { projects, entries, taskRunning, activeEntry, reloadProjects, reloadEntries, addToast } = useApp();

  const handleDelete = async (id) => {
    const msg = taskRunning && activeEntry && activeEntry.projectId === id
      ? 'This project has a running timer. Delete anyway?'
      : 'Delete this project?';
    if (!(await alert(msg, true, true))) return;
    try {
      await deleteProject(id);
      await reloadProjects();
      await reloadEntries();
      addToast('Project deleted.');
    } catch { addToast('Failed to delete', 'err'); }
  };

  return (
    <div className="card card-scroll">
      <div className="chead">
        <div className="ctitle">PROJECTS</div>
        <button className="add-btn" onClick={() => window.dispatchEvent(new CustomEvent('openCreateProject'))}><i className="fas fa-plus"></i></button>
      </div>
      <div id="projList" role="list">
        {projects.length === 0 && <div className="empty">// no projects</div>}
        {projects.map((p, i) => {
          const total = entries.reduce((s, e) => e.projectId === p._id ? s + (e.durationMs || 0) : s, 0);
          const color = PROJ_COLORS[i % PROJ_COLORS.length];
          return (
            <div key={p._id} className="proj-item" role="listitem">
              <div className="p-dot" style={{ background: color }} aria-hidden="true"></div>
              <div className="p-body">
                <div className="p-name">{p.name}</div>
                <div className="p-total">{fmt(total)} tracked</div>
              </div>
              <div className="iacts">
                <button className="ia ed" onClick={() => {
                  window.dispatchEvent(new CustomEvent('openEditProject', { detail: p }));
                }} title="Edit project"><i className="fas fa-pen"></i></button>
                <button className="ia dl" onClick={() => handleDelete(p._id)} title="Delete project"><i className="fas fa-trash"></i></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
