import { useState, useEffect, useCallback } from 'react';

let alertResolve = null;

export function alert(msg, isConfirm = false, danger = false) {
  return new Promise((resolve) => {
    alertResolve = resolve;
    window.dispatchEvent(new CustomEvent('showAlert', { detail: { msg, isConfirm, danger } }));
  });
}

export default function AlertModal() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [isConfirm, setIsConfirm] = useState(false);
  const [danger, setDanger] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setMsg(e.detail.msg);
      setIsConfirm(e.detail.isConfirm);
      setDanger(e.detail.danger || false);
      setOpen(true);
    };
    window.addEventListener('showAlert', handler);
    return () => window.removeEventListener('showAlert', handler);
  }, []);

  const handleOk = () => {
    setOpen(false);
    if (alertResolve) alertResolve(true);
  };
  const handleCancel = () => {
    setOpen(false);
    if (alertResolve) alertResolve(false);
  };

  return (
    <div className={`overlay alert-ov${open ? ' open' : ''}`} data-no-overlay-close
      onClick={e => { if (e.target === e.currentTarget) handleCancel(); }}>
      <div className={`modal${danger ? ' modal-danger' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="alertMsg">
        {isConfirm && (
          <div className="mhead">
            <div className="mtitle">{danger ? '⚠ DELETE' : 'CONFIRM'}</div>
          </div>
        )}
        <div className="alert-body" id="alertMsg">
          <div className="alert-icon">{danger ? '⚠' : isConfirm ? '?' : 'i'}</div>
          <div className="alert-text">{msg}</div>
        </div>
        <div className="mfoot">
          {isConfirm && <button className="btn btn-s" onClick={handleCancel} autoFocus>CANCEL</button>}
          <button className={`btn ${danger ? 'btn-d' : 'btn-p'}`} onClick={handleOk}>
            {danger ? 'DELETE' : isConfirm ? 'CONFIRM' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
