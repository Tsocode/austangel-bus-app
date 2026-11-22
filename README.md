# Austangel

A React Native and Expo Router app for school transportation and travel ride bookings. Firebase provides authentication, Firestore, Realtime Database, and callable Cloud Functions. Stripe is used for travel ride payments.

## Current capabilities

- Parents manage child profiles and view bus locations for buses their children are assigned to.
- School drivers start and finish trips, share foreground GPS while a trip is active, and record student boarding and drop-off check-ins.
- Attendants view the assigned bus roster and record check-ins during an active trip.
- Admins manage school buses, routes, driver/attendant assignments, and student bus assignments.
- Travel users can request rides, pay using Stripe PaymentSheet, and follow driver location updates.

Live school GPS is sent while Driver Tools is open and a trip is active. Background tracking, push notifications, account self-deletion, and automatic data-retention cleanup are not implemented. Travel fares use server-side pricing and an estimated straight-line distance factor; this is not a routing or dispatch optimization service.

## Development setup

1. Install the supported Node.js version and dependencies: `npm install`.
2. Create a local `.env` file from `.env.example` and fill in Firebase configuration. Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` if you want the Android native map to use your Google Maps key.
3. Follow [docs/SETUP.md](docs/SETUP.md) for Firebase Emulator Suite and device setup.
4. Start the app with `npm start`; use `npm run android`, `npm run ios` (macOS), or `npm run web` as needed.

## Documentation

- [Setup and local emulators](docs/SETUP.md)
- [Feature behavior and limits](docs/FEATURES.md)
- [Security configuration and known release work](docs/SECURITY.md)
- [Travel payment setup](docs/TRAVEL_PAYMENTS.md)
- [Privacy and data retention](PRIVACY_POLICY.md)
- [Terms of Service](TERMS_OF_SERVICE.md)

The privacy policy and terms are operational drafts, not legal approval. Replace the contact placeholders and obtain review for the regions and age groups where the service will operate before publishing.
