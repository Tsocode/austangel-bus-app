# Austangel Privacy Notice (release draft)

**Last reviewed: November 22, 2026**

This notice describes data handling visible in the current Austangel app and Firebase configuration. It is a product-accuracy draft, not a legal determination. Before release, the service owner must confirm the operating entity, contact details, applicable jurisdictions, children's consent process, and legally required retention periods with qualified counsel.

## Information processed

Depending on the features used, Austangel processes:

- **Account/profile data:** email, display name, phone number when provided, selected role/service, and account timestamps through Firebase Authentication and Firestore.
- **Child/roster data:** child names and guardian/bus assignment information entered by a parent or administrator in Firestore.
- **School transport data:** bus and route assignments, trip start/end/status, check-in type, time, staff member who recorded it, optional note, and the driver's current coordinates included with a check-in when available.
- **Location data:** a school driver's foreground device location while Driver Tools is open and a school trip is active; travel-driver location during the travel tracking flow. Current positions are used to show authorized users the bus/driver location.
- **Travel booking and payment metadata:** pickup/drop-off details, scheduled/requested time, calculated fare, trip state, and Stripe PaymentIntent identifiers/status. Card entry is presented by Stripe PaymentSheet; the app does not intentionally store card numbers or security codes.
- **Technical/service data:** Firebase Authentication, Firestore, Realtime Database, Cloud Functions, Google Maps (where its map SDK is used), and Stripe may process service, device, network, or diagnostic data under their own terms and privacy notices. This app does not currently integrate an app analytics or crash-reporting SDK.

## How data is used and shared

Data is used to authenticate accounts, assign users to transportation roles, manage rosters and trips, record check-ins, show current locations to authorized users, calculate and collect ride payments, process eligible cancellations/refunds, and protect the service. Access is controlled by Firebase rules and authenticated Cloud Functions; exact access depends on role and assignment.

Firebase/Google provides app infrastructure and map services. Stripe processes payments. Information may also be disclosed when required by law or to protect people and the service. Austangel does not currently describe or implement advertising or sale of personal data in the app.

## Location behavior

School driver location is requested as foreground location and is published while an active trip is being viewed in Driver Tools. It is not configured as an always-on/background tracking service. A network or permission issue can interrupt updates. The latest location record may remain in Realtime Database after a trip ends; the app has no scheduled expiration or location-history cleanup job. Travel location is stored in the current driver location record used by the travel tracking flow.

Parents should use the app's current bus assignment and trip state to understand which location is shown. The app does not guarantee location accuracy or availability.

## Retention and deletion

The project does not currently configure automatic expiration or a complete account/child-data deletion workflow. Firestore trip, check-in, profile, route, and booking records may remain until an authorized administrator or operator deletes them under Firebase access controls. The latest Realtime Database location can remain until overwritten or deleted. Stripe retains payment records under its own policies and legal obligations.

Do not rely on an assumed 30-day, 90-day, or seven-year schedule: no such automatic policy is implemented in this codebase. Before launch, the service owner must choose and implement retention periods, deletion procedures, backup handling, and request channels, then update this notice to match.

There is no in-app self-service account deletion flow in the current app. For account or data requests, contact the operator using the contact details supplied in the store listing or by the organization that provided access. The operator must verify the request and explain any records that must be retained.

## Children and school records

The app supports parent-managed child roster information. The codebase alone does not establish a complete parental consent process or determine compliance with children's privacy, education-record, or other laws. The service operator must define who may create child profiles, obtain required notices/consents, limit access, and handle deletion requests before offering the service to children or schools.

## Security and third parties

The app uses Firebase Authentication, Firestore and Realtime Database security rules, and callable Cloud Functions. Data is transmitted to Firebase/Google and Stripe services. No system can promise absolute security; deployment configuration, credentials, access policies, and vendor terms also affect protection. Google Maps keys embedded in native apps are discoverable and must be restricted by application and API in Google Cloud Console.

Review the privacy information from [Firebase](https://firebase.google.com/support/privacy), [Google Maps Platform](https://cloud.google.com/maps-platform/terms), and [Stripe](https://stripe.com/privacy) for their processing details.

## Changes and contact

The published policy should include the legal operator's name, working privacy email, mailing address where required, and an effective date. Those details are not configured in this repository and must be supplied before store submission. Significant changes should be communicated as required by applicable law.
