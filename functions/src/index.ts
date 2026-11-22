import { timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import Stripe from 'stripe';

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const adminPromotionSecret = defineSecret('ADMIN_PROMOTION_SECRET');
const stripeSecret = defineSecret('STRIPE_SECRET_KEY');
const db = getFirestore();
const realtimeDb = getDatabase();

type Coordinate = { latitude: number; longitude: number; address: string; name?: string };
type TravelBookingInput = {
  pickupLocation: Coordinate;
  dropoffLocation: Coordinate;
  passengers: number;
  serviceClass: 'standard' | 'comfort' | 'premium';
  scheduledTime: number;
};

function parseCoordinate(value: unknown, label: string): Coordinate {
  if (!value || typeof value !== 'object') {
    throw new HttpsError('invalid-argument', `${label} location is required.`);
  }
  const location = value as Record<string, unknown>;
  if (typeof location.latitude !== 'number' || location.latitude < -90 || location.latitude > 90 ||
      typeof location.longitude !== 'number' || location.longitude < -180 || location.longitude > 180 ||
      typeof location.address !== 'string' || location.address.trim().length < 3 || location.address.length > 300) {
    throw new HttpsError('invalid-argument', `${label} location is invalid.`);
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address.trim(),
    ...(typeof location.name === 'string' ? { name: location.name.slice(0, 120) } : {}),
  };
}

function parseBookingInput(value: unknown): TravelBookingInput {
  if (!value || typeof value !== 'object') {
    throw new HttpsError('invalid-argument', 'Booking details are required.');
  }
  const input = value as Record<string, unknown>;
  const pickupLocation = parseCoordinate(input.pickupLocation, 'Pickup');
  const dropoffLocation = parseCoordinate(input.dropoffLocation, 'Dropoff');
  if (!Number.isInteger(input.passengers) || (input.passengers as number) < 1 || (input.passengers as number) > 8) {
    throw new HttpsError('invalid-argument', 'Passenger count must be between 1 and 8.');
  }
  if (!['standard', 'comfort', 'premium'].includes(String(input.serviceClass))) {
    throw new HttpsError('invalid-argument', 'Select a valid ride class.');
  }
  if (typeof input.scheduledTime !== 'number' || input.scheduledTime < Date.now() - 60_000) {
    throw new HttpsError('invalid-argument', 'Select a valid pickup time.');
  }
  return {
    pickupLocation,
    dropoffLocation,
    passengers: input.passengers as number,
    serviceClass: input.serviceClass as TravelBookingInput['serviceClass'],
    scheduledTime: input.scheduledTime,
  };
}

function haversineDistanceKm(start: Coordinate, end: Coordinate): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(end.latitude - start.latitude);
  const longitudeDelta = radians(end.longitude - start.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(start.latitude)) * Math.cos(radians(end.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function calculateTravelFare(input: TravelBookingInput) {
  const pricingSnapshot = await db.doc('travelPricing/current').get();
  if (!pricingSnapshot.exists) {
    throw new HttpsError('failed-precondition', 'Travel pricing has not been configured.');
  }
  const pricing = pricingSnapshot.data() ?? {};
  const numeric = (field: string) => typeof pricing[field] === 'number' ? pricing[field] as number : NaN;
  const baseFareCents = numeric('baseFareCents');
  const perKmCents = numeric('perKmCents');
  const minimumFareCents = numeric('minimumFareCents');
  const roadDistanceFactor = numeric('roadDistanceFactor');
  const multipliers = pricing.classMultipliers as Record<string, unknown> | undefined;
  const multiplier = multipliers?.[input.serviceClass];
  const currency = typeof pricing.currency === 'string' ? pricing.currency.toLowerCase() : '';
  if (![baseFareCents, perKmCents, minimumFareCents, roadDistanceFactor].every(Number.isFinite) ||
      baseFareCents < 0 || perKmCents < 0 || minimumFareCents < 0 || roadDistanceFactor < 1 ||
      typeof multiplier !== 'number' || multiplier <= 0 || !/^[a-z]{3}$/.test(currency)) {
    throw new HttpsError('failed-precondition', 'Travel pricing configuration is invalid.');
  }

  const straightLineKm = haversineDistanceKm(input.pickupLocation, input.dropoffLocation);
  const estimatedRoadKm = straightLineKm * roadDistanceFactor;
  const baseAmount = Math.max(minimumFareCents, baseFareCents + perKmCents * estimatedRoadKm);
  const amountCents = Math.max(1, Math.round(baseAmount * multiplier));
  return {
    amountCents,
    currency,
    straightLineKm: Math.round(straightLineKm * 100) / 100,
    estimatedRoadKm: Math.round(estimatedRoadKm * 100) / 100,
  };
}

function isTravelPassengerProfile(user: Record<string, unknown> | undefined): boolean {
  return !!user && (user.travelRole === 'passenger' ||
    (user.role === 'passenger' && user.primaryService === 'travel'));
}

function isAdminRequest(request: { auth?: { token: Record<string, unknown> } | null }): boolean {
  return request.auth?.token.role === 'admin';
}

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export const promoteToAdmin = onCall(
  { secrets: [adminPromotionSecret] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before requesting admin access.');
    }

    const adminCode = request.data?.adminCode;
    if (typeof adminCode !== 'string' || adminCode.length < 1 || adminCode.length > 256) {
      throw new HttpsError('invalid-argument', 'Enter a valid admin code.');
    }

    const expectedSecret = adminPromotionSecret.value();
    const emulatorAllowsShortSecret = process.env.FUNCTIONS_EMULATOR === 'true' &&
      process.env.ADMIN_PROMOTION_ALLOW_SHORT_SECRET === 'true';
    const minimumSecretLength = emulatorAllowsShortSecret ? 4 : 32;
    if (expectedSecret.length < minimumSecretLength) {
      throw new HttpsError('failed-precondition', 'Admin promotion is not configured securely.');
    }

    const attemptsRef = db.doc(`adminPromotionAttempts/${request.auth.uid}`);
    const now = Date.now();
    await db.runTransaction(async (transaction) => {
      const attemptsSnapshot = await transaction.get(attemptsRef);
      const attempts = attemptsSnapshot.data() ?? {};
      const windowStartedAt = typeof attempts.windowStartedAt === 'number'
        ? attempts.windowStartedAt
        : now;
      const currentCount = now - windowStartedAt > 60 * 60 * 1000
        ? 0
        : (typeof attempts.count === 'number' ? attempts.count : 0);
      if (currentCount >= 5) {
        throw new HttpsError('resource-exhausted', 'Too many attempts. Try again later.');
      }
      transaction.set(attemptsRef, {
        count: currentCount + 1,
        windowStartedAt: currentCount === 0 ? now : windowStartedAt,
        updatedAt: now,
      });
    });

    if (!secretsMatch(adminCode.trim(), expectedSecret)) {
      throw new HttpsError('permission-denied', 'Invalid admin code.');
    }

    const userRef = db.doc(`users/${request.auth.uid}`);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Create your user profile before requesting admin access.');
    }

    const auth = getAuth();
    const userRecord = await auth.getUser(request.auth.uid);
    await auth.setCustomUserClaims(request.auth.uid, {
      ...userRecord.customClaims,
      role: 'admin',
    });
    await userRef.update({ role: 'admin', schoolRole: 'admin', updatedAt: Date.now() });
    await attemptsRef.delete();

    return { success: true, message: 'Admin access granted.' };
  }
);

export const quoteTravelFare = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to get a fare quote.');
  const input = parseBookingInput(request.data);
  return calculateTravelFare(input);
});

