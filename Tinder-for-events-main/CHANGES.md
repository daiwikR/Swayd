# CHANGES.md

## BLR Swipe — Full Rewrite & Feature Update

---

## Bugs Fixed

### Backend
1. **Missing `MONGODB_URI` env var** — Created `.env` files for both services with defaults for local development.
2. **Missing `VITE_API_BASE` env var** — All API calls were silently going to `undefined`. Added `.env` with correct default.
3. **`package.json` had no `dependencies` section** — Backend ran but couldn't be reproduced. All deps now explicitly listed.
4. **Cookie-based `getOrCreateUserId` was stateless** — Anyone could forge a uid cookie. Replaced with proper JWT auth.
5. **Smart/curly quote characters in source files** — `src/index.ts` and `src/pages/Home.tsx` contained Unicode smart quotes (`'` `'`) from copy-paste, causing TypeScript compiler and esbuild to crash with "Invalid character" errors. Fixed with byte-level replacement.
6. **`Card` model had wrong categories** — Categories were `brewery`, `restaurant`, `event`, `activity` — not matching the app's event use case. Replaced with proper event categories.
7. **`Swipe` model used string `userId`** — No referential integrity, no indexes. Replaced with ObjectId ref and unique compound index.
8. **`profile` route used old `getOrCreateUserId`** — Broke when called without cookie. Now uses JWT auth.
9. **`cards` route had no auth or age filtering** — Any request returned all cards. Now requires JWT and applies age gating.
10. **`events` route created a `Card` document** — Wrong model entirely. Now creates an `Event` document with proper fields.
11. **`SwipeDeck` sent `action: like/dislike` to `/api/swipe`** — Backend payload format changed to `eventId + direction`. Fixed throughout.
12. **Duplicate `postcss.config.js` and `postcss.config.mjs`** — Both existed, only one needed. Left as-is (identical content, no errors).

### Frontend
1. **`App.css` had default Vite boilerplate styles** — Caused layout conflicts. Cleared.
2. **`VITE_API_BASE` was undefined** — All `axios` calls had no base URL. Fixed via `.env`.
3. **No error handling in `Home.tsx`** — Silently failed if API was down. Added error state.
4. **`Profile.tsx` used wrong field names** — Referenced `eventDate` and `image` from old API. Updated to `datetime` and `image_url`.

---

## Features Added

### Auth System (JWT + httpOnly Cookie)
- `POST /api/auth/signup` — Creates user with hashed password (bcryptjs). Returns JWT.
- `POST /api/auth/login` — Verifies credentials. Returns JWT. Recalculates `verified_age` server-side on login.
- `POST /api/auth/logout` — Clears token cookie.
- `GET /api/auth/me` — Returns authenticated user profile.
- Two roles: **seeker** (discover events) and **lister** (create/manage events).
- `requireAuth`, `requireLister`, `optionalAuth` middleware in `src/middleware/auth.ts`.

### Age Verification & Content Gating
- **`date_of_birth`** field added to User model. Required for seekers at signup.
- **`verified_age`** calculated **server-side** from DOB — never trusts client-sent age.
- **`age_rating`** column added to Event model: `ALL_AGES` | `13+` | `18+` | `21+`.
- Age gating enforced in DB query — 18+ events are absent from API responses for under-18 users.
- Direct event URL access for age-restricted events returns `403 AGE_RESTRICTED`.
- Under-13 signup attempt returns a friendly block screen (no further access).
- Age picker in Signup uses a real date input, not a checkbox.

### Onboarding Questionnaire (New Seekers)
- Multi-step flow shown before main feed for first-time seekers.
- **Step 1**: Category multi-select (10 categories, minimum 3 required).
- **Step 2**: Event format preference (In-person / Online / Both) + time preference (Weekdays / Weekends / Both).
- Saves `preference_vector` (initial weight = 1.0 per selected category) to user record.
- `POST /api/profile/onboarding` endpoint.

### Preference Learning Engine
- After every swipe, user's `preference_vector` is updated server-side:
  - Right swipe → category weight + 0.1 (capped at 2.0)
  - Left swipe → category weight − 0.05 (floored at 0.0)
