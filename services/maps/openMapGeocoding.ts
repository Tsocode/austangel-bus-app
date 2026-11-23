export type OpenMapPlace = {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

const searchCache = new Map<string, OpenMapPlace[]>();

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toPlace(feature: PhotonFeature): OpenMapPlace | null {
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const properties = feature.properties ?? {};
  const title = text(properties.name) || text(properties.street) || text(properties.city) || 'Selected location';
  const address = [properties.housenumber, properties.street, properties.city, properties.state, properties.country]
    .map(text)
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(', ') || title;
  return { latitude, longitude, title, address };
}

/** Search the free, OpenStreetMap-based Photon geocoder and cache repeated searches. */
export async function searchOpenMapPlaces(query: string, limit = 6): Promise<OpenMapPlace[]> {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  if (normalizedQuery.length < 2) return [];
  const cacheKey = `${normalizedQuery.toLocaleLowerCase()}|${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(normalizedQuery)}&limit=${limit}&lang=en`;
  const response = await fetch(url, { headers: { Accept: 'application/geo+json' } });
  if (!response.ok) throw new Error(`Open map search failed (${response.status})`);
  const data = await response.json();
  const places = ((data?.features ?? []) as PhotonFeature[])
    .map(toPlace)
    .filter((place): place is OpenMapPlace => Boolean(place));
  searchCache.set(cacheKey, places);
  return places;
}
