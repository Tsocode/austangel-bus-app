# Austangel App - Quick Start Guide

## Clone & Setup (First Time Only)

```bash
# Clone the repository
git clone https://github.com/Tsocode/austangel-bus-app.git
cd austangel-bus-app

# Install dependencies
npm install

# Create .env file with your Firebase credentials
cp .env.example .env
# Edit .env and add your credentials

# (Optional) Install Expo CLI globally
npm install -g expo-cli
npm install -g eas-cli
```

## Development

### Web Development
```bash
npm run web
# Opens http://localhost:8081 in your browser
# Hot reload on file changes
```

### iOS Development
```bash
npm run ios
# Shows QR code in terminal
# Scan with Expo Go app (from App Store)
# Or use development client on physical iPhone
```

### Android Development
```bash
npm run android
# Requires Android emulator running or device connected
# Automatically builds and launches app
```

## Project Structure

```
austangel-bus-app/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab-based navigation
│   ├── (auth)/                   # Authentication flows
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable components
├── models/                       # TypeScript data models
│   ├── user.ts                   # User + roles
│   ├── vehicle.ts                # Vehicles
│   ├── travel-trip.ts            # Trips
│   ├── travel-group.ts           # Groups
│   ├── fleet.ts                  # Fleets
│   └── invitation.ts             # Invitations
├── providers/                    # React Context providers
│   ├── AuthProvider.tsx          # Authentication & multi-service
│   └── ThemeProvider.tsx         # Dark mode
├── services/                     # Firebase and API services
│   ├── firebase.ts               # Firebase config
│   ├── firestore/                # Firestore operations
│   └── realtime-db/              # Realtime Database ops
├── utils/                        # Utility functions
│   ├── navigation.ts             # Route mapping
│   └── ...
├── constants/                    # App constants
└── styles/                       # Global styles
```

## Multi-Service Architecture

### User Roles

**School Transport:**
- `'admin'` - Admin panel, user management, bus oversight
- `'driver'` - Drive buses, manage routes, check-in students
- `'attendant'` - Track attendance, manage students, support driver
- `'parent'` - View child location, real-time notifications

**Vehicle & Travel (Future):**
- `'passenger'` - Book and manage trips
- `'chauffeur'` - Drive privately, earn money
- `'fleet_operator'` - Manage fleet of vehicles
- `'travel_organizer'` - Organize group trips
- `'travel_admin'` - Oversee all travel operations

### Using the Auth Context

```typescript
import { useAuthContext } from '@/providers/AuthProvider';

export function MyComponent() {
  const { profile, role, primaryService, switchService } = useAuthContext();
  
  // Check current service
  if (primaryService === 'school') {
    // Show school transport UI
  } else {
    // Show travel/vehicle UI
  }
  
  // Switch service
  await switchService('travel');
}
```

### Smart Routing

```typescript
import { getLandingRouteForRole, getServiceFromRole } from '@/utils/navigation';

// Get the right landing page for a role
const route = getLandingRouteForRole('parent'); // Returns '/(tabs)/track'
const route2 = getLandingRouteForRole('chauffeur'); // Returns '/(travel)/dashboard'

// Detect service from role
const service = getServiceFromRole('driver'); // Returns 'school'
const service2 = getServiceFromRole('passenger'); // Returns 'travel'
```

## Firebase Setup

### Firestore Collections

**Current (School Transport):**
- `users/` - User profiles and roles
- `buses/` - Bus information
- `routes/` - Bus routes
- `checkIns/` - Student check-ins
- `incidents/` - Incident reports

**Future (Vehicle & Travel):**
- `vehicles/` - Car, SUV, van, coach listings
- `trips/` - Travel trips and assignments
- `groups/` - Travel groups and members
- `fleets/` - Fleet operators and vehicles
- `invitations/` - Pending invitations

### Environment Variables

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

## Common Commands

```bash
# Check for type errors (note: may crash due to pre-existing issue)
npx tsc --noEmit

# Lint code
npm run lint

# Run tests
npm test

# Build for production
npm run build-web          # Web
eas build --platform ios   # iOS (requires EAS account)
eas build --platform android # Android

# See all scripts
npm run
```

## Git Workflow

```bash
# See recent commits
git log --oneline -n 10

# Create a feature branch
git checkout -b feature/my-feature

# Make changes, then commit
git add .
git commit -m "feat: Add my feature"

# Push to remote
git push origin feature/my-feature

# Create pull request on GitHub
# (Link in PR description: "Closes #123" to auto-close issues)
```

## Debugging

### App Won't Start
```bash
# Clear everything and reinstall
rm -rf node_modules
npm install

# Or reset Expo
npm start -- --clear
```

### Metro Bundler Errors
```bash
# Reset bundler cache
npm run web -- --reset-cache

# Or kill the process and restart
npm run web
```

### TypeScript Errors
```bash
# This is OK - pre-existing issue in codebase
# The app still runs fine via Metro bundler
# Use npm run web/ios/android for testing

# If you need to check syntax:
npm run lint
```

## Testing Your Changes

### Quick Test Flow
1. Make code changes
2. Hot reload happens automatically in dev mode
3. Test on web with `npm run web`
4. Test on device with `npm run ios` or `npm run android`

### Testing Multi-Service
1. Create a new account
2. Check that `primaryService` is 'school'
3. Check that `schoolRole` is 'parent'
4. Verify legacy `role` field still works
5. Test that existing school transport features work

## Performance Tips

- Use `useMemo` for expensive computations
- Use `React.memo` for components that rarely change
- Keep bundle size small by lazy loading features
- Use Expo's built-in code splitting

## Resources

- **Expo Docs**: https://docs.expo.dev/
- **Firebase Docs**: https://firebase.google.com/docs
- **React Navigation**: https://reactnavigation.org/
- **React Native**: https://reactnative.dev/
- **Expo Router**: https://expo.dev/routing

## Getting Help

1. **Check Documentation**:
   - `MULTI_SERVICE_IMPLEMENTATION.md` - Architecture
   - `PHASE2_COMPLETION_SUMMARY.md` - What was done
   - `TESTING_AND_DEPLOYMENT_GUIDE.md` - Testing

2. **Search Codebase**:
   - Use VS Code Find (Cmd+F / Ctrl+F)
   - Use ripgrep: `grep -r "search term"`

3. **Git History**:
   - `git log --oneline` - See recent changes
   - `git show <commit>` - See what changed
   - `git blame <file>` - See who changed what

4. **Firebase Console**:
   - https://console.firebase.google.com/
   - Check Firestore, Realtime DB, Authentication

## Production Deployment

```bash
# When ready to submit to app stores:

# 1. Test thoroughly
npm run web
npm run ios
npm run android

# 2. Update version in app.config.js
# 3. Commit changes
git add .
git commit -m "release: Bump version to v1.1.0"
git tag -a v1.1.0 -m "Release v1.1.0"

# 4. Build for production
eas build --platform ios --auto-submit
eas build --platform android --auto-submit

# 5. Submit to stores (or use --auto-submit)
```

---

**Happy Coding!** 🚀

For more details, see the full documentation in the root directory.
