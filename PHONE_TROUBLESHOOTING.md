# App Not Working on Phone - Diagnostic Checklist

## What to Check

### 1. Terminal Output (Most Important!)
When running `npx expo start --clear`, look for:
- ❌ Red ERROR messages
- ❌ "util" or "async_hooks" errors
- ❌ "firebase-functions" errors
- ❌ Blue WARNING messages about "Module not found"
- ✅ Green message about Metro bundler ready
- ✅ QR code displayed

### 2. Phone Screen When Opening App

**Expected Behavior:**
- Splash screen appears
- App loads to login or main screen
- No red error overlays
- UI is responsive

**Problems to Report:**
1. **Blank white/black screen** → App crashed on startup
2. **Red error overlay** → JavaScript error (read the error message)
3. **Stuck on splash screen** → Loading forever (auth/Firebase issue)
4. **Can't scan QR code** → Network issue or Metro not running
5. **App loads but buttons don't work** → JavaScript error in component

### 3. What Changed Today

```
✅ functions/package.json name changed: "functions" → "austangel"
✅ metro.config.js updated with better blocking rules
✅ HapticTab.tsx fixed to handle errors
✅ app/_layout.tsx added try-catch for reanimated
✅ globals.js added RCTDeviceEventEmitter mock
✅ functions/index.js stub file created
```

### 4. If App Still Won't Work

**Try this sequence:**

```bash
# Step 1: Stop the current Expo server (Ctrl+C)

# Step 2: Delete ALL caches
rm -r .expo .metro-bundler-cache node_modules/.cache

# Step 3: Clear phone's Expo Go cache
# (In Expo Go app → Settings → Clear cache)

# Step 4: Reinstall dependencies
npm install

# Step 5: Start fresh
npx expo start --clear

# Step 6: Wait for "Metro bundler ready"

# Step 7: Scan QR code SLOWLY (let camera focus)
```

### 5. What Should I Report Back?

Please send:
1. Full terminal output (copy entire error if there is one)
2. What the phone screen shows
3. Steps you took before error happened
4. Whether this worked before (if so, what changed?)

### 6. Quick Tests If App Loads

Once app appears on phone:
1. Try logging in
2. Try tapping different tabs
3. Try admin code: `austangel-admin-2024`
4. Check if Settings page loads

---

**Next Step:** Run the app with --clear flag and report what you see!
