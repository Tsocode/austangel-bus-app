# Service Selector - What Users See

## Screen 1: Login Screen (Existing)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│           Welcome to Austangel                  │
│                                                 │
│      Sign in or create an account to manage     │
│          buses, track rides, or check in        │
│                students.                        │
│                                                 │
│      ┌─────────────────────────────────────┐   │
│      │  Sign In    │   Sign Up             │   │
│      └─────────────────────────────────────┘   │
│                                                 │
│      Select your role                          │
│      [Parent] [Driver] [Attendant] [Admin]     │
│                                                 │
│      📧 Email                                  │
│      ┌─────────────────────────────────────┐   │
│      │ user@example.com                    │   │
│      └─────────────────────────────────────┘   │
│                                                 │
│      🔒 Password                               │
│      ┌─────────────────────────────────────┐   │
│      │ ••••••••                            │   │
│      └─────────────────────────────────────┘   │
│                                                 │
│      ┌─────────────────────────────────────┐   │
│      │  SIGN IN                            │   │
│      └─────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**User Actions:**
1. Enter email and password
2. Click "Sign In"
3. Firebase authenticates
4. ⬇️ Automatically navigates to Service Selector

---

## Screen 2: Service Selector (NEW!) ✨
```
┌─────────────────────────────────────────────────┐
│                                                 │
│          Choose Your Service                    │
│                                                 │
│    Welcome back, John!                          │
│                                                 │
│    ┌─────────────────────────────────────────┐ │
│    │ 🚌  School Transport                    │ │
│    │                                         │ │
│    │ Track school buses, manage attendance, │ │
│    │ and stay connected with drivers        │ │
│    │                                         │ │
│    │ ✅ Selected                             │ │
│    └─────────────────────────────────────────┘ │
│                                                 │
│    ┌─────────────────────────────────────────┐ │
│    │ 🚗  Vehicle & Travel                    │ │
│    │                                         │ │
│    │ Book rides, manage group trips, or     │ │
│    │ offer private transportation services  │ │
│    └─────────────────────────────────────────┘ │
│                                                 │
│    ┌─────────────────────────────────────────┐ │
│    │  Continue to App →                      │ │
│    └─────────────────────────────────────────┘ │
│                                                 │
│    💡 You can switch services anytime from     │
│       your profile settings                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**User Actions:**
1. See personalized greeting
2. See two service options
3. Tap to select a different service (if desired)
4. Click "Continue to App"
5. ⬇️ Navigates to appropriate dashboard

---

## Screen 3A: School Transport Dashboard (if School selected)
```
┌─────────────────────────────────────────────────┐
│  🏠                        📍 Track      👤      │
├─────────────────────────────────────────────────┤
│                                                 │
│          Bus Tracking Dashboard                 │
│                                                 │
│    📍 Picking up at Oak Elementary               │
│       ETA: 2:15 PM                              │
│       Speed: 35 mph                             │
│                                                 │
│    ┌───────────────────────────────────┐       │
│    │      [MAP VIEW]                   │       │
│    │      🚌 Bus at current location   │       │
│    │      📍 Route shown as line       │       │
│    └───────────────────────────────────┘       │
│                                                 │
│    Recent Updates:                              │
│    • 2:10 PM - Started route                    │
│    • 2:08 PM - Departed main depot              │
│                                                 │
│    ┌─────────────────────────────────┐         │
│    │  View Details  │  Share Location │       │
│    └─────────────────────────────────┘         │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Features:**
- Real-time bus tracking
- Student check-ins
- Route information
- Driver communication

---