/** Creates a server-priced trip. Client-supplied fares are never trusted. */
export const createTravelBooking = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to book a trip.');
  const userSnapshot = await db.doc(`users/${request.auth.uid}`).get();
  if (!isTravelPassengerProfile(userSnapshot.data())) {
    throw new HttpsError('permission-denied', 'A travel passenger profile is required to book a trip.');
  }

  const input = parseBookingInput(request.data);
  const quote = await calculateTravelFare(input);
  const now = Date.now();
  const tripRef = db.collection('travelTrips').doc();
  await tripRef.create({
    tripType: 'chauffeur',
    passengerId: request.auth.uid,
    driverId: null,
    pickupLocation: input.pickupLocation,
    dropoffLocation: input.dropoffLocation,
    requestedTime: now,
    scheduledTime: input.scheduledTime,
    status: 'requested',
    paymentStatus: 'unpaid',
    serviceClass: input.serviceClass,
    passengers: input.passengers,
    estimatedCost: quote.amountCents / 100,
    estimatedCostCents: quote.amountCents,
    currency: quote.currency,
    estimatedDistanceKm: quote.estimatedRoadKm,
    createdAt: now,
    updatedAt: now,
  });

  return { tripId: tripRef.id, ...quote };
});

export const createTravelPaymentIntent = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before paying.');
    const tripId = request.data?.tripId;
    if (typeof tripId !== 'string' || tripId.length < 1 || tripId.length > 128) {
      throw new HttpsError('invalid-argument', 'A valid trip ID is required.');
    }
    const tripRef = db.doc(`travelTrips/${tripId}`);
    const tripSnapshot = await tripRef.get();
    if (!tripSnapshot.exists || tripSnapshot.data()?.passengerId !== request.auth.uid) {
      throw new HttpsError('not-found', 'Trip not found.');
    }
    const trip = tripSnapshot.data() ?? {};
    if (trip.paymentStatus === 'paid') throw new HttpsError('failed-precondition', 'This trip is already paid.');
    if (trip.status !== 'requested' || typeof trip.estimatedCostCents !== 'number' ||
        !Number.isInteger(trip.estimatedCostCents) || typeof trip.currency !== 'string') {
      throw new HttpsError('failed-precondition', 'This trip cannot be paid right now.');
    }

    const secret = stripeSecret.value();
    if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) {
      throw new HttpsError('failed-precondition', 'Stripe is not configured. Set STRIPE_SECRET_KEY first.');
    }
    const stripe = new Stripe(secret);
    let intent: Stripe.PaymentIntent;
    if (typeof trip.paymentIntentId === 'string') {
      intent = await stripe.paymentIntents.retrieve(trip.paymentIntentId);
    } else {
      intent = await stripe.paymentIntents.create(
        {
          amount: trip.estimatedCostCents,
          currency: trip.currency,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          metadata: { tripId, passengerId: request.auth.uid },
        },
        { idempotencyKey: `travel-trip-${tripId}` }
      );
      await tripRef.update({ paymentIntentId: intent.id, updatedAt: Date.now() });
    }
    if (!intent.client_secret) throw new HttpsError('internal', 'Stripe did not return a payment secret.');
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  }
);

