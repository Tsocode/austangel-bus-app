import { doc, getDoc } from 'firebase/firestore';

import { Route } from '@/models/route';
import { db } from '@/services/firebase';

const COLLECTION = 'routes';

export async function getRoute(routeId: string): Promise<Route | null> {
  const ref = doc(db, COLLECTION, routeId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name,
    stops: (data.stops ?? []).map((stop: any) => ({
      id: stop.id,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      order: stop.order,
    })),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as Route;
}
