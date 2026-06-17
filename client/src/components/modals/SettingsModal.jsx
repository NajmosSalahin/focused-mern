import { useApp, DEFAULT_POMO } from '../../context/AppContext';
import { alert } from './AlertModal';
import { deleteAllUserData } from '../../api/account';
import { updatePomoSettings } from '../../api/pomo';

export default function SettingsModal() {
  const {
    clock24h, setClock24h, weatherVisible, setWeatherVisible,
    setEntries, setProjects, setGoals, setPomoSessions,
    setPomoSettings, setPomoGoalTarget, addToast,
  } = useApp();

  const close = () => {
    const el = document.getElementById('settingsModal');
    if (el) el.classList.remove('open');
  };

  const handleResetDefaults = async () => {
    const ok = await alert('Reset all settings to defaults?\n\nTimers, plan, clock format, and weather widget will be restored to factory defaults.', true);
    if (!ok) return;
    setClock24h(true);
    setWeatherVisible(true);
    try {
      await updatePomoSettings(DEFAULT_POMO);
      setPomoSettings(DEFAULT_POMO);
      addToast('Settings reset to defaults');
    } catch {
      addToast('Failed to reset settings', 'err');
    }
  };

  const handleDeleteAll = async () => {
    const ok = await alert(
      'Delete ALL your data?\n\nThis will permanently remove all entries, projects, goals, pomodoro sessions, habits, weather data, and notes.\n\nThis action CANNOT be undone.',
      true, true
    );
    if (!ok) return;
    try {
      await deleteAllUserData();
      setEntries([]);
      setProjects([]);
      setGoals([]);
      setPomoSessions([]);
      setPomoSettings(DEFAULT_POMO);
      setPomoGoalTarget(8);
      addToast('All data deleted');
      close();
    } catch {
      addToast('Failed to delete data', 'err');
    }
  };

  return (
    <div className="overlay" id="settingsModal">
      <div className="modal">
        <div className="mhead">
          <div className="mtitle"><i className="fas fa-cog"></i> SETTINGS</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          <div className="set-row">
            <span className="set-label">24-hour clock</span>
            <label className="stoggle">
              <input type="checkbox" checked={clock24h} onChange={e => setClock24h(e.target.checked)} />
              <span className="stoggle-slider"></span>
            </label>
          </div>
          <div className="set-row">
            <span className="set-label">Weather widget</span>
            <label className="stoggle">
              <input type="checkbox" checked={weatherVisible} onChange={e => setWeatherVisible(e.target.checked)} />
              <span className="stoggle-slider"></span>
            </label>
          </div>

          <hr className="set-divider" />
          <div className="set-section-title"><i className="fas fa-undo"></i> RESET</div>
          <button className="btn btn-p" onClick={handleResetDefaults} style={{ width: '100%', marginBottom: 4 }}>
            <i className="fas fa-undo"></i> RESET TO DEFAULTS
          </button>

          <hr className="set-divider" />
          <div className="set-section-title set-danger"><i className="fas fa-trash"></i> DANGER ZONE</div>
          <button className="btn btn-d" onClick={handleDeleteAll} style={{ width: '100%' }}>
            <i className="fas fa-trash"></i> DELETE ALL DATA
          </button>
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}
