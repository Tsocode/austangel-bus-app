# Store release readiness checklist

This checklist reflects the repository state reviewed on November 22, 2026. Items are not marked complete based only on source files or successful compilation.

## Product verification

- [ ] Run account creation, sign-in, role-specific navigation, and sign-out on iOS and Android builds.
- [ ] Verify school bus assignment, foreground GPS, live map updates, roster visibility, and check-in writes with separate parent/driver/attendant/admin accounts.
- [ ] Verify travel booking, fare display, Stripe test payment, cancellation/refund behavior, and driver tracking on physical devices.
- [ ] Confirm app behavior on denied/revoked location permission, unavailable GPS, offline network, and stale bus positions.
- [ ] Resolve all release-blocking errors and document supported devices/OS versions.

## Firebase and credentials

- [ ] Confirm production Auth providers, Firestore rules/indexes, Realtime Database rules, Functions, IAM, and App Check configuration.
- [ ] Review authorization with automated allow/deny cases and an independent rules/security review.
- [ ] Use production-only secrets in Secret Manager; verify no development credentials or test pricing are deployed.
- [ ] Restrict Google Maps API keys by application and API; verify Android map rendering and decide whether iOS should use Apple Maps or Google Maps.
- [ ] Set appropriate Firebase budgets, monitoring, backups, and incident response contacts.

## Privacy, legal, and payments

- [ ] Replace placeholder operator/contact information and publish a reviewed privacy notice and terms.
- [ ] Define and implement account deletion, data access/correction, child-data consent, retention, and backup deletion processes.
- [ ] Set and publish ride fares, cancellation/refund policy, taxes/fees, and customer support process; verify implementation matches the published terms.
- [ ] Complete platform privacy labels/data safety forms and applicable child/school privacy review.
- [ ] Add a Stripe webhook/reconciliation process for asynchronous payment and refund outcomes before live payments.

## Store assets and signing

- [ ] Confirm app name, identifiers, icon, screenshots, age/content ratings, support URL, and privacy-policy URL.
- [ ] Configure Apple/Google signing, release builds, version/build numbers, and store listing metadata.
- [ ] Build and install release candidates from the exact production configuration, then complete store review submissions.

## Current known gaps

- School GPS is foreground-only and has no offline queue or automatic expiry.
- There is no self-service account deletion or automatic data-retention cleanup.
- The privacy/terms drafts require service-owner and legal review.
- Real-device testing and production deployment verification are outstanding.
