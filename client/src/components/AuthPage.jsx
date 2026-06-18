import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ initialMode, onBackToLanding, verifyToken: urlVerifyToken, resetToken: urlResetToken }) {
  const { login, register, verifyEmail, resendVerification, requestPasswordReset, resetPassword } = useAuth();
  const [mode, setMode] = useState(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(urlVerifyToken ? 'verifying' : null);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (urlVerifyToken) {
      verifyEmail(urlVerifyToken)
        .then(() => setVerifyStatus('success'))
        .catch(err => { setError(err.message); setVerifyStatus('error'); });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(email, password, displayName);
        setRegisteredEmail(email);
        setMode('verify-notice');
      }
    } catch (err) {
      setError(err.message);
      if (err.needsVerification) setNeedsVerification(true);
    } finally {
      setBusy(false);
    }
  };

  const handleResendFromLogin = async () => {
    setError('');
    setBusy(true);
    try {
      await resendVerification(email);
      setError('Verification email resent! Check your inbox.');
      setNeedsVerification(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setForgotSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await resetPassword(urlResetToken, newPassword);
      setResetDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setBusy(true);
    try {
      await resendVerification(registeredEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (urlVerifyToken) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo">FOCUS<span className="auth-logo-sub">/ pomodoro + tracker</span></div>
          {verifyStatus === 'verifying' && (
            <p style={{ marginTop: 12 }}><i className="fas fa-circle-notch fa-spin"></i> Verifying your email...</p>
          )}
          {verifyStatus === 'success' && (
            <>
              <p style={{ marginTop: 12, color: 'var(--green-b)' }}><i className="fas fa-check-circle"></i> Email verified! You can now sign in.</p>
              <button className="auth-submit" style={{ marginTop: 12 }} onClick={() => { window.location.href = '/'; }}>
                Go to Sign In
              </button>
            </>
          )}
          {verifyStatus === 'error' && (
            <>
              <p style={{ marginTop: 12, color: 'var(--red)' }}>{error}</p>
              <button className="auth-submit" style={{ marginTop: 12 }} onClick={() => { window.location.href = '/'; }}>
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (urlResetToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">FOCUS<span className="auth-logo-sub">/ pomodoro + tracker</span></div>
          {resetDone ? (
            <>
              <p style={{ textAlign: 'center', color: 'var(--green-b)' }}><i className="fas fa-check-circle"></i> Password reset successful!</p>
              <button className="auth-submit" onClick={() => { window.location.href = '/'; }}>
                Go to Sign In
              </button>
            </>
          ) : (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-dim)' }}>Enter your new password</p>
              <input className="auth-input" type="password" placeholder="New password (min 6 chars)" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? <i className="fas fa-circle-notch fa-spin"></i> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'verify-notice') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <button className="auth-back-btn" onClick={onBackToLanding}><i className="fas fa-arrow-left"></i> Back</button>
          <div className="auth-logo">FOCUS<span className="auth-logo-sub">/ pomodoro + tracker</span></div>
          <p style={{ marginTop: 8 }}><i className="fas fa-envelope" style={{ fontSize: 32, color: 'var(--yellow-b)' }}></i></p>
          <p style={{ fontWeight: 700 }}>Check your email</p>
          <p style={{ fontSize: 13, color: 'var(--fg-dim)' }}>
            We sent a verification link to <strong>{registeredEmail}</strong>
          </p>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" style={{ marginTop: 8 }} onClick={handleResend} disabled={busy}>
            {busy ? <i className="fas fa-circle-notch fa-spin"></i> : 'Resend email'}
          </button>
          <button className="auth-tab" style={{ marginTop: 8, width: '100%' }} onClick={() => setMode('login')}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'forgot-password') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <button className="auth-back-btn" onClick={() => setMode('login')}><i className="fas fa-arrow-left"></i> Back</button>
          <div className="auth-logo">FOCUS<span className="auth-logo-sub">/ pomodoro + tracker</span></div>
          {forgotSent ? (
            <>
              <p style={{ textAlign: 'center' }}><i className="fas fa-envelope" style={{ fontSize: 32, color: 'var(--yellow-b)' }}></i></p>
              <p style={{ textAlign: 'center', fontWeight: 700 }}>Check your email</p>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-dim)' }}>
                If an account exists with that email, we sent a password reset link.
              </p>
              <button className="auth-tab" style={{ width: '100%' }} onClick={() => setMode('login')}>
                Back to Sign In
              </button>
            </>
          ) : (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-dim)' }}>
                Enter your email and we'll send you a reset link.
              </p>
              <input className="auth-input" type="email" placeholder="Email" value={email} required
                onChange={e => setEmail(e.target.value)} />
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? <i className="fas fa-circle-notch fa-spin"></i> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="auth-back-btn" onClick={onBackToLanding}><i className="fas fa-arrow-left"></i> Back</button>
        <div className="auth-logo">FOCUS<span className="auth-logo-sub">/ pomodoro + tracker</span></div>
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setNeedsVerification(false); setError(''); }}>Sign In</button>
          <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setNeedsVerification(false); setError(''); }}>Register</button>
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
          {needsVerification && (
            <button className="auth-resend-btn" type="button" onClick={handleResendFromLogin} disabled={busy}>
              {busy ? <i className="fas fa-circle-notch fa-spin"></i> : 'Resend verification email'}
            </button>
          )}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? <i className="fas fa-circle-notch fa-spin"></i> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        {mode === 'login' && (
          <button className="auth-forgot-btn" onClick={() => setMode('forgot-password')}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