- Preference vector persisted in MongoDB as a Map<string, number>.

### Smart Event Recommendation Feed
- `GET /api/cards` now returns a ranked feed:
  1. Filters out already-swiped events.
  2. Filters by `age_rating` against `user.verified_age` (DB-level).
  3. Scores remaining events: `score = preference_vector[category]`.
  4. Sorts by score descending (highest match first).
  5. Falls back to newest-first if no preference data.
- Events with `score > 1.2` tagged `is_recommended: true`.
- Frontend shows `⚡ FOR YOU` badge on recommended cards.

### Event Lister Dashboard
- Login as lister → access dashboard with:
  - **Stats**: total events, total likes, active count.
  - **Event list**: each event shows category, age rating badge, like count, status.
  - **Create form**: title, description, category (11 options), age rating (4 options with descriptions), date/time, location, price (₹), capacity, image URL.
  - **Manage**: pause/activate or delete events.
- Age rating selection shows warning for 18+ ("Users under 18 will not see this event").

### Swipe History
- `swipes` table with `user_id`, `event_id`, `direction`, `timestamp`.
- Compound unique index `{ user_id, event_id }` prevents duplicate swipes.

---

## UI Overhaul — Dark City Underground

### Design System
- **Color palette**: Near-black backgrounds (`#0A0A0A`, `#111`, `#1A1A1A`). No white cards, no purple gradients.
- **Accent colors per category**: acid green (fitness), hot coral (nightlife), electric blue (tech), warm amber (food), etc.
- **Typography**: `Bebas Neue` for display/headings, `DM Sans` for body. Loaded via Google Fonts.
- Custom Tailwind theme with `dark.*` and `accent.*` color tokens.

### Event Cards
- Full-bleed image backgrounds with gradient scrim (dark at bottom, transparent at top).
- Category shown as glowing pill badge in category accent color.
- Event name in large all-caps Bebas Neue.
- Swipe feedback: green tint + "LIKE" stamp on right drag; pink tint + "NOPE" stamp on left drag.
- Stacked card effect — next 2 cards visible behind the top card.

### Swipe Mechanics
- Replaced `react-tinder-card` with `framer-motion` for smoother drag physics.
- `useMotionValue` + `useTransform` for tilt-as-you-drag animation.
- Velocity-based swipe detection (swipe fast = auto-complete).
- Like/Dislike buttons with glow-on-hover pulse effect.
- Brief color ripple on screen after a right-swipe.

### Navigation
- Floating bottom nav bar with frosted glass effect (`backdrop-blur`).
- Safe area insets for iOS notch support.
- Separate nav items for seekers (Discover / My Space) and listers (Dashboard / My Space).

### Profile Page
- Taste profile bar chart showing preference vector (top 5 categories).
- Upcoming events panel (liked events with future dates).
- Tabbed interface: Liked / Skipped.
- Sign out button.

### Auth Pages
- Dark full-screen login/signup with Bebas Neue logo.
- Role selection step before registration details.
- DOB picker with friendly message ("We use your birthday to make sure you only see events that are right for you 🎉").
- Age restriction block screen for under-13 users.

### Global
- `react-hot-toast` for dark-themed in-app notifications.
- All inputs styled with `.input-dark` class.
- Mobile-first layout, desktop centered at max 420px.

---

## Database Schema Changes

### `User` model (rewritten)
```
email, password (bcrypt), role (seeker|lister),
preference_vector (Map<string,number>),
preferences { categories[], format, time },
onboarding_complete,
date_of_birth, verified_age,
display_name, avatar_url, createdAt
```

### `Event` model (replaces `Card`)
```
lister_id (ObjectId→User), title, description,
category (11 options), datetime, location,
image_url, price, capacity,
age_rating (ALL_AGES|13+|18+|21+),
like_count, dislike_count, is_active, createdAt
```

### `Swipe` model (rewritten)
```
user_id (ObjectId→User), event_id (ObjectId→Event),
direction (left|right), timestamp
Unique index: { user_id, event_id }
```
