import Constants from 'expo-constants';

/**
 * Map provider switch.
 * Set EXPO_PUBLIC_MAPS_PROVIDER=google in .env to restore Google Maps.
 * Installed builds use the no-key OpenStreetMap-based MapLibre renderer.
 * Expo Go falls back to its bundled native map on iOS for device preview.
 */
export const MAPS_PROVIDER = process.env.EXPO_PUBLIC_MAPS_PROVIDER === 'google'
  ? 'google'
  : 'openstreetmap';

export const USE_GOOGLE_MAPS = MAPS_PROVIDER === 'google';
const extra = Constants.expoConfig?.extra ?? {};
const configuredGoogleValue = (name: string) => {
  if (!USE_GOOGLE_MAPS) return undefined;
  const value = extra[name];
  return typeof value === 'string' ? value : undefined;
};

export const GOOGLE_MAPS_ANDROID_API_KEY = configuredGoogleValue('expoPublicGoogleMapsAndroidApiKey');
export const GOOGLE_MAPS_IOS_API_KEY = configuredGoogleValue('expoPublicGoogleMapsIosApiKey');
export const GOOGLE_MAPS_WEB_API_KEY = configuredGoogleValue('expoPublicGoogleMapsWebApiKey');
export const GOOGLE_MAPS_LEGACY_API_KEY = configuredGoogleValue('expoPublicGoogleMapsLegacyApiKey');
export const GOOGLE_PLACES_API_KEY = configuredGoogleValue('expoPublicGooglePlacesApiKey');
export const MAPBOX_TOKEN = configuredGoogleValue('expoPublicMapboxToken');
