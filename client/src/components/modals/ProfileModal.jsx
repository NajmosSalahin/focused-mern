import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function ProfileModal() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useApp();
  const [name, setName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const close = () => {
    const el = document.getElementById('profileModal');
    if (el) el.classList.remove('open');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName: name });
      addToast('Profile updated');
      close();
    } catch {
      addToast('Failed to update profile', 'err');
    } finally {
      setSaving(false);
    }
  };

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
            <input className="auth-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CANCEL</button>
          <button className="btn btn-p" onClick={handleSave} disabled={saving}>
            {saving ? <i className="fas fa-circle-notch fa-spin"></i> : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}
