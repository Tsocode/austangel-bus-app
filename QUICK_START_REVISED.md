# 🚌 Austangel Bus App - Quick Start Guide

## Overview
Austangel is a **dual-service React Native app** built with Expo that provides:
- 🚌 **School Transport Management** - For tracking buses, managing drivers, and parent updates
- 🚗 **Vehicle & Travel Service** - For booking rides, payment processing, and trip tracking

The app works seamlessly across **iOS, Android, and Web** with a unified auth system and smart service selector.

---

## 🚀 Quick Start (60 seconds)

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`

### Installation & Run
```bash
# Clone repository
cd austangel-bus-app

# Install dependencies
npm install
# or
npx expo install

# Create .env file (copy from .env.example)
cp .env.example .env

# Start development server
npm start
# or
npx expo start

# Then choose platform:
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Press 'w' for Web browser
```

---

## 📱 Testing on Devices

### iOS Simulator
```bash
npx expo start --ios
```

### Android Emulator
```bash
npx expo start --android
```

### Web Browser
```bash
npx expo start --web
```

### Physical Devices
1. Install Expo Go app from App Store / Play Store
2. Run: `npx expo start`
3. Scan QR code with Expo Go or camera
4. App opens on your device

---

## 🔐 Authentication Setup

### Test Accounts
Before running, ensure Firebase credentials are in `.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key (optional)
```

### Create Test Account
1. Launch app
2. Click "Sign Up" on login screen
3. Enter email and password
4. App automatically navigates to service selector

---

## 🎯 App Flow

### 🔑 Authentication
```
Splash Screen
    ↓
Login Screen (Sign In / Sign Up)
    ↓
✨ SERVICE SELECTOR ✨
    ├─ School Transport → School Dashboard
    └─ Vehicle & Travel → Travel Dashboard
```

### 🚌 School Transport Flow
```
School Dashboard (Track)
    ├─ View active buses
    ├─ Track bus location in real-time
    ├─ Monitor route and stops
    └─ Role-based features:
        ├─ Parent: Track child's bus
        ├─ Driver: Update location
        ├─ Attendant: Check in/out students
        └─ Admin: Manage buses & routes
```

### 🚗 Vehicle & Travel Flow
```
Travel Dashboard
    ├─ 📍 Book a Ride
    │   ├─ Enter pickup & dropoff
    │   ├─ Select date, time, passengers
    │   ├─ Choose ride type
    │   └─ Review fare
    │       ↓
    │   💳 Payment
    │   ├─ View trip summary
    │   ├─ Enter payment method
    │   ├─ Apply promo code (try "SAVE10")
    │   └─ Complete payment
    │       ↓
    │   ✅ Confirmation
    │   ├─ Show booking confirmation
    │   ├─ Display trip ID
    │   └─ Estimated ETA
    │
    └─ 📍 Monitor Trip
        ├─ View all trips (active, completed, cancelled)
        ├─ See trip details
        ├─ Track driver location
        └─ Contact driver
```

---

## 🎨 Features by Platform

### ✅ iOS
- Full app functionality
- Smooth animations using React Native Reanimated
- Gesture support (swipe navigation)
- Native feel and performance
- Dark mode support

### ✅ Android
- Full app functionality
- Edge-to-edge rendering
- Material Design components
- System integration
- Dark mode support

### ✅ Web
- Full app functionality
- Responsive layout (desktop, tablet, mobile)
- Keyboard navigation
- Browser-compatible
- Dark mode support

---

## 📊 Key Screens

### 🔐 Authentication Screens
| Screen | Purpose |
|--------|---------|
| Login | Sign in with email/password |
| Sign Up | Create new account |
| **Service Selector** | Choose School or Travel service |

### 🚌 School Transport Screens
| Screen | Purpose |
|--------|---------|
| Track | Main dashboard, bus tracking with maps |
| Driver Tools | For drivers - update location, checklist |
| Attendant | For attendants - check students in/out |
| Admin | For admins - manage buses and routes |
| Explore | Discover features and help |
| Settings | User preferences and account |

### 🚗 Vehicle & Travel Screens
| Screen | Purpose |
|--------|---------|
| Dashboard | Main menu - Book or Monitor trips |
| Book Appointment | Booking form for new rides |
| Payment | Payment processing with promo codes |
| Payment Success | Booking confirmation and trip ID |
| Monitor Trip | View and track active/completed trips |

---

## 🔧 Development

### Project Structure
```
austangel-bus-app/
├── app/                      # Expo Router screen components
│   ├── (auth)/              # Auth screens (login, signup, service selector)
│   ├── (tabs)/              # School transport tabs
│   ├── (travel)/            # Vehicle & travel screens
│   └── _layout.tsx          # Root navigation
├── components/              # Reusable React components
├── providers/               # Context providers (Auth, Theme)
├── services/                # Backend services (Firebase, Firestore)
├── models/                  # TypeScript data models
├── hooks/                   # Custom React hooks
├── utils/                   # Utility functions
├── constants/               # App constants (colors, geometry)
├── styles/                  # Shared styling
└── assets/                  # Images, fonts, icons
```

### TypeScript
App uses **strict TypeScript** mode:
```bash
# Check for type errors
npx tsc --noEmit

