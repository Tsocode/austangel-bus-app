# Firebase Data Setup for Users & Drivers (Travel Service)

## Overview
This document outlines the Firebase Firestore collections and data structure for the travel booking system with users and drivers.

---

## 1. USERS Collection

### Path: `/users/{userId}`

**Purpose:** Store user profiles for all users (passengers, drivers/chauffeurs)

### Schema:
```typescript
{
  id: string;                          // Auto-generated UID from Firebase Auth
  email: string;                       // User email
  primaryService: 'school' | 'travel'; // Which service user uses
  
  // Profile
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  photoURL?: string;
  
  // Travel Service Fields
  travelRole: 'passenger' | 'driver';  // Role in travel service
  
  // For Passengers
  travelGroupIds: string[];            // Groups they're part of
  
  // For Drivers/Chauffeurs
  fleetId?: string;                    // Fleet they belong to
  verificationStatus: 'pending' | 'verified' | 'rejected';
  licenseNumber?: string;              // Encrypted
  rating?: number;                     // Average rating (0-5)
  totalTrips?: number;                 // Total completed trips
  
  // Timestamps
  createdAt: number;                   // Milliseconds
  updatedAt: number;                   // Milliseconds
}
```

### Example:
```json
{
  "id": "user123",
  "email": "john@example.com",
  "primaryService": "travel",
  "firstName": "John",
  "lastName": "Doe",
  "displayName": "John D.",
  "phoneNumber": "+1234567890",
  "photoURL": "https://...",
  "travelRole": "passenger",
  "travelGroupIds": ["group1", "group2"],
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000
}
```

---

## 2. DRIVERS Collection (Optional - for easier querying)

### Path: `/drivers/{driverId}`

**Purpose:** Quick access to all active drivers without filtering users collection

### Schema:
```typescript
{
  id: string;                          // Same as userId
  userId: string;                      // Reference to users/{userId}
  
  // Driver Info
  firstName: string;
  lastName: string;
  phoneNumber: string;
  photoURL?: string;
  
  // Verification
  verificationStatus: 'pending' | 'verified' | 'rejected';
  licenseNumber?: string;
  
  // Rating & Performance
  rating: number;                      // Average rating
  totalTrips: number;                  // Completed trips
  acceptanceRate: number;              // % of trips accepted (0-1)
  cancellationRate: number;            // % of trips cancelled
  
  // Vehicle
  currentVehicleId?: string;           // Currently driving
  
  // Availability
  isAvailable: boolean;                // Online/offline status
  lastActive: number;                  // Last active timestamp
  
  // Location (for nearby driver search)
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}
```

### Example:
```json
{
  "id": "driver456",
  "userId": "driver456",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1987654321",
  "verificationStatus": "verified",
  "rating": 4.8,
  "totalTrips": 150,
  "acceptanceRate": 0.95,
  "isAvailable": true,
  "currentVehicleId": "vehicle789",
  "lastActive": 1700100000000,
  "createdAt": 1700000000000,
  "updatedAt": 1700100000000
}
```

---

## 3. TRAVEL TRIPS Collection

### Path: `/travelTrips/{tripId}`

**Purpose:** Store trip requests and their status

### Schema:
```typescript
{
  id: string;                     // Auto-generated
  tripType: 'airport' | 'chauffeur' | 'tourism' | 'corporate' | 'wedding' | 'other';
  
  // Participants
  passengerId: string;            // Who requested
  driverId?: string;              // Who is driving
  travelGroupId?: string;         // If part of group trip
  
  // Vehicle
  vehicleId?: string;             // Assigned vehicle
  
  // Route
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    name?: string;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    address: string;
    name?: string;
  };
  
  // Timing
  requestedTime: number;          // When requested
  scheduledTime?: number;         // Planned start
  startTime?: number;             // Actual start
  endTime?: number;               // Actual end
  estimatedDuration?: number;     // In minutes
  
  // Status
  status: 'requested' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  
  // Cost
  estimatedCost?: number;
  finalCost?: number;
  
  // Additional
  passengers: number;             // Number of passengers
  specialRequests?: string;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}
```

