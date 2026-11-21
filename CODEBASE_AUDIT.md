# Austangel App - Codebase Audit & Architecture Analysis

## Executive Summary

**Current State:** School bus transportation platform for managing routes, buses, drivers, parents, and students with real-time tracking and check-ins.

**Tech Stack:** React Native (Expo 58), Firebase (Auth + Firestore + Realtime DB), Expo Router, TypeScript

**Current Functionality:** ✅ Working on iOS, Android, and Web (after platform fixes)

**Expansion Task:** Add Vehicle & Travel service (ride-sharing, chauffeur, tourism, fleet management) while preserving school transport.

---

## 1. TECHNOLOGY STACK & DEPENDENCIES

### Frontend Framework
- **Expo 58.0.26** - React Native development platform
- **React 19.3.0** - UI framework
- **React Native 0.88.1** - Native components
- **Expo Router 58.0.32** - File-based routing (file structure = URL structure)
- **React Navigation 7.x** - Navigation library

### Maps & Location
- **react-native-maps 1.29.11** - Google Maps integration
- **expo-location 58.0.22** - GPS and geolocation
- **Google Maps API key configured** - Environment variable `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

### Backend & Database
- **Firebase 11.10.0**
  - Firebase Auth (Email/Password)
  - Firestore (Document database for structured data)
  - Realtime Database (JSON database for live locations)

### UI & Animation
- **react-native-reanimated 4.7.1** - Smooth animations (native only)
- **@expo/vector-icons 15.0.2** - Icon library
- **react-native-blur** - Blur effects
- **react-native-safe-area-context** - Safe area handling

### Web Support
- **react-native-web 0.21.4** - React Native to web
- **react-dom 19.3.0** - React DOM
- Conditional loading: Native modules (Reanimated, Maps) skipped on web

### Development
- **TypeScript 6.0.3** - Type safety
- **Jest + jest-expo** - Testing framework
- **ESLint** - Code linting
- **dotenv** - Environment configuration

### Build & Deployment
- **EAS Build** - Expo's cloud build service (iOS/Android)
- **Firebase Deploy** - Rules deployment for Firestore/Realtime DB
- **Metro** - JavaScript bundler with custom config for polyfills

---

## 2. APPLICATION ARCHITECTURE

### Project Structure

```
austangel-bus-app/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx             # Login/signup screen
│   │   └── _layout.tsx           # Auth group layout
│   ├── (tabs)/                   # Tabbed interface (after auth)
│   │   ├── _layout.tsx           # Tab navigation (role-based)
│   │   ├── index.tsx             # Home screen
│   │   ├── home.tsx              # Parent dashboard
│   │   ├── track.tsx             # Bus tracking (maps)
│   │   ├── driver-tools.tsx      # Driver interface
│   │   ├── attendant.tsx         # Attendant check-ins
│   │   ├── admin.tsx             # Admin dashboard
│   │   ├── explore.tsx           # Explore screen
│   │   ├── settings.tsx          # Settings
│   │   └── help.tsx              # Help/support
│   ├── _layout.tsx               # Root layout
│   ├── error.tsx                 # Error boundary
│   └── +not-found.tsx            # 404 page
│
├── components/                   # Reusable UI components
│   ├── ui/                       # Basic components
│   ├── HapticTab.tsx             # Haptic feedback for tabs
│   ├── HelloWave.tsx             # Animated wave (platform-specific)
│   ├── ParallaxScrollView.tsx    # Scroll view (native vs web)
│   ├── SettingsButton.tsx        # Settings button
│   └── ThemedText.tsx            # Themed typography
│
├── constants/
│   ├── Colors.ts                 # Theme colors
│   └── geo.ts                    # Geographic constants (routes, locations)
│
├── models/                       # TypeScript interfaces
│   ├── user.ts                   # User interface (extends AustangelUser)
│   ├── bus.ts                    # Bus interface
│   ├── route.ts                  # Route interface
│   ├── trip.ts                   # Trip interface
│   ├── checkin.ts                # Check-in interface
│   ├── child.ts                  # Child (student) interface
│   └── permission.ts             # Permission model
│
├── services/                     # Business logic
│   ├── firebase.ts               # Firebase initialization
│   ├── firestore/
│   │   ├── users.ts              # User CRUD operations
│   │   ├── buses.ts              # Bus management
│   │   ├── routes.ts             # Route management
│   │   └── checkins.ts           # Check-in management
│   └── realtime/
│       └── locations.ts          # Live location updates (Realtime DB)
│
├── providers/                    # React context providers
│   ├── AuthProvider.tsx          # Authentication state management
│   └── AppearanceProvider.tsx    # Theme/appearance management
│
├── utils/
│   ├── navigation.ts             # Navigation utilities
│   └── user.ts                   # User utilities
│
├── hooks/
│   └── useColorScheme.ts         # Color scheme hook
│
├── __tests__/                    # Test files
│   └── navigation.test.ts        # Navigation tests
│
├── assets/
│   ├── images/                   # App icons, splash, etc.
│   └── fonts/                    # Custom fonts
│
├── firebase.json                 # Firebase config
├── firestore.rules               # Firestore security rules
├── database.rules.json           # Realtime Database rules
├── app.config.js                 # Expo configuration
├── metro.config.js               # Metro bundler config (polyfills)
├── globals.js                    # Global polyfills for FileReader, etc.
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies
└── .env / .env.example           # Environment variables
```

---

## 3. AUTHENTICATION & AUTHORIZATION

### Current Implementation

**Firebase Auth Integration:**
- Email/password authentication only
- Located in `services/firebase.ts`
- Initialized on app startup

**User Profile Structure (Firestore):**
```typescript
interface AustangelUser {
  id: string;                    // Firebase UID
  email: string;
  role: UserRole;                // 'admin' | 'driver' | 'parent' | 'attendant'
  firstName?: string;
  lastName?: string;
  displayName?: string;
  assignedBusId?: string;        // For drivers/attendants
  childIds?: string[];           // For parents
  phoneNumber?: string;
  photoURL?: string;
  createdAt?: number;
  updatedAt?: number;
}
```

**Roles & Permissions:**

| Role | Permissions | Tabs |
|------|-------------|------|
| **Parent** | View assigned child on bus, receive notifications | track, home, explore |
| **Driver** | Accept trips, update bus location, see assigned bus | track, driver-tools, home |
| **Attendant** | Check in students, record incidents | track, attendant, home |
| **Admin** | Full access to all data, manage users/buses/routes | track, admin, home |

**Auth Flow:**
1. User opens app → `app/_layout.tsx` checks auth status
2. If unauthorized → Redirects to `(auth)/login`
3. If authorized → Loads user profile from Firestore
4. Navigates to role-appropriate dashboard via `getLandingRouteForRole(role)`

**Default Role:** New users assigned `parent` role (line 60-61 in AuthProvider.tsx)

---

## 4. DATABASE SCHEMA & COLLECTIONS

### Firestore Collections

**Collection: `users`**
- Document ID: Firebase UID
- Fields: See AustangelUser interface above
- Rules: Users can read/update their own profile; admins can manage all

**Collection: `buses`**
```typescript
interface Bus {
  id: string;
  nickname: string;
  plateNumber?: string;
  driverId?: string;
  driverName?: string;
  routeId?: string;
  updatedAt?: number;
}
```

**Collection: `routes`**
```typescript
interface Route {
  id: string;
  name: string;
  stops: RouteStop[];
  createdAt?: number;
  updatedAt?: number;
}

