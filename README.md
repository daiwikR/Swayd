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

Each user has a `preference_vector` — a map from event category to a weight (0.0–2.0).

- **Right swipe** → category weight `+0.1` (cap: 2.0)
- **Left swipe** → category weight `−0.05` (floor: 0.0)

The event feed is ranked by matching the event's category against the user's weights. Events with a score above `1.2` receive a **FOR YOU** badge.

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
