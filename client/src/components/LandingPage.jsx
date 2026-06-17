
const features = [
  { icon: 'fa-clock', title: 'Pomodoro Timer', desc: 'Customizable focus sessions with auto-advance plan and smart break scheduling.' },
  { icon: 'fa-list-check', title: 'Task Tracking', desc: 'Track every task with live timer, pause/resume, and project assignment.' },
  { icon: 'fa-bullseye', title: 'Goals', desc: 'Set daily, weekly, or monthly time-based goals with auto-reset and progress bars.' },
  { icon: 'fa-folder', title: 'Projects', desc: 'Organize work into projects and see time distribution across each.' },
  { icon: 'fa-check-circle', title: 'Habits', desc: 'Build streaks with daily habit tracking and visual calendar.' },
  { icon: 'fa-chart-line', title: 'Statistics', desc: 'Deep insights: trends, heatmaps, streaks, weather correlation, and more.' },
];

export default function LandingPage({ onGetStarted, onSignIn }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-logo">FOCUS<span className="landing-logo-sub">/ pomodoro + tracker</span></div>
        <button className="landing-cta-btn" onClick={onSignIn}>Sign In</button>
      </header>

      <section className="landing-hero">
        <h1 className="landing-title">Stay <span className="hl">Focused</span>.</h1>
        <p className="landing-sub">An all-in-one productivity dashboard combining Pomodoro timing, task tracking, goals, projects, habits, and deep analytics — all wrapped in a clean, distraction-free interface.</p>
        <button className="landing-hero-btn" onClick={onGetStarted}>
          <i className="fas fa-rocket"></i> Get Started &mdash; It's Free
        </button>
      </section>

      <section className="landing-features">
        <h2 className="landing-section-title">Everything you need to <span className="hl">stay productive</span></h2>
        <div className="landing-grid">
          {features.map((f) => (
            <div key={f.icon} className="landing-card">
              <div className="landing-card-icon"><i className={`fas ${f.icon}`}></i></div>
              <h3 className="landing-card-title">{f.title}</h3>
              <p className="landing-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>FOCUSED &mdash; open source productivity suite</p>
      </footer>
    </div>
  );
}
