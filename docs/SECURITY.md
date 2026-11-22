# Security configuration and release work

## Current controls in the repository

- Firebase Authentication identifies app users.
- Firestore rules restrict profiles, child records, buses, school trips, check-ins, travel bookings, and driver locations by role and assignment.
- The Realtime Database rules restrict bus location writes to the assigned driver or an admin and reads to authorized accounts.
- Admin promotion and school fleet assignment are handled through authenticated Cloud Functions; admin privileges are represented by server-issued custom claims. The promotion secret belongs in Firebase Functions secret configuration, never in app code or a public document.
- Stripe secret credentials are used only in Cloud Functions. The Stripe publishable key may be provided to the client build.

These statements describe intended code/configuration behavior and are not a certification or substitute for reviewing the deployed Firebase project. Check the active Firebase project, rules, indexes, claims, Functions secrets, IAM, and API-key restrictions before release.

## Required before public release

- Review Firestore and Realtime Database rules with representative role and assignment cases, including denied access. The current rules were validated by loading them in the local emulator, but complete authorization tests and independent review remain outstanding.
- Restrict the Google Maps key by Android application ID and allowed Maps SDK APIs. Avoid embedding server-side Google credentials in the app.
- Use separate development and production Firebase projects. Do not run local app tests against production data.
- Configure App Check and monitor Firebase Auth/Functions access as appropriate for the deployment.
- Decide and implement data retention, account deletion, backup expiration, incident handling, and access-request workflows.
- Review child-data consent, privacy notice, terms, payment/refund policy, and store disclosures with the service owner and qualified counsel.
- Verify all native permissions, maps, location behavior, rules, payment and refund handling on actual iOS and Android builds.

## Known limits

- School driver location is foreground-only; no background GPS task is configured.
- There is no scheduled cleanup for location records, check-ins, school trips, or user data.
- There is no complete in-app account deletion flow.
- Automated rule tests, audit logging for every admin action, crash reporting, and an incident response process are not established by this repository.

Never commit Firebase service-account files, `.env` files, Stripe secret keys, or the admin promotion secret. Rotate any secret that has been exposed.
