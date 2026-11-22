# Firebase Functions setup

## Admin promotion

The `promoteToAdmin` callable validates the supplied code against the
`ADMIN_PROMOTION_SECRET` stored in Firebase Secret Manager. Set a random secret
of at least 32 characters before deploying Functions:

```sh
firebase functions:secrets:set ADMIN_PROMOTION_SECRET
firebase deploy --only functions
```

The app calls this function from Settings. The secret is never bundled into
the app. A successful call writes the user's admin role through the Admin SDK
and sets the `role: "admin"` custom claim. The client refreshes its ID token
afterward so the updated claim is available to security rules. Failed codes are
rate limited to five attempts per account per hour.

## Realtime Database access mirrors

Realtime Database rules use backend-maintained `busAssignments` and
`userBusAccess` nodes because RTDB rules cannot read Firestore documents.
Firestore triggers keep those nodes current for bus assignments and child bus
assignments. After deploying the functions and refreshing the admin custom
claim, an admin should press **Sync Existing Firebase Access** in Settings.
This calls `rebuildRealtimeAccessMaps`, migrates legacy bus `assignedDriver`
fields to `driverId`, and populates the mirrors for existing records.
Parent location access is granted only for bus IDs on their child documents.

The `busAssignments` and `userBusAccess` nodes must only be written by trusted
backend code. Do not grant client write access to these paths. The same
backfill call also builds `buses.parentIds`, `routes.parentIds`, and the
PII-limited `drivers_public` projection used by passenger driver discovery.