export const verifyTravelPayment = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to verify payment.');
    const tripId = request.data?.tripId;
    if (typeof tripId !== 'string' || tripId.length < 1 || tripId.length > 128) {
      throw new HttpsError('invalid-argument', 'A valid trip ID is required.');
    }
    const tripRef = db.doc(`travelTrips/${tripId}`);
    const tripSnapshot = await tripRef.get();
    const trip = tripSnapshot.data();
    if (!tripSnapshot.exists || trip?.passengerId !== request.auth.uid) {
      throw new HttpsError('not-found', 'Trip not found.');
    }
    if (trip.paymentStatus === 'paid') return { paid: true };
    if (typeof trip.paymentIntentId !== 'string') return { paid: false };

    const secret = stripeSecret.value();
    if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) {
      throw new HttpsError('failed-precondition', 'Stripe is not configured. Set STRIPE_SECRET_KEY first.');
    }
    const intent = await new Stripe(secret).paymentIntents.retrieve(trip.paymentIntentId);
    if (intent.metadata.tripId !== tripId || intent.metadata.passengerId !== request.auth.uid ||
        intent.amount !== trip.estimatedCostCents || intent.currency !== trip.currency) {
      throw new HttpsError('failed-precondition', 'Payment details do not match this trip.');
    }
    if (intent.status !== 'succeeded') return { paid: false, status: intent.status };

    await tripRef.update({ paymentStatus: 'paid', paidAt: Date.now(), updatedAt: Date.now() });
    return { paid: true };
  }
);

