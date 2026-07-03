import './FeaturePage.css';

const features = {
  'features': {
    title: 'All Features',
    subtitle: 'Everything you need to stay productive',
    content: (
      <>
        <p>FOCUS combines six powerful tools into one clean, distraction-free dashboard. Each feature works independently or together for a complete productivity system.</p>
        <div className="fp-grid">
          {[
            { icon: 'fa-clock', title: 'Pomodoro Timer', desc: 'Customizable focus sessions with auto-advance plans and smart break scheduling.' },
            { icon: 'fa-list-check', title: 'Task Tracking', desc: 'Track every task with live timer, pause/resume, and project assignment.' },
            { icon: 'fa-bullseye', title: 'Goals', desc: 'Set daily, weekly, or monthly time-based goals with auto-reset and progress bars.' },
            { icon: 'fa-folder', title: 'Projects', desc: 'Organize work into projects and see time distribution across each.' },
            { icon: 'fa-check-circle', title: 'Habits', desc: 'Build streaks with daily habit tracking and visual calendar.' },
            { icon: 'fa-chart-line', title: 'Statistics', desc: 'Deep insights: trends, heatmaps, streaks, weather correlation, and more.' },
          ].map(f => (
            <div key={f.icon} className="fp-card">
              <div className="fp-card-icon"><i className={`fas ${f.icon}`}></i></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  'pomodoro-technique': {
    title: 'Pomodoro Technique',
    subtitle: 'Stay focused with timed work sessions',
    content: (
      <>
        <p>The Pomodoro Technique is a time management method that breaks work into focused intervals, traditionally 25 minutes, separated by short breaks. FOCUS enhances this with a modern, customizable implementation.</p>
        <h2>How it works</h2>
        <ul>
          <li><strong>Focus Sessions</strong> — Set session length from 5 to 60 minutes. Work until the timer rings, then take a break.</li>
          <li><strong>Smart Breaks</strong> — After each session, take a short break (5 min by default). After 4 sessions, take a longer break (15 min).</li>
          <li><strong>Auto-Advance Plans</strong> — Let FOCUS automatically move from focus to break and back again, with customizable session counts per cycle.</li>
        </ul>
        <h2>Why it works</h2>
        <ul>
          <li>Reduces mental fatigue by splitting work into manageable chunks</li>
          <li>Creates urgency with a visible countdown</li>
          <li>Eliminates decision fatigue — you only focus on one task per session</li>
        </ul>
      </>
    ),
  },
  'task-tracking': {
    title: 'Task Tracking',
    subtitle: 'Stay on top of every task with precision timing',
    content: (
      <>
        <p>FOCUS provides a full-featured task tracker designed for deep work. Unlike simple to-do lists, every task has a live timer so you know exactly where your time goes.</p>
        <h2>Key features</h2>
        <ul>
          <li><strong>Live Timer</strong> — Start and stop timing any task with one click. The timer runs in real-time with pause and resume support.</li>
          <li><strong>Project Assignment</strong> — Organize tasks into projects to track time by category.</li>
          <li><strong>Entry History</strong> — Every work session is logged with timestamps, duration, and notes for later review.</li>
          <li><strong>Pomodoro Integration</strong> — Link tasks to Pomodoro sessions to see your focus sessions per task.</li>
        </ul>
        <h2>Why use a timer-based tracker</h2>
        <p>Manual checklists don't capture effort. With FOCUS, you'll know exactly how long each task took — invaluable for estimating future work, billing, or understanding your productivity patterns.</p>
      </>
    ),
  },
  'goals': {
    title: 'Goals',
    subtitle: 'Set time-based goals and track your progress',
    content: (
      <>
        <p>Goals in FOCUS are time-based — set a target number of focused hours per day, week, or month, and watch your progress bars fill up automatically.</p>
        <h2>How goals work</h2>
        <ul>
          <li><strong>Choose a period</strong> — Daily, weekly, or monthly goals</li>
          <li><strong>Set a target</strong> — Hours of focused work you want to achieve</li>
          <li><strong>Auto-reset</strong> — Goals reset automatically so they require zero maintenance</li>
          <li><strong>Visual progress</strong> — Real-time progress bars show how close you are to your target</li>
        </ul>
        <h2>Goals + Pomodoro</h2>
        <p>Every completed Pomodoro session counts toward your goal. This creates a powerful feedback loop: you focus more, which fills your goal, which motivates you to keep going.</p>
      </>
    ),
  },
  'projects': {
    title: 'Projects',
    subtitle: 'Organize your work and measure time by project',
    content: (
      <>
        <p>Projects let you group related tasks together and see exactly how much time you spend on each area of your work or life.</p>
        <h2>Project features</h2>
        <ul>
          <li><strong>Organize tasks</strong> — Assign any task or Pomodoro session to a project</li>
          <li><strong>Time distribution</strong> — See a breakdown of hours per project in your statistics</li>
          <li><strong>Multiple projects</strong> — Run as many projects simultaneously as you need</li>
        </ul>
        <h2>Use cases</h2>
        <ul>
          <li>Work projects — separate client work from internal tasks</li>
          <li>Personal projects — track time spent on learning, side projects, or hobbies</li>
          <li>Study — organize by subject or course</li>
        </ul>
      </>
    ),
  },
  'habits': {
    title: 'Habit Tracking',
    subtitle: 'Build streaks and stay consistent',
    content: (
      <>
        <p>Habit tracking in FOCUS helps you build lasting routines with a simple check-in system and visual streak calendar.</p>
        <h2>How it works</h2>
        <ul>
          <li><strong>Daily check-in</strong> — Each day, mark your habits as done. One tap, that's it.</li>
          <li><strong>Streak tracking</strong> — Build consecutive-day streaks. Don't break the chain.</li>
          <li><strong>Visual calendar</strong> — See your entire month at a glance with color-coded days</li>
        </ul>
        <h2>Why habit tracking matters</h2>
        <p>Research shows that tracking a habit dramatically increases your chance of sticking with it. The visual streak creates a powerful incentive — you won't want to break it.</p>
        <h2>Example habits</h2>
        <ul>
          <li>Read for 30 minutes</li>
          <li>Exercise</li>
          <li>Meditate</li>
          <li>Write 500 words</li>
          <li>No social media before noon</li>
        </ul>
      </>
    ),
  },
  'statistics': {
    title: 'Statistics & Analytics',
    subtitle: 'Understand your productivity with data',
    content: (
      <>
        <p>FOCUS provides deep analytics that go beyond simple counts. Discover patterns in your focus, see what affects your productivity, and make data-driven improvements.</p>
        <h2>Available insights</h2>
        <ul>
          <li><strong>Trends</strong> — See your focus time over days, weeks, and months with interactive charts</li>
          <li><strong>Heatmaps</strong> — Visualize your most and least productive hours across the week</li>
          <li><strong>Streaks</strong> — Track your longest streaks of consecutive productive days</li>
          <li><strong>Weather correlation</strong> — See if weather conditions affect your focus (requires location permission)</li>
          <li><strong>Time distribution</strong> — Breakdown by project, task, and time of day</li>
        </ul>
        <h2>Why analytics matter</h2>
        <p>You can't improve what you don't measure. With FOCUS statistics, you'll identify your peak hours, discover what distracts you, and see your progress over time — turning productivity from a feeling into a fact.</p>
      </>
    ),
  },
};

export default function FeaturePage({ slug, onGetStarted, onSignIn }) {
  const feature = features[slug] || features['features'];

  return (
    <div className="fp-page">
      <header className="fp-header">
        <a href="/" className="fp-logo" style={{ textDecoration: 'none' }}>FOCUS<span className="fp-logo-sub">/ {slug === 'features' ? 'features' : slug.replace(/-/g, ' ')}</span></a>
        <div className="fp-header-right">
          <a href="/" className="fp-back-link">&larr; Home</a>
          <button className="fp-cta-btn" onClick={onSignIn}>Sign In</button>
        </div>
      </header>

      <main className="fp-main">
        <div className="fp-hero">
          <h1 className="fp-title">{feature.title}</h1>
          <p className="fp-subtitle">{feature.subtitle}</p>
        </div>
        <div className="fp-content">
          {feature.content}
        </div>
        <div className="fp-cta">
          <button className="fp-hero-btn" onClick={onGetStarted}>
            <i className="fas fa-rocket"></i> Get Started &mdash; It's Free
          </button>
        </div>
      </main>

      <footer className="fp-footer">
        <nav className="fp-footer-nav">
          <a href="/features">Features</a>
          <a href="/pomodoro-technique">Pomodoro</a>
          <a href="/task-tracking">Tasks</a>
          <a href="/goals">Goals</a>
          <a href="/projects">Projects</a>
          <a href="/habits">Habits</a>
          <a href="/statistics">Analytics</a>
        </nav>
        <p>FOCUSED &mdash; open source productivity suite</p>
      </footer>
    </div>
  );
}
