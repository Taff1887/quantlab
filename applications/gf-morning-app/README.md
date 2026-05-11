# Morning Command Centre

A polished personal dashboard for morning routines — weather, commute, gym tracking, life admin, and chore countdowns.

Built with **Next.js 15 · React 19 · TypeScript · Tailwind CSS · localStorage**.

---

## Running locally

### Prerequisites
- [Node.js LTS](https://nodejs.org) (v20+)

### Setup

```bash
cd applications/gf-morning-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

For mobile testing on the same WiFi network, visit:
```
http://<your-computer-ip>:3000
```

---

## Project structure

```
gf-morning-app/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   ├── page.tsx            # Entry point → renders Dashboard
│   └── globals.css         # Tailwind + custom component classes
├── components/
│   ├── Dashboard.tsx       # Top-level layout, composes all cards
│   ├── Header.tsx          # Live clock + greeting
│   ├── WeatherCard.tsx     # Temperature, rain %, recommendations
│   ├── TransportCard.tsx   # Commute options with filter chips
│   ├── FerrySchedule.tsx   # Next departures per wharf
│   ├── GymTracker.tsx      # Log sessions, view history
│   ├── LifeAdmin.tsx       # Task list with due dates
│   └── ChoreCountdown.tsx  # Recurring chore tracker
├── lib/
│   ├── weatherService.ts   # Weather data + recommendation logic
│   ├── transportService.ts # Transport options + ferry schedule
│   └── storage.ts          # localStorage helpers (SSR-safe)
└── types/
    └── index.ts            # All TypeScript interfaces and types
```

---

## Where mock data lives

| Module | File | What to replace |
|---|---|---|
| Weather | `lib/weatherService.ts` | `fetchWeather()` function — returns a hardcoded object |
| Transport options | `lib/transportService.ts` | `fetchTransportOptions()` — hardcoded departure offsets from now |
| Ferry schedule | `lib/transportService.ts` | `fetchFerryDepartures()` — generated from a fixed schedule grid |

All mock data functions are marked with `// TODO` comments pointing to the exact API endpoints.

---

## Connecting live APIs

### 1. Weather — Open-Meteo (free, no API key)

Replace `fetchWeather()` in `lib/weatherService.ts`:

```ts
const res = await fetch(
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=-33.8274&longitude=151.2273" +
  "&current=temperature_2m,weathercode" +
  "&hourly=precipitation_probability" +
  "&timezone=Australia%2FSydney"
);
const json = await res.json();

// Parse morning rain (hours 7–9) and evening rain (hours 17–22)
// from json.hourly.precipitation_probability[]
```

Alternative: **OpenWeatherMap** (free tier, API key required):
```
GET https://api.openweathermap.org/data/2.5/forecast?lat=-33.8274&lon=151.2273&appid={KEY}&units=metric
```

Alternative: **WeatherAPI.com** (free tier, API key required):
```
GET https://api.weatherapi.com/v1/forecast.json?key={KEY}&q=-33.8274,151.2273&days=1
```

---

### 2. Transport for NSW (real ferries and buses)

Register for a free API key at [opendata.transport.nsw.gov.au](https://opendata.transport.nsw.gov.au/).

Replace `fetchTransportOptions()` and `fetchFerryDepartures()` in `lib/transportService.ts`:

```ts
// Trip Planner API — departure monitor
GET https://api.transport.nsw.gov.au/v1/tp/departure_mon
  ?outputFormat=rapidJSON
  &type_dm=stop
  &name_dm=2000259        // Taronga Zoo Wharf stop ID
  &departureMonitorMacro=true
  Header: Authorization: apikey {YOUR_KEY}
```

**Mosman ferry stop IDs (TfNSW GTFS):**
| Wharf | Stop ID |
|---|---|
| Taronga Zoo | `2000259` |
| South Mosman | `2000255` |
| Mosman Bay | `2000254` |
| Cremorne Point | `2000252` |

---

### 3. Google Maps — live walking times

Replace the hardcoded `walkMins` values with real walking times from 1 Rickard Ave, Mosman:

```ts
GET https://maps.googleapis.com/maps/api/distancematrix/json
  ?origins=1+Rickard+Ave+Mosman+NSW+2088
  &destinations=Taronga+Zoo+Wharf+Sydney
  &mode=walking
  &key={YOUR_KEY}
```

Enable the **Distance Matrix API** in Google Cloud Console.

---

## Persistent data

All user data (gym sessions, tasks, chores) is stored in **browser localStorage** with these keys:

| Key | Module | Contents |
|---|---|---|
| `mcc_gym_sessions` | GymTracker | `GymSession[]` |
| `mcc_life_admin` | LifeAdmin | `Task[]` |
| `mcc_chores` | ChoreCountdown | `Chore[]` |

Data persists across page refreshes on the same device. To clear all data: open DevTools → Application → Local Storage → clear keys prefixed with `mcc_`.

---

## Deployment (when ready)

The easiest option for a personal app is **Vercel** (free):

```bash
npm install -g vercel
vercel
```

Or connect the GitHub repo to Vercel — it auto-deploys on every push to `main`.
