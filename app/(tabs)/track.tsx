import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking, Platform, Share } from 'react-native';
import * as Location from 'expo-location';
import { get, ref, set, update } from 'firebase/database';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DimensionValue,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  KeyboardAvoidingView,
} from 'react-native';

// ============================================================================
// CAREFUL: Conditionally load react-native-maps for native only (not web)
// ============================================================================
// On web, MapView will be null and the component won't render maps
// Use try-catch because Metro tries to resolve react-native-maps even with
// Platform checks, and on web it will fail to load native internals
const shouldLoadMaps = Platform.OS !== 'web';

type MapViewInstance = any;
type LatLngCoord = any;
type MarkerType = any;
type MarkerAnimatedType = any;
type PolylineType = any;
type AnimatedRegionType = any;

let MapView: any = null;
let AnimatedRegion: any = null;
let LatLng: any = null;
let Marker: any = null;
let MarkerAnimated: any = null;
let Polyline: any = null;
let GoogleMapsProvider: any = null;
let FreeMap: any = null;

if (shouldLoadMaps && process.env.EXPO_PUBLIC_MAPS_PROVIDER === 'google') {
  try {
    // eslint-disable-next-line global-require
    const mapsModule = require('react-native-maps');
    MapView = mapsModule.default;
    AnimatedRegion = mapsModule.AnimatedRegion;
    LatLng = mapsModule.LatLng;
    Marker = mapsModule.Marker;
    MarkerAnimated = mapsModule.MarkerAnimated;
    Polyline = mapsModule.Polyline;
    GoogleMapsProvider = mapsModule.PROVIDER_GOOGLE;
  } catch (e) {
    console.warn('Failed to load react-native-maps (this is OK on web):', e);
    // On web, these will stay as null, and we just won't render the map
    MapView = null;
  }
}
if (shouldLoadMaps && process.env.EXPO_PUBLIC_MAPS_PROVIDER !== 'google') {
  try {
    // eslint-disable-next-line global-require
    FreeMap = require('@/components/maps/FreeMap').default;
  } catch (e) {
    console.warn('Could not load the native free map renderer:', e);
  }
}
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsButton } from '@/components/ui/SettingsButton';
import { LocationAutocomplete, PlaceResult } from '@/components/LocationAutocomplete';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import {
  GOOGLE_MAPS_ANDROID_API_KEY,
  GOOGLE_MAPS_IOS_API_KEY,
  GOOGLE_MAPS_LEGACY_API_KEY,
  USE_GOOGLE_MAPS,
} from '@/constants/mapProvider';
import { BANANA_TO_AKUTE_ROUTE_POINTS, DEFAULT_LOCATION, DEFAULT_ROUTE_POINTS } from '@/constants/geo';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Bus } from '@/models/bus';
import { Route, RouteStop } from '@/models/route';
import { useAuthContext } from '@/providers/AuthProvider';
import { getBus, listBuses, listBusesForParent, listBusesForSchoolStaff, updateBusDriver } from '@/services/firestore/buses';
import { getRoute } from '@/services/firestore/routes';
import { LiveLocation, subscribeToLiveLocation, updateLiveLocation } from '@/services/realtime/locations';
import { realtimeDb } from '@/services/firebase';
import { searchOpenMapPlaces } from '@/services/maps/openMapGeocoding';

type Coordinate = { latitude: number; longitude: number };

const calculateHeading = (from: Coordinate, to: Coordinate): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const deltaLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const heading = toDeg(Math.atan2(y, x));
  return (heading + 360) % 360;
};

const haversineDistanceMeters = (from: Coordinate, to: Coordinate): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const remainingDistanceMeters = (path: Coordinate[], startIndex: number): number => {
  if (path.length < 2 || startIndex >= path.length - 1) return 0;
  let total = 0;
  for (let i = startIndex; i < path.length - 1; i += 1) {
    total += haversineDistanceMeters(path[i], path[i + 1]);
  }
  return total;
};

const buildSegmentDurations = (points: Coordinate[], totalDurationMs: number): number[] => {
  if (points.length < 2) return [];
  const distances = points.slice(1).map((point, index) =>
    haversineDistanceMeters(points[index], point)
  );
  const totalDistance = distances.reduce((sum, distance) => sum + distance, 0);
  if (!totalDistance) {
    // Even distribution if no distance variation
    const evenDuration = Math.max(250, Math.floor(totalDurationMs / distances.length));
    return distances.map(() => evenDuration);
  }
  // Calculate segment durations proportional to distance, minimum 250ms for smooth animation
  return distances.map((distance) =>
    Math.max(250, Math.floor((distance / totalDistance) * totalDurationMs))
  );
};

