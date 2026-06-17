import { useApp } from '../context/AppContext';

export default function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div className="toasts" id="toastContainer">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}