export const cancelTravelTrip = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to cancel a trip.');
    const tripId = request.data?.tripId;
    if (typeof tripId !== 'string' || tripId.length < 1 || tripId.length > 128) {
      throw new HttpsError('invalid-argument', 'A valid trip ID is required.');
    }
    const reason = typeof request.data?.reason === 'string' ? request.data.reason.trim().slice(0, 300) : '';
    const tripRef = db.doc(`travelTrips/${tripId}`);
    const tripSnapshot = await tripRef.get();
    const trip = tripSnapshot.data();
    if (!tripSnapshot.exists || trip?.passengerId !== request.auth.uid) {
      throw new HttpsError('not-found', 'Trip not found.');
    }
    if (trip.status === 'cancelled') return { success: true, paymentStatus: trip.paymentStatus };
    if (!['requested', 'accepted'].includes(String(trip.status))) {
      throw new HttpsError('failed-precondition', 'This trip can no longer be cancelled.');
    }

    let paymentStatus = trip.paymentStatus ?? 'unpaid';
    if (paymentStatus === 'paid') {
      if (typeof trip.paymentIntentId !== 'string') {
        throw new HttpsError('failed-precondition', 'Payment record is incomplete; support must review this trip.');
      }
      const secret = stripeSecret.value();
      if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) {
        throw new HttpsError('failed-precondition', 'Stripe is not configured. Set STRIPE_SECRET_KEY first.');
      }
      const stripe = new Stripe(secret);
      const intent = await stripe.paymentIntents.retrieve(trip.paymentIntentId);
      if (intent.metadata.tripId !== tripId || intent.metadata.passengerId !== request.auth.uid) {
        throw new HttpsError('failed-precondition', 'Payment details do not match this trip.');
      }
      if (intent.status === 'succeeded') {
        const refund = await stripe.refunds.create(
          { payment_intent: intent.id },
          { idempotencyKey: `travel-trip-refund-${tripId}` }
        );
        paymentStatus = refund.status === 'succeeded' ? 'refunded' : 'refund_pending';
        await tripRef.update({
          status: 'cancelled',
          paymentStatus,
          refundId: refund.id,
          cancellationReason: reason || 'Cancelled by passenger',
          updatedAt: Date.now(),
        });
        return { success: true, paymentStatus };
      }
      if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status)) {
        await stripe.paymentIntents.cancel(intent.id);
      } else if (intent.status !== 'canceled') {
        throw new HttpsError('failed-precondition', 'Payment is processing. Try cancelling again shortly.');
      }
      paymentStatus = 'unpaid';
    }
    await tripRef.update({
      status: 'cancelled',
      paymentStatus,
      cancellationReason: reason || 'Cancelled by passenger',
      updatedAt: Date.now(),
    });
    return { success: true, paymentStatus };
  }
);

function getBusAssignment(data: Record<string, unknown> | undefined) {
  const bus = data ?? {};
  const attendants = Array.isArray(bus.assignedAttendants)
    ? bus.assignedAttendants.filter((uid): uid is string => typeof uid === 'string')
    : [];
  return {
    driverId: typeof bus.driverId === 'string'
      ? bus.driverId
      : (typeof bus.assignedDriver === 'string' ? bus.assignedDriver : null),
    attendantIds: attendants,
  };
}

