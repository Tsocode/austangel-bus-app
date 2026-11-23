# Admin promotion setup

This guide replaces the obsolete local-promotion instructions that previously described a hardcoded code and direct client role writes. Do not follow those old steps or put an admin secret in app code, Firestore, or chat.

The Settings flow calls the `promoteToAdmin` Cloud Function. The Function checks the submitted code against the server-only `ADMIN_PROMOTION_SECRET` and grants the admin role/custom claim on success. The Firestore rules block clients from changing their own role.

## Local emulator

For local development, place a development-only value in `functions/.secret.local`:

```dotenv
ADMIN_PROMOTION_SECRET=choose-a-private-development-secret
```

Restart the Functions Emulator after editing the file. Keep it out of source control. This emulator value does not grant admin rights in production.

## Production

Set the production secret through Firebase Secret Manager:

```bash
firebase functions:secrets:set ADMIN_PROMOTION_SECRET
firebase deploy --only functions
```

Use a long random secret, restrict access to Firebase project administrators, and rotate it if exposed. After promoting an account, sign in or refresh the ID token so custom claims take effect. See [Functions setup](functions/README.md).
