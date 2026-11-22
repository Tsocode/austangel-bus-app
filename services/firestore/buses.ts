import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

import { Bus } from '@/models/bus';
import { db } from '@/services/firebase';
import { functions } from '@/services/firebase';
import { httpsCallable } from 'firebase/functions';

const COLLECTION = 'buses';

function toBus(id: string, data: Record<string, any>): Bus {
  return {
    id,
    nickname: data.nickname,
    plateNumber: data.plateNumber,
    driverId: data.driverId,
    driverName: data.driverName,
    assignedAttendants: Array.isArray(data.assignedAttendants) ? data.assignedAttendants : [],
    parentIds: Array.isArray(data.parentIds) ? data.parentIds : [],
    routeId: data.routeId,
    updatedAt: data.updatedAt,
  };
}

export async function getBus(busId: string): Promise<Bus | null> {
  const ref = doc(db, COLLECTION, busId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return null;
  }
  return toBus(snapshot.id, snapshot.data());
}

export async function listBuses(): Promise<Bus[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((docSnapshot) => toBus(docSnapshot.id, docSnapshot.data()));
}

export async function listBusesForParent(parentId: string): Promise<Bus[]> {
  const parentBuses = query(collection(db, COLLECTION), where('parentIds', 'array-contains', parentId));
  const snapshot = await getDocs(parentBuses);
  return snapshot.docs.map((docSnapshot) => toBus(docSnapshot.id, docSnapshot.data()));
}

export async function listBusesForSchoolStaff(userId: string): Promise<Bus[]> {
  const [driverBuses, attendantBuses] = await Promise.all([
    getDocs(query(collection(db, COLLECTION), where('driverId', '==', userId))),
    getDocs(query(collection(db, COLLECTION), where('assignedAttendants', 'array-contains', userId))),
  ]);
  const docsById = new Map([
    ...driverBuses.docs.map((snapshot) => [snapshot.id, snapshot] as const),
    ...attendantBuses.docs.map((snapshot) => [snapshot.id, snapshot] as const),
  ]);
  return [...docsById.values()].map((snapshot) => toBus(snapshot.id, snapshot.data()));
}

export interface SchoolStaffOption {
  id: string;
  name: string;
  role: 'driver' | 'attendant';
  assignedBusId?: string | null;
}

export async function listSchoolStaff(): Promise<SchoolStaffOption[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.flatMap((userDoc) => {
    const data = userDoc.data();
    if (data.primaryService === 'travel') return [];
    const schoolRole = data.schoolRole ?? data.role;
    if (schoolRole !== 'driver' && schoolRole !== 'attendant') return [];
    return [{
      id: userDoc.id,
      name: data.displayName || [data.firstName, data.lastName].filter(Boolean).join(' ') || userDoc.id,
      role: schoolRole,
      assignedBusId: data.assignedBusId ?? null,
    } as SchoolStaffOption];
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export async function assignSchoolBusFleet(
  busId: string,
  driverId: string | null,
  attendantIds: string[],
  routeId: string | null
): Promise<void> {
  const assign = httpsCallable(functions, 'assignSchoolBusFleet');
  await assign({ busId, driverId, attendantIds, routeId });
}

export async function updateBusDriver(
  busId: string,
  {
    driverId,
    driverName,
  }: {
    driverId?: string | null;
    driverName?: string | null;
  }
): Promise<void> {
  const ref = doc(db, COLLECTION, busId);
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (driverId !== undefined) updates.driverId = driverId;
  if (driverName !== undefined) updates.driverName = driverName;
  await updateDoc(ref, updates);
}

export async function createBus(
  {
    id,
    nickname,
    plateNumber,
    driverId,
    driverName,
    routeId,
  }: {
    id?: string | null;
    nickname: string;
    plateNumber?: string | null;
    driverId?: string | null;
    driverName?: string | null;
    routeId?: string | null;
  }
): Promise<string> {
  const payload = {
    nickname,
    plateNumber: plateNumber ?? null,
    driverId: driverId ?? null,
    driverName: driverName ?? null,
    routeId: routeId ?? null,
    parentIds: [],
    updatedAt: Date.now(),
  };

  if (id) {
    const ref = doc(db, COLLECTION, id);
    await setDoc(ref, payload, { merge: true });
    return id;
  }

  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}