### Example:
```json
{
  "id": "trip123",
  "tripType": "chauffeur",
  "passengerId": "user123",
  "driverId": "driver456",
  "vehicleId": "vehicle789",
  "pickupLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "123 Main St, NYC",
    "name": "Hotel"
  },
  "dropoffLocation": {
    "latitude": 40.6895,
    "longitude": -74.0149,
    "address": "JFK Airport",
    "name": "Terminal 4"
  },
  "requestedTime": 1700000000000,
  "scheduledTime": 1700003600000,
  "status": "accepted",
  "passengers": 1,
  "estimatedDuration": 45,
  "estimatedCost": 65.00,
  "createdAt": 1700000000000,
  "updatedAt": 1700000100000
}
```

---

## 4. LIVE LOCATIONS Collection

### Path: `/liveLocations/{userId}`

**Purpose:** Real-time driver location tracking for active trips

### Schema:
```typescript
{
  userId: string;                 // Driver ID
  
  // Current Position
  latitude: number;
  longitude: number;
  
  // Movement
  speed?: number;                 // km/h (admin only)
  bearing?: number;               // Direction 0-360
  accuracy?: number;              // GPS accuracy in meters
  
  // Trip Context
  tripId?: string;                // Current trip
  status: 'available' | 'on_trip' | 'offline';
  
  // Timestamps
  timestamp: number;              // When location was updated
  createdAt: number;              // First location record
}
```

### Example:
```json
{
  "userId": "driver456",
  "latitude": 40.7138,
  "longitude": -74.0070,
  "speed": 25.5,
  "bearing": 180,
  "accuracy": 5,
  "tripId": "trip123",
  "status": "on_trip",
  "timestamp": 1700100000000,
  "createdAt": 1700000000000
}
```

---

## 5. TRAVEL GROUPS Collection

### Path: `/travelGroups/{groupId}`

**Purpose:** Group trips (family, corporate, tourism groups)

### Schema:
```typescript
{
  id: string;                     // Auto-generated
  name: string;                   // e.g., "Company Outing"
  description?: string;
  
  // Organization
  organizerId: string;            // Creator
  memberIds: string[];            // All members
  
  // Travel Details
  destination: {
    latitude: number;
    longitude: number;
    address: string;
    name: string;
  };
  startDate: number;              // Timestamp
  endDate?: number;               // Timestamp
  
  // Vehicle & Driver
  vehicleId?: string;
  driverId?: string;
  
  // Status
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  
  // Privacy
  isPrivate: boolean;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}
```

---

## 6. VEHICLES Collection

### Path: `/vehicles/{vehicleId}`

**Purpose:** Store available vehicles for trips

### Schema:
```typescript
{
  id: string;
  
  // Owner
  fleetId?: string;               // Fleet owner
  ownerId: string;                // Driver/Owner ID
  
  // Details
  make: string;                   // e.g., "Toyota"
  model: string;                  // e.g., "Camry"
  year: number;
  licensePlate: string;
  
  // Capacity
  seats: number;
  luggageCapacity?: string;
  
  // Features
  features: string[];             // e.g., ["wifi", "usb_charger", "water"]
  
  // Status
  status: 'available' | 'in_use' | 'maintenance';
  currentDriver?: string;         // Currently driving
  
  // Verification
  insuranceExpiry?: number;
  registrationExpiry?: number;
  lastInspection?: number;
  
  // Photos
  photoURLs?: string[];
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}
```

---

## 7. FIRESTORE SECURITY RULES

Add these rules to your `firestore.rules`:

```firestore
// ==========================================
// USERS COLLECTION (Travel Service)
// ==========================================
match /users/{userId} {
  // Users can read their own profile
  allow read: if request.auth.uid == userId;
  
  // Admin can read all users
  allow read: if isAdmin();
  
  // Users can update their own profile (not role)
  allow update: if request.auth.uid == userId && 
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['travelRole', 'createdAt']);
  
  // New users can create their profile on signup
  allow create: if request.auth.uid == userId;
  
  // Admin can create/update users
  allow write: if isAdmin();
}

// ==========================================
// DRIVERS COLLECTION
// ==========================================
match /drivers/{driverId} {
  // Anyone can read driver info (for finding drivers)
  allow read: if true;
  
  // Drivers can update their own availability/location
  allow update: if request.auth.uid == driverId && 
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['rating', 'totalTrips', 'verificationStatus']);
  
  // Only admin and driver can create
  allow create: if request.auth.uid == driverId || isAdmin();
}

// ==========================================
// TRAVEL TRIPS COLLECTION
// ==========================================
match /travelTrips/{tripId} {
  // Passengers can read their own trips
  allow read: if resource.data.passengerId == request.auth.uid;
  
  // Drivers can read trips assigned to them
  allow read: if resource.data.driverId == request.auth.uid;
  
  // Admin can read all trips
  allow read: if isAdmin();
  
  // Passengers can create trip requests
  allow create: if request.auth.uid == request.resource.data.passengerId;
  
  // Passengers can update their pending trips
  allow update: if resource.data.passengerId == request.auth.uid && 
    resource.data.status == 'requested';
  
  // Drivers can update trip status (accepted, in_progress, completed)
  allow update: if resource.data.driverId == request.auth.uid;
  
  // Admin can update anything
  allow update: if isAdmin();
  
  // Admin can delete
  allow delete: if isAdmin();
}

// ==========================================
// LIVE LOCATIONS COLLECTION
// ==========================================
match /liveLocations/{userId} {
  // User can write their own location
  allow write: if request.auth.uid == userId;
  
  // Admin can read all locations
  allow read: if isAdmin();
  
  // Users can read their own location
  allow read: if request.auth.uid == userId;
  
  // Passengers can see driver locations for their current trip
  allow read: if exists(/databases/$(database)/documents/travelTrips/$(resource.data.tripId)) &&
    get(/databases/$(database)/documents/travelTrips/$(resource.data.tripId)).data.passengerId == request.auth.uid;
}

// ==========================================
// TRAVEL GROUPS COLLECTION
// ==========================================
match /travelGroups/{groupId} {
  // Members can read their groups
  allow read: if request.auth.uid in resource.data.memberIds;
  
  // Organizer can read/write
  allow read, write: if resource.data.organizerId == request.auth.uid;
  
  // Admin can read all
  allow read: if isAdmin();
  
  // Users can create new groups
  allow create: if request.auth.uid == request.resource.data.organizerId;
}

// ==========================================
// VEHICLES COLLECTION
// ==========================================
match /vehicles/{vehicleId} {
  // Anyone can read vehicles
  allow read: if true;
  
  // Owner/Driver can update their vehicle
  allow update: if request.auth.uid == resource.data.ownerId;
  
  // Owner/Driver can create
  allow create: if request.auth.uid == request.resource.data.ownerId;
  
  // Admin can manage vehicles
  allow write: if isAdmin();
}
```

---

## 8. INDEXES TO CREATE

Go to Firebase Console > Firestore > Indexes and add these composite indexes:

### For Driver Search:
- Collection: `drivers`
- Fields: `verificationStatus` (Ascending), `isAvailable` (Ascending)

### For Trip Queries:
- Collection: `travelTrips`
- Fields: `passengerId` (Ascending), `status` (Ascending)
- Collection: `travelTrips`
- Fields: `driverId` (Ascending), `status` (Ascending)

### For Location Updates:
- Collection: `liveLocations`
- Fields: `tripId` (Ascending), `timestamp` (Descending)

---

## 9. INITIALIZATION CODE

Add to your app initialization:

```typescript
// services/firebase-travel.ts

import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";

// Create user profile after signup
export async function createUserProfile(userId: string, userData: Partial<AustangelUser>) {
  try {
    await setDoc(doc(db, "users", userId), {
      id: userId,
      ...userData,
      primaryService: "travel",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error creating user:", error);
  }
}

// Create driver profile
export async function createDriverProfile(driverId: string, driverData: Partial<Driver>) {
  try {
    await addDoc(collection(db, "drivers"), {
      id: driverId,
      userId: driverId,
      ...driverData,
      isAvailable: true,
      lastActive: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error creating driver:", error);
  }
}

// Request a trip
export async function createTripRequest(tripData: Partial<TravelTrip>) {
  try {
    const docRef = await addDoc(collection(db, "travelTrips"), {
      ...tripData,
      status: "requested",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating trip:", error);
  }
}

// Update driver location (real-time)
export async function updateDriverLocation(driverId: string, location: { latitude: number; longitude: number; speed?: number }) {
  try {
    await setDoc(doc(db, "liveLocations", driverId), {
      userId: driverId,
      ...location,
      status: "on_trip",
      timestamp: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Error updating location:", error);
  }
}
```

---

## 10. NEXT STEPS

1. ✅ Create collections in Firestore Console
2. ✅ Deploy security rules to Firestore
3. ✅ Create indexes
4. ✅ Implement initialization code
5. Test trip creation and driver assignment
6. Test real-time location updates
7. Test passenger-driver communication