const formatArrival = (etaSeconds: number): string => {
  const etaMs = Date.now() + etaSeconds * 1000;
  const date = new Date(etaMs);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SIMULATION_SPEED_MULTIPLIER = 2.5;

// Realistic bus speeds (km/h) based on traffic conditions
const BUS_SPEEDS = {
  idle: 0,
  slow: 15,      // Heavy traffic
  moderate: 25,  // Normal traffic
  highway: 40,   // Open road
};

// Calculate realistic speed based on route segment
const calculateBusSpeed = (currentIndex: number, totalPoints: number): number => {
  if (currentIndex === 0 || currentIndex === totalPoints - 1) {
    return BUS_SPEEDS.slow;
  }

  const progress = currentIndex / totalPoints;

  // Simulate varying traffic: slow at start, faster mid-route, slow at end
  if (progress < 0.2) return BUS_SPEEDS.slow;
  if (progress < 0.3) return BUS_SPEEDS.moderate;
  if (progress < 0.7) return BUS_SPEEDS.highway;
  if (progress < 0.85) return BUS_SPEEDS.moderate;
  return BUS_SPEEDS.slow;
};

const FALLBACK_ROUTE: Route = {
  id: 'demo-route-1',
  name: 'Carlton Gate to Ikorodu',
  stops: DEFAULT_ROUTE_POINTS.map((point, index) => ({
    id: `stop-${index}`,
    name: `Stop ${index + 1}`,
    latitude: point.latitude,
    longitude: point.longitude,
    order: index,
  })),
};

const ROUTE_PLACEHOLDER: Route = {
  id: 'planned-route',
  name: 'Plan a route',
  stops: [],
};

const FALLBACK_ROUTES: Record<string, Route> = {
  'demo-route-1': FALLBACK_ROUTE,
  'demo-route-2': {
    id: 'demo-route-2',
    name: 'Banana Island to Akute',
    stops: BANANA_TO_AKUTE_ROUTE_POINTS.map((point, index) => ({
      id: `stop-${index}`,
      name: `Stop ${index + 1}`,
      latitude: point.latitude,
      longitude: point.longitude,
      order: index,
    })),
  },
};

export default function TrackScreen() {
  const { role, profile, firebaseUser } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    cardBg: theme.surface,
    cardBorder: theme.border,
    textStrong: theme.text,
    textMuted: theme.text,
    textSubtle: theme.icon,
    bannerBg: theme.tint,
    bannerText: '#fff',
    inputBg: theme.surface,
    inputBorder: theme.border,
    controlBg: theme.surface,
    controlBorder: theme.border,
    ghostText: theme.tint,
  };
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(ROUTE_PLACEHOLDER);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [driverDraft, setDriverDraft] = useState('');
  const [followBus, setFollowBus] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [trailCoords, setTrailCoords] = useState<Coordinate[]>([]);
  const [routePolyline, setRoutePolyline] = useState<Coordinate[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
  const [startQuery, setStartQuery] = useState('Carlton Gate Estate, Chevron Drive, Lekki');
  const [endQuery, setEndQuery] = useState('Ikorodu Central, Lagos');
  const [startCoord, setStartCoord] = useState<Coordinate | null>(null);
  const [endCoord, setEndCoord] = useState<Coordinate | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isRoutePlannerExpanded, setIsRoutePlannerExpanded] = useState(false);
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [pauseUntil, setPauseUntil] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomDelta, setZoomDelta] = useState({ latitudeDelta: 0.03, longitudeDelta: 0.03 });
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [destinationSearch, setDestinationSearch] = useState('');
  const [safetyTracking, setSafetyTracking] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [safetyLocation, setSafetyLocation] = useState<Location.LocationObject | null>(null);
  const [safetyRefreshing, setSafetyRefreshing] = useState(false);
  const safetyWatcher = useRef<Location.LocationSubscription | null>(null);
  // Realtime Database rules scope this node to auth.uid; never fall back to a bus or guest ID.
  const safetyTripId = firebaseUser?.uid ?? '';
  const mapRef = useRef<MapViewInstance | null>(null);
  const simulationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationStep = useRef(0);
  const stopScheduleRef = useRef<{ index: number; stop: RouteStop; dwellSeconds: number }[]>([]);
  const pauseUntilRef = useRef<number | null>(null);
  const visitedStopsRef = useRef<Set<number>>(new Set());
  const isSimulatingRef = useRef(false);
  const segmentDurationsRef = useRef<number[]>([]);
  const busCoordinate = useRef<any>(
    AnimatedRegion
      ? new AnimatedRegion({
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
        })
      : { setValue: () => undefined }
  );

  const selectedBus = useMemo(
    () => buses.find((bus) => bus.id === selectedBusId) ?? null,
    [buses, selectedBusId]
  );

  const currentLocation = useMemo(
    () =>
      liveLocation ?? {
        latitude: routePolyline[0]?.latitude ?? DEFAULT_LOCATION.latitude,
        longitude: routePolyline[0]?.longitude ?? DEFAULT_LOCATION.longitude,
      },
    [liveLocation, routePolyline]
  );

  const routePoints = useMemo<RouteStop[]>(() => {
    return routeStops;
  }, [routeStops]);

  const simulationPath = useMemo(() => routePolyline, [routePolyline]);

  const lastUpdatedAt = liveLocation?.updatedAt ?? null;
  const isStale = lastUpdatedAt ? clockNow - lastUpdatedAt > 2 * 60 * 1000 : false;

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const etaSeconds = useMemo(() => {
    if (!simulationPath.length) return null;
    const baseDuration = routeDurationSeconds ?? Math.max(1, simulationPath.length * 2.5);
    const travelDuration = baseDuration * SIMULATION_SPEED_MULTIPLIER;
    const progressRatio = simulationPath.length > 1 ? currentIndex / (simulationPath.length - 1) : 1;
    const remainingTravelSeconds = Math.max(0, travelDuration * (1 - progressRatio));
    let remainingDwell = 0;
    const now = Date.now();
    stopScheduleRef.current.forEach((stop) => {
      if (stop.index < currentIndex) {
        return;
      }
      if (stop.index === currentIndex && pauseUntilRef.current) {
        remainingDwell += Math.max(0, Math.floor((pauseUntilRef.current - now) / 1000));
        return;
      }
      remainingDwell += stop.dwellSeconds;
    });
    return Math.ceil(remainingTravelSeconds) + remainingDwell;
  }, [simulationPath, currentIndex, pauseUntil, routeDurationSeconds]);

  useEffect(() => {
    if (followBus && mapRef.current && currentLocation) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: zoomDelta.latitudeDelta,
          longitudeDelta: zoomDelta.longitudeDelta,
        },
        400
      );
    }
  }, [currentLocation, followBus, zoomDelta]);

  useEffect(() => {
    if (routePolyline.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(routePolyline, {
        edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
        animated: true,
      });
    }
  }, [routePolyline]);

  useEffect(() => {
    let isMounted = true;
    const loadBuses = async () => {
      if (role === 'admin') return listBuses();
      if (role === 'parent' && profile?.id) return listBusesForParent(profile.id);
      if ((role === 'driver' || role === 'attendant') && profile?.id) {
        if (profile.assignedBusId) {
          try {
            const assignedBus = await getBus(profile.assignedBusId);
            if (assignedBus) return [assignedBus];
          } catch {
            // Fall back to the current assignment queries if this profile is stale.
          }
        }
        return listBusesForSchoolStaff(profile.id);
      }
      return [];
    };

    loadBuses()
      .then((items) => {
        if (!isMounted) {
          return;
        }
        setBuses(items);
        const firstBus = items[0];
        setSelectedBusId(firstBus?.id ?? null);
        setDriverDraft(firstBus?.driverName ?? '');
      })
      .catch((error) => {
        const isPermissionError =
          typeof error === 'object' &&
          error !== null &&
          'code' in (error as { code?: string }) &&
          (error as { code?: string }).code === 'permission-denied';

        const message = isPermissionError
          ? 'Missing Firestore read permission for the assigned bus.'
          : 'Failed to load buses';
        console.warn(message, error);

        if (isMounted) {
          setBuses([]);
          setSelectedBusId(null);
          setDriverDraft('');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [role, profile?.id, profile?.assignedBusId]);

  useEffect(() => {
    if (!selectedBusId) {
      return;
    }

    setTrailCoords([]);

    const bus = buses.find((item) => item.id === selectedBusId);
    setDriverDraft(bus?.driverName ?? '');

    let unsubscribe: (() => void) | undefined;

    unsubscribe = subscribeToLiveLocation(selectedBusId, (location) => {
      setLiveLocation(location);
    });

    const applyRoute = (nextRoute: Route) => {
      setRoute(nextRoute);
      setRouteStops(nextRoute.stops);
      setRoutePolyline(
        nextRoute.stops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude }))
      );
      stopScheduleRef.current = [];
    };

    if (bus?.routeId) {
      getRoute(bus.routeId)
        .then((routeDoc) => {
          if (routeDoc) {
            applyRoute(routeDoc);
          } else {
            applyRoute(ROUTE_PLACEHOLDER);
          }
        })
        .catch((error) => {
          console.warn('Route load failed.', error);
          applyRoute(ROUTE_PLACEHOLDER);
        });
    } else {
      applyRoute(ROUTE_PLACEHOLDER);
    }

    return () => {
      unsubscribe?.();
    };
  }, [selectedBusId, buses, role, profile?.assignedBusId]);

  useEffect(() => {
    return () => {
      if (simulationTimer.current) {
        clearTimeout(simulationTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!liveLocation) {
      return;
    }
    setTrailCoords((prev) => {
      if (!prev.length) {
        return [{ latitude: liveLocation.latitude, longitude: liveLocation.longitude }];
      }
      const last = prev[prev.length - 1];
      const next = { latitude: liveLocation.latitude, longitude: liveLocation.longitude };
      const distanceMeters = haversineDistanceMeters(last, next);
      if (distanceMeters < 10) {
        return prev;
      }
      return [...prev, next];
    });
  }, [liveLocation, selectedBusId]);

  useEffect(() => {
    if (isSimulatingRef.current) {
      return;
    }
    busCoordinate.current.setValue({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    });
  }, [currentLocation.latitude, currentLocation.longitude]);

  const handleSelectBus = (busId: string) => {
    setSelectedBusId(busId);
    setIsEditingDriver(false);
    setTrailCoords([]);
    setStartCoord(null);
    setEndCoord(null);
    setCurrentStop(null);
    setPauseUntil(null);
    pauseUntilRef.current = null;
  };

  const geocodeAddress = async (query: string): Promise<Coordinate> => {
    const trimmed = query.trim();
    const match = trimmed.match(
      /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i
    );
    if (match) {
      return { latitude: Number(match[1]), longitude: Number(match[2]) };
    }
    const results = await searchOpenMapPlaces(trimmed, 1);
    if (!results.length) throw new Error('No results');
    return { latitude: results[0].latitude, longitude: results[0].longitude };
  };

  const fallbackLookup = (query: string): Coordinate | null => {
    const lower = query.toLowerCase();
    if (lower.includes('carlton gate')) {
      return { latitude: 6.4428, longitude: 3.5284 };
    }
    if (lower.includes('ikorodu')) {
      return { latitude: 6.6194, longitude: 3.5105 };
    }
    if (lower.includes('banana island')) {
      return { latitude: 6.4654, longitude: 3.4441 };
    }
    if (lower.includes('akute')) {
      return { latitude: 6.6891, longitude: 3.3718 };
    }
    return null;
  };

  const fetchRoutePolyline = async (
    start: Coordinate,
    end: Coordinate
  ): Promise<{ polyline: Coordinate[]; durationSeconds: number | null }> => {
    console.log('Route request', { start, end });
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Route request failed');
    }
    let data: any;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('Route response invalid');
    }
    const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates ?? [];
    const durationSeconds = typeof data?.routes?.[0]?.duration === 'number'
      ? data.routes[0].duration
      : null;
    console.log('Route points', coords.length);
    if (!coords.length) {
      throw new Error('Route not found');
    }
    // Keep more points to follow road curves accurately
    // Target: keep 300-400 points for smooth road-following animation
    const targetPoints = 350;
    const step = Math.max(1, Math.floor(coords.length / targetPoints));
    const polyline = coords
      .filter((_, index) => index % step === 0)
      .map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
    return { polyline, durationSeconds };
  };

  const buildStopSchedule = (polyline: Coordinate[]) => {
    if (polyline.length < 2) {
      stopScheduleRef.current = [];
      return [];
    }
    const stopCount = Math.min(10, Math.max(5, Math.floor(polyline.length / 12)));
    const interval = Math.floor(polyline.length / (stopCount + 1));
    const stops: RouteStop[] = [];
    const schedule: { index: number; stop: RouteStop; dwellSeconds: number }[] = [];
    for (let i = 1; i <= stopCount; i += 1) {
      const index = Math.min(polyline.length - 1, i * interval);
      const coord = polyline[index];
      const dwellSeconds = 60 + ((index * 37) % 241);
      const stop: RouteStop = {
        id: `stop-${i}`,
        name: `Stop ${i}`,
        latitude: coord.latitude,
        longitude: coord.longitude,
        order: i,
      };
      stops.push(stop);
      schedule.push({ index, stop, dwellSeconds });
    }
    stopScheduleRef.current = schedule;
    return stops;
  };

  const handleBuildTypedRoute = async () => {
    if (!startQuery.trim() || !endQuery.trim()) {
      Alert.alert('Missing locations', 'Enter both start and destination addresses.');
      return;
    }
    setIsGeocoding(true);
    setIsRouting(true);
    try {
      const [start, end] = await Promise.all([
        geocodeAddress(startQuery.trim()).catch(() => {
          const fallback = fallbackLookup(startQuery);
          if (!fallback) throw new Error('Start not found');
          return fallback;
        }),
        geocodeAddress(endQuery.trim()).catch(() => {
          const fallback = fallbackLookup(endQuery);
          if (!fallback) throw new Error('End not found');
          return fallback;
        }),
      ]);
      setStartCoord(start);
      setEndCoord(end);
      const { polyline, durationSeconds } = await fetchRoutePolyline(start, end);
      const stops = buildStopSchedule(polyline);
      setRoute({
        id: 'typed-route',
        name: `${startQuery.trim()} to ${endQuery.trim()}`,
        stops,
      });
      setRouteStops(stops);
      setRoutePolyline(polyline);
      setRouteDurationSeconds(durationSeconds);
      setTrailCoords([]);
      setCurrentStop(null);
      setPauseUntil(null);
      pauseUntilRef.current = null;
      visitedStopsRef.current = new Set();
    } catch (error) {
      console.warn('Route lookup failed', error);
      Alert.alert('Route failed', 'Unable to build a route for those locations.');
    } finally {
      setIsGeocoding(false);
      setIsRouting(false);
    }
  };

  const handleDestinationSelect = async (place: PlaceResult) => {
    const destination = { latitude: place.latitude, longitude: place.longitude };
    setDestinationSearch(place.address);
    setEndQuery(place.address);
    setEndCoord(destination);
    setFollowBus(false);
    try {
      const { polyline, durationSeconds } = await fetchRoutePolyline(currentLocation, destination);
      setRoutePolyline(polyline);
      setRouteDurationSeconds(durationSeconds);
      if (mapRef.current) mapRef.current.fitToCoordinates([currentLocation, destination], {
        edgePadding: { top: 100, right: 60, bottom: 130, left: 60 }, animated: true,
      });
    } catch (error) {
      console.warn('Could not calculate destination route', error);
      setRoutePolyline([currentLocation, destination]);
    }
  };

  const publishSafetyPosition = async (position: Location.LocationObject) => {
    if (!safetyTripId) throw new Error('Sign in before sharing your trip location.');
    setSafetyLocation(position);
    const { speed, heading, accuracy } = position.coords;
    await set(ref(realtimeDb, `activeTravelTrips/${safetyTripId}`), {
      tripId: safetyTripId, userId: safetyTripId, active: true,
      latitude: position.coords.latitude, longitude: position.coords.longitude,
      ...(typeof speed === 'number' && speed >= 0 ? { speed } : {}),
      ...(typeof heading === 'number' && heading >= 0 && heading <= 360 ? { heading } : {}),
      ...(typeof accuracy === 'number' && accuracy >= 0 ? { accuracy } : {}),
      timestamp: position.timestamp,
      ...(endCoord ? { destination: { ...endCoord, address: endQuery } } : {}),
    });
  };
  const startSafetyTracking = async () => {
    try {
      if (!safetyTripId) throw new Error('Sign in before sharing your trip location.');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setLocationDenied(true); return; }
      setLocationDenied(false);
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await publishSafetyPosition(initial);
      safetyWatcher.current = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000,
      }, (position) => { void publishSafetyPosition(position).catch((error) => console.warn('Could not publish safety location', error)); });
      setSafetyTracking(true);
      Alert.alert('Safety tracking started', 'Your live location is now being shared for this trip.');
    } catch (error) { Alert.alert('Tracking unavailable', error instanceof Error ? error.message : 'Unable to start location tracking.'); }
  };
  const stopSafetyTracking = async () => {
    safetyWatcher.current?.remove(); safetyWatcher.current = null; setSafetyTracking(false);
    if (!safetyTripId) return;
    try { await update(ref(realtimeDb, `activeTravelTrips/${safetyTripId}`), { active: false, stoppedAt: Date.now() }); }
    catch (error) { console.warn('Could not mark safety trip stopped', error); }
  };
  const refreshSafetyLocation = async () => {
    setSafetyRefreshing(true);
    try {
      if (!safetyTripId) throw new Error('Sign in before refreshing trip location.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setSafetyLocation(position);
      const snapshot = await get(ref(realtimeDb, `activeTravelTrips/${safetyTripId}`));
      if (safetyTracking) await publishSafetyPosition(position);
      Alert.alert('Location refreshed', `GPS ±${Math.round(position.coords.accuracy ?? 0)}m${snapshot.exists() ? ' · trip data synced' : ''}`);
    } catch (error) { Alert.alert('Refresh failed', error instanceof Error ? error.message : 'Could not refresh GPS.'); }
    finally { setSafetyRefreshing(false); }
  };
  useEffect(() => () => { safetyWatcher.current?.remove(); }, []);
  const sendSos = () => Alert.alert('Emergency alert', 'Send an SOS alert to your trip contacts?', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Send SOS', style: 'destructive', onPress: () => {
      if (!safetyTripId) {
        Alert.alert('Sign in required', 'Sign in before sending an emergency alert.');
        return;
      }
      const coordinates = safetyLocation ? {
        latitude: safetyLocation.coords.latitude,
        longitude: safetyLocation.coords.longitude,
      } : {};
      void set(ref(realtimeDb, `activeTravelTrips/${safetyTripId}/sos`), {
        active: true,
        timestamp: Date.now(),
        ...coordinates,
      }).then(() => Alert.alert('SOS sent', 'Your trip alert was recorded.')).catch(() => Alert.alert('SOS unavailable', 'The alert could not be recorded.'));
    } },
  ]);

  const handleResetToFallback = () => {
    setRoute(ROUTE_PLACEHOLDER);
    setRouteStops([]);
    setRoutePolyline([]);
    setRouteDurationSeconds(null);
    stopScheduleRef.current = [];
    setTrailCoords([]);
    setStartCoord(null);
    setEndCoord(null);
    setCurrentStop(null);
    setPauseUntil(null);
    pauseUntilRef.current = null;
  };

  const nextStopInfo = useMemo(() => {
    const upcoming = stopScheduleRef.current.find((stop) => stop.index >= currentIndex);
    return upcoming?.stop ?? null;
  }, [currentIndex]);

  const handleSaveDriverName = async () => {
    if (!selectedBusId) {
      return;
    }
    try {
      await updateBusDriver(selectedBusId, { driverName: driverDraft });
      Alert.alert('Driver updated', 'Parents will now see the new driver name.');
      setIsEditingDriver(false);
      setBuses((prev) =>
        prev.map((bus) => (bus.id === selectedBusId ? { ...bus, driverName: driverDraft } : bus))
      );
    } catch (error) {
      console.error('Driver update failed', error);
      Alert.alert('Update failed', 'We could not update the driver name.');
    }
  };

  const zoomMap = (factor: number) => {
    const nextLatitudeDelta = Math.min(0.2, Math.max(0.005, zoomDelta.latitudeDelta * factor));
    const nextLongitudeDelta = Math.min(0.2, Math.max(0.005, zoomDelta.longitudeDelta * factor));
    setZoomDelta({ latitudeDelta: nextLatitudeDelta, longitudeDelta: nextLongitudeDelta });
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: nextLatitudeDelta,
          longitudeDelta: nextLongitudeDelta,
        },
        200
      );
    }
  };

  const handleRefresh = async () => {
    if (!selectedBusId) return;

    setIsRefreshing(true);
    try {
      // Reload live location
      const unsubscribe = subscribeToLiveLocation(selectedBusId, (location) => {
        if (location) {
          setLiveLocation(location);
          setCurrentSpeed(location.speed ?? null);
        }
        unsubscribe?.();
      });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.mapCard, { borderColor: palette.cardBorder }]}>
            <SkeletonBlock height={260} width="100%" />
          </View>
          <View style={[styles.infoCard, { backgroundColor: palette.cardBg }]}>
            <SkeletonBlock height={20} width="70%" />
            <SkeletonBlock height={16} width="60%" />
            <SkeletonBlock height={16} width="80%" />
            <SkeletonBlock height={16} width="55%" />
            <SkeletonBlock height={44} width="100%" />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const requiresAssignment = role === 'driver' || role === 'attendant';
  if (requiresAssignment && !buses.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
        <ScrollView style={[styles.screen, { backgroundColor: palette.screenBg }]} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={[styles.infoCard, { backgroundColor: palette.cardBg }]}>
            <Text style={[styles.infoTitle, { color: palette.textStrong }]}>No bus assigned</Text>
            <Text style={[styles.infoText, { color: palette.textMuted }]}>
              Ask an admin to assign a bus/route to your profile. Tracking is hidden until then.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const renderMapView = (style: StyleProp<ViewStyle>) => {
    if (!USE_GOOGLE_MAPS && FreeMap) {
      const points = [
        ...(startCoord ? [{ id: 'start', coordinate: startCoord, title: 'Start', color: '#16a34a' }] : []),
        ...(endCoord ? [{ id: 'destination', coordinate: endCoord, title: 'Destination', color: '#dc2626' }] : []),
        ...routePoints.map((stop) => ({
          id: stop.id,
          coordinate: { latitude: stop.latitude, longitude: stop.longitude },
          title: stop.name,
          color: '#d97706',
        })),
        ...(liveLocation ? [{
          id: 'live-bus',
          coordinate: { latitude: liveLocation.latitude, longitude: liveLocation.longitude },
          title: selectedBus?.nickname ?? 'Bus',
          color: isStale ? '#64748b' : '#1d4ed8',
        }] : []),
      ];
      return (
        <FreeMap
          ref={mapRef}
          style={style}
          center={currentLocation}
          zoomDelta={zoomDelta.longitudeDelta}
          points={points}
          lines={[
            { id: 'route', coordinates: routePolyline, color: '#93c5fd', width: 5 },
            { id: 'live-trail', coordinates: trailCoords, color: '#2563eb', width: 6 },
          ]}
          onPanDrag={() => setFollowBus(false)}
          onMapReady={() => {
            if (routePolyline.length > 1) {
              mapRef.current?.fitToCoordinates(routePolyline, {
                edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
                animated: false,
              });
            }
          }}
        />
      );
    }

    if (USE_GOOGLE_MAPS ? !MapView : !FreeMap) {
      return (
        <View style={[style, { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <MaterialIcons name="location-on" size={48} color="#2563eb" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8, textAlign: 'center' }}>
            Map renderer unavailable
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
            Install a native development build with the configured map provider, then reopen tracking.
          </Text>
        </View>
      );
    }
    
    return (
      <MapView
        ref={mapRef}
        style={style}
        onMapReady={() => {
          if (routePolyline.length > 1) {
            mapRef.current?.fitToCoordinates(routePolyline, {
              edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
              animated: false,
            });
          } else {
            mapRef.current?.animateToRegion({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: zoomDelta.latitudeDelta,
              longitudeDelta: zoomDelta.longitudeDelta,
            }, 0);
          }
        }}
        onPanDrag={() => setFollowBus(false)}
        provider={(Platform.OS === 'ios'
          ? GOOGLE_MAPS_IOS_API_KEY || GOOGLE_MAPS_LEGACY_API_KEY
          : GOOGLE_MAPS_ANDROID_API_KEY || GOOGLE_MAPS_LEGACY_API_KEY)
          ? GoogleMapsProvider
          : undefined}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: zoomDelta.latitudeDelta,
          longitudeDelta: zoomDelta.longitudeDelta,
        }}>
        {routePolyline.length > 1 ? (
          <Polyline coordinates={routePolyline} strokeWidth={5} strokeColor="#93c5fd" />
        ) : null}
        {trailCoords.length > 1 ? (
          <Polyline coordinates={trailCoords} strokeWidth={6} strokeColor="#2563eb" />
        ) : null}
        {endCoord ? (
          <Marker
            coordinate={endCoord}
            title="Selected destination"
            pinColor="#ef4444"
          />
        ) : null}
        {startCoord ? (
          <Marker
            coordinate={startCoord}
            title="Selected start"
            pinColor="#22c55e"
          />
        ) : null}
        {routePoints.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.name}
            pinColor="#f59e0b"
          />
        ))}
        {startCoord ? (
          <Marker coordinate={startCoord} title="Start" pinColor="#22c55e" />
        ) : null}
        {endCoord ? (
          <Marker coordinate={endCoord} title="Destination" pinColor="#ef4444" />
        ) : null}
        {liveLocation ? (
          <MarkerAnimated
            coordinate={busCoordinate.current as unknown as LatLngCoord}
            title="Bus location"
            description={selectedBus?.nickname}
            rotation={liveLocation.heading ?? 0}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.busMarker, isStale && styles.busMarkerStale]}>
              <MaterialIcons name="directions-bus" size={22} color="#fff" />
            </View>
          </MarkerAnimated>
        ) : null}
      </MapView>
    );
  };

  const renderMapControls = (isFullscreen: boolean) => (
    <View style={[styles.mapControls, isFullscreen ? styles.fullscreenControls : null]}>
      <Pressable
        style={[styles.controlButton, { backgroundColor: palette.controlBg, borderColor: palette.controlBorder }]}
        onPress={() => zoomMap(0.8)}
        accessibilityRole="button"
        accessibilityLabel="Zoom in"
        hitSlop={8}>
        <Text style={[styles.controlText, { color: palette.textStrong }]}>+</Text>
      </Pressable>
      <Pressable
        style={[styles.controlButton, { backgroundColor: palette.controlBg, borderColor: palette.controlBorder }]}
        onPress={() => zoomMap(1.2)}
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
        hitSlop={8}>
        <Text style={[styles.controlText, { color: palette.textStrong }]}>-</Text>
      </Pressable>
      <Pressable
        style={[styles.controlButton, { backgroundColor: palette.controlBg, borderColor: palette.controlBorder }]}
        onPress={handleRefresh}
        disabled={isRefreshing}
        accessibilityRole="button"
        accessibilityLabel="Refresh bus location"
        hitSlop={8}>
        <MaterialIcons
          name="refresh"
          size={18}
          color={isRefreshing ? palette.textMuted : palette.textStrong}
        />
      </Pressable>
      <Pressable
        style={[
          styles.controlButton,
          followBus ? styles.controlButtonActive : undefined,
          { backgroundColor: palette.controlBg, borderColor: palette.controlBorder },
        ]}
        onPress={() => setFollowBus((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={followBus ? 'Disable follow bus' : 'Enable follow bus'}
        hitSlop={8}>
        <MaterialIcons
          name="my-location"
          size={18}
          color={followBus ? '#1d4ed8' : palette.textStrong}
        />
      </Pressable>
      <Pressable
        style={[styles.controlButton, { backgroundColor: palette.controlBg, borderColor: palette.controlBorder }]}
        onPress={() => setIsMapFullscreen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={isFullscreen ? 'Exit full screen map' : 'Open full screen map'}
        hitSlop={8}>
        <MaterialIcons
          name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
          size={18}
          color={palette.textStrong}
        />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <Modal
        visible={isMapFullscreen}
        animationType="fade"
        onRequestClose={() => setIsMapFullscreen(false)}>
        <SafeAreaView style={styles.fullscreenContainer}>
          {renderMapView(styles.fullscreenMap)}
          <View style={[styles.routeLabels, styles.fullscreenLabels, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <View style={styles.routeLabelRow}>
              <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
              <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
                Start: {startCoord ? startQuery.trim() || 'Selected' : 'Default'}
              </Text>
            </View>
            <View style={styles.routeLabelRow}>
              <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
                End: {endCoord ? endQuery.trim() || 'Selected' : 'Default'}
              </Text>
            </View>
            <View style={styles.routeLabelRow}>
              <View style={[styles.routeDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
                Next: {nextStopInfo?.name ?? '—'}
              </Text>
            </View>
          </View>
          <View style={[styles.mapLegend, styles.fullscreenLegend, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#93c5fd' }]} />
              <Text style={[styles.legendText, { color: palette.textMuted }]}>Route</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
              <Text style={[styles.legendText, { color: palette.textMuted }]}>Live trail</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#1d4ed8' }]} />
              <Text style={[styles.legendText, { color: palette.textMuted }]}>Bus</Text>
            </View>
          </View>
          {renderMapControls(true)}
        </SafeAreaView>
      </Modal>
      <SettingsButton />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView
          style={[styles.screen, { backgroundColor: palette.screenBg }]}
          contentContainerStyle={{ paddingTop: 72, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled">
        <View style={[styles.banner, { backgroundColor: palette.bannerBg }]}>
          <Text style={[styles.bannerText, { color: palette.bannerText }]}>
            {liveLocation
              ? isStale ? 'Bus location is delayed. Check the last update below.' : 'Showing the latest bus location.'
              : 'Waiting for the driver to share a bus location.'}
          </Text>
        </View>

      <View style={styles.selectorSection}>
        <Text style={[styles.sectionLabel, { color: palette.textStrong }]}>Select Bus:</Text>
        <View style={styles.busButtonRow}>
          {buses.map((bus) => {
            const isActive = bus.id === selectedBusId;
            return (
              <Pressable
                key={bus.id}
                style={[
                  styles.busButton,
                  isActive ? styles.busButtonActive : styles.busButtonInactive,
                  { backgroundColor: isActive ? theme.tint : theme.surfaceMuted, borderColor: isActive ? theme.tint : theme.border },
                ]}
                onPress={() => handleSelectBus(bus.id)}>
                <Text
                  style={[
                    styles.busButtonText,
                    isActive ? styles.busButtonTextActive : { color: palette.textStrong },
                  ]}>
                  {bus.nickname || `Bus ${bus.id.slice(0, 5).toUpperCase()}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ zIndex: 12, marginBottom: 12 }}>
        <LocationAutocomplete placeholder="Search destination or location" value={destinationSearch}
          onChangeText={setDestinationSearch} onSelect={handleDestinationSelect} />
      </View>
      <View style={[styles.mapCard, { borderColor: palette.cardBorder }]}>
        {isMapFullscreen ? (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>Map is open in full screen</Text>
          </View>
        ) : (
          renderMapView(styles.map)
        )}
        <View style={[styles.routeLabels, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={styles.routeLabelRow}>
            <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
              Start: {startCoord ? startQuery.trim() || 'Selected' : 'Default'}
            </Text>
          </View>
          <View style={styles.routeLabelRow}>
            <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
              End: {endCoord ? endQuery.trim() || 'Selected' : 'Default'}
            </Text>
          </View>
          <View style={styles.routeLabelRow}>
            <View style={[styles.routeDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
              Next: {nextStopInfo?.name ?? '—'}
            </Text>
          </View>
        </View>
        <View style={[styles.mapLegend, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#93c5fd' }]} />
            <Text style={[styles.legendText, { color: palette.textMuted }]}>Route</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
            <Text style={[styles.legendText, { color: palette.textMuted }]}>Live trail</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#1d4ed8' }]} />
            <Text style={[styles.legendText, { color: palette.textMuted }]}>Bus</Text>
          </View>
        </View>
        {isMapFullscreen ? null : renderMapControls(false)}
      </View>

      <View style={[styles.infoCard, { backgroundColor: palette.cardBg }]}>
        <Text style={[styles.infoTitle, { color: palette.textStrong }]}>
          {selectedBus?.nickname ?? 'Austangel Bus'} - {route?.name ?? 'Route'}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            {liveLocation ? 'Live bus GPS received' : 'Waiting for bus GPS'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⚡</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            Speed: {liveLocation?.speed == null ? '—' : `${Math.round(liveLocation.speed)} km/h`}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🚌</Text>
          {role === 'admin' && isEditingDriver ? (
            <View style={styles.editRow}>
              <TextInput
                value={driverDraft}
                onChangeText={setDriverDraft}
                style={[
                  styles.driverInput,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    color: palette.textStrong,
                  },
                ]}
                placeholder="Driver name"
                placeholderTextColor={palette.textSubtle}
              />
              <Pressable onPress={handleSaveDriverName} style={[styles.saveButton, { backgroundColor: theme.tint }]}>
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.infoText, { color: palette.textMuted }]}>
              Driver: {selectedBus?.driverName ?? 'Assign driver'}
              {role === 'admin' ? (
                <Text style={[styles.editLink, { color: theme.tint }]} onPress={() => setIsEditingDriver(true)}>
                  {' '}
                  (Edit)
                </Text>
              ) : null}
            </Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            {routePoints.length ? `Assigned route has ${routePoints.length} stops` : 'No assigned route stops'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🛣️</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            Last update: {lastUpdatedAt ? formatAge(lastUpdatedAt) : 'Waiting for first location…'}{' '}
            {isStale ? '(stale)' : ''}
          </Text>
        </View>

        <View style={[styles.routeForm, { borderColor: palette.cardBorder }]}>
          <Pressable
            style={styles.routePlannerHeader}
            onPress={() => setIsRoutePlannerExpanded((expanded) => !expanded)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isRoutePlannerExpanded }}
            accessibilityLabel={isRoutePlannerExpanded ? 'Hide route planner' : 'Show route planner'}>
            <View style={styles.routePlannerHeading}>
              <View style={[styles.routePlannerIcon, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
                <MaterialIcons name="alt-route" size={20} color={theme.tint} />
              </View>
              <View style={styles.routePlannerTitleGroup}>
                <Text style={[styles.routePlannerTitle, { color: palette.textStrong }]}>Plan a route</Text>
                <Text style={[styles.routePlannerSubtitle, { color: palette.textSubtle }]} numberOfLines={1}>
                  {routePolyline.length > 1 ? `${routePolyline.length} route points · ${startQuery} to ${endQuery}` : 'Choose a start and destination'}
                </Text>
              </View>
            </View>
            <MaterialIcons name={isRoutePlannerExpanded ? 'expand-less' : 'expand-more'} size={24} color={palette.textSubtle} />
          </Pressable>
          {isRoutePlannerExpanded ? <View style={styles.routePlannerBody}>
          <TextInput
            value={startQuery}
            onChangeText={setStartQuery}
            placeholder="Start address"
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.inputBorder,
                color: palette.textStrong,
              },
            ]}
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            value={endQuery}
            onChangeText={setEndQuery}
            placeholder="Destination address"
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.inputBorder,
                color: palette.textStrong,
              },
            ]}
            placeholderTextColor={palette.textSubtle}
          />
          <Pressable
            style={[
              styles.secondaryButton,
              { backgroundColor: isDark ? '#1f2937' : '#e2e8f0' },
              isGeocoding ? styles.primaryButtonDisabled : undefined,
            ]}
            onPress={handleBuildTypedRoute}
            disabled={isGeocoding}
          >
            <View style={styles.routeButtonContent}>
              <MaterialIcons
                name={routePolyline.length ? 'check-circle' : 'alt-route'}
                size={18}
                color={routePolyline.length ? '#16a34a' : palette.textStrong}
              />
              <Text style={[styles.secondaryButtonText, { color: palette.textStrong }]}>
                {isGeocoding ? 'Finding route…' : routePolyline.length ? 'Route ready' : 'Build route'}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.ghostButton} onPress={handleResetToFallback}>
            <Text style={[styles.ghostButtonText, { color: palette.ghostText }]}>
              {routePolyline.length ? 'Clear route' : 'Reset to default route'}
            </Text>
          </Pressable>
          </View> : null}
        </View>
        {isRouting ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🧭</Text>
            <Text style={[styles.infoText, { color: palette.textMuted }]}>
              Fetching route from selected location…
            </Text>
          </View>
        ) : null}

        {role === 'driver' ? <Text style={[styles.infoText, { color: palette.textMuted }]}>Use the Driver tab to start a trip; it shares the device’s live GPS instead of simulating a route.</Text> : null}
      </View>
      <View style={[styles.safetyCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
        <View style={styles.safetyHeader}>
          <View style={[styles.statusDot, { backgroundColor: safetyTracking ? '#16a34a' : '#d97706' }]} />
          <Text style={[styles.safetyStatus, { color: palette.textStrong }]}>{safetyTracking ? 'LIVE TRACKING' : 'TRACKING PAUSED'}</Text>
          <Text style={[styles.accuracy, { color: palette.textMuted }]}>{safetyLocation?.coords.accuracy != null ? `±${Math.round(safetyLocation.coords.accuracy)}m` : 'GPS accuracy unavailable'}</Text>
        </View>
        {locationDenied ? <View style={styles.permissionBanner}><Text style={styles.permissionText}>Location permission is needed to share your trip location.</Text><Pressable onPress={() => void Linking.openSettings()}><Text style={styles.settingsLink}>Open Settings</Text></Pressable></View> : null}
        <Pressable style={[styles.safetyPrimary, { backgroundColor: safetyTracking ? '#dc2626' : '#16a34a' }]} onPress={() => void (safetyTracking ? stopSafetyTracking() : startSafetyTracking())}>
          <MaterialIcons name={safetyTracking ? 'stop' : 'my-location'} size={20} color="#fff" />
          <Text style={styles.safetyPrimaryText}>{safetyTracking ? 'Stop Tracking' : 'Start Safety Tracking'}</Text>
        </Pressable>
        <View style={styles.safetyActions}>
          <Pressable style={styles.safetyAction} onPress={() => void refreshSafetyLocation()} disabled={safetyRefreshing}>
            {safetyRefreshing ? <ActivityIndicator color="#2563eb" /> : <MaterialIcons name="refresh" size={19} color="#2563eb" />}
            <Text style={styles.safetyActionText}>{safetyRefreshing ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
          <Pressable style={styles.safetyAction} onPress={() => void Share.share({ message: `Follow my Austangel trip: ${safetyTripId}` })}>
            <MaterialIcons name="share" size={19} color="#2563eb" /><Text style={styles.safetyActionText}>Share Live Trip</Text>
          </Pressable>
          <Pressable style={[styles.safetyAction, styles.sosAction]} onPress={sendSos}>
            <MaterialIcons name="emergency" size={19} color="#b91c1c" /><Text style={[styles.safetyActionText, { color: '#b91c1c' }]}>SOS</Text>
          </Pressable>
        </View>
        <Text style={[styles.safetyUpdated, { color: palette.textMuted }]}>
          {safetyLocation ? `Updated ${new Date(safetyLocation.timestamp).toLocaleTimeString()}` : 'Location has not been refreshed'}
          {endCoord ? ` · Destination: ${endQuery}` : ''}
        </Text>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatAge(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function SkeletonBlock({
  height,
  width,
  radius = 12,
}: {
  height: number;
  width: DimensionValue;
  radius?: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';
  const fill = isDark ? '#1f2937' : '#e5e7eb';
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: radius, backgroundColor: fill }]} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  screen: {
    width: '100%',
    maxWidth: Layout.pageWidth,
    alignSelf: 'center',
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#475569',
  },
  banner: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginTop: 18,
    marginBottom: 16,
  },
  bannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectorSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  busButtonRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  busButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busButtonActive: {
    backgroundColor: '#2563eb',
  },
  busButtonInactive: {
    backgroundColor: '#e2e8f0',
  },
  busButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  busButtonTextActive: {
    color: '#fff',
  },
  busMarker: {
    backgroundColor: '#1d4ed8',
    padding: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#e0f2fe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  busMarkerStale: {
    backgroundColor: '#9ca3af',
    borderColor: '#e5e7eb',
  },
  mapCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 20,
    height: 260,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  fullscreenMap: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
  },
  mapPlaceholderText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  fullscreenControls: {
    top: 18,
    right: 16,
  },
  controlButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  controlButtonActive: {
    borderColor: '#1d4ed8',
    backgroundColor: '#e0f2fe',
  },
  controlText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapLegend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fullscreenLegend: {
    bottom: 20,
  },
  routeLabels: {
    position: 'absolute',
    left: 12,
    top: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  routeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  routeLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fullscreenLabels: {
    top: 20,
  },
  fullscreenNextButton: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 90,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  fullscreenNextButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  routeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ghostButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  ghostButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  routeForm: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  routePlannerHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  routePlannerHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  routePlannerIcon: {
    height: 40,
    width: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePlannerTitleGroup: {
    flex: 1,
    gap: 3,
  },
  routePlannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  routePlannerSubtitle: {
    fontSize: 12,
  },
  routePlannerBody: {
    paddingTop: 10,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    fontSize: 15,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  editLink: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  driverInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  skeletonBlock: {
    backgroundColor: '#e5e7eb',
  },
  demoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  demoSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  demoLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
  demoValue: {
    fontSize: 13,
    textAlign: 'right',
  },
  demoBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  demoBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  demoHint: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  safetyCard: { marginTop: 14, padding: 16, borderWidth: 1, borderRadius: 18, gap: 12 },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  safetyStatus: { fontSize: 14, fontWeight: '700', flex: 1 },
  accuracy: { fontSize: 13, fontWeight: '600' },
  safetyPrimary: { minHeight: 50, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  safetyPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  safetyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safetyAction: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#eff6ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sosAction: { backgroundColor: '#fee2e2' },
  safetyActionText: { color: '#1d4ed8', fontSize: 14, fontWeight: '600' },
  safetyUpdated: { fontSize: 13 },
  permissionBanner: { padding: 12, borderRadius: 10, backgroundColor: '#fef3c7', gap: 6 },
  permissionText: { fontSize: 14, color: '#78350f' },
  settingsLink: { fontSize: 14, color: '#1d4ed8', fontWeight: '700', textDecorationLine: 'underline' },
});
