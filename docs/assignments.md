## Setup: env + role assignments

### 1) Create your `.env`
- Copy `.env.example` to `.env`.
- Fill in `EXPO_PUBLIC_FIREBASE_*` and, for Android/web, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Restart Expo with cache clear so values load: `expo start -c` (or `npm start` then press `c`).

### 2) Define roles and assignments in Firestore
- Collection: `users/{uid}`
- Required fields:
  - `email`: string
  - `role`: `parent | driver | attendant | admin`
  - `displayName`: string
  - `assignedBusId`: string|null (required for driver/attendant; use null otherwise)
  - `childIds`: string[] (for parents; list of student IDs)
  - `createdAt`, `updatedAt`: number (ms)
- Example documents:
```json
// Driver
{
  "email": "driver@example.com",
  "role": "driver",
  "displayName": "Mr. Adewale",
  "assignedBusId": "bus-123",
  "childIds": [],
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000
}

// Attendant
{
  "email": "attendant@example.com",
  "role": "attendant",
  "displayName": "Mrs. Bisi",
  "assignedBusId": "bus-123",
  "childIds": [],
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000
}

// Parent
{
  "email": "parent@example.com",
  "role": "parent",
  "displayName": "Austangel Parent",
  "assignedBusId": null,
  "childIds": ["student-001", "student-002"],
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000
}
```

### 3) Security rules (outline)
- Drivers/attendants: allow reads/writes only when `request.auth.uid` matches the user doc and `resource.data.assignedBusId == user.assignedBusId`.
- Parents: allow reads only for buses/routes tied to their `childIds`.
- Admin: allow reads/writes to all.
- Deny broad collection reads; require filters by assigned IDs.

### 4) Verify in the app
- Driver/Attendant with `assignedBusId`: Track shows only that bus; if missing, Track shows “No bus assigned.”
- Parent: Track should show only their child’s bus (wire parent→child→bus in data/rules).
- Admin: all tabs visible.
