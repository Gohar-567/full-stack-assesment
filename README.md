# ELD Trip Planner

Django + React app for truck drivers. Plans a trip with full FMCSA Hours of Service compliance, renders an interactive route map, and generates ELD Daily Log Sheet images.

---

## Requirements

- Python 3.11+
- Node.js 18+
- A free [OpenRouteService API key](https://openrouteservice.org/dev/#/signup)

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
ORS_API_KEY=your-key-here
SECRET_KEY=any-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

```bash
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

---

## Running Tests

```bash
cd backend
source venv/bin/activate
python manage.py test trip.tests
```

Run a single test:

```bash
python manage.py test trip.tests.test_hos_engine.HosEngineTests.test_seventy_hour_cycle_restart
```

---
