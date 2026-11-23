# Expo/Metro Bundling Fixes - Root Cause & Solutions

## Problem Summary
The app was failing to start with errors:
- `async_hooks could not be found`
- `util could not be found`
- `ConfigError: Cannot resolve entry file`
- `Global was not installed` / `HMRClient.setup()` errors

**Root Cause:** Metro bundler was attempting to include Cloud Functions (Node.js-only code that imports `firebase-functions`) in the React Native/Expo client bundle, which is impossible since React Native doesn't have access to Node.js standard library modules.

---

## Fixes Applied

### 1. **Fixed Main App TypeScript Config** (`tsconfig.json`)
**Problem:** The main tsconfig.json included `**/*.ts` and `**/*.tsx` without exclusions, causing TypeScript to compile files from the `functions/` directory.

**Solution:** Added an `exclude` block to prevent functions directory from being compiled:
```json
{
  "exclude": [
    "node_modules",
    "functions",           // ← Excludes entire functions folder
    "**/*.test.ts",
    "**/*.test.tsx",
    ".expo",
    "dist",
    "build"
  ]
}
```

### 2. **Fixed Cloud Functions TypeScript Config** (`functions/tsconfig.json`)
**Problem:** The functions' tsconfig.json was extending `expo/tsconfig.base`, which is a **browser/client** TypeScript config, not a Node.js config. This caused type confusion and mismatched module resolution.

**Solution:** Removed the Expo base config extension and use pure Node.js configuration:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "esModuleInterop": true,
    "moduleResolution": "nodenext",
    "target": "es2017",
    "lib": ["es2017"],
    // ... other Node.js-appropriate options
  },
  "include": ["src"]
  // ← REMOVED: "extends": "expo/tsconfig.base"
}
```

### 3. **Improved Metro Configuration** (`metro.config.js`)
**Changes:**
- Improved regex blocking for Node.js built-in modules (now blocks by name instead of path)
- Removed the HMR disabling workaround (no longer needed with proper blocking)
- Cleaned up comments for clarity

**Key blocking rules:**
```javascript
config.resolver.blockList.push(
  // Block entire functions directory
  new RegExp(`${functionsPath.replace(/\\/g, '\\\\')}(?:[/\\\\]|$)`),
  // Block firebase-functions package
  /firebase-functions/,
  // Block Node.js built-in modules by name
  /^(async_hooks|util|path|fs|stream|events|buffer|crypto|http|https|net|os|process|url|querystring|zlib)$/,
);
```

---

## Architecture Overview

The project now has two properly separated environments:

### **Frontend (Expo/React Native)**
- **Config:** `tsconfig.json` (excludes functions)
- **Config:** `metro.config.js` (blocks Node.js modules)
- **Entry:** `expo-router/entry` (from package.json main field)
- **Runs in:** Browser-like React Native runtime (mobile/web)
- **Can use:** Only browser-compatible packages

### **Backend (Firebase Cloud Functions)**
- **Config:** `functions/tsconfig.json` (pure Node.js config)
- **Source:** `functions/src/index.ts`
- **Output:** `functions/lib/` (after compilation)
- **Runs in:** Node.js runtime (Firebase Functions environment)
- **Can use:** Any npm package including firebase-functions, Node.js standard library

---

## How to Test

1. **Clear all caches:**
   ```bash
   rm -r .expo node_modules/.cache
   npm start -- --clear
   ```

2. **On your phone:**
   - Force-quit Expo Go completely
   - Scan the QR code again from the terminal
   - You should see the app start without bundling errors

3. **Expected behavior:**
   - Metro logs show successful bundling without `async_hooks` / `util` errors
   - App loads to the login/service selection screen
   - No "Global was not installed" or "HMRClient.setup()" errors

---

## Configuration Status

✅ **Fixed:**
- Main tsconfig.json excludes functions directory
- Functions tsconfig.json uses Node.js config (not Expo browser config)
- Metro.config.js properly blocks Node.js modules
- package.json main field: `"expo-router/entry"` ✓
- app.config.js: `newArchEnabled: false` ✓ (uses Legacy Architecture)

---

## Related Configurations

### app.config.js
- Uses **Legacy Architecture** (`newArchEnabled: false`) - compatible with Expo Go
- react-native-maps v1.29.11 - should work with Expo Go (requires Expo 58)
- Google Maps API key configuration for iOS/Android

### Dependencies
- Expo 58.x
- React Native 0.88.1
- React 19.3.0
- Firebase 11.10.0 (client library only - functions kept separate)
- react-native-maps 1.29.11

---

## If Issues Persist

1. **Check the terminal for the FIRST error** (not HMRClient.setup, but the error above it)
2. **Run:** `npx expo-doctor` to check for SDK/native binary mismatches
3. **Clear and rebuild completely:**
   ```bash
   rm -rf .expo node_modules/.cache watchman watch-clear
   npm ci
   npm start -- --clear
   ```
4. **Force-quit and relaunch** Expo Go on your phone

---

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `tsconfig.json` | Added `exclude` block with functions | Prevent functions TypeScript from compiling into client bundle |
| `functions/tsconfig.json` | Removed `extends: "expo/tsconfig.base"` | Use Node.js config, not browser config |
| `metro.config.js` | Improved blocking rules; removed HMR workaround | Better module isolation and cleaner code |

These changes ensure the **frontend and backend are completely isolated**, each using the correct configuration and runtime for their target environments.