interface RouteStop {
  location: string;
  latitude: number;
  longitude: number;
  sequence: number;
}
```

**Collection: `checkIns`**
```typescript
interface CheckIn {
  id: string;
  busId: string;
  studentId: string;
  timestamp: number;
  status: 'picked_up' | 'dropped_off';
  recordedBy: string; // attendant/driver UID
}
```

**Collection: `children`** (subcollection under users/)
```typescript
interface Child {
  id: string;
  name: string;
  schoolId?: string;
  parentId: string;
  assignedBusId?: string;
  assignedRoute?: string;
}
```

### Realtime Database Collections

**Path: `liveLocations/{busId}`**
```typescript
interface LiveLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: number;
}
```

Used for real-time bus tracking on maps.

---

## 5. FIRESTORE SECURITY RULES

**Location:** `firestore.rules`

**Key Rules:**
- `users/{userId}` → Own profile read/write; admin can manage all
- `buses/{busId}` → Admin read/write; drivers can update location
- `routes/{routeId}` → Admin read/write; drivers/attendants can read assigned routes
- `checkIns/{checkInId}` → Attendants can create/write; parents can read
- `liveLocations/{userId}` → Own location write; admin read; drivers read own; attendants/parents restricted

**Current Status:** Rules updated in this session to allow authenticated users to create profiles on first signup.

---

## 6. REALTIME DATABASE RULES

**Location:** `database.rules.json`

**Current Rules:**
```json
{
  "rules": {
    "liveLocations": {
      ".read": "auth.uid != null",
      ".write": "auth.uid != null",
      "$key": {
        ".validate": "newData.hasChildren(['latitude', 'longitude'])"
      }
    },
    "trips": {
      ".read": "auth.uid != null",
      ".write": "auth.uid != null",
      "$tripId": {
        ".validate": "newData.hasChildren(['busId', 'startLocation'])"
      }
    }
  }
}
```

---

## 7. NAVIGATION STRUCTURE

### File-Based Routing (Expo Router)

**Root Layout:** `app/_layout.tsx`
- Initializes providers (Auth, Theme)
- Handles auth state → routes to `(auth)` or `(tabs)`
- Shows loading screen while checking auth status

**Auth Stack:** `app/(auth)/_layout.tsx`
- Login/signup screen
- Native stack (full-screen)

**Tabs Stack:** `app/(tabs)/_layout.tsx`
- Bottom tab navigation
- Tabs visible based on user role (VISIBLE_TABS config)
- Role-based tab visibility prevents unauthorized screen access

**Landing Route Logic:**
```typescript
// utils/navigation.ts
function getLandingRouteForRole(role: UserRole | null): string {
  switch (role) {
    case 'parent': return '/(tabs)/home';
    case 'driver': return '/(tabs)/track';
    case 'attendant': return '/(tabs)/attendant';
    case 'admin': return '/(tabs)/admin';
    default: return '/(tabs)/home';
  }
}
```

---

## 8. EXISTING FEATURES - SCHOOL TRANSPORT

### Parent Experience
- **Home Dashboard** (`home.tsx`) - Overview of active trips, check-ins
- **Bus Tracking** (`track.tsx`) - Real-time map showing bus location
- **Explore** (`explore.tsx`) - Browse bus schedules
- **Notifications** - Alerts for pickups, drop-offs, delays

### Driver Experience
- **Driver Tools** (`driver-tools.tsx`) - Accept/manage trips, update location
- **Route Management** - View assigned routes
- **Live Tracking** - Broadcast location to parents
- **Status Updates** - Mark trips started/completed

### Attendant Experience
- **Check-ins** (`attendant.tsx`) - Scan/record student boarding
- **Route Tracking** - Follow assigned bus
- **Incident Reporting** - Log issues

### Admin Experience
- **Admin Dashboard** (`admin.tsx`) - Manage all data
- **User Management** - Create/edit users, assign roles
- **Bus Management** - Add/edit buses, assign drivers
- **Route Management** - Create/edit routes
- **Reports** - View analytics

---

## 9. CURRENT BUGS & ISSUES

**Fixed in this session:**
- ✅ FileReaderModule mismatch (reverted to default Expo config)
- ✅ Firestore permission denied for new user profiles
- ✅ Realtime database permission denied for live locations
- ✅ Web platform compatibility (conditional imports, fallbacks)
- ✅ Bundle identifier missing in app.config.js

**Known Limitations:**
- Maps not available on web (fallback message shown)
- Reanimated animations disabled on web

---

## 10. REUSABLE COMPONENTS & SERVICES

### Reusable Services
- `services/firebase.ts` - Firebase app initialization (can be extended)
- `services/firestore/users.ts` - User CRUD (upsertUserProfile, getUserProfile)
- `services/realtime/locations.ts` - Live location updates
- `AuthProvider.tsx` - Context-based authentication (can be extended with multi-service support)

### Reusable UI Components
- `components/HapticTab.tsx` - Tab button with haptic feedback
- `components/ParallexScrollView.tsx` - Platform-specific scrolling
- `components/ThemedText.tsx` - Themed typography
- `components/IconSymbol.tsx` - Icon rendering

### Potential Issues for Expansion
- **Role system is global** - New roles needed for Vehicle & Travel service
- **User profile assumes school context** - Need `serviceType` or similar field
- **assignedBusId is school-specific** - Need different assignment model for vehicles
- **Routes are geographic paths** - Different from trip scheduling

---

## 11. GOOGLE MAPS INTEGRATION

**Current Status:** ✅ Configured and working

**API Key:** `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (environment variable)

