# Austangel Bus Tracker

Expo Router + Firebase app for managing Austangel school buses. Parents watch buses in real time, drivers log activity, and admin maintain routes and permissions.

## Quick Start

1. Install dependencies (first run)

   ```bash
   npm install
   ```

2. Start Metro and launch the iOS simulator

   ```bash
   npx expo start
   ```

## Firebase Setup & Seeding

1. Create a Firebase project and update `services/firebase.ts` with your config.
2. In **Firestore** create collections:
   - `users/{uid}` with fields `email`, `role` (`parent`, `driver`, `admin`), and optional `assignedBusId`.
   - `buses/{busId}` with `nickname`, `driverName`, and optional `routeId`.
   - `routes/{routeId}` storing `stops` as an ordered array of `{ id, name, latitude, longitude, order }`.
3. In **Realtime Database** (RTDB) enable the default instance. Live bus positions are written to `/liveLocations/{busId}`.
4. For a demo ride add:
   - A parent user (`role: "parent"`) and a bus document (`nickname: "Austangel Bus 1"`, `driverName: "Mr. Adewale"`).
   - Optional: `routes/demo-route-1` using the coordinates in `constants/geo.ts`.

The app fabricates parent profiles the first time they log in. Drivers and admin accounts need the correct `role` field in Firestore.

## Simulating Bus Movement

- **Driver Tools tab** → tap **Start Simulation** to publish a mock GPS point for the assigned bus.
- **Track tab** → press **Start Simulation** (admin/parent preview) to broadcast a sample location from the selected route.
- Update the driver name from the Track info card (admin only) or via the Admin tab.

## Child Check-ins (Preview)

Use **Driver Tools → Record Boarding** to write a demo event to the `checkins` collection. The structure matches the long-term boarded/dropped design.

## Tests

Run unit tests for navigation helpers, driver updates, and location subscriptions:

```bash
npm test
```

## Project Structure Highlights

- `models/` – typed Firestore/RTDB models.
- `providers/AuthProvider.tsx` – role-aware auth context and routing guard.
- `services/` – Firebase helpers (`firestore`, `realtime`).
- `app/(auth)` – login flow.
- `app/(tabs)` – signed-in experience (role-aware tabs, Track, Driver tools, Admin console).
- `constants/geo.ts` – fallback geo data for simulations.
- `__tests__/` – Jest specs for critical flows.

## TODO & Security Placeholders

- Implement Firestore/RTDB security rules so drivers write only their bus, parents read with valid permission, and admin manage everything. Add TODO comments when rules are introduced.
- Flesh out permissions workflow (temporary tracking access) and AI assistant entry point.
- Expand check-in UI for per-child boarding/dropping flows.
