import { useApp } from '../context/AppContext';
import { fmtHuman } from '../utils/helpers';

export default function PomoLog() {
  const { pomoSessions, viewDate } = useApp();
  const dateKey = viewDate.toISOString().split('T')[0];
  const todaySessions = pomoSessions.filter(s => new Date(s.completedAt).toISOString().split('T')[0] === dateKey);
  const lbl = (new Date().toISOString().split('T')[0] === dateKey)
    ? 'TODAY'
    : viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="card card-scroll">
      <div className="chead">
        <div className="ctitle">POMO LOG — <b>{lbl}</b></div>
      </div>
      <div className="pomo-log-list">
        {todaySessions.length === 0 && <div className="empty">// no sessions for this day</div>}
        {[...todaySessions].reverse().map((s, i) => {
          const num = todaySessions.length - i;
          const at = new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const label = s.skipped ? 'SKP' : s.mode === 'work' ? 'WRK' : s.mode === 'short' ? 'SHT' : 'LNG';
          return (
            <div key={s._id} className={`pomo-log-item${s.skipped ? ' skipped' : ''}`}>
              <span className="pl-idx">#{num}</span>
              <span className={`pl-mode ${s.mode}${s.skipped ? ' skipped' : ''}`}>{label}</span>
              <span className="pl-time">{at}</span>
              <span className="pl-dur">{s.skipped ? 'SKIPPED' : fmtHuman(s.duration)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