export const assignSchoolBusFleet = onCall(async (request) => {
  if (!request.auth || !isAdminRequest(request)) {
    throw new HttpsError('permission-denied', 'Only an administrator can assign school fleet staff.');
  }
  const busId = request.data?.busId;
  const driverId = request.data?.driverId == null ? null : request.data.driverId;
  const routeId = request.data?.routeId == null ? null : request.data.routeId;
  const attendantIds = request.data?.attendantIds ?? [];
  if (typeof busId !== 'string' || !busId.trim() || busId.length > 128 ||
      (driverId !== null && (typeof driverId !== 'string' || driverId.length > 128)) ||
      (routeId !== null && (typeof routeId !== 'string' || routeId.length > 128)) ||
      !Array.isArray(attendantIds) || attendantIds.length > 10 ||
      attendantIds.some((uid: unknown) => typeof uid !== 'string' || uid.length > 128)) {
    throw new HttpsError('invalid-argument', 'Bus and staff assignments are invalid.');
  }
  const normalizedBusId = busId.trim();
  const normalizedDriverId = typeof driverId === 'string' ? driverId.trim() || null : null;
  const normalizedRouteId = typeof routeId === 'string' ? routeId.trim() || null : null;
  const normalizedAttendants = [...new Set((attendantIds as string[]).map((uid) => uid.trim()))];
  if (normalizedAttendants.some((uid) => !uid) ||
      (normalizedDriverId && normalizedAttendants.includes(normalizedDriverId))) {
    throw new HttpsError('invalid-argument', 'A staff member cannot be assigned twice to the same bus.');
  }

  const candidateIds = [...new Set([...(normalizedDriverId ? [normalizedDriverId] : []), ...normalizedAttendants])];
  const result = await db.runTransaction(async (transaction) => {
    const allBusesSnapshot = await transaction.get(db.collection('buses'));
    const candidateSnapshots = await Promise.all(candidateIds.map((uid) => transaction.get(db.doc(`users/${uid}`))));
    const activeTrips = await transaction.get(db.collection('trips')
      .where('busId', '==', normalizedBusId)
      .where('status', '==', 'in_progress'));
    const routeSnapshot = normalizedRouteId ? await transaction.get(db.doc(`routes/${normalizedRouteId}`)) : null;
    const targetSnapshot = allBusesSnapshot.docs.find((bus) => bus.id === normalizedBusId);
    if (!targetSnapshot) throw new HttpsError('not-found', 'Bus not found.');
    if (normalizedRouteId && !routeSnapshot?.exists) throw new HttpsError('not-found', 'Route not found.');
    const targetData = targetSnapshot.data();
    const currentAttendants = Array.isArray(targetData.assignedAttendants)
      ? targetData.assignedAttendants.filter((uid: unknown): uid is string => typeof uid === 'string')
      : [];
    const assignmentsChanged = (targetData.driverId ?? null) !== normalizedDriverId ||
      (targetData.routeId ?? null) !== normalizedRouteId ||
      JSON.stringify([...currentAttendants].sort()) !== JSON.stringify([...normalizedAttendants].sort());
    if (activeTrips.size && assignmentsChanged) {
      throw new HttpsError('failed-precondition', 'End the active trip before changing this bus assignment.');
    }

    const candidateProfiles = new Map<string, Record<string, unknown>>();
    candidateIds.forEach((uid, index) => {
      const profile = candidateSnapshots[index].data();
      if (!candidateSnapshots[index].exists || !profile) {
        throw new HttpsError('not-found', `Staff profile ${uid} was not found.`);
      }
      const schoolRole = profile.schoolRole ?? profile.role;
      if (profile.primaryService === 'travel' ||
          (uid === normalizedDriverId ? schoolRole !== 'driver' : schoolRole !== 'attendant')) {
        throw new HttpsError('failed-precondition', `Staff profile ${uid} does not have the required school role.`);
      }
      candidateProfiles.set(uid, profile);
    });

    const nextBusData = new Map<string, Record<string, unknown>>();
    for (const busSnapshot of allBusesSnapshot.docs) {
      const busData = busSnapshot.data();
      const oldAttendants = Array.isArray(busData.assignedAttendants)
        ? busData.assignedAttendants.filter((uid: unknown): uid is string => typeof uid === 'string')
        : [];
      const isTarget = busSnapshot.id === normalizedBusId;
      const shouldRemoveStaff = (uid: string) => candidateIds.includes(uid) && !isTarget;
      const assignedAttendants = isTarget
        ? normalizedAttendants
        : oldAttendants.filter((uid) => !shouldRemoveStaff(uid));
      const nextDriverId = isTarget
        ? normalizedDriverId
        : (typeof busData.driverId === 'string' && candidateIds.includes(busData.driverId) ? null : busData.driverId ?? null);
      const nextDriverName = isTarget && normalizedDriverId
        ? String(candidateProfiles.get(normalizedDriverId)?.displayName ?? 'School Driver').slice(0, 120)
        : (isTarget ? null : (nextDriverId === null ? null : busData.driverName ?? null));
      if (isTarget || nextDriverId !== (busData.driverId ?? null) ||
          JSON.stringify(assignedAttendants) !== JSON.stringify(oldAttendants)) {
        nextBusData.set(busSnapshot.id, {
          ...busData,
          driverId: nextDriverId,
          driverName: nextDriverName,
          assignedAttendants,
          ...(isTarget ? { routeId: normalizedRouteId } : {}),
          updatedAt: Date.now(),
        });
      }
    }

    const affectedStaffIds = new Set<string>(candidateIds);
    const oldTarget = targetSnapshot.data();
    if (typeof oldTarget.driverId === 'string') affectedStaffIds.add(oldTarget.driverId);
    if (Array.isArray(oldTarget.assignedAttendants)) {
      oldTarget.assignedAttendants.filter((uid: unknown): uid is string => typeof uid === 'string')
        .forEach((uid: string) => affectedStaffIds.add(uid));
    }
    const affectedProfiles = await Promise.all([...affectedStaffIds].map((uid) => transaction.get(db.doc(`users/${uid}`))));
    const assignedBusByUid = new Map<string, string>();
    for (const [affectedBusId, data] of nextBusData) {
      if (typeof data.driverId === 'string') assignedBusByUid.set(data.driverId, affectedBusId);
      if (Array.isArray(data.assignedAttendants)) {
        for (const uid of data.assignedAttendants) if (typeof uid === 'string') assignedBusByUid.set(uid, affectedBusId);
      }
    }

    for (const [changedBusId, data] of nextBusData) {
      const { driverId: nextDriverId, driverName: nextDriverName, assignedAttendants: nextAttendants, routeId: nextRouteId, updatedAt } = data;
      transaction.update(db.doc(`buses/${changedBusId}`), {
        driverId: nextDriverId,
        driverName: nextDriverName,
        assignedAttendants: nextAttendants,
        routeId: nextRouteId ?? null,
        updatedAt,
      });
    }
    [...affectedStaffIds].forEach((uid, index) => {
      if (affectedProfiles[index].exists) {
        transaction.update(db.doc(`users/${uid}`), {
          assignedBusId: assignedBusByUid.get(uid) ?? null,
          updatedAt: Date.now(),
        });
      }
    });
    return { busId: normalizedBusId, driverId: normalizedDriverId, attendantIds: normalizedAttendants, routeId: normalizedRouteId };
  });

  return { success: true, ...result };
});

