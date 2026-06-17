import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ initialMode }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">FOCUS<span className="auth-logo-sub">/ pomodoro + tracker</span></div>
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
          <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input className="auth-input" placeholder="Display name" value={displayName}
              onChange={e => setDisplayName(e.target.value)} />
          )}
          <input className="auth-input" type="email" placeholder="Email" value={email} required
            onChange={e => setEmail(e.target.value)} />
          <input className="auth-input" type="password" placeholder="Password" value={password} required minLength={6}
            onChange={e => setPassword(e.target.value)} />
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? <i className="fas fa-circle-notch fa-spin"></i> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
