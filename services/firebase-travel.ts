import {
  collection,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  limit,
  getDocs,
  setDoc,
  onSnapshot,
  DocumentData,
  Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db } from "./firebase";
import { AustangelUser } from "@/models/user";
import { TravelBookingInput, TravelFareQuote, TravelTrip } from "@/models/travel-trip";
import { functions } from "@/services/firebase";

/**
 * Create a new user profile after signup
 */
export async function createUserProfile(userId: string, userData: Partial<AustangelUser>) {
  try {
    await setDoc(doc(db, "users", userId), {
      id: userId,
      ...userData,
      email: userData.email ?? "",
      role: userData.role === "driver" ? "driver" : "passenger",
      primaryService: "travel",
      schoolRole: null,
      travelRole: userData.travelRole ?? (userData.role === "driver" ? "driver" : "passenger"),
      childIds: userData.childIds ?? [],
      travelGroupIds: userData.travelGroupIds ?? [],
      displayName: userData.displayName ?? "Austangel User",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Create a driver profile
 */
export async function createDriverProfile(
  driverId: string,
  driverData: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    photoURL?: string;
    licenseNumber?: string;
    verificationStatus: "pending" | "verified" | "rejected";
  }
) {
  try {
    await setDoc(doc(db, "drivers", driverId), {
      id: driverId,
      userId: driverId,
      ...driverData,
      // Drivers stay unavailable until an administrator verifies the profile.
      isAvailable: false,
      totalTrips: 0,
      acceptanceRate: 1.0,
      rating: 5.0,
      lastActive: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error creating driver profile:", error);
    throw error;
  }
}

export async function quoteTravelFare(input: TravelBookingInput): Promise<TravelFareQuote> {
  const quote = httpsCallable<TravelBookingInput, TravelFareQuote>(functions, "quoteTravelFare");
  const response = await quote(input);
  return response.data;
}

/** The server reprices and creates the trip; the client never supplies a charge amount. */
export async function createTripRequest(input: TravelBookingInput): Promise<{ tripId: string } & TravelFareQuote> {
  const create = httpsCallable<TravelBookingInput, { tripId: string } & TravelFareQuote>(functions, "createTravelBooking");
  const response = await create(input);
  return response.data;
}

export async function createTravelPaymentIntent(tripId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const create = httpsCallable<{ tripId: string }, { clientSecret: string; paymentIntentId: string }>(
    functions,
    "createTravelPaymentIntent"
  );
  const response = await create({ tripId });
  return response.data;
}

export async function verifyTravelPayment(tripId: string): Promise<{ paid: boolean; status?: string }> {
  const verify = httpsCallable<{ tripId: string }, { paid: boolean; status?: string }>(
    functions,
    "verifyTravelPayment"
  );
  const response = await verify({ tripId });
  return response.data;
}

/**
 * Update trip status
 */
export async function updateTripStatus(tripId: string, status: TravelTrip["status"]) {
  try {
    await updateDoc(doc(db, "travelTrips", tripId), {
      status,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error updating trip status:", error);
    throw error;
  }
}

/**
 * Update driver location (real-time tracking)
 */
export async function updateDriverLocation(
  driverId: string,
  location: {
    latitude: number;
    longitude: number;
    speed?: number;
    bearing?: number;
    accuracy?: number;
    tripId?: string;
  }
) {
  try {
    await setDoc(
      doc(db, "liveLocations", driverId),
      {
        userId: driverId,
        ...location,
        status: "on_trip",
        timestamp: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating driver location:", error);
    throw error;
  }
}

/**
 * Get all available verified drivers
 */
export async function getActiveDrivers() {
  try {
    const q = query(
      collection(db, "drivers_public"),
      where("isAvailable", "==", true),
      where("verificationStatus", "==", "verified")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching active drivers:", error);
    throw error;
  }
}

/**
 * Get all trips for a passenger
 */
export async function getUserTrips(userId: string) {
  try {
    const q = query(collection(db, "travelTrips"), where("passengerId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching user trips:", error);
    throw error;
  }
}

/**
 * Get all trips for a driver
 */
export async function getDriverTrips(driverId: string) {
  try {
    const q = query(collection(db, "travelTrips"), where("driverId", "==", driverId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching driver trips:", error);
    throw error;
  }
}

/** Subscribe a verified travel driver to unassigned ride requests. */
export function subscribeToAvailableTrips(
  callback: (trips: TravelTrip[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "travelTrips"),
    where("status", "==", "requested"),
    where("paymentStatus", "==", "paid"),
    where("driverId", "==", null),
    limit(50)
  );
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TravelTrip))),
    (error) => onError?.(error)
  );
}

/**
 * Get current location of a driver (for real-time tracking)
 */
export async function getDriverLocation(driverId: string) {
  try {
    const docSnap = await getDoc(doc(db, "liveLocations", driverId));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error fetching driver location:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time driver location updates
 */
export function subscribeToDriverLocation(
  driverId: string,
  callback: (location: DocumentData | null) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    doc(db, "liveLocations", driverId),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    (error) => onError?.(error)
  );
}

/**
 * Subscribe to trips for a user
 */
export function subscribeToUserTrips(
  userId: string,
  callback: (trips: TravelTrip[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, "travelTrips"), where("passengerId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TravelTrip))),
    (error) => onError?.(error)
  );
}

/**
 * Subscribe to trips for a driver
 */
export function subscribeToDriverTrips(
  driverId: string,
  callback: (trips: TravelTrip[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, "travelTrips"), where("driverId", "==", driverId));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TravelTrip))),
    (error) => onError?.(error)
  );
}

/**
 * Driver accepts a trip
 */
export async function acceptTrip(tripId: string, driverId: string) {
  try {
    await updateDoc(doc(db, "travelTrips", tripId), {
      driverId,
      status: "accepted",
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error accepting trip:", error);
    throw error;
  }
}

/**
 * Start a trip (driver begins driving)
 */
export async function startTrip(tripId: string) {
  try {
    await updateDoc(doc(db, "travelTrips", tripId), {
      status: "in_progress",
      startTime: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error starting trip:", error);
    throw error;
  }
}

/**
 * Complete a trip
 */
export async function completeTrip(tripId: string) {
  try {
    await updateDoc(doc(db, "travelTrips", tripId), {
      status: "completed",
      endTime: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error completing trip:", error);
    throw error;
  }
}

/**
 * Cancel a trip
 */
export async function cancelTrip(tripId: string, reason?: string) {
  try {
    const cancel = httpsCallable<{ tripId: string; reason?: string }, { success: boolean }>(functions, "cancelTravelTrip");
    await cancel({ tripId, ...(reason ? { reason } : {}) });
  } catch (error) {
    console.error("Error cancelling trip:", error);
    throw error;
  }
}

/**
 * Update driver availability status
 */
export async function updateDriverAvailability(driverId: string, isAvailable: boolean) {
  try {
    await updateDoc(doc(db, "drivers", driverId), {
      isAvailable,
      lastActive: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error updating driver availability:", error);
    throw error;
  }
}

/**
 * Update driver rating and trip count
 */
export async function updateDriverStats(
  driverId: string,
  rating: number,
  totalTrips: number
) {
  try {
    await updateDoc(doc(db, "drivers", driverId), {
      rating,
      totalTrips,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error updating driver stats:", error);
    throw error;
  }
}

/**
 * Get a specific trip details
 */
export async function getTrip(tripId: string) {
  try {
    const docSnap = await getDoc(doc(db, "travelTrips", tripId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error fetching trip:", error);
    throw error;
  }
}

/**
 * Get a driver's details
 */
export async function getDriver(driverId: string) {
  try {
    // Passenger-facing driver details come from the backend-maintained public
    // projection. The private drivers collection contains phone/license data.
    const docSnap = await getDoc(doc(db, "drivers_public", driverId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error fetching driver:", error);
    throw error;
  }
}

/**
 * Get a user's details
 */
export async function getUser(userId: string) {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, userData: Partial<AustangelUser>) {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...userData,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}
