
const features = [
  { icon: 'fa-clock', title: 'Pomodoro Timer', desc: 'Customizable focus sessions with auto-advance plan and smart break scheduling.' },
  { icon: 'fa-list-check', title: 'Task Tracking', desc: 'Track every task with live timer, pause/resume, and project assignment.' },
  { icon: 'fa-bullseye', title: 'Goals', desc: 'Set daily, weekly, or monthly time-based goals with auto-reset and progress bars.' },
  { icon: 'fa-folder', title: 'Projects', desc: 'Organize work into projects and see time distribution across each.' },
  { icon: 'fa-chart-line', title: 'Statistics', desc: 'Deep insights: trends, heatmaps, streaks, weather correlation, and more.' },
];

export default function LandingPage({ onGetStarted, onSignIn }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <a href="/" className="landing-logo" style={{ textDecoration: 'none' }}>FOCUS<span className="landing-logo-sub">/ pomodoro + tracker</span></a>
        <button className="landing-cta-btn" onClick={onSignIn}>Sign In</button>
      </header>

      <section className="landing-hero">
        <h1 className="landing-title">Stay <span className="hl">Focused</span>.</h1>
        <p className="landing-sub">An all-in-one productivity dashboard combining Pomodoro timing, task tracking, goals, projects, and deep analytics — all wrapped in a clean, distraction-free interface.</p>
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
        <nav style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '12px' }}>
          <a href="/features" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontWeight: 600, transition: 'var(--t)' }}>Features</a>
          <a href="/pomodoro-technique" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontWeight: 600, transition: 'var(--t)' }}>Pomodoro</a>
          <a href="/task-tracking" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontWeight: 600, transition: 'var(--t)' }}>Tasks</a>
          <a href="/goals" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontWeight: 600, transition: 'var(--t)' }}>Goals</a>
          <a href="/projects" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontWeight: 600, transition: 'var(--t)' }}>Projects</a>
          <a href="/statistics" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontWeight: 600, transition: 'var(--t)' }}>Analytics</a>
        </nav>
        <p>FOCUSED &mdash; open source productivity suite</p>
      </footer>
    </div>
  );
}
