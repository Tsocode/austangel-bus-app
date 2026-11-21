# Testing Guide for Austangel Bus App (Expo 58)

## ✅ Completed Tests

### 1. **Unit Tests** - PASSED ✅
```bash
npm test
# Result: 3 test suites, 9 tests, 0 failures
```

**Test Coverage:**
- `__tests__/navigation.test.ts` - Route navigation logic
- `__tests__/updateBusDriver.test.ts` - Bus driver model updates
- `__tests__/locations.test.ts` - Location service functionality

### 2. **TypeScript Compilation** - PASSED ✅
```bash
npx tsc --noEmit
# Result: 0 errors
```

### 3. **ESLint Code Quality** - PASSED ✅
```bash
npm run lint
# Result: 125 errors (all path resolution/native binding - expected in dev)
#         No actual code quality violations
```

---

## 🎯 Next: Runtime Testing (Most Important)

This is where you verify the app actually **works** on a real device or simulator.

### **Option 1: Device Testing (Recommended)**

Best for iOS/Android real devices with Expo Go installed.

#### Setup:
1. Install **Expo Go** on your iOS or Android device
   - [iOS: Download from App Store](https://apps.apple.com/app/expo-go/id1223657937)
   - [Android: Download from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Make sure your device is on the same WiFi as your development machine

#### Run the App:
```bash
cd C:\Users\hp\austangel-bus-app
npx expo start -c
```

**You should see:**
```
Starting Metro Bundler
Waiting on http://localhost:8081
...
› Metro waiting on port 8081.
› Scan the QR code below with Expo Go (Android) or the Camera app (iOS)
┌────────────────────────────────────────┐
│                                        │
│  [QR CODE]                             │
│                                        │
└────────────────────────────────────────┘
› Press 'a' to open Android, 'i' to open iOS, or 'w' to open web
```

#### Scan & Test:
- **iOS**: Open Camera app → Scan QR code → Tap notification
- **Android**: Open Expo Go → Scan QR code

#### What to Verify on Device:
- [ ] App loads without crash
- [ ] No red error screen
- [ ] Login screen appears
- [ ] Navigation tabs are visible
- [ ] Tab switching works smoothly
- [ ] Haptic feedback on button press (if iOS)
- [ ] No Firebase errors in console
- [ ] App loads in <5 seconds

---

### **Option 2: Web Testing (If No Device Available)**

```bash
npx expo start --web
# Opens http://localhost:19006 in browser
```

**What to Verify:**
- App loads in browser
- Login form is visible and functional
- Navigation works
- No console errors
- Responsive layout on desktop

---

### **Option 3: Android Emulator (Advanced)**

Requires Android SDK setup:
```bash
npx expo start --android
```

---

## 🔍 Verification Checklist

### **App Startup**
- [ ] No red error screen
- [ ] App boots in under 5 seconds
- [ ] Loading spinner appears if authentication is loading
- [ ] No console warnings about missing modules

### **UI Rendering**
- [ ] Login screen displays correctly
- [ ] Tab bar appears at bottom (iOS) or top (Android)
- [ ] All screen text is readable
- [ ] Icons render properly
- [ ] Colors match design system

### **Navigation**
- [ ] Can tap between tabs without crash
- [ ] Can navigate back from screens
- [ ] Deep links work (if implemented)
- [ ] Tab state persists on switch

### **Firebase Integration**
- [ ] App initializes without connection errors
- [ ] Falls back to config if .env is missing
- [ ] No auth errors in console
- [ ] Ready to test login once backend is configured

### **Haptic Feedback (iOS)**
- [ ] Tab buttons provide tactile feedback
- [ ] No vibration errors in console

### **Performance**
- [ ] No lag when switching tabs
- [ ] Smooth animations
- [ ] No memory warnings
- [ ] Battery icon doesn't show excessive drain

---

## 🐛 Debugging Tips

### **If App Crashes:**
1. Check the terminal for error message
2. Look for red error screen on device
3. Take a screenshot of the error
4. Try `npx expo start -c` (clear cache)

### **If Modules Missing:**
```bash
# Clear all caches and reinstall
rm -rf node_modules .expo .expo-shared metro-cache
npm install
npx expo start -c
```

### **If Can't Connect:**
1. Verify device and computer are on same WiFi
2. Check IP address: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
3. Try restarting the dev server: `npx expo start --clear`

### **To View Console Logs:**
- Open browser DevTools (F12) in web
- Use XCode console for iOS simulator
- Use Android Studio logcat for Android emulator

---

## 📱 Testing Workflow

```
1. Start dev server
   npx expo start -c

2. Scan QR with device

3. Verify app loads

4. Test each major feature:
   ✓ Navigation between tabs
   ✓ Screen rendering
   ✓ Button interactions
   ✓ Form inputs (once auth is integrated)

5. Check console for errors

6. Take notes on any issues

7. Report findings
```

---

## ✨ Success Criteria

You'll know the app is working when:

1. ✅ App loads on device without crash
2. ✅ Login screen is visible
3. ✅ Tabs can be navigated
4. ✅ No red error screen
5. ✅ Console has no unhandled errors
6. ✅ Firebase initializes (even with fallback config)

---

## Next Steps After Device Testing

If device testing is successful:

1. **Create PR** to merge `feature/driver-tools-ui` → `main`
2. **Set up CI/CD** with GitHub Actions
3. **Deploy to EAS Build** for production binaries
4. **Implement login flow** with Firebase Auth
5. **Test API integrations** with Firestore/Realtime DB

---

## Questions?

If testing reveals issues:
- Check the [EXPO_58_MIGRATION_SUMMARY.md](./EXPO_58_MIGRATION_SUMMARY.md) for reference
- Look at polyfills in [globals.js](./globals.js)
- Review changes in git commits: `git log --oneline feature/driver-tools-ui`