async function syncSchoolStaffProfileAssignment(userId: string): Promise<void> {
  const userRef = db.doc(`users/${userId}`);
  const user = await userRef.get();
  if (!user.exists) return;
  const userData = user.data() ?? {};
  const schoolRole = userData.schoolRole ?? userData.role;
  if (!['driver', 'attendant'].includes(String(schoolRole)) || userData.primaryService === 'travel') return;
  const [driverBuses, attendantBuses] = await Promise.all([
    db.collection('buses').where('driverId', '==', userId).limit(1).get(),
    db.collection('buses').where('assignedAttendants', 'array-contains', userId).limit(1).get(),
  ]);
  const busId = driverBuses.docs[0]?.id ?? attendantBuses.docs[0]?.id ?? null;
  if (userData.assignedBusId !== busId) {
    await userRef.update({ assignedBusId: busId, updatedAt: Date.now() });
  }
}

async function setRealtimeBusAccess(userId: string, busId: string, allowed: boolean): Promise<void> {
  const accessRef = realtimeDb.ref(`userBusAccess/${userId}/${busId}`);
  if (allowed) await accessRef.set(true);
  else await accessRef.remove();
}

export const syncBusRealtimeAssignment = onDocumentWritten('buses/{busId}', async (event) => {
  const busId = event.params.busId;
  const after = event.data?.after;
  const assignmentRef = realtimeDb.ref(`busAssignments/${busId}`);

  if (!after?.exists) {
    const previousBus = event.data?.before.data();
    const previousParentIds = previousBus?.parentIds;
    const previousAssignment = getBusAssignment(previousBus);
    await assignmentRef.remove();
    const previousStaffIds = [...new Set([
      ...(previousAssignment.driverId ? [previousAssignment.driverId] : []),
      ...previousAssignment.attendantIds,
    ])];
    await Promise.all(previousStaffIds.map(async (uid) => {
      await syncSchoolStaffProfileAssignment(uid);
      await setRealtimeBusAccess(uid, busId, false);
    }));
    if (Array.isArray(previousParentIds)) {
      await Promise.all(previousParentIds.filter((uid): uid is string => typeof uid === 'string')
        .map((uid) => syncParentBusAccess(uid)));
    }
    if (typeof previousBus?.routeId === 'string') {
      await syncRouteParentIds(previousBus.routeId);
    }
    return;
  }

  const beforeBus = event.data?.before.data();
  const afterBus = after.data() ?? {};
  const beforeAssignment = getBusAssignment(beforeBus);
  const afterAssignment = getBusAssignment(afterBus);
  const previousStaffIds = new Set([
    ...(beforeAssignment.driverId ? [beforeAssignment.driverId] : []),
    ...beforeAssignment.attendantIds,
  ]);
  const nextStaffIds = new Set([
    ...(afterAssignment.driverId ? [afterAssignment.driverId] : []),
    ...afterAssignment.attendantIds,
  ]);
  await Promise.all([...new Set([...previousStaffIds, ...nextStaffIds])].map(async (uid) => {
    await syncSchoolStaffProfileAssignment(uid);
    await setRealtimeBusAccess(uid, event.params.busId, nextStaffIds.has(uid));
  }));
  await assignmentRef.set(getBusAssignment(afterBus));
  const previousRouteId = event.data?.before.data()?.routeId;
  const routeId = afterBus.routeId;
  if (typeof previousRouteId === 'string' && previousRouteId !== routeId) {
    await syncRouteParentIds(previousRouteId);
  }
  if (typeof routeId === 'string') await syncRouteParentIds(routeId);
});

