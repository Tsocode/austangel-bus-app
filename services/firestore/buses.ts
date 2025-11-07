import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';

import { Bus } from '@/models/bus';
import { db } from '@/services/firebase';

const COLLECTION = 'buses';

export async function getBus(busId: string): Promise<Bus | null> {
  const ref = doc(db, COLLECTION, busId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data();
  return {
    id: snapshot.id,
    nickname: data.nickname,
    plateNumber: data.plateNumber,
    driverId: data.driverId,
    driverName: data.driverName,
    routeId: data.routeId,
    updatedAt: data.updatedAt,
  } as Bus;
}

export async function listBuses(): Promise<Bus[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      nickname: data.nickname,
      plateNumber: data.plateNumber,
      driverId: data.driverId,
      driverName: data.driverName,
      routeId: data.routeId,
      updatedAt: data.updatedAt,
    } as Bus;
  });
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
  await updateDoc(ref, {
    driverId: driverId ?? null,
    driverName: driverName ?? null,
    updatedAt: Date.now(),
  });
}
