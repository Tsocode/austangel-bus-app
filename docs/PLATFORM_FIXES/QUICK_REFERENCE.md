# Quick Test Commands

## Web (Browser)
```bash
npm run web
```
- Opens browser at http://localhost:8081
- Press Ctrl+C to stop
- Expected: No errors, all tabs work, maps show fallback text

## iOS Simulator
```bash
npm run ios
```
- Launches Expo Go app
- Press Ctrl+C to stop
- Expected: Full features, animated wave, parallax scroll, real maps

## Android Emulator
```bash
npm run android
```
- Launches Expo Go app
- Same as iOS
- Requires Android SDK setup

---

## Clear Cache Between Tests

If you get strange errors:
```bash
npx expo start --clear
```

Or manually:
```bash
rm -rf node_modules/.cache
rm -rf .metro-cache
```

---

## Platform Behavior Quick Reference

### Web
- ✅ App loads
- ⚠️ Wave is static emoji (no animation)
- ⚠️ Explore scrolls normally (no parallax)
- ⚠️ Track shows "Map not available" text

### iOS
- ✅ Full features
- ✅ Animated wave
- ✅ Parallax scrolling
- ✅ Interactive map with markers

### Android
- ✅ Same as iOS

---

## Most Common Errors & Fixes

| Error | Fix |
|-------|-----|
| FileReaderModule not found | `npx expo start --clear` |
| Blank web screen | Clear browser cache (Ctrl+Shift+Delete) |
| Reanimated errors on web | Should be fixed - if not, clear cache |
| Maps not loading | Physical device may work better than simulator |

---

## Success = ✅ All 3 platforms work without errors
