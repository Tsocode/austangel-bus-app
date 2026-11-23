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
  const [plannedRoutePolyline, setPlannedRoutePolyline] = useState<Coordinate[]>([]);
  const [plannedRouteDurationSeconds, setPlannedRouteDurationSeconds] = useState<number | null>(null);
  const [plannedRouteDistanceMeters, setPlannedRouteDistanceMeters] = useState<number | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startCoord, setStartCoord] = useState<Coordinate | null>(null);
  const [endCoord, setEndCoord] = useState<Coordinate | null>(null);
  const [routePickerVisible, setRoutePickerVisible] = useState(false);
  const [routePickerField, setRoutePickerField] = useState<'start' | 'destination' | null>(null);
  const [routePickerQuery, setRoutePickerQuery] = useState('');
  const [isLocatingRoutePoint, setIsLocatingRoutePoint] = useState(false);
  const [isPickingRoutePoint, setIsPickingRoutePoint] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isRoutePlannerExpanded, setIsRoutePlannerExpanded] = useState(false);
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [pauseUntil, setPauseUntil] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomDelta, setZoomDelta] = useState({ latitudeDelta: 0.03, longitudeDelta: 0.03 });
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showFullscreenStatus, setShowFullscreenStatus] = useState(true);
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
  const scrollViewRef = useRef<any>(null);
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
  const busStatus = liveLocation ? (isStale ? 'GPS signal lost' : 'Bus live') : 'Waiting for GPS';
  const busStatusColor = liveLocation ? (isStale ? '#d97706' : '#16a34a') : '#64748b';
  const routeSummary = route.id === 'planned-route'
      ? 'Route not assigned'
      : routePoints.length ? `${routePoints.length} stops` : 'No stops assigned';

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const etaSeconds = useMemo(() => {
    if (!simulationPath.length) return null;
    const baseDuration = Math.max(1, simulationPath.length * 2.5);
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
  }, [simulationPath, currentIndex, pauseUntil]);

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
    if (plannedRoutePolyline.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(plannedRoutePolyline, {
        edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
        animated: true,
      });
    }
  }, [plannedRoutePolyline]);

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

  const fetchRoutePolyline = async (
    start: Coordinate,
    end: Coordinate
  ): Promise<{ polyline: Coordinate[]; durationSeconds: number | null; distanceMeters: number | null }> => {
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
    const distanceMeters = typeof data?.routes?.[0]?.distance === 'number'
      ? data.routes[0].distance
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
    return { polyline, durationSeconds, distanceMeters };
  };

  const handlePlanRoute = async () => {
    if (!startCoord || !endCoord) {
      Alert.alert('Choose both locations', 'Select a starting point and destination, or use My Current Location.');
      return;
    }
    setIsGeocoding(true);
    setIsRouting(true);
    try {
      const { polyline, durationSeconds, distanceMeters } = await fetchRoutePolyline(startCoord, endCoord);
      setPlannedRoutePolyline(polyline);
      setPlannedRouteDurationSeconds(durationSeconds);
      setPlannedRouteDistanceMeters(distanceMeters);
      setFollowBus(false);
      mapRef.current?.fitToCoordinates(polyline, {
        edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
        animated: true,
      });
    } catch (error) {
      console.warn('Route lookup failed', error);
      Alert.alert('Route failed', 'Unable to build a route for those locations.');
    } finally {
      setIsGeocoding(false);
      setIsRouting(false);
    }
  };

  const handleDestinationSelect = (place: PlaceResult) => {
    const destination = { latitude: place.latitude, longitude: place.longitude };
    setDestinationSearch(place.address);
    setEndQuery(place.address);
    setEndCoord(destination);
    setPlannedRoutePolyline([]);
    setPlannedRouteDurationSeconds(null);
    setPlannedRouteDistanceMeters(null);
    setFollowBus(false);
    mapRef.current?.animateToRegion({ ...destination, ...zoomDelta }, 350);
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

  const handleClearRoutePlan = () => {
    setPlannedRoutePolyline([]);
    setPlannedRouteDurationSeconds(null);
    setPlannedRouteDistanceMeters(null);
    setStartQuery('');
    setEndQuery('');
    setStartCoord(null);
    setEndCoord(null);
    setDestinationSearch('');
  };

  const openRouteLocationPicker = (field: 'start' | 'destination') => {
    setRoutePickerField(field);
    setRoutePickerQuery('');
    setRoutePickerVisible(true);
  };

  const selectRouteLocation = (field: 'start' | 'destination', label: string, coordinate: Coordinate) => {
    if (field === 'start') {
      setStartQuery(label);
      setStartCoord(coordinate);
    } else {
      setEndQuery(label);
      setEndCoord(coordinate);
    }
    setPlannedRoutePolyline([]);
    setPlannedRouteDurationSeconds(null);
    setPlannedRouteDistanceMeters(null);
    setRoutePickerVisible(false);
    setRoutePickerField(null);
    setIsPickingRoutePoint(false);
    setFollowBus(false);
    mapRef.current?.animateToRegion({ ...coordinate, ...zoomDelta }, 350);
  };

  const useDeviceLocationForRoute = async () => {
    if (!routePickerField) return;
    setIsLocatingRoutePoint(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Allow location access to use your current location. You can still search for an address or choose a point on the map.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      selectRouteLocation(routePickerField, 'My Current Location', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Could not get your current location. Search for an address or choose a point on the map.');
    } finally {
      setIsLocatingRoutePoint(false);
    }
  };

  const handleRouteMapPress = (coordinate: Coordinate) => {
    if (!isPickingRoutePoint || !routePickerField) return;
    const label = `Pinned location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
    selectRouteLocation(routePickerField, label, coordinate);
  };

  const selectRouteSearchResult = (place: PlaceResult) => {
    if (!routePickerField) return;
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      Alert.alert('Location unavailable', 'We could not get coordinates for that result. Try another search or choose a point on the map.');
      return;
    }
    selectRouteLocation(routePickerField, place.address || place.title, {
      latitude: place.latitude,
      longitude: place.longitude,
    });
  };

  const chooseRoutePointOnMap = () => {
    if (!routePickerField) return;
    setRoutePickerVisible(false);
    setIsPickingRoutePoint(true);
    requestAnimationFrame(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const swapRouteLocations = () => {
    setStartQuery(endQuery);
    setEndQuery(startQuery);
    setStartCoord(endCoord);
    setEndCoord(startCoord);
    setPlannedRoutePolyline([]);
    setPlannedRouteDurationSeconds(null);
    setPlannedRouteDistanceMeters(null);
  };

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
            { id: 'planned-route', coordinates: plannedRoutePolyline, color: '#f97316', width: 5 },
            { id: 'live-trail', coordinates: trailCoords, color: '#2563eb', width: 6 },
          ]}
          onPanDrag={() => setFollowBus(false)}
          onPress={handleRouteMapPress}
          onMapReady={() => {
            const focusPath = plannedRoutePolyline.length > 1 ? plannedRoutePolyline : routePolyline;
            if (focusPath.length > 1) {
              mapRef.current?.fitToCoordinates(focusPath, {
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
        onPress={(event: any) => handleRouteMapPress(event.nativeEvent.coordinate)}
        onMapReady={() => {
          const focusPath = plannedRoutePolyline.length > 1 ? plannedRoutePolyline : routePolyline;
          if (focusPath.length > 1) {
            mapRef.current?.fitToCoordinates(focusPath, {
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
        {plannedRoutePolyline.length > 1 ? (
          <Polyline coordinates={plannedRoutePolyline} strokeWidth={5} strokeColor="#f97316" lineDashPattern={[12, 6]} />
        ) : null}
        {trailCoords.length > 1 ? (
          <Polyline coordinates={trailCoords} strokeWidth={6} strokeColor="#2563eb" />
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
          {isPickingRoutePoint ? (
            <View style={[styles.mapPickerPrompt, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <Text style={[styles.mapPickerPromptText, { color: palette.textStrong }]}>Tap the map to choose a {routePickerField === 'start' ? 'starting point' : 'destination'}.</Text>
              <Pressable onPress={() => setIsPickingRoutePoint(false)} accessibilityRole="button"><Text style={[styles.mapPickerCancel, { color: theme.tint }]}>Cancel</Text></Pressable>
            </View>
          ) : <View style={[styles.routeLabels, styles.fullscreenLabels, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <View style={styles.routeLabelRow}>
              <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
              <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
                Start: {startCoord ? startQuery.trim() || 'Selected' : 'Not selected'}
              </Text>
            </View>
            <View style={styles.routeLabelRow}>
              <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
                End: {endCoord ? endQuery.trim() || 'Selected' : 'Not selected'}
              </Text>
            </View>
          </View>}
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
            {plannedRoutePolyline.length > 1 ? <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
              <Text style={[styles.legendText, { color: palette.textMuted }]}>Planned route</Text>
            </View> : null}
          </View>
          {!isPickingRoutePoint && showFullscreenStatus ? (
            <View style={[styles.fullscreenStatus, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <View style={styles.fullscreenStatusTop}>
                <View style={[styles.statusDot, { backgroundColor: busStatusColor }]} />
                <Text style={[styles.fullscreenStatusTitle, { color: palette.textStrong }]}>{busStatus}</Text>
                <Pressable onPress={() => setShowFullscreenStatus(false)} accessibilityRole="button" accessibilityLabel="Hide bus status">
                  <MaterialIcons name="close" size={20} color={palette.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.fullscreenStatusDetails, { color: palette.textMuted }]} numberOfLines={1}>
                {selectedBus?.driverName ? `Driver: ${selectedBus.driverName}  ·  ` : ''}
                {liveLocation?.speed != null ? `${Math.round(liveLocation.speed)} km/h  ·  ` : ''}
                {lastUpdatedAt ? `Updated ${formatAge(lastUpdatedAt)}` : 'Awaiting first location'}
              </Text>
            </View>
          ) : !isPickingRoutePoint ? (
            <Pressable style={[styles.showFullscreenStatus, { backgroundColor: palette.cardBg }]} onPress={() => setShowFullscreenStatus(true)} accessibilityRole="button" accessibilityLabel="Show bus status">
              <MaterialIcons name="directions-bus" size={20} color={theme.tint} />
            </Pressable>
          ) : null}
          {renderMapControls(true)}
        </SafeAreaView>
      </Modal>
      <Modal
        visible={routePickerVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          setRoutePickerVisible(false);
          setRoutePickerField(null);
        }}>
        <View style={styles.routePickerModal}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setRoutePickerVisible(false);
              setRoutePickerField(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Close location picker" />
          <KeyboardAvoidingView style={styles.routePickerKeyboard} behavior={Platform.select({ ios: 'padding', android: undefined })}>
            <View style={[styles.routePickerSheet, { backgroundColor: palette.cardBg }]}>
              <View style={styles.routePickerHandle} />
              <View style={styles.routePickerHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.routePickerTitle, { color: palette.textStrong }]}>
                    Choose {routePickerField === 'start' ? 'Starting Point' : 'Destination'}
                  </Text>
                  <Text style={[styles.routePickerSubtitle, { color: palette.textMuted }]}>Search a place or use your location</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setRoutePickerVisible(false);
                    setRoutePickerField(null);
                  }}
                  style={styles.routePickerClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close location picker">
                  <MaterialIcons name="close" size={22} color={palette.textMuted} />
                </Pressable>
              </View>
              <LocationAutocomplete
                label="Search places or addresses"
                placeholder="School, landmark, or address"
                value={routePickerQuery}
                onChangeText={setRoutePickerQuery}
                onSelect={selectRouteSearchResult}
              />
              <Pressable
                style={[styles.locationChoice, { borderColor: palette.cardBorder }]}
                onPress={() => void useDeviceLocationForRoute()}
                disabled={isLocatingRoutePoint}
                accessibilityRole="button"
                accessibilityLabel="Use my current location">
                <View style={[styles.locationChoiceIcon, { backgroundColor: theme.tint }]}>
                  {isLocatingRoutePoint ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="my-location" size={19} color="#fff" />}
                </View>
                <View style={styles.locationChoiceText}>
                  <Text style={[styles.locationChoiceTitle, { color: palette.textStrong }]}>My Current Location</Text>
                  <Text style={[styles.locationChoiceSubtitle, { color: palette.textMuted }]}>Device location requested only when selected</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={palette.textMuted} />
              </Pressable>
              <Pressable
                style={[styles.locationChoice, { borderColor: palette.cardBorder }]}
                onPress={chooseRoutePointOnMap}
                accessibilityRole="button"
                accessibilityLabel="Choose a location on the map">
                <View style={[styles.locationChoiceIcon, { backgroundColor: theme.surfaceMuted }]}>
                  <MaterialIcons name="add-location-alt" size={19} color={theme.tint} />
                </View>
                <View style={styles.locationChoiceText}>
                  <Text style={[styles.locationChoiceTitle, { color: palette.textStrong }]}>Choose on Map</Text>
                  <Text style={[styles.locationChoiceSubtitle, { color: palette.textMuted }]}>Tap the map to place a pin</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={palette.textMuted} />
              </Pressable>
              <Text style={[styles.routePickerFootnote, { color: palette.textMuted }]}>If location permission is denied, search for an address or select a point on the map instead.</Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <SettingsButton />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView
          ref={scrollViewRef}
          style={[styles.screen, { backgroundColor: palette.screenBg }]}
          contentContainerStyle={{ paddingTop: 72, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled">
        <View style={[styles.banner, { backgroundColor: palette.bannerBg }]}>
          <Text style={[styles.bannerText, { color: palette.bannerText }]}>
            {requiresAssignment && !buses.length
              ? 'No bus assigned yet. You can still plan a personal route below.'
              : liveLocation
              ? isStale ? 'Bus location is delayed. Check the last update below.' : 'Showing the latest bus location.'
              : 'Waiting for the driver to share a bus location.'}
          </Text>
        </View>

      {buses.length ? <View style={styles.selectorSection}>
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
      </View> : null}

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
        {isPickingRoutePoint ? (
          <View style={[styles.mapPickerPrompt, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <Text style={[styles.mapPickerPromptText, { color: palette.textStrong }]}>Tap the map to choose a {routePickerField === 'start' ? 'starting point' : 'destination'}.</Text>
            <Pressable onPress={() => setIsPickingRoutePoint(false)} accessibilityRole="button"><Text style={[styles.mapPickerCancel, { color: theme.tint }]}>Cancel</Text></Pressable>
          </View>
        ) : <View style={[styles.routeLabels, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={styles.routeLabelRow}>
            <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
              Start: {startCoord ? startQuery.trim() || 'Selected' : 'Not selected'}
            </Text>
          </View>
          <View style={styles.routeLabelRow}>
            <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.routeLabelText, { color: palette.textMuted }]}>
              End: {endCoord ? endQuery.trim() || 'Selected' : 'Not selected'}
            </Text>
          </View>
        </View>}
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
          {plannedRoutePolyline.length > 1 ? <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={[styles.legendText, { color: palette.textMuted }]}>Planned route</Text>
          </View> : null}
        </View>
        {isMapFullscreen ? null : renderMapControls(false)}
      </View>

      <View style={[styles.infoCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
        <View style={styles.trackingHeader}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.infoTitle, { color: palette.textStrong }]}>Austangel Bus Tracking</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: busStatusColor }]} />
              <Text style={[styles.statusBadgeText, { color: busStatusColor }]}>{busStatus}</Text>
            </View>
          </View>
          {liveLocation?.speed != null ? (
            <View style={styles.speedBadge}>
              <MaterialIcons name="speed" size={17} color={theme.tint} />
              <Text style={[styles.speedBadgeText, { color: palette.textStrong }]}>{Math.round(liveLocation.speed)} km/h</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.trackingGrid}>
          <View style={[styles.trackingMetric, { backgroundColor: palette.screenBg }]}>
            <Text style={[styles.metricLabel, { color: palette.textMuted }]}>Driver</Text>
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
              <Text style={[styles.metricValue, { color: palette.textStrong }]}>
              {selectedBus?.driverName ?? 'Driver not assigned'}
              {role === 'admin' ? (
                <Text style={[styles.editLink, { color: theme.tint }]} onPress={() => setIsEditingDriver(true)}>
                  {' '}
                  (Edit)
                </Text>
              ) : null}
            </Text>
          )}
        </View>
          <View style={[styles.trackingMetric, { backgroundColor: palette.screenBg }]}>
            <Text style={[styles.metricLabel, { color: palette.textMuted }]}>Route</Text>
            <Text style={[styles.metricValue, { color: palette.textStrong }]} numberOfLines={1}>{routeSummary}</Text>
          </View>
          <View style={[styles.trackingMetric, { backgroundColor: palette.screenBg }]}>
            <Text style={[styles.metricLabel, { color: palette.textMuted }]}>Last updated</Text>
            <Text style={[styles.metricValue, { color: palette.textStrong }]}>{lastUpdatedAt ? `${formatAge(lastUpdatedAt)}${isStale ? ' · Stale' : ''}` : 'Awaiting first location'}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.routeForm, styles.routePlannerCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
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
              <Text style={[styles.routePlannerTitle, { color: palette.textStrong }]}>Plan Your Route</Text>
                <Text style={[styles.routePlannerSubtitle, { color: palette.textSubtle }]} numberOfLines={1}>
                  {plannedRoutePolyline.length > 1 ? `${startQuery} to ${endQuery}` : 'Choose your start and destination'}
                </Text>
              </View>
            </View>
            <MaterialIcons name={isRoutePlannerExpanded ? 'expand-less' : 'expand-more'} size={24} color={palette.textSubtle} />
          </Pressable>
          {isRoutePlannerExpanded ? <View style={styles.routePlannerBody}>
          <View style={styles.routeInputGroup}>
            <Text style={[styles.routeInputLabel, { color: palette.textStrong }]}>Starting point</Text>
            <Pressable
              style={[styles.locationField, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
              onPress={() => openRouteLocationPicker('start')}
              accessibilityRole="button"
              accessibilityLabel={`Starting point: ${startQuery || 'Choose a starting point'}`}>
              <MaterialIcons name="my-location" size={19} color={theme.tint} />
              <Text style={[styles.locationFieldText, { color: startQuery ? palette.textStrong : palette.textMuted }]} numberOfLines={1}>{startQuery || 'Choose a starting point'}</Text>
              <MaterialIcons name="search" size={19} color={palette.textMuted} />
            </Pressable>
          </View>
          <Pressable
            style={[styles.swapButton, { borderColor: palette.cardBorder }]}
            onPress={swapRouteLocations}
            disabled={isGeocoding}
            accessibilityRole="button"
            accessibilityLabel="Swap starting point and destination">
            <MaterialIcons name="swap-vert" size={18} color={theme.tint} />
            <Text style={[styles.swapButtonText, { color: theme.tint }]}>Swap Locations</Text>
          </Pressable>
          <View style={styles.routeInputGroup}>
            <Text style={[styles.routeInputLabel, { color: palette.textStrong }]}>Destination</Text>
            <Pressable
              style={[styles.locationField, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
              onPress={() => openRouteLocationPicker('destination')}
              accessibilityRole="button"
              accessibilityLabel={`Destination: ${endQuery || 'Choose a destination'}`}>
              <MaterialIcons name="place" size={19} color="#dc2626" />
              <Text style={[styles.locationFieldText, { color: endQuery ? palette.textStrong : palette.textMuted }]} numberOfLines={1}>{endQuery || 'Search for an address'}</Text>
              <MaterialIcons name="search" size={19} color={palette.textMuted} />
            </Pressable>
          </View>
          <Pressable
            style={[
              styles.planRouteButton,
              { backgroundColor: isGeocoding ? '#94a3b8' : theme.tint },
              isGeocoding ? styles.primaryButtonDisabled : undefined,
            ]}
            onPress={handlePlanRoute}
            disabled={isGeocoding}
          >
            <View style={styles.routeButtonContent}>
              <MaterialIcons
                name={plannedRoutePolyline.length ? 'check-circle' : 'alt-route'}
                size={18}
                color="#fff"
              />
              <Text style={styles.planRouteButtonText}>
                {isGeocoding ? 'Planning route…' : 'Plan Route'}
              </Text>
            </View>
          </Pressable>
          {plannedRoutePolyline.length > 1 ? (
          <View style={[styles.routeEstimate, { backgroundColor: palette.screenBg, borderColor: palette.cardBorder }]}>
              <View style={styles.routeEstimateMetric}>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>Distance</Text>
                <Text style={[styles.metricValue, { color: palette.textStrong }]}>{plannedRouteDistanceMeters == null ? 'Unavailable' : formatRouteDistance(plannedRouteDistanceMeters)}</Text>
              </View>
              <View style={styles.routeEstimateMetric}>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>Estimated travel time</Text>
                <Text style={[styles.metricValue, { color: palette.textStrong }]}>{plannedRouteDurationSeconds == null ? 'Unavailable' : formatRouteDuration(plannedRouteDurationSeconds)}</Text>
              </View>
              <Text style={[styles.routeEstimateNote, { color: palette.textMuted }]}>A personal route preview only. It does not change the school bus route or assigned stops.</Text>
            </View>
          ) : null}
          <Pressable style={styles.ghostButton} onPress={handleClearRoutePlan}>
            <Text style={[styles.ghostButtonText, { color: palette.ghostText }]}>
              {plannedRoutePolyline.length ? 'Clear route plan' : 'Clear selected locations'}
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

function formatRouteDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return 'Unavailable';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatRouteDuration(durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) return 'Unavailable';
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `About ${totalMinutes} min`;
  return minutes ? `About ${hours} hr ${minutes} min` : `About ${hours} hr`;
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  infoTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  trackingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusBadgeText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  speedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#eff6ff' },
  speedBadgeText: { fontSize: 13, fontWeight: '700' },
  trackingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trackingMetric: { flexBasis: '48%', flexGrow: 1, minWidth: 125, minHeight: 68, justifyContent: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  metricValue: { fontSize: 13, fontWeight: '700' },
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
  },
  routePlannerCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
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
    fontSize: 17,
    fontWeight: '700',
  },
  routePlannerSubtitle: {
    fontSize: 12,
  },
  routePlannerBody: {
    paddingTop: 10,
    gap: 10,
  },
  routeInputGroup: { gap: 6 },
  routeInputLabel: { fontSize: 13, fontWeight: '600' },
  locationField: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13 },
  locationFieldText: { flex: 1, fontSize: 15, fontWeight: '500' },
  swapButton: { minHeight: 42, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14 },
  swapButtonText: { fontSize: 13, fontWeight: '700' },
  planRouteButton: { minHeight: 50, marginTop: 4, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  planRouteButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  routeEstimate: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 12, borderWidth: 1, borderRadius: 13 },
  routeEstimateMetric: { flex: 1, minWidth: 120, gap: 4 },
  routeEstimateNote: { width: '100%', fontSize: 12, lineHeight: 17 },
  routePickerModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  routePickerKeyboard: { justifyContent: 'flex-end' },
  routePickerSheet: { maxHeight: '90%', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 14 },
  routePickerHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#94a3b8', alignSelf: 'center', marginBottom: 2 },
  routePickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routePickerTitle: { fontSize: 19, fontWeight: '700' },
  routePickerSubtitle: { fontSize: 13 },
  routePickerClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  locationChoice: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  locationChoiceIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  locationChoiceText: { flex: 1, gap: 3 },
  locationChoiceTitle: { fontSize: 14, fontWeight: '700' },
  locationChoiceSubtitle: { fontSize: 12 },
  routePickerFootnote: { fontSize: 12, lineHeight: 17 },
  mapPickerPrompt: { position: 'absolute', zIndex: 6, top: 12, left: 12, right: 76, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 13, borderWidth: 1, elevation: 4 },
  mapPickerPromptText: { flex: 1, fontSize: 13, fontWeight: '600' },
  mapPickerCancel: { fontSize: 13, fontWeight: '700', padding: 6 },
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
  fullscreenStatus: { position: 'absolute', left: 12, right: 12, bottom: 128, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 4 },
  fullscreenStatusTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fullscreenStatusTitle: { flex: 1, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  fullscreenStatusDetails: { fontSize: 12 },
  showFullscreenStatus: { position: 'absolute', left: 14, bottom: 130, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 3 },
});
