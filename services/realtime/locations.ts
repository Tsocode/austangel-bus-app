import { onValue, ref, set, Unsubscribe } from 'firebase/database';

import { realtimeDb } from '@/services/firebase';

export interface LiveLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: number;
}

const ROOT = 'liveLocations';

export function subscribeToLiveLocation(
  busId: string,
  callback: (location: LiveLocation | null) => void
): Unsubscribe {
  const locationRef = ref(realtimeDb, `${ROOT}/${busId}`);
  return onValue(locationRef, (snapshot) => {
    const value = snapshot.val();
    if (value) {
      callback(value as LiveLocation);
    } else {
      callback(null);
    }
  });
}

export async function updateLiveLocation(busId: string, location: LiveLocation): Promise<void> {
  const locationRef = ref(realtimeDb, `${ROOT}/${busId}`);
  await set(locationRef, {
    ...location,
    updatedAt: location.updatedAt ?? Date.now(),
  });
}
