import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  query,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';

import { Checkin, CheckinType } from '@/models/checkin';
import { ChildProfile } from '@/models/child';
import { Trip, TripShift } from '@/models/trip';
import { db } from '@/services/firebase';

export type BusRosterStudent = ChildProfile & { parentId: string; displayName: string };

export async function listStudentsForAdmin(): Promise<BusRosterStudent[]> {
  const snapshot = await getDocs(collectionGroup(db, 'children'));
  return snapshot.docs.map((studentDoc) => {
    const data = studentDoc.data();
    const firstName = typeof data.firstName === 'string' ? data.firstName : '';
    const lastName = typeof data.lastName === 'string' ? data.lastName : '';
    return {
      id: studentDoc.id,
      parentId: studentDoc.ref.parent.parent?.id ?? '',
      firstName,
      lastName,
      fullName: typeof data.fullName === 'string' ? data.fullName : undefined,
      displayName: data.fullName || [firstName, lastName].filter(Boolean).join(' ') || 'Student',
      guardianIds: Array.isArray(data.guardianIds) ? data.guardianIds : [],
      defaultBusId: typeof data.defaultBusId === 'string' ? data.defaultBusId : undefined,
    } as BusRosterStudent;
  }).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function setStudentDefaultBus(parentId: string, studentId: string, busId: string | null): Promise<void> {
  await updateDoc(doc(db, 'users', parentId, 'children', studentId), {
    defaultBusId: busId,
    updatedAt: Date.now(),
  });
}

export function subscribeToBusRoster(
  busId: string,
  onStudents: (students: BusRosterStudent[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const rosterQuery = query(collectionGroup(db, 'children'), where('defaultBusId', '==', busId));
  return onSnapshot(rosterQuery, (snapshot) => {
    const students = snapshot.docs.map((studentDoc) => {
      const data = studentDoc.data();
      const parentId = studentDoc.ref.parent.parent?.id ?? '';
      const firstName = typeof data.firstName === 'string' ? data.firstName : '';
      const lastName = typeof data.lastName === 'string' ? data.lastName : '';
      return {
        id: studentDoc.id,
        parentId,
        firstName,
        lastName,
        fullName: typeof data.fullName === 'string' ? data.fullName : undefined,
        displayName: data.fullName || [firstName, lastName].filter(Boolean).join(' ') || 'Student',
        guardianIds: Array.isArray(data.guardianIds) ? data.guardianIds : [],
        defaultBusId: data.defaultBusId,
      } as BusRosterStudent;
    });
    students.sort((a, b) => a.displayName.localeCompare(b.displayName));
    onStudents(students);
  }, onError);
}

export function subscribeToBusTrips(
  busId: string,
  onTrips: (trips: Trip[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tripsQuery = query(
    collection(db, 'trips'),
    where('busId', '==', busId),
    where('status', '==', 'in_progress')
  );
  return onSnapshot(tripsQuery, (snapshot) => {
    onTrips(snapshot.docs.map((tripDoc) => ({ id: tripDoc.id, ...tripDoc.data() } as Trip)));
  }, onError);
}

export function subscribeToTripCheckins(
  tripId: string,
  onCheckins: (checkins: Checkin[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const checkinsQuery = query(collection(db, 'checkIns'), where('tripId', '==', tripId));
  return onSnapshot(checkinsQuery, (snapshot) => {
    onCheckins(snapshot.docs.map((checkinDoc) => ({ id: checkinDoc.id, ...checkinDoc.data() } as Checkin)));
  }, onError);
}

export async function startSchoolTrip(busId: string, routeId: string | undefined, driverId: string): Promise<string> {
  const now = Date.now();
  const hour = new Date(now).getHours();
  const shift: TripShift = hour < 12 ? 'AM' : 'PM';
  const currentDate = new Date(now);
  const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const trip = await addDoc(collection(db, 'trips'), {
    busId,
    routeId: routeId ?? '',
    driverId,
    date,
    shift,
    startTime: now,
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
  });
  return trip.id;
}

export async function finishSchoolTrip(tripId: string): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(db, 'trips', tripId), { status: 'completed', endTime: now, updatedAt: now });
}

export async function recordSchoolCheckin(
  tripId: string,
  busId: string,
  student: BusRosterStudent,
  type: CheckinType,
  recordedBy: string,
  location: { latitude: number; longitude: number } | null,
  note?: string
): Promise<void> {
  await addDoc(collection(db, 'checkIns'), {
    tripId,
    busId,
    childId: student.id,
    parentId: student.parentId,
    type,
    recordedBy,
    timestamp: Date.now(),
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    note: note?.trim().slice(0, 500) || null,
  });
}
