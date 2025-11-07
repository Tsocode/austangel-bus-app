import { addDoc, collection } from 'firebase/firestore';

import { Checkin, CheckinType } from '@/models/checkin';
import { db } from '@/services/firebase';

const COLLECTION = 'checkins';

export async function recordCheckin(
  tripId: string,
  childId: string,
  type: CheckinType,
  driverId: string,
  data: Partial<Omit<Checkin, 'id' | 'tripId' | 'childId' | 'type' | 'recordedBy'>> = {}
): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    tripId,
    childId,
    type,
    recordedBy: driverId,
    timestamp: data.timestamp ?? Date.now(),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    note: data.note ?? null,
  });
}
