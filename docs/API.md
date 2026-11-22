# Firebase data model notes

The app uses Firebase's JavaScript SDK and the Cloud Functions client. Security rules and callable Functions are authoritative; this page is a collection/data-shape guide, not an authorization bypass or complete API contract.

## Firestore collections

| Path | Purpose | Typical fields |
|---|---|---|
| `users/{uid}` | Account profile and service/role assignment | `email`, `displayName`, `role`, `primaryService`, timestamps, optional `assignedBusId` |
| `users/{uid}/children/{childId}` | Parent-managed student roster | `firstName`, `lastName`, optional `fullName`, `guardianIds`, optional `defaultBusId` |
| `buses/{busId}` | School vehicle and staff/route assignment | `nickname`, `driverId`, `assignedAttendants`, `routeId`, optional parent access fields |
| `routes/{routeId}` | School route and ordered stops | `name`, `stops`, timestamps |
| `trips/{tripId}` | School trip state | `busId`, `routeId`, `driverId`, `date`, `shift`, `startTime`, `status`, optional `endTime` |
| `checkIns/{checkinId}` | Student boarding/drop-off event | `tripId`, `busId`, `childId`, `parentId`, `type`, `recordedBy`, `timestamp`, optional coordinates/note |
| `travelTrips/{tripId}` | Travel ride booking and payment state | passenger/driver IDs, pickup/drop-off, schedule, fare, payment and trip status |
| `drivers/{uid}` / `drivers_public/{uid}` | Travel driver profile and public-safe listing | driver-specific profile fields |
| `travelPricing/{pricingId}` | Admin-managed fare configuration | base/per-km/minimum cents, currency and class multipliers |

## Realtime Database

- `liveLocations/{busId}` is the current school bus location used by the school tracking screen.
- Travel driver location is stored at `liveLocations/{driverUid}` in Firestore by the travel flow; this is separate from the school bus RTDB location.
- `busAssignments` and `userBusAccess` are server-maintained access maps used by RTDB rules. Clients cannot write these maps.

## Callable Cloud Functions

Important client flows call server-side Functions for admin promotion, school fleet assignment, travel booking/payment/cancellation, and RTDB access-map synchronization. Function names and regions are defined in `functions/src/index.ts`; use the generated Firebase Functions client rather than direct client writes for protected operations.

## Authorization

Rules enforce role and assignment checks. Do not update user role fields directly from the client or treat a client-side profile role as proof of admin status. See [SECURITY.md](SECURITY.md) and [the rules](../firestore.rules).
