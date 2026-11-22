# Quick Firebase Setup for Travel Service

## Step 1: Deploy Updated Firestore Rules (5 minutes)

Run:
```bash
firebase deploy --only firestore:rules
```

This deploys the security rules for users, drivers, trips, and locations.

---

## Step 2: Create Indexes in Firebase Console (2 minutes)

1. Go to: https://console.firebase.google.com/project/austangels/firestore
2. Click **Indexes** tab
3. Create these composite indexes:

### Index 1: Driver Search
- Collection: `drivers`
- Field 1: `verificationStatus` (Ascending)
- Field 2: `isAvailable` (Ascending)

### Index 2: Passenger Trips
- Collection: `travelTrips`
- Field 1: `passengerId` (Ascending)
- Field 2: `status` (Ascending)

### Index 3: Driver Trips
- Collection: `travelTrips`
- Field 1: `driverId` (Ascending)
- Field 2: `status` (Ascending)

### Index 4: Location Tracking
- Collection: `liveLocations`
- Field 1: `tripId` (Ascending)
- Field 2: `timestamp` (Descending)

---

## Step 3: Create Service Module (10 minutes)

Create `services/firebase-travel.ts`:

```typescript
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  setDoc
} from "firebase/firestore";
import { db } from "./firebase";

export async function createUserProfile(userId: string, userData: any) {
  await setDoc(doc(db, "users", userId), {
    id: userId,
    ...userData,
    primaryService: "travel",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function createDriverProfile(driverId: string, driverData: any) {
  await setDoc(doc(db, "drivers", driverId), {
    id: driverId,
    userId: driverId,
    ...driverData,
    isAvailable: true,
    totalTrips: 0,
    acceptanceRate: 1.0,
    rating: 5.0,
    lastActive: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function createTripRequest(tripData: any) {
  const docRef = await addDoc(collection(db, "travelTrips"), {
    ...tripData,
    status: "requested",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateTripStatus(tripId: string, status: string) {
  await updateDoc(doc(db, "travelTrips", tripId), {
    status,
    updatedAt: Date.now(),
  });
}

export async function updateDriverLocation(driverId: string, location: any) {
  await setDoc(doc(db, "liveLocations", driverId), {
    userId: driverId,
    ...location,
    status: "on_trip",
    timestamp: Date.now(),
  }, { merge: true });
}

export async function getActiveDrivers() {
  const q = query(
    collection(db, "drivers"),
    where("isAvailable", "==", true),
    where("verificationStatus", "==", "verified")
  );
  return getDocs(q);
}

export async function getUserTrips(userId: string) {
  const q = query(
    collection(db, "travelTrips"),
    where("passengerId", "==", userId)
  );
  return getDocs(q);
}

export async function getDriverTrips(driverId: string) {
  const q = query(
    collection(db, "travelTrips"),
    where("driverId", "==", driverId)
  );
  return getDocs(q);
}

export async function getDriverLocation(driverId: string) {
  const docSnap = await getDoc(doc(db, "liveLocations", driverId));
  return docSnap.exists() ? docSnap.data() : null;
}

export async function acceptTrip(tripId: string, driverId: string) {
  await updateDoc(doc(db, "travelTrips", tripId), {
    driverId,
    status: "accepted",
    updatedAt: Date.now(),
  });
}

export async function startTrip(tripId: string) {
  await updateDoc(doc(db, "travelTrips", tripId), {
    status: "in_progress",
    startTime: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function completeTrip(tripId: string, finalCost: number) {
  await updateDoc(doc(db, "travelTrips", tripId), {
    status: "completed",
    endTime: Date.now(),
    finalCost,
    updatedAt: Date.now(),
  });
}
```

---

## Step 4: Update Auth Signup (5 minutes)

When a user signs up, create their profile:

```typescript
// In your signup handler
import { createUserProfile, createDriverProfile } from "@/services/firebase-travel";

async function handleSignup(email: string, password: string, userData: any) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;
  
  // Create user profile
  await createUserProfile(userId, {
    email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    phoneNumber: userData.phoneNumber,
    travelRole: userData.travelRole, // "passenger" or "driver"
  });
  
  // If driver, create driver profile
  if (userData.travelRole === "driver") {
    await createDriverProfile(userId, {
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      verificationStatus: "pending",
      licenseNumber: userData.licenseNumber,
    });
  }
}
```

---

## Step 5: Update Trip Request Handler (5 minutes)

```typescript
import { createTripRequest } from "@/services/firebase-travel";

async function handleRequestTrip(passengerId: string, tripDetails: any) {
  const tripId = await createTripRequest({
    passengerId,
    tripType: tripDetails.tripType,
    pickupLocation: tripDetails.pickupLocation,
    dropoffLocation: tripDetails.dropoffLocation,
    passengers: tripDetails.passengers,
    specialRequests: tripDetails.specialRequests,
    estimatedDuration: tripDetails.estimatedDuration,
    estimatedCost: tripDetails.estimatedCost,
  });
  
  return tripId;
}
```

---

## Step 6: Real-Time Driver Location (5 minutes)

```typescript
import { updateDriverLocation } from "@/services/firebase-travel";

// In your map component, update driver location every 5 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const location = await Location.getCurrentPositionAsync();
    
    await updateDriverLocation(currentUserId, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      speed: location.coords.speed || 0,
      bearing: location.coords.heading || 0,
    });
  }, 5000);
  
  return () => clearInterval(interval);
}, [currentUserId]);
```

---

## Step 7: Real-Time Listeners (5 minutes)

Listen for trip updates:

```typescript
import { onSnapshot, query, where, collection } from "firebase/firestore";
import { db } from "@/services/firebase";

useEffect(() => {
  const q = query(
    collection(db, "travelTrips"),
    where("passengerId", "==", currentUserId)
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUserTrips(trips);
  });
  
  return () => unsubscribe();
}, [currentUserId]);
```

---

## Summary of Collections Created:

1. ✅ **users** - User profiles (passengers, drivers)
2. ✅ **drivers** - Driver-specific info (for fast lookup)
3. ✅ **travelTrips** - Trip requests and bookings
4. ✅ **liveLocations** - Real-time driver tracking
5. ✅ **travelGroups** - Group trips
6. ✅ **vehicles** - Available vehicles

---

## Testing

### Test 1: Create User Profile
```
1. Sign up with email and password
2. Check Firebase Console > Firestore > users collection
3. You should see your user document
```

### Test 2: Create Trip Request
```
1. Click "Request Trip"
2. Fill in destination and details
3. Check Firebase Console > travelTrips
4. Trip should appear with status: "requested"
```

### Test 3: Driver Accepts Trip
```
1. Driver logs in
2. Sees available trip
3. Clicks "Accept"
4. Trip status changes to "accepted"
5. Passenger sees driver details + location
```

---

## Performance Tips

1. Use indexes for all query filters
2. Batch updates when possible
3. Limit real-time listeners (don't subscribe to everything)
4. Cache user data locally
5. Paginate trip history (don't load all at once)

---

## Security Checklist

- ✅ Users can only see their own profile
- ✅ Drivers can only update their own availability/location
- ✅ Passengers can only create trips (not update others' trips)
- ✅ Admin can manage all data
- ✅ Sensitive data (license numbers) should be encrypted