## Screen 3B: Vehicle & Travel Dashboard (if Travel selected)
```
┌─────────────────────────────────────────────────┐
│  🏠                        🚗 Trips      👤      │
├─────────────────────────────────────────────────┤
│                                                 │
│          Available Trips                        │
│                                                 │
│    ┌─────────────────────────────────┐         │
│    │ Downtown → Airport              │         │
│    │ Departs: Today 3:00 PM          │         │
│    │ Seats: 3 available              │         │
│    │ Price: $25                      │         │
│    │        [BOOK NOW]               │         │
│    └─────────────────────────────────┘         │
│                                                 │
│    ┌─────────────────────────────────┐         │
│    │ University → Central Station    │         │
│    │ Departs: Today 3:30 PM          │         │
│    │ Seats: 4 available              │         │
│    │ Price: $18                      │         │
│    │        [BOOK NOW]               │         │
│    └─────────────────────────────────┘         │
│                                                 │
│    ┌─────────────────────────────────┐         │
│    │ [+ Start a New Trip]            │         │
│    └─────────────────────────────────┘         │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Features:**
- Browse available trips
- Book rides
- Manage group trips
- Earn as driver/operator

---

## User Flow Summary

```
START
  │
  ├─→ LOGIN SCREEN
  │   • Enter credentials
  │   • Select school role (for existing users)
  │   • Click Sign In / Sign Up
  │
  ├─→ FIREBASE AUTH
  │   • Validate credentials
  │   • Create/load user profile
  │
  ├─→ SERVICE SELECTOR ✨ (NEW SCREEN)
  │   • Welcome greeting
  │   • Choose School Transport OR Vehicle & Travel
  │   • Click Continue to App
  │
  ├─→ SERVICE SAVED TO FIRESTORE
  │   • primaryService updated
  │   • User preference stored
  │
  ├─→ NAVIGATE TO DASHBOARD
  │   • If School: → School Transport Dashboard
  │   • If Travel: → Vehicle & Travel Dashboard
  │
  └─→ APP RUNNING
      • User is now in the selected service
      • Can switch services from profile settings (future)
```

---

## Key Benefits

### For Users
✅ **Clear Choice**: Easy to understand what each service offers
✅ **Personalized**: See your name, feel welcomed
✅ **Fast**: One tap to select, one tap to continue
✅ **Flexible**: Can switch services later from settings
✅ **Professional**: Clean, modern UI

### For Business
✅ **Path to Travel Service**: Users see Vehicle & Travel option before it's fully ready
✅ **User Engagement**: Introduces new service naturally
✅ **Data**: Track which service users prefer
✅ **Future Ready**: Easy to add more services later
✅ **Growth**: Encourages users to explore both services

---

## Color Scheme in Action

| Element | Color | Hex |
|---------|-------|-----|
| Background | Light Gray | #f9fafb |
| Cards | White | #fff |
| Card Border (default) | Light Gray | #e5e7eb |
| Card Border (selected) | Blue | #3b82f6 |
| Selected Badge | Green | #10b981 |
| Button | Blue | #2563eb |
| Primary Text | Dark Gray | #1f2937 |
| Secondary Text | Medium Gray | #6b7280 |
| Bus Icon | Blue | #2563eb |
| Car Icon | Red | #dc2626 |

---

## Responsive Design

### Mobile (Portrait)
- Full width cards with 20px padding
- Large touch targets (68px height)
- Stacked layout
- Large fonts for readability

### Tablet (Landscape)
- Side-by-side cards (if width allows)
- Centered layout with max-width
- Same touch target sizes
- Maintained proportions

### Web (Desktop)
- Centered layout with max-width constraint
- Same card sizes
- Hover effects added
- Smooth animations

---

## Accessibility Features

♿ **High Contrast**
- Text colors meet WCAG AA standards
- 7:1 contrast ratio on primary text

♿ **Large Touch Targets**
- Minimum 44x44 points
- Cards are 68px tall for easy tapping

♿ **Clear Labels**
- Descriptive text for each service
- No icon-only buttons
- Clear call-to-action button

♿ **Keyboard Navigation**
- Tab through options (web)
- Spacebar/Enter to select
- Proper focus indicators

♿ **Screen Reader**
- Semantic structure
- Descriptive alt text
- ARIA labels where needed

---

## Next Steps for Users

After Service Selection:

### If School Transport Selected
1. See dashboard with bus tracking
2. Can set preferences
3. Access parent/driver/attendant features
4. Enable notifications

### If Vehicle & Travel Selected
1. See available trips or driver dashboard
2. Can set preferences
3. Access booking/driver features
4. Enable notifications

### Anytime
1. Go to Profile Settings
2. Find "Switch Service" option (future)
3. Select new service
4. Update profile
5. Navigate to new dashboard

---

**Current Status**: ✅ Service Selector is live and fully functional!

**Where to Test**: 
- Web: `npm run web` → Log in → See service selector
- iOS: `npm run ios` → Log in → See service selector
- Android: `npm run android` → Log in → See service selector