async function syncParentBusAccess(parentId: string): Promise<void> {
  const parentSnapshot = await db.doc(`users/${parentId}`).get();
  if (!parentSnapshot.exists) {
    await realtimeDb.ref(`userBusAccess/${parentId}`).remove();
    return;
  }

  const [parentBuses, driverBuses, attendantBuses] = await Promise.all([
    db.collection('buses').where('parentIds', 'array-contains', parentId).get(),
    db.collection('buses').where('driverId', '==', parentId).get(),
    db.collection('buses').where('assignedAttendants', 'array-contains', parentId).get(),
  ]);
  const access = Object.fromEntries(
    [...parentBuses.docs, ...driverBuses.docs, ...attendantBuses.docs].map((bus) => [bus.id, true])
  );
  const accessRef = realtimeDb.ref(`userBusAccess/${parentId}`);
  if (!Object.keys(access).length) {
    await accessRef.remove();
  } else {
    await accessRef.set(access);
  }
}

async function syncBusParentIds(busId: string): Promise<void> {
  const busRef = db.doc(`buses/${busId}`);
  const busSnapshot = await busRef.get();
  if (!busSnapshot.exists) return;
  const routeId = busSnapshot.data()?.routeId;

  const oldParentIds = Array.isArray(busSnapshot.data()?.parentIds)
    ? busSnapshot.data()?.parentIds.filter((uid: unknown): uid is string => typeof uid === 'string')
    : [];
  const childQueries = await Promise.all(
    ['defaultBusId', 'assignedBusId', 'busId', 'assignedBus'].map((field) =>
      db.collectionGroup('children').where(field, '==', busId).get()
    )
  );
  const parentIds = new Set<string>();
  for (const querySnapshot of childQueries) {
    for (const child of querySnapshot.docs) {
      const ownerId = child.ref.parent.parent?.id;
      if (ownerId) parentIds.add(ownerId);
      const guardians = child.data().guardianIds;
      if (Array.isArray(guardians)) {
        guardians.filter((uid): uid is string => typeof uid === 'string').forEach((uid) => parentIds.add(uid));
      }
    }
  }

  const nextParentIds = [...parentIds].sort();
  if (JSON.stringify([...oldParentIds].sort()) !== JSON.stringify(nextParentIds)) {
    await busRef.update({ parentIds: nextParentIds, updatedAt: Date.now() });
  }
  await Promise.all([...new Set([...oldParentIds, ...nextParentIds])].map(syncParentBusAccess));
  if (typeof routeId === 'string') await syncRouteParentIds(routeId);
}

async function syncRouteParentIds(routeId: string): Promise<void> {
  const routes = await db.collection('routes').doc(routeId).get();
  if (!routes.exists) return;
  const buses = await db.collection('buses').where('routeId', '==', routeId).get();
  const parentIds = new Set<string>();
  for (const bus of buses.docs) {
    const ids = bus.data().parentIds;
    if (Array.isArray(ids)) {
      ids.filter((uid): uid is string => typeof uid === 'string').forEach((uid) => parentIds.add(uid));
    }
  }
  const nextParentIds = [...parentIds].sort();
  const current = Array.isArray(routes.data()?.parentIds)
    ? routes.data()?.parentIds.filter((uid: unknown): uid is string => typeof uid === 'string')
    : [];
  if (JSON.stringify([...current].sort()) !== JSON.stringify(nextParentIds)) {
    await routes.ref.update({ parentIds: nextParentIds, updatedAt: Date.now() });
  }
}

export const syncRouteParentAccess = onDocumentWritten('routes/{routeId}', async (event) => {
  if (event.data?.after.exists) await syncRouteParentIds(event.params.routeId);
});

