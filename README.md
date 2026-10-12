# FOCUS

> A Pomodoro timer and time tracker that logs where your time actually goes.

FOCUS is a full-stack productivity app built on the MERN stack. Instead of treating tasks as checkboxes, it records real time against each task, links that time to Pomodoro sessions, and turns the data into goals and analytics.

**Live demo:** [focused-4l3h.onrender.com](https://focused-4l3h.onrender.com/)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Terminal Commands](#terminal-commands)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Data Import & Export](#data-import--export)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Time tracking
- Start, pause, resume, and stop a timer against any task, optionally assigned to a project.
- Every work period is stored as a discrete **segment** (`start`/`end`), so pausing and resuming produces an accurate record. Expand any entry in the timesheet to see its segments.
- Browse any day with the date navigator; edit or delete entries after the fact.
- Header totals for **today, this week, this month**, plus a daily average.

### Pomodoro timer
- Configurable work, short-break, and long-break lengths (click the clock to edit the time directly).
- A visual **plan** of work/break blocks: click a block to cycle its type, drag to reorder, drag it far away to remove it, or use **+** to add one. Plans are limited to 30 blocks total.
- **Auto-advance** or manual mode, optional completion bell, and browser notifications.
- **Focus task:** pin a task to the timer and FOCUS will automatically start, pause, and stop time tracking in step with your work sessions.
- Daily session goal with progress bar; completed and skipped sessions are logged.

### Projects and goals
- **Projects** group entries and show total tracked time.
- **Goals** are time targets per day, week, or month, either *at least* (a minimum) or *at most* (a cap), optionally scoped to one project and given an end date. Progress rings update from logged time.

### Analytics
- Statistics endpoints for KPIs, daily totals, per-project split, day-of-week and hour-of-day patterns, session-length distribution, streaks, trend direction, and consistency.
- Optional **weather correlation**: the header widget saves a daily weather snapshot (temperature, humidity, precipitation, wind), and the stats API computes Pearson correlations against your focused hours.
- A printable **PDF summary report** generator is included in `client/src/utils/pdf.js`.

### Power-user interfaces
- **Command palette** (`Ctrl/Cmd + K`) with fuzzy search.
- **Terminal mode** (`` ` ``): a shell-style interface with history, tab completion, and commands like `track`, `stop`, `today`, `week`, `goals`, and `neofetch`.

### Accounts
- Email/password registration with **email verification**, password reset, and profile editing.
- JWT sessions (30-day expiry) and bcrypt-hashed passwords.
- Transactional email through [Brevo](https://www.brevo.com/); without an API key, emails are printed to the server console instead.
- A **Delete all data** action in Settings.

### Also included
- Public marketing pages (`/features`, `/pomodoro-technique`, `/task-tracking`, `/goals`, `/projects`, `/statistics`) with `sitemap.xml` and `robots.txt`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, [`@dnd-kit`](https://dndkit.com/) |
| Backend | Node.js, Express 4 |
| Database | MongoDB with Mongoose 8 |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Weather | [Open-Meteo](https://open-meteo.com/) (forecast), [Nominatim](https://nominatim.org/) (geocoding), ipapi.co (IP fallback); no API keys required |
| Email | Brevo transactional API (optional) |
| Hosting | Render (single service: Express serves the built client) |

---

## Getting Started

### Prerequisites

- **Node.js** (current LTS recommended)
- A **MongoDB** database: a local instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Install

```bash
git clone https://github.com/NajmosSalahin/focused-mern.git
cd focused-mern
npm install
```

The root `postinstall` script installs dependencies for both `client/` and `server/`.

### Configure

Create `server/.env` (see [Configuration](#configuration)):

```env
MONGODB_URI=mongodb://localhost:27017/focused
JWT_SECRET=replace-me-with-a-long-random-string
```

### Run

```bash
npm run dev
```

This starts the API on **http://localhost:5000** and the Vite dev server on **http://localhost:5173**, with `/api` requests proxied to the backend.

> **Local sign-up tip:** without `BREVO_API_KEY`, verification links are printed in the server terminal as `[EMAIL DEBUG]` lines. Copy the link from there to verify your account.

---

## Configuration

Environment variables for the server (`server/.env`):

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | **Yes** | MongoDB connection string. |
| `JWT_SECRET` | **Yes in production** | Secret for signing tokens. If unset, an insecure development default is used. **Never deploy without setting this.** |
| `PORT` | No | Server port. Defaults to `5000`. |
| `BREVO_API_KEY` | No | Enables real email delivery. Without it, emails are logged to the console. |
| `EMAIL_FROM` | No | Sender address for outgoing email. Must be a sender verified in your Brevo account. |
| `CLIENT_URL` | No | Base URL used to build verification/reset links. Defaults to `http://localhost:5173`. Set this to your deployed URL in production. |
| `CORS_ORIGIN` | No | Comma-separated list of allowed browser origins. Defaults to `https://focused-4l3h.onrender.com`. |

---

## Scripts

Run from the repository root:

| Command | Description |
|---|---|
| `npm run dev` | Run client and server together (development). |
| `npm run dev:client` | Run only the Vite client. |
| `npm run dev:server` | Run only the Express server (with `node --watch`). |
| `npm run build` | Build the client into `client/dist`. |
| `npm start` | Start the production server (serves `client/dist`). |

---

## Keyboard Shortcuts

Single-key shortcuts are ignored while typing in an input field; modifier shortcuts work everywhere.

| Key | Action |
|---|---|
| `Space` | Start / pause the Pomodoro timer |
| `R` | Reset the current session |
| `S` | Skip to the next session |
| `1` / `2` / `3` | Switch to Work / Short / Long |
| `N` | Focus the task input |
| `Ctrl/Cmd + Enter` | Start / stop time tracking |
| `Ctrl/Cmd + P` | Pause / resume the tracker |
| `[` / `]` | Previous / next day |
| `T` | Jump to today |
| `G` | New goal |
| `P` | New project |
| `Ctrl/Cmd + K` | Command palette |
| `Ctrl/Cmd + ,` | Pomodoro settings |
| `Ctrl/Cmd + S` | Statistics & analytics |
| `Ctrl/Cmd + E` | Export data |
| `Ctrl/Cmd + I` | Import data |
| `` ` `` | Toggle terminal |
| `Ctrl/Cmd + L` | Clear terminal |
| `?` | Show the shortcuts panel |
| `Esc` | Close the topmost modal |

---

## Terminal Commands

Press `` ` `` to open the terminal, then type `help` for the full list. Highlights:

| Command | Description |
|---|---|
| `track <task> [#project]` | Start tracking time |
| `stop` / `pause` / `resume` | Control the current session |
| `add <task> <duration> [#project]` | Log a manual entry, e.g. `add deep work 1h30m #research` |
| `today` / `week` / `entries [date]` | Review logged time |
| `total [today\|week\|month\|all]` | Totals with a per-project breakdown |
| `projects` / `goals` | List projects and goal progress |
| `find <keyword>` | Search entries |
| `start` / `reset` / `skip` / `work` / `short` / `long` | Pomodoro controls |
| `note <text>` | Save a quick note as an entry |
| `open <stats\|import\|export>` | Open a panel |
| `neofetch`, `cal`, `keys`, `man <cmd>` | Extras |

`Tab` autocompletes, `↑`/`↓` browse history, and `Ctrl+L` clears the screen.

---

## Project Structure

```
focused-mern/
├── package.json            # Root scripts (dev, build, start)
├── client/                 # React frontend (Vite)
│   ├── index.html
│   ├── vite.config.js      # Dev proxy: /api → localhost:5000
│   ├── public/             # robots.txt, sitemap
│   └── src/
│       ├── api/            # Thin fetch wrappers per resource
│       ├── components/     # Panels, pages, terminal, command palette
│       │   └── modals/     # Create/edit/settings/import/export dialogs
│       ├── context/        # AuthContext, AppContext (timer + data state)
│       └── utils/          # Formatting helpers, PDF report generator
└── server/                 # Express backend
    ├── index.js            # App entry, route mounting, static serving
    ├── controllers/        # Request handlers
    ├── middleware/         # JWT auth
    ├── models/             # Mongoose schemas
    ├── routes/             # Express routers
    └── utils/              # Brevo email helper
```

---

## API Overview

All routes are under `/api`. Everything except `/api/auth/*` requires an `Authorization: Bearer <token>` header.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/verify-email/:token`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password/:token`, `GET/PUT /auth/me` |
| Entries | `GET/POST /entries`, `PUT/DELETE /entries/:id`, `POST /entries/:id/segments`, `POST /entries/:id/stop` |
| Projects | `GET/POST /projects`, `PUT/DELETE /projects/:id` |
| Goals | `GET/POST /goals`, `PUT/DELETE /goals/:id`, `GET /goals/progress` |
| Pomodoro | `GET/POST /pomo-sessions`, `DELETE /pomo-sessions/today`, `GET/PUT /pomo-settings` |
| Weather | `GET/POST /weather`, `GET /weather/location`, `GET /weather/fetch` |
| Stats | `GET /stats/{kpi,daily,projects,dow,hour-heatmap,pomo,distribution,insights,weather,detailed}` |
| Data | `GET /export`, `POST /import`, `DELETE /account/data` |

---

## Data Import & Export

- **Export** downloads a single JSON file containing entries, projects, goals, Pomodoro sessions and settings, and weather snapshots.
- **Import** accepts that file in one of two modes:
  - **Merge** adds records whose `_id` doesn't already exist.
  - **Replace** wipes each imported collection for your account first, then inserts the file's contents.
- Older exports using the keys `timeEntries`, `pomoHistory`, and `weatherHistory` are still recognized.

---

## Deployment

FOCUS deploys as a single service; Express serves the built client, so no separate static hosting is required.

1. Create a new **Web Service** on [Render](https://render.com/) (or any Node host) from your repository.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. Set environment variables: `MONGODB_URI`, a strong `JWT_SECRET`, `CLIENT_URL`, and `CORS_ORIGIN` (your deployed URL).
5. *(Optional)* Add `BREVO_API_KEY` and `EMAIL_FROM` to send real verification and password-reset emails.

---

## Known Limitations

This is a personal/learning project, and some rough edges are worth knowing about before you rely on it or build on it:

- **Rate limiting is per-process.** Auth endpoints are limited with an in-memory store, so counters reset on restart and aren't shared between instances.
- **Timezones use a fixed UTC offset.** The browser sends its offset (`?tz=`) and the server buckets days with it; a DST change mid-session is picked up on the next page load.

---

## Contributing

Contributions are welcome. Fork the repository, create a feature branch, and open a pull request. Fixes for anything in [Known Limitations](#known-limitations) are especially appreciated.

---

## License

Released under the [MIT License](./LICENSE).

## Author

**Md. Najmos Salahin** · [@NajmosSalahin](https://github.com/NajmosSalahin)
