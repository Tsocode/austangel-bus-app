# Features and current limits

## School transportation

- **Parent:** manages child profiles and sees buses connected to assigned children.
- **Admin:** creates school buses and routes, assigns drivers and attendants through a callable Cloud Function, and assigns children to buses.
- **Driver:** starts and finishes a trip for the assigned bus; while the trip is active and Driver Tools is open, foreground GPS updates are written to Realtime Database at `liveLocations/{busId}`.
- **Attendant:** views the assigned bus's student roster and records boarding/drop-off events in Firestore `checkIns` during an active trip.
- **Parent map:** displays the current bus position when available. Android uses the native Google map provider; iOS uses its default native map provider. Web does not render an interactive map.

School GPS is not a background service. If the driver closes Driver Tools, the app is suspended, location permission is denied, or connectivity is lost, updates may stop or be delayed. There is no offline upload queue or location-history playback. The latest RTDB location is not automatically expired when a trip ends.

## Travel rides

- Passengers can request a ride with pickup/drop-off details and pay through Stripe PaymentSheet.
- The server calculates fares using the admin-configured `travelPricing/current` document and estimates distance from coordinates; no turn-by-turn route or traffic calculation is included.
- Verified drivers can accept eligible paid trips and share their location while monitoring an active trip.
- Payment and refund state is handled by Cloud Functions and Stripe. Configure Stripe secrets and test on a development build before using the flow.

Dispatch does not currently provide geographic matching, availability scheduling, or automatic timeout/reassignment. Stripe asynchronous outcomes need webhook reconciliation before production use.

## Roles and data

Roles include parent, driver, attendant, admin, travel rider, and travel driver. The available screens and access are governed by Firebase Auth, Firestore rules, and server-side Functions. Do not manually edit role fields in Firestore to grant access.

The app stores profile and child records, buses, routes, trips, check-ins, travel booking/payment metadata, and current driver/bus location as needed by these flows. There is no configured automatic retention/deletion schedule. See [the Privacy Policy](../PRIVACY_POLICY.md) for details.

## Not implemented / release work

- Background school GPS collection or an offline location/check-in queue.
- Push notifications and an in-app parent/driver messaging service.
- User-facing account deletion and a production data-retention job.
- Production legal/privacy review, completed support/contact details, and platform store disclosures.
- End-to-end device verification of all role, GPS, maps, check-in, and Stripe flows.
