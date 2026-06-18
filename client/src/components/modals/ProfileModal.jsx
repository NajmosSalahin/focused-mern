import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function ProfileModal() {
  const { user, updateProfile } = useAuth();
  const { projects, goals, entries, pomoSessions, addToast } = useApp();
  const [name, setName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const close = () => {
    const el = document.getElementById('profileModal');
    if (el) el.classList.remove('open');
  };

  const handleSave = async () => {
    if (!name.trim()) { addToast('Enter a display name.', 'err'); return; }
    setSaving(true);
    try {
      await updateProfile({ displayName: name.trim() });
      addToast('Profile updated');
    } catch {
      addToast('Failed to update profile', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.target.blur(); handleSave(); }
    if (e.key === 'Escape') close();
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const stats = [
    { val: projects.length, lbl: 'Projects', icon: 'fa-folder' },
    { val: goals.length, lbl: 'Goals', icon: 'fa-bullseye' },
    { val: entries.length, lbl: 'Entries', icon: 'fa-list-check' },
    { val: pomoSessions.length, lbl: 'Pomodoros', icon: 'fa-fire' },
  ];

  return (
    <div className="overlay" id="profileModal">
      <div className="modal">
        <div className="mhead">
          <div className="mtitle"><i className="fas fa-user"></i> PROFILE</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          <div className="set-row">
            <span className="set-label">Email</span>
            <span className="set-value">{user?.email}</span>
          </div>
          <div className="set-row">
            <span className="set-label">Display name</span>
            <input className="auth-input profile-name-input" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Your name" />
          </div>

          <hr className="set-divider" />
          <div className="set-section-title"><i className="fas fa-chart-simple"></i> ACCOUNT STATS</div>
          <div className="profile-stats-grid">
            {stats.map((s, i) => (
              <div key={i} className="profile-stat-card">
                <div className="profile-stat-icon"><i className={`fas ${s.icon}`}></i></div>
                <div className="profile-stat-val">{s.val}</div>
                <div className="profile-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
          <div className="profile-member-since">
            <i className="fas fa-calendar"></i> Member since {memberSince}
          </div>
        </div>
      </div>
    </div>
  );
}