# Fix any type issues
# (Most IDEs will highlight issues in real-time)
```

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Linting
```bash
# Check code quality
npm run lint

# Fix linting issues
npm run lint -- --fix
```

---

## 🐛 Troubleshooting

### "Cannot find module '@/...'"
- Ensure `tsconfig.json` path alias is set: `"@/*": ["./*"]`
- Clear node_modules: `rm -rf node_modules && npm install`

### "Couldn't find bottom tab bar height" error
- Already fixed! The TabBarBackground component now has error handling
- If still seeing: Check you're using TabBarBackground in Tabs

### App won't start
1. Clear cache: `npx expo start --clear`
2. Reset node_modules: `rm -rf node_modules && npm install`
3. Check `.env` file has valid Firebase credentials
4. Try on web first: `npx expo start --web`

### Firebase connection issues
- Verify `.env` file has all required Firebase credentials
- Check Firebase project allows web/mobile apps
- Ensure Firestore rules allow read/write for authenticated users

### Payment flow not working
- This is a demo/mock implementation
- Replace mock code in `payment.tsx` with real Stripe/PayPal integration
- See inline comments for integration points

### Maps not showing
- Google Maps API key required in `.env`
- If not provided, app falls back to text-based location display

---

## 📋 Configuration

### Environment Variables (.env)
```bash
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Google Maps (optional)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

### App Configuration (app.config.js)
- **iOS Bundle ID:** `com.tsocode.austangel`
- **Android Package:** `com.tsocode.austangel`
- **EAS Project ID:** `3778bb84-a6a0-4df5-945e-bbd566ff5134`

---

## 🚢 Deployment

### iOS (Apple App Store)
```bash
# Build
eas build --platform ios

# Submit
eas submit --platform ios
```

### Android (Google Play Store)
```bash
# Build
eas build --platform android

# Submit
eas submit --platform android
```

### Web
```bash
# Build static export
npx expo export -p web

# Deploy to Vercel, Netlify, etc.
# (Resulting files are in dist/ directory)
```

---

## 📚 Documentation

- **Implementation Checklist:** `FINAL_IMPLEMENTATION_CHECKLIST.md`
- **Session Summary:** `SESSION_SUMMARY.md`
- **Multi-Service Architecture:** `MULTI_SERVICE_IMPLEMENTATION.md`
- **Service Selector UI:** `SERVICE_SELECTOR_UI.md`
- **Platform Fixes:** `PLATFORM_FIXES.md`

---

## 🤝 Contributing

### Code Style
- Use functional components with hooks
- Prefer TypeScript for type safety
- Comment complex logic
- Use meaningful variable names
- Keep components small and focused

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git commit -m "feat: Add new feature"

# Push and create PR
git push origin feature/your-feature
```

### Commit Message Format
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Build, dependencies, etc.

---

## 📞 Support

### Common Questions

**Q: Can users switch between services?**
A: Yes! Service preference is remembered. Users can switch anytime by logging out and in, or via settings (future feature).

**Q: Is payment real?**
A: Currently a demo with mock payment. Connect to Stripe/PayPal for real transactions.

**Q: How is real-time tracking implemented?**
A: Using Firebase Realtime Database for location updates. See `services/realtime/locations.ts`.

**Q: Can I customize the styling?**
A: Yes! All colors defined in `constants/Colors.ts`. Fonts in `assets/fonts/`.

**Q: How do I add a new service?**
A: Update `ServiceType` in `models/user.ts` and add new route group in `app/`.

---

## 🎉 You're All Set!

The app is ready to run. Choose your platform and start developing:

```bash
# iOS
npx expo start --ios

# Android  
npx expo start --android

# Web
npx expo start --web
```

**Happy coding! 🚀**

For detailed technical information, see the other documentation files in the project.
