# Infrastructure Configuration

This folder contains deployment, CI/CD, and infrastructure setup files.

## Firebase Deployment

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy all Firebase services
firebase deploy
```

## EAS Build Configuration

See `eas.json` in root for iOS/Android build profiles.

## GitHub Actions

CI/CD workflows in `.github/workflows/`

## Environment Variables

Set in `.env` (never commit):

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

## Production Checklist

- [ ] Environment variables set
- [ ] Firebase rules deployed
- [ ] Security audit passed
- [ ] Error logging enabled
- [ ] Builds tested on devices
- [ ] App store listings ready
