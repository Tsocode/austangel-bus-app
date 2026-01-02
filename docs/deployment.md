## Deployment checklist

- **Env config**
  - Create `.env` with `EXPO_PUBLIC_FIREBASE_*` values (web-safe) and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` if you use Google Maps on Android/web.
  - Never commit private keys. Restrict API keys to your bundle IDs and SHA fingerprints.

- **Firebase**
  - Set Firestore rules for your roles (parent/driver/admin) and enable required providers in Firebase Auth.
  - Add your production app IDs to Firebase (iOS bundle ID, Android package, web origin) and download updated `google-services.json` / `GoogleService-Info.plist` if you eject.

- **Maps**
  - iOS uses Apple Maps by default (no key). Android/web need a Google Maps API key with Maps SDK enabled. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and add it to `app.json` `extra` if required.

- **Branding**
  - Update `app.json` name/slug, icons, splash, and colors.
  - Replace placeholder support copy/phone in Home.

- **Build & test**
  - Run `npm run lint` and `npm test`.
  - Build with EAS: `eas build -p ios --profile production` and `eas build -p android --profile production`.
  - Install builds on devices and smoke-test login, Track, Driver tools, Admin navigation, and map rendering.

- **Release**
  - Configure Apple/Google store listings, privacy policy, and App Tracking Transparency if tracking.
  - Set up OTA updates via EAS Update if desired.

- **Monitoring**
  - Enable Crashlytics/Analytics (requires additional setup) and verify logins and Firestore access are tracked in your backend analytics.
