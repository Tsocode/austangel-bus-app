# Development setup

## Requirements

- Node.js and npm (use the version configured for the project/Expo SDK).
- Android Studio for Android emulator/device work.
- macOS and Xcode for local iOS simulator builds. EAS can build iOS remotely.
- Java 21 for the Firebase Firestore Emulator on Windows if Java is not already on PATH.

## Install and configure

```bash
git clone <repo-url>
cd austangel-bus-app
npm install
cp .env.example .env
```

Edit `.env` and set the Firebase `EXPO_PUBLIC_FIREBASE_*` values. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for Android's native Google map tiles. The key is included in the native app binary, so restrict it in Google Cloud Console to the Android application ID (`com.tsocode.austangel`) and Maps SDK for Android. iOS uses the platform's default Apple map provider in the school tracking screen; the Google key is not used there. The web tracking screen has no interactive map.

Do not commit `.env`, `.env.local`, Stripe secret keys, or Firebase service-account credentials. The repository's `.env.local` files are ignored by Git.

## Start local Firebase emulators

The app connects to emulators when `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` is set. For Android Emulator, set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2`; for a physical device, use the development computer's LAN IPv4 address; for iOS Simulator or a local web browser, use `127.0.0.1`.

In terminal 1, from the project root:

```bash
npx firebase-tools emulators:start --only auth,firestore,database,functions
```

In terminal 2:

```bash
npm start
```

Use `npm run android`, `npm run ios` (macOS only), or `npm run web` to launch a target. Emulator data is separate from production data. Do not use production credentials while testing writes.

## Native maps and location

The native map and location permissions are part of the app build. When changing the Google Maps key or native configuration, rebuild/reinstall the development app; restarting Metro alone does not change the binary. Expo Go may not reflect project-specific native settings. Driver GPS uses foreground location only and runs while Driver Tools is open during an active school trip. Grant location permission on the driver device and enable device location services.

## Prepare a school-flow test

Create test accounts through the app's sign-up screen while connected to the Auth Emulator. Configure the server-side admin secret as described in [Admin promotion setup](../ADMIN_CODE_FIX_GUIDE.md), then promote the test admin through Settings. In the Admin tab, create a route and bus, assign a driver and attendant, then assign a child profile to that bus. Sign in on the driver and attendant sessions to exercise GPS and check-in writes. The app does not seed these records automatically.

## Travel payments

See [TRAVEL_PAYMENTS.md](TRAVEL_PAYMENTS.md). Stripe PaymentSheet requires Stripe test credentials and a native development build. Configure test pricing in the Firestore Emulator before trying to book and pay.

## Useful checks

```bash
npx tsc --noEmit
npm --prefix functions run build
npx expo export --platform android
```

These checks do not replace testing sign-in, permissions, maps, GPS, rules, and Stripe payment on target devices. See [FEATURES.md](FEATURES.md) for current limitations.
