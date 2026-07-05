# FOCUS

A full-stack time-tracking and productivity application built on the MERN stack.

**Live Website:** [focused-4l3h.onrender.com](https://focused-4l3h.onrender.com/)

## Overview

FOCUS is a time-tracking application centered on a Pomodoro timer. Rather than treating tasks as checklist items, the system logs the actual time spent on each task as discrete segments, producing an accurate record of work performed. The application also includes project organization, time-based goals, and a usage analytics dashboard that incorporates daily weather data to identify potential correlations with focus levels. For power users, the interface can also be driven through a command palette or a terminal-style input mode.

## Screenshots

<!-- Replace these with real screenshots once available. Suggested filenames below. -->

**Dashboard**
![FOCUS dashboard](./screenshots/dashboard.png)

**Analytics & Weather Correlation**
![Analytics and weather correlation](./screenshots/analytics.png)

**Command Palette**
![Command palette](./screenshots/command-palette.png)

**Terminal Mode**
![Terminal mode](./screenshots/terminal.png)

## Features

- **Time Tracking** — Time is logged against individual tasks as discrete start/stop segments. Returning to a task later appends a new segment to the existing entry rather than creating a duplicate. Tasks can optionally be assigned to a project.
- **Pomodoro Timer** — A configurable work/break timer supporting custom session lengths, break intervals, auto-advance between sessions, and sound notifications. The work/break cycle itself can be rearranged by dragging blocks into a custom order. Completed and skipped sessions are recorded for use in analytics.
- **Projects** — Lightweight containers used to group time entries and goals under a common name.
- **Goals** — Time-based targets defined per day, week, or month (for example, "at least 5 hours per week on Project X" or "at most 2 hours per day of unplanned work"). Progress is calculated automatically from logged time.
- **Analytics** — A statistics dashboard summarizing focus time by day, week, and month, including trend direction and day-to-day consistency. Users can opt in to local weather tracking (via a free, key-less API) to see correlation charts between weather conditions and focus time.
- **Command Palette** — A keyboard-driven quick action menu (Ctrl/Cmd+K) with fuzzy search, for starting timers, creating projects or goals, and jumping to other parts of the app without touching the mouse.
- **Terminal Mode** — An alternate, CLI-styled interface for interacting with the app.
- **Accounts** — Email and password authentication with JWT-based sessions and bcrypt password hashing. Transactional email (e.g., account notifications) is supported via the Brevo API.
- **Data Portability** — Users can export their data and re-import it at a later time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, `@dnd-kit` (drag-to-reorder Pomodoro cycle blocks) |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT (`jsonwebtoken`), `bcryptjs` |
| Weather Data | Open-Meteo, Nominatim (reverse geocoding) — no API key required |
| Email | Brevo API (optional; falls back to console logging if not configured) |
| Deployment | Render (single service; Express serves the built client) |

## Project Structure

```
focused-mern/
├── client/                 # React frontend (Vite)
│   └── src/
├── server/                 # Express backend
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── package.json             # Root-level scripts for running client and server together
└── LICENSE
```

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- A MongoDB database (local instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

### Installation

```bash
git clone https://github.com/NajmosSalahin/focused-mern.git
cd focused-mern
npm install
```

The root `postinstall` script automatically installs dependencies for both `client` and `server`.

### Environment Variables

Create a `.env` file inside `server/`:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWT tokens. An insecure default is used if this is unset — acceptable for local testing only |
| `PORT` | No | Server port (defaults to `5000`) |
| `BREVO_API_KEY` | No | Enables transactional email. Without it, emails are logged to the console instead of sent |
| `EMAIL_FROM` | No | Sender address for outgoing email |
| `CLIENT_URL` | No | Base URL used to build links in outgoing email (defaults to `http://localhost:5173`) |

### Running the Application

```bash
npm run dev
```

This runs the client and server concurrently. Port numbers are printed to the terminal on startup.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs client and server concurrently (development) |
| `npm run dev:client` | Runs only the React client |
| `npm run dev:server` | Runs only the Express server |
| `npm run build` | Builds the client for production |
| `npm start` | Starts the production server |

## Deployment

The live instance is deployed on Render as a single service; Express serves the built client directly, so no separate static hosting is required.

To deploy a new instance:

1. Connect the repository to a new Render Web Service.
2. Set the build command to `npm run build`.
3. Set the start command to `npm start`.
4. Add `MONGODB_URI` and `JWT_SECRET` as environment variables. A real `JWT_SECRET` is required — the default fallback is not secure for a public deployment.
5. Optionally add the Brevo email variables and set `CLIENT_URL` to the deployed URL.

## Contributing

Contributions are welcome. Fork the repository, create a feature branch, and open a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Author

**Md. Najmos Salahin**
[@NajmosSalahin](https://github.com/NajmosSalahin)
