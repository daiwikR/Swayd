# BLR Swipe

**Tinder-style event discovery for Bangalore.**

Swipe right on events you want to attend, left on ones you don't. BLR Swipe learns your taste over time and surfaces events that match — concerts, tech meetups, food festivals, comedy nights, and more.

---

## Features

- **Swipe-based discovery** — drag cards left/right with smooth physics animations
- **Personalized recommendations** — preference weights update after every swipe
- **Two roles** — *Seekers* discover events; *Listers* create and manage them
- **Age gating** — events rated `ALL_AGES`, `13+`, `18+`, or `21+`; filtered server-side based on verified DOB
- **Auto-scraped events** — pulls from BookMyShow and District.io on startup and every 6 hours
- **RSVP forms** — listers can attach custom questions to events
- **Dark-themed UI** — category-specific accent colors, glassmorphism, Framer Motion + GSAP animations
- **Admin dashboard** — platform-wide stats and user management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Animation | Framer Motion, GSAP, React Spring |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT + httpOnly cookies |
| Scraping | Cheerio |
| Password | bcryptjs |

---

## Project Structure

```
Tinder-for-events-main/
├── blr-swipe-backend/       # Express API server
│   └── src/
│       ├── index.ts         # App entry point
│       ├── db.ts            # MongoDB connection (with in-memory fallback)
│       ├── middleware/      # Auth, role-based access
│       ├── models/          # User, Event, Swipe, RSVP schemas
│       ├── routes/          # auth, cards, swipe, profile, events, rsvp, admin
│       ├── scrapers/        # BookMyShow, District.io scrapers
│       └── utils/
│
└── blr-swipe-frontend/      # React/Vite app
    └── src/
        ├── App.tsx           # Router + layout
        ├── api.ts            # Axios instance
        ├── pages/            # Home, Login, Signup, Profile, Onboarding, ...
        ├── components/       # EventCard, SwipeDeck, UI primitives
        └── context/          # AuthContext
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or [Atlas](https://www.mongodb.com/cloud/atlas))

---

### Backend

```bash
cd blr-swipe-backend
npm install
```

Create a `.env` file:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>
JWT_SECRET=your-secret-key
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

```bash
npm run dev        # Development (ts-node-dev, hot reload)
npm run build      # Compile TypeScript → dist/
npm start          # Run compiled build
```

Server runs at `http://localhost:4000`.

> **Note:** If MongoDB is unavailable, the server falls back to an in-memory MongoDB instance automatically — useful for local development without a running database.

---

### Frontend

```bash
cd blr-swipe-frontend
npm install
```

Create a `.env` file:

```env
VITE_API_BASE=http://localhost:4000
VITE_CITY=Bangalore
```

```bash
npm run dev        # Development server with HMR
npm run build      # Production bundle → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint
```

Frontend runs at `http://localhost:5173`.

---

## API Overview

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register (seeker or lister) |
| `POST` | `/api/auth/login` | Login, sets JWT cookie |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/auth/me` | Authenticated user |
| `GET` | `/api/cards` | Personalized event feed |
| `POST` | `/api/swipe` | Record swipe, update preferences |
| `GET/PUT` | `/api/profile` | View/update profile |
| `POST` | `/api/profile/onboarding` | Save category preferences |
| `POST` | `/api/events` | Create event (lister) |
| `GET/PUT/DELETE` | `/api/events/:id` | Manage event (lister) |
| `POST` | `/api/rsvp` | Submit RSVP |
| `GET` | `/api/admin/stats` | Platform stats (admin) |
| `GET` | `/health` | Health check |

---

## How Recommendations Work

Each user has a `preference_vector` — a map from event category to a weight (0.0–2.0), seeded at 1.0 for onboarding picks.

**Learning (exponential moving average, recency-weighted):** every interaction moves the category weight toward a target with a learning rate `α` scaled by interaction strength:

| Signal | Target | α |
|---|---|---|
| Right swipe | 2.0 | 0.08–0.15 (higher with longer dwell time on the card) |
| Left swipe | 0.0 | 0.04–0.07 (higher for instant flicks — confident rejection) |
| RSVP | 2.0 | 0.25 (strongest intent signal) |
| RSVP cancel | 0.0 | 0.08 |

The frontend sends `dwell_ms` (how long the card was on top) with every swipe.

**Ranking:** the feed blends four signals — past events are excluded:

```
score = 0.55·preference + 0.20·quality + 0.15·urgency + 0.10·schedule
```

- `preference` — the user's learned category weight (normalized)
- `quality` — Bayesian-smoothed like ratio across all users (collaborative signal; prior 0.5 so new events aren't buried)
- `urgency` — events happening sooner rank higher (≈2-week decay)
- `schedule` — matches the user's weekday/weekend onboarding preference

Cold start (no swipes yet) ranks by quality + urgency. 15% of each feed is random exploration from low-affinity categories, interleaved every ~6 cards. High-affinity events get a **FOR YOU** badge.

---

## User Roles

| Role | Capabilities |
|---|---|
| **Seeker** | Swipe events, RSVP, view liked events, set preferences |
| **Lister** | Create/manage events, view RSVPs, see event stats |
| **Admin** | Platform-wide stats, user management |

Seekers complete a 3-step onboarding flow (categories → format → schedule) before seeing their feed.

---

## Design System

The UI uses a dark base (`#0A0A0A`) with per-category neon accent colors:

| Category | Accent |
|---|---|
| Fitness | `#39FF14` acid green |
| Music | `#FF2D78` hot coral |
| Tech | `#00D4FF` electric blue |
| Food | `#FF9F1C` warm amber |
| Art | `#C77DFF` purple |
| Nightlife | `#FF6B35` orange |
| Sports | `#06D6A0` teal |
| Wellness | `#FFD166` yellow |
| Comedy | `#EF476F` pink |
| Networking | `#118AB2` dark blue |

Typography: **Bebas Neue** for display, **DM Sans** for body, **IBM Plex Mono** for code.

---

## Deploying to Vercel

The repo is set up as **one Vercel project** serving both the static frontend and the Express API (wrapped as a serverless function in `api/index.ts`). Same origin — no CORS or cross-site cookie issues.

1. In the Vercel dashboard, create a project from this repo and set **Root Directory** to `Tinder-for-events-main`. `vercel.json` handles the rest (build, SPA rewrites, `/api/*` routing, 6-hourly scraper cron).
2. Set these **Environment Variables** in the project settings:

| Variable | Value |
|---|---|
| `MONGODB_URI` | A MongoDB **Atlas** connection string (required — no in-memory fallback on Vercel) |
| `JWT_SECRET` | A long random string |
| `CRON_SECRET` | A long random string (protects `/api/cron/scrape`; Vercel sends it automatically) |

3. Deploy. The frontend needs no `VITE_API_BASE` — production builds call the same origin.

> ⚠️ Don't deploy a locally built `dist/` (drag-and-drop or `vercel --prod` of the folder) — a local `.env` can bake `localhost` URLs into the bundle. Always let Vercel build from source.

---

## Environment Variables Reference

### Backend

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `PORT` | Server port (default: `4000`) |
| `CLIENT_ORIGIN` | Frontend origin for CORS |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Backend API base URL |
| `VITE_CITY` | City name displayed in the UI |

---

## License

MIT