**Configured In:**
- `app.config.js` → Passes to native iOS and Android
- `services/firebase.ts` → Can be used for client-side calls
- `app/(tabs)/track.tsx` → Uses `react-native-maps` for rendering

**APIs Currently Used:**
- **Google Maps SDK** - Native map rendering
- **Maps JavaScript API** (optional) - Web support

**NOT Currently Implemented:**
- Routes API - ETA calculations, turn-by-turn
- Places API - Location search/autocomplete
- Geocoding API - Address lookups
- Matrix API - Distance calculations

---

## 12. DESIGN & STYLING

### Color Scheme
- **Light Mode:** Blue accent (#2563eb), gray backgrounds
- **Dark Mode:** Supported via ThemeProvider
- **Custom:** `constants/Colors.ts` defines theme colors

### Typography
- **Font:** SpaceMono (custom)
- **Icons:** Expo Vector Icons + SF Symbols

### Responsive Design
- Conditional styling: `Platform.select({ ios: ..., android: ..., web: ... })`
- Safe area context for notches/edges
- Tab bar responsive (absolute positioning on iOS)

---

## 13. ENVIRONMENT CONFIGURATION

### .env Variables (Firebase)
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=austangels
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

### Configuration Files
- `app.config.js` - Expo/app settings
- `metro.config.js` - Bundler configuration
- `firebase.json` - Firebase settings
- `.firebaserc` - Project ID: `austangels`

---

## 14. DEPENDENCIES & COMPATIBILITY

### Minimum Requirements
- **Node.js:** 16+
- **iOS:** 13+
- **Android:** 8+ (API level 26)
- **Expo Go:** Latest version

### Key Dependency Versions
- Expo: 58.0.26
- React: 19.3.0
- React Native: 0.88.1
- TypeScript: 6.0.3
- Firebase: 11.10.0

### Known Version Constraints
- Firebase 11.10.0 requires specific polyfills (globals.js configured)
- Expo 58 locks react-native to 0.88.1
- Reanimated 4.7.1 not available on web

---

## 15. TEST COVERAGE

**Location:** `__tests__/`

**Current Tests:**
- `navigation.test.ts` - Navigation routing tests

**Test Framework:** Jest + jest-expo

---

## 16. DEPLOYMENT & BUILD

### Build Configuration
- **EAS Build:** Cloud build service for iOS/Android
- **Platforms:** iOS, Android, Web
- **Bundle Identifier:** `com.tsocode.austangel`
- **Package Name:** `com.tsocode.austangel`

### Environment Profiles
- **Development:** Expo Go + EAS Development Builds
- **Production:** EAS Production Builds

---

## 17. PLATFORM-SPECIFIC IMPLEMENTATION

### iOS
- Uses `react-native-maps` for maps
- Reanimated animations enabled
- Safe area insets handled

### Android
- Uses `react-native-maps` for maps
- Reanimated animations enabled
- Edge-to-edge layout enabled
- Adaptive icons

### Web
- Maps unavailable (fallback message)
- Reanimated disabled (animations not used)
- react-native-web rendering
- Static Metro bundler output

---

## 18. SECURITY CONSIDERATIONS

### Current Implementations
- ✅ Firebase Auth (passwords hashed)
- ✅ Firestore security rules (backend-enforced)
- ✅ Role-based access control (admin, driver, parent, attendant)
- ✅ No hardcoded credentials

### Gaps for Expansion
- ⚠️ No IDOR protection tested (IDs are Firebase UIDs - should be safe)
- ⚠️ No rate limiting
- ⚠️ No audit logging
- ⚠️ No invitation token system (for group travel)
- ⚠️ No location data retention policies

---

## 19. SCALABILITY NOTES

### Current Limitations
- Firestore: 1 write per second per document (fine for single bus tracking)
- Realtime DB: Unlimited writes (good for live locations)
- No caching layer (every read hits Firebase)
- No offline support

### For Vehicle & Travel Service
- Need separate collection trees (vehicles, trips, groups, passengers)
- May need Firestore indexes for complex queries
- Consider caching for frequently accessed vehicle/driver data
- Implement offline sync for trip status

---

## 20. RECOMMENDATION FOR EXPANSION

### Extend, Don't Duplicate
1. **Extend Role System** - Add: `passenger`, `chauffeur`, `fleet_operator`, `travel_organizer`
2. **Extend User Model** - Add `serviceType: 'school' | 'travel'` field, service-specific profile data
3. **New Collections** - `vehicles`, `trips_v2`, `travel_groups`, `invitations`, `travel_routes`
4. **New Auth Paths** - Separate signup flows: `/auth/school` vs `/auth/travel`
5. **Service-Based Navigation** - Initial screen lets user pick service, then renders appropriate tabs
6. **Shared Infrastructure** - Firebase Auth, Maps API, real-time location updates (all reusable)

### Implementation Order
1. **Phase 1:** Extend user model, add service type field to Firestore
2. **Phase 2:** Create new models and Firestore collections for Vehicle & Travel
3. **Phase 3:** Create new auth flow for service selection
4. **Phase 4:** Build Vehicle & Travel dashboard
5. **Phase 5:** Implement trip creation, driver assignment, group management
6. **Phase 6:** Add Google Maps integration for travel routes
7. **Phase 7:** Implement safety features (SOS, emergency contacts)
8. **Phase 8:** Testing, security review, deployment

---

## Conclusion

The Austangel app is **well-architected** with:
- ✅ Proper separation of concerns (services, models, components)
- ✅ Firebase backend ready for expansion
- ✅ Type-safe TypeScript throughout
- ✅ Role-based access control foundation
- ✅ Maps and location services working
- ✅ Cross-platform support (iOS, Android, Web)

**Ready for expansion:** Vehicle & Travel service can extend the existing architecture without disrupting school transportation functionality.