export const syncParentAccessFromProfile = onDocumentWritten('users/{userId}', async (event) => {
  await syncParentBusAccess(event.params.userId);
});

export const syncParentAccessFromChild = onDocumentWritten(
  'users/{parentId}/children/{childId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const busIds = new Set<string>();
    for (const child of [before, after]) {
      if (!child) continue;
      const busId = child.assignedBusId ?? child.defaultBusId ?? child.busId ?? child.assignedBus;
      if (typeof busId === 'string' && busId.length > 0) busIds.add(busId);
    }
    await Promise.all([...busIds].map(syncBusParentIds));
    await syncParentBusAccess(event.params.parentId);
  }
);

/** Publish only non-sensitive driver fields for passenger discovery. */
async function writePublicDriverProfile(driverId: string, driver: Record<string, unknown>): Promise<void> {
  const publicRef = db.doc(`drivers_public/${driverId}`);
  const publicProfile: Record<string, unknown> = {
    id: driverId,
    firstName: driver.firstName ?? '',
    lastName: driver.lastName ?? '',
    verificationStatus: driver.verificationStatus ?? 'pending',
    isAvailable: driver.isAvailable === true,
    totalTrips: typeof driver.totalTrips === 'number' ? driver.totalTrips : 0,
    rating: typeof driver.rating === 'number' ? driver.rating : 0,
    updatedAt: Date.now(),
  };
  if (typeof driver.photoURL === 'string') publicProfile.photoURL = driver.photoURL;
  if (typeof driver.acceptanceRate === 'number') publicProfile.acceptanceRate = driver.acceptanceRate;
  if (typeof driver.lastActive === 'number') publicProfile.lastActive = driver.lastActive;
  await publicRef.set(publicProfile);
}

export const syncPublicDriverProfile = onDocumentWritten('drivers/{driverId}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) {
    await db.doc(`drivers_public/${event.params.driverId}`).delete();
    return;
  }
  await writePublicDriverProfile(event.params.driverId, after.data() ?? {});
});

/** Run once after deploying to populate RTDB assignment mirrors for existing records. */
export const rebuildRealtimeAccessMaps = onCall(async (request) => {
  if (!request.auth || !isAdminRequest(request)) {
    throw new HttpsError('permission-denied', 'Admin access is required.');
  }

  const buses = await db.collection('buses').get();
  await Promise.all(buses.docs.map(async (bus) => {
    const busData = bus.data();
    if (typeof busData.assignedDriver === 'string') {
      const migratedDriverId = typeof busData.driverId === 'string'
        ? busData.driverId
        : busData.assignedDriver;
      await bus.ref.update({
        driverId: migratedDriverId,
        assignedDriver: FieldValue.delete(),
      });
      busData.driverId = migratedDriverId;
      delete busData.assignedDriver;
    }
    await realtimeDb.ref(`busAssignments/${bus.id}`).set(getBusAssignment(busData));
    await syncBusParentIds(bus.id);
  }));
  const drivers = await db.collection('drivers').get();
  await Promise.all(drivers.docs.map((driver) => writePublicDriverProfile(driver.id, driver.data())));
  const parents = await db.collection('users').where('role', '==', 'parent').get();
  await Promise.all(parents.docs.map((parent) => syncParentBusAccess(parent.id)));
  const users = await db.collection('users').get();
  const currentBuses = await db.collection('buses').get();
  const schoolStaff = users.docs.filter((user) => {
    const data = user.data();
    return data.primaryService !== 'travel' && ['driver', 'attendant'].includes(String(data.schoolRole ?? data.role));
  });
  await Promise.all(schoolStaff.map(async (user) => {
    const access: Record<string, boolean> = {};
    for (const bus of currentBuses.docs) {
      const assignment = getBusAssignment(bus.data());
      if (assignment.driverId === user.id || assignment.attendantIds.includes(user.id)) {
        access[bus.id] = true;
      }
    }
    await syncSchoolStaffProfileAssignment(user.id);
    const accessRef = realtimeDb.ref(`userBusAccess/${user.id}`);
    if (Object.keys(access).length) await accessRef.set(access);
    else await accessRef.remove();
  }));

  return { success: true, buses: buses.size, parents: parents.size, schoolStaff: schoolStaff.length, drivers: drivers.size };
});
