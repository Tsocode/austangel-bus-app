import { addDoc, collection, doc, getDoc, getDocs } from 'firebase/firestore';

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

export async function listRoutes(): Promise<Route[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((routeDoc) => {
    const data = routeDoc.data();
    return {
      id: routeDoc.id,
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
  });
}

export async function createRoute(
  name: string,
  stops: Array<{ id: string; name: string; latitude: number; longitude: number; order: number }>
): Promise<string> {
  const normalizedName = name.trim();
  if (normalizedName.length < 2 || normalizedName.length > 120 || stops.length < 2 || stops.length > 200 ||
      stops.some((stop) => !stop.name.trim() || stop.name.length > 120 ||
        !Number.isFinite(stop.latitude) || stop.latitude < -90 || stop.latitude > 90 ||
        !Number.isFinite(stop.longitude) || stop.longitude < -180 || stop.longitude > 180)) {
    throw new Error('Enter a route name and at least two stops with valid coordinates.');
  }
  const now = Date.now();
  const routeRef = await addDoc(collection(db, COLLECTION), {
    name: normalizedName,
    stops: stops.map((stop, index) => ({ ...stop, name: stop.name.trim(), order: index })),
    createdAt: now,
    updatedAt: now,
  });
  return routeRef.id;
}
