# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**ELD Trip Planner** — a Django + React full-stack app for truck drivers. Given a current location, pickup, dropoff, and hours already used in the 70hr/8-day HOS cycle, it:
1. Geocodes addresses and fetches truck routes via **OpenRouteService (ORS)**
2. Runs an **FMCSA Hours of Service simulation** that injects mandatory rest, break, and 34h restart events
3. Generates **visual ELD Daily Log Sheet PNGs** (one per calendar day) via Pillow
4. Returns everything in a single JSON response consumed by the React frontend

---

## Commands

### Backend (Django)

```bash
cd backend
source venv/bin/activate

# Run dev server
python manage.py runserver

# Run all tests
python manage.py test trip

# Run a single test case
python manage.py test trip.tests.test_hos_engine.HosEngineTests.test_short_trip_no_rests

# Run tests with pytest (alternative)
pytest backend/trip/tests/

# Apply migrations
python manage.py migrate
```

### Frontend (React/Vite)

```bash
cd frontend

# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

---

## Architecture

### Backend (`backend/`)

Django project named `config`; single app named `trip`.

**Request flow for `POST /api/trip/plan`:**

```
TripPlanView (trip/api/views.py)
  ├─ TripInputSerializer.validate()       ← trip/api/serializers.py
  ├─ geocode_address() × 3               ← trip/services/routing.py
  ├─ get_route() × 2                     ← trip/services/routing.py
  ├─ get_fuel_stop_waypoints() × 2       ← trip/services/routing.py
  ├─ simulate_trip()                     ← trip/services/hos_engine.py
  └─ generate_all_logs()                 ← trip/services/log_generator.py
```

There is also `GET /api/trip/autocomplete?q=<query>` which proxies ORS autocomplete without exposing the API key to the browser.

**Key modules in `trip/services/`:**

- **`routing.py`** — ORS wrappers: `geocode_address`, `get_route` (uses `driving-hgv` profile, decodes ORS encoded polyline internally), `get_fuel_stop_waypoints` (Haversine walk, every 1000 mi), `autocomplete_address`. ORS returns `[lng, lat]`; all internal code uses `[lat, lng]` — swapped at the ORS boundary.

- **`hos_engine.py`** — Pure Python FMCSA HOS state machine. Entry point: `simulate_trip()`. Internally:
  - `_build_raw_segments()` builds an ordered list of DRIVE and ON_DUTY_ND dicts (fuel stops interleaved)
  - `_process_drive_segment()` runs a `while remaining_hours > eps` loop, injecting rests at the correct priority: 70h cycle → 10h rest → 30-min break
  - `_HosState` is a mutable dataclass threaded through the entire simulation (never recreated mid-trip)
  - Four clocks: `driving_hours` (resets after 10h SB), `window_hours` (resets after 10h SB), `hours_since_break` (resets after 30-min OD), `cycle_hours` (resets after 34h restart)
  - **Critical:** 30-min break advances `window_hours` (counts against the 14h window); it does NOT extend it

- **`log_generator.py`** — Pillow PNG generation. `generate_all_logs(events)` groups events by calendar day (events spanning midnight appear in both days, clipped), calls `generate_log_image()` per day, returns `[{"date": "YYYY-MM-DD", "image_base64": "..."}]`.

**There are two copies of some service files** — the canonical ones are in `trip/services/`. The files directly in `trip/` (`trip/hos_engine.py`, `trip/routing.py`, `trip/log_generator.py`, `trip/serializers.py`) are legacy/duplicates from an earlier refactor; `trip/api/views.py` imports from `trip/services/`.

**Environment variables** (`backend/.env`):
```
ORS_API_KEY=...
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`frontend/`)

Vite + React 18 + TailwindCSS. State is managed entirely in the `useTripPlan` hook.

**State machine** (`idle → loading → results | error → idle`):
- `useTripPlan` hook (`src/hooks/useTripPlan.js`) owns state, calls `planTrip()` from `src/api/tripApi.js`
- `App.jsx` spreads the hook return value into `TripPlannerPage`
- `TripPlannerPage` (`src/pages/`) renders the form or results depending on state

**Component tree under results state:**
- `MapDisplay` — React-Leaflet map with two polylines (blue = to pickup, green = to dropoff), colored markers, auto-fit bounds
- `StopsTimeline` — vertical event list with colored status badges
- `LogSheets` — renders each `image_base64` as `<img src="data:image/png;base64,...">`, with per-sheet and bulk PDF download

**API base URL** is `VITE_API_URL` from `frontend/.env`. The axios client sets a 60s timeout (long trips take time).

**Leaflet CSS** must be loaded separately — it is included via a `<link>` in `index.html`. Without it, map tiles do not render.

---

## HOS Rules (authoritative reference)

| Rule | Limit | Rest injected | Resets |
|---|---|---|---|
| 11h driving limit | 11h driving | 10h Sleeper Berth | driving, window, break clocks |
| 14h driving window | 14h since window opened | 10h Sleeper Berth | driving, window, break clocks |
| 30-min break | 8h cumulative driving | 30-min Off Duty | break clock only |
| 70h/8-day cycle | 70h on-duty | 34h Off Duty restart | all clocks + cycle |

- 10h mandatory rest → **Sleeper Berth** status
- 34h restart + 30-min break → **Off Duty** status
- Pickup and dropoff each take **1h On Duty (Not Driving)**; fuel stops take **0.5h**
- ON_DUTY_ND time advances `window_hours` and `cycle_hours`, but NOT `driving_hours` or `hours_since_break`

---

## Testing

Tests are in `backend/trip/tests/test_hos_engine.py`. They cover all 6 README §12 verification scenarios using synthetic route dicts (no network calls). Tests call both the public `simulate_trip()` API and internal `_process_drive_segment()` directly to set precise clock states.

```bash
# All HOS tests
python manage.py test trip.tests.test_hos_engine

# Single scenario
python manage.py test trip.tests.test_hos_engine.HosEngineTests.test_seventy_hour_cycle_restart
```

---

## Deployment

- **Backend** → Render.com, root dir `backend/`, start cmd `gunicorn config.wsgi:application`
- **Frontend** → Vercel, root dir `frontend/`, framework preset Vite
- `render.yaml` at repo root defines the Render service; `frontend/vercel.json` contains SPA rewrite rules
