import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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
} from 'react-native';
import MapView, { AnimatedRegion, LatLng, Marker, MarkerAnimated, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsButton } from '@/components/ui/SettingsButton';
import { Colors } from '@/constants/Colors';
import { BANANA_TO_AKUTE_ROUTE_POINTS, DEFAULT_LOCATION, DEFAULT_ROUTE_POINTS } from '@/constants/geo';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Bus } from '@/models/bus';
import { Route, RouteStop } from '@/models/route';
import { useAuthContext } from '@/providers/AuthProvider';
import { listBuses, updateBusDriver } from '@/services/firestore/buses';
import { getRoute } from '@/services/firestore/routes';
import { LiveLocation, subscribeToLiveLocation, updateLiveLocation } from '@/services/realtime/locations';

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
    const evenDuration = Math.max(300, Math.floor(totalDurationMs / distances.length));
    return distances.map(() => evenDuration);
  }
  return distances.map((distance) =>
    Math.max(300, Math.floor((distance / totalDistance) * totalDurationMs))
  );
};

const formatArrival = (etaSeconds: number): string => {
  const etaMs = Date.now() + etaSeconds * 1000;
  const date = new Date(etaMs);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SIMULATION_SPEED_MULTIPLIER = 2.5;

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

const FALLBACK_BUSES: Bus[] = [
  { id: 'demo-bus-1', nickname: 'Austangel Bus 1', driverName: 'Mr. Adewale', routeId: 'demo-route-1' },
  { id: 'demo-bus-2', nickname: 'Austangel Bus 2', driverName: 'Mrs. Bisi', routeId: 'demo-route-2' },
];

export default function TrackScreen() {
  const { role, profile } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    cardBg: isDark ? '#111827' : '#fff',
    cardBorder: isDark ? '#1f2937' : '#dbeafe',
    textStrong: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#1f2937',
    textSubtle: isDark ? '#94a3b8' : '#475569',
    bannerBg: isDark ? '#1e293b' : '#1d4ed8',
    bannerText: '#fff',
    inputBg: isDark ? '#0b1220' : '#f8fafc',
    inputBorder: isDark ? '#1f2937' : '#d0d5dd',
    controlBg: isDark ? '#0b1220' : '#fff',
    controlBorder: isDark ? '#1f2937' : '#e5e7eb',
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
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [pauseUntil, setPauseUntil] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomDelta, setZoomDelta] = useState({ latitudeDelta: 0.03, longitudeDelta: 0.03 });
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const simulationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationStep = useRef(0);
  const stopScheduleRef = useRef<{ index: number; stop: RouteStop; dwellSeconds: number }[]>([]);
  const pauseUntilRef = useRef<number | null>(null);
  const visitedStopsRef = useRef<Set<number>>(new Set());
  const isSimulatingRef = useRef(false);
  const segmentDurationsRef = useRef<number[]>([]);
  const busCoordinate = useRef(
    new AnimatedRegion({
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
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
  const isStale = lastUpdatedAt ? Date.now() - lastUpdatedAt > 2 * 60 * 1000 : false;
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
    listBuses()
      .then((items) => {
        if (!items.length) {
          items = FALLBACK_BUSES;
        }

        // Role-based filtering: drivers/attendants only see their assigned bus; others see all.
        const requiresAssignment = role === 'driver' || role === 'attendant';
        const assignedBusId = profile?.assignedBusId ?? null;
        let filtered = items;
        if (requiresAssignment) {
          filtered = assignedBusId ? items.filter((bus) => bus.id === assignedBusId) : [];
        }
        if (!filtered.length && !requiresAssignment) {
          filtered = items;
        }

        if (!isMounted) {
          return;
        }
        setBuses(filtered);
        const firstBus = filtered[0];
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
          ? 'Missing Firestore read permission; using fallback buses.'
          : 'Failed to load buses';
        console.warn(message, error);

        if (isMounted) {
          setBuses(FALLBACK_BUSES);
          setSelectedBusId(FALLBACK_BUSES[0].id);
          setDriverDraft(FALLBACK_BUSES[0].driverName ?? '');
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
  }, []);

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
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      trimmed
    )}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    let data: Array<{ lat: string; lon: string }>;
    try {
      data = (await response.json()) as Array<{ lat: string; lon: string }>;
    } catch (error) {
      throw new Error('Geocoding response invalid');
    }
    if (!data.length) {
      throw new Error('No results');
    }
    return { latitude: Number(data[0].lat), longitude: Number(data[0].lon) };
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
    const step = Math.max(1, Math.floor(coords.length / 120));
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

  const stopTrip = (message?: string) => {
    if (simulationTimer.current) {
      clearTimeout(simulationTimer.current);
      simulationTimer.current = null;
    }
    simulationStep.current = 0;
    visitedStopsRef.current = new Set();
    isSimulatingRef.current = false;
    setCurrentIndex(0);
    setCurrentStop(null);
    setPauseUntil(null);
    pauseUntilRef.current = null;
    setIsSimulating(false);
    if (message) {
      Alert.alert('Trip ended', message);
    }
  };

  const handleNextStop = () => {
    if (!isSimulatingRef.current || !simulationPath.length) {
      return;
    }
    const upcoming = stopScheduleRef.current.find((stop) => stop.index > simulationStep.current);
    if (!upcoming) {
      stopTrip('Trip complete. Ready for the next run.');
      return;
    }
    if (simulationTimer.current) {
      clearTimeout(simulationTimer.current);
      simulationTimer.current = null;
    }
    pauseUntilRef.current = null;
    setPauseUntil(null);
    setCurrentStop(null);
    simulationStep.current = Math.min(upcoming.index, simulationPath.length - 1);
    setCurrentIndex(simulationStep.current);
    const point = simulationPath[simulationStep.current];
    const previous = simulationPath[Math.max(0, simulationStep.current - 1)];
    const nextLocation = {
      latitude: point.latitude,
      longitude: point.longitude,
      updatedAt: Date.now(),
      speed: 14,
      heading: calculateHeading(previous, point),
    };
    setLiveLocation(nextLocation);
    busCoordinate.current.setValue({
      latitude: point.latitude,
      longitude: point.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    });
    updateLiveLocation(selectedBusId ?? 'unknown', nextLocation).catch((err) => {
      console.warn('Next stop publish skipped', err);
    });
    simulationTimer.current = setTimeout(() => {
      const nextIndex = Math.min(simulationStep.current + 1, simulationPath.length - 1);
      if (nextIndex === simulationStep.current) {
        stopTrip('Trip complete. Ready for the next run.');
        return;
      }
      const pointNext = simulationPath[nextIndex];
      const prevNext = simulationPath[Math.max(0, nextIndex - 1)];
      const durationMs =
        segmentDurationsRef.current[Math.max(0, nextIndex - 1)] ?? 1000;
      const liveNext = {
        latitude: pointNext.latitude,
        longitude: pointNext.longitude,
        updatedAt: Date.now(),
        speed: 14,
        heading: calculateHeading(prevNext, pointNext),
      };
      setLiveLocation(liveNext);
      busCoordinate.current.timing({
        latitude: pointNext.latitude,
        longitude: pointNext.longitude,
        duration: durationMs,
        useNativeDriver: false,
      } as Parameters<typeof busCoordinate.current.timing>[0]).start();
      simulationStep.current = nextIndex;
      setCurrentIndex(nextIndex);
    }, 0);
  };

  const handleStartTrip = async () => {
    if (!selectedBusId) {
      Alert.alert('Select a bus', 'Choose a bus to start the trip.');
      return;
    }

    if (isSimulating) {
      Alert.alert('End trip?', 'Stop publishing live updates for this bus?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End trip', style: 'destructive', onPress: () => stopTrip('Trip updates stopped.') },
      ]);
      return;
    }

    if (!routePolyline.length) {
      Alert.alert('Build a route', 'Enter a start and destination before starting a trip.');
      return;
    }

    const targetPoint = routePolyline[0] ?? { ...DEFAULT_LOCATION };
    if (!stopScheduleRef.current.length) {
      buildStopSchedule(routePolyline);
    }

    Alert.alert(
      'Start trip?',
      `This will publish live updates for ${selectedBus?.nickname ?? 'the bus'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start trip',
          onPress: async () => {
            if (simulationTimer.current) {
              clearTimeout(simulationTimer.current);
            }
            simulationStep.current = 0;
            isSimulatingRef.current = true;
            setFollowBus(true);
            setIsSimulating(true);
            setCurrentIndex(0);
            visitedStopsRef.current = new Set();
            try {
              await updateLiveLocation(selectedBusId, {
                latitude: targetPoint.latitude,
                longitude: targetPoint.longitude,
                updatedAt: Date.now(),
                speed: 16,
                heading: 90,
              });
              setTrailCoords([{ latitude: targetPoint.latitude, longitude: targetPoint.longitude }]);
              setLiveLocation({
                latitude: targetPoint.latitude,
                longitude: targetPoint.longitude,
                updatedAt: Date.now(),
                speed: 16,
                heading: 90,
              });
              Alert.alert('Trip started', 'Parents will see the bus move shortly.');
              const points = simulationPath;
              if (!points.length) {
                stopTrip('No route points available.');
                return;
              }
              const baseDurationSeconds = routeDurationSeconds ?? points.length * 2.5;
              const totalDurationMs = Math.max(
                1000,
                baseDurationSeconds * SIMULATION_SPEED_MULTIPLIER * 1000
              );
              segmentDurationsRef.current = buildSegmentDurations(points, totalDurationMs);
              busCoordinate.current.setValue({
                latitude: targetPoint.latitude,
                longitude: targetPoint.longitude,
                latitudeDelta: 0,
                longitudeDelta: 0,
              });

              const runSegment = (nextIndex: number) => {
                if (!isSimulatingRef.current) {
                  return;
                }
                if (nextIndex >= points.length) {
                  stopTrip('Trip complete. Ready for the next run.');
                  return;
                }
                const previous = points[Math.max(0, nextIndex - 1)];
                const point = points[nextIndex];
                const durationMs =
                  segmentDurationsRef.current[Math.max(0, nextIndex - 1)] ?? 1000;
                const nextLocation = {
                  latitude: point.latitude,
                  longitude: point.longitude,
                  updatedAt: Date.now(),
                  speed: 14,
                  heading: calculateHeading(previous, point),
                };
                setLiveLocation(nextLocation);
                busCoordinate.current
                  .timing({
                    latitude: point.latitude,
                    longitude: point.longitude,
                    duration: durationMs,
                    useNativeDriver: false,
                  } as Parameters<typeof busCoordinate.current.timing>[0])
                  .start();
                simulationStep.current = nextIndex;
                setCurrentIndex(nextIndex);
                const stopMatch = stopScheduleRef.current.find(
                  (stop) => stop.index === nextIndex && !visitedStopsRef.current.has(stop.index)
                );
                if (stopMatch) {
                  visitedStopsRef.current.add(stopMatch.index);
                  const dwellMs = stopMatch.dwellSeconds * 1000;
                  pauseUntilRef.current = Date.now() + dwellMs;
                  setPauseUntil(pauseUntilRef.current);
                  setCurrentStop(stopMatch.stop);
                  simulationTimer.current = setTimeout(() => {
                    setPauseUntil(null);
                    pauseUntilRef.current = null;
                    setCurrentStop(null);
                    runSegment(nextIndex + 1);
                  }, dwellMs);
                  return;
                }
                simulationTimer.current = setTimeout(() => {
                  runSegment(nextIndex + 1);
                }, durationMs);
                updateLiveLocation(selectedBusId, nextLocation).catch((err) => {
                  console.warn('Simulation publish skipped', err);
                });
              };

              if (points.length > 1) {
                runSegment(1);
              } else {
                stopTrip('Not enough route points to simulate.');
              }
            } catch (error: any) {
              console.error('Simulation failed', error);
              const message =
                error?.code === 'permission-denied'
                  ? 'Missing permission to publish location. Check Firestore/Realtime rules.'
                  : 'Unable to publish trip location.';
              stopTrip();
              Alert.alert('Trip failed', message);
            }
          },
        },
      ]
    );
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
  if (requiresAssignment && (!profile?.assignedBusId || !buses.length)) {
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

  const renderMapView = (style: StyleProp<ViewStyle>) => (
    <MapView
      ref={mapRef}
      style={style}
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
      <MarkerAnimated
        coordinate={busCoordinate.current as unknown as LatLng}
        title="Bus location"
        description={selectedBus?.nickname}
        rotation={liveLocation?.heading ?? 0}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={[styles.busMarker, isStale && styles.busMarkerStale]}>
          <MaterialIcons name="directions-bus" size={22} color="#fff" />
        </View>
      </MarkerAnimated>
    </MapView>
  );

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
          {isSimulating ? (
            <Pressable
              style={[styles.fullscreenNextButton, { backgroundColor: theme.tint }]}
              onPress={handleNextStop}
              accessibilityRole="button"
              accessibilityLabel="Jump to next stop">
              <Text style={styles.fullscreenNextButtonText}>Next stop</Text>
            </Pressable>
          ) : null}
          {renderMapControls(true)}
        </SafeAreaView>
      </Modal>
      <SettingsButton />
      <ScrollView
        style={[styles.screen, { backgroundColor: palette.screenBg }]}
        contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[styles.banner, { backgroundColor: palette.bannerBg }]}>
          <Text style={[styles.bannerText, { color: palette.bannerText }]}>
            Your child&apos;s bus is being monitored in real time
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
                  !isActive && isDark ? { backgroundColor: '#1f2937' } : null,
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
          <Text style={styles.infoIcon}>🕒</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            ETA:{' '}
            {etaSeconds && isSimulating ? `${formatArrival(etaSeconds)} (${Math.ceil(etaSeconds / 60)} min)` : '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            {startCoord && endCoord
              ? 'Custom route active'
              : 'Default route active'}
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
          <Text style={styles.infoIcon}>➡️</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            Next stop: {nextStopInfo?.name ?? '—'}
          </Text>
        </View>
        {isSimulating ? (
          <Pressable
            style={[styles.secondaryButton, { backgroundColor: isDark ? '#1f2937' : '#e2e8f0' }]}
            onPress={handleNextStop}
            accessibilityRole="button"
            accessibilityLabel="Jump to next stop">
            <Text style={[styles.secondaryButtonText, { color: palette.textStrong }]}>
              Next stop
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <Text style={[styles.infoText, { color: palette.textMuted }]}>
            Last update: {lastUpdatedAt ? formatAge(lastUpdatedAt) : 'Waiting for first location…'}{' '}
            {isStale ? '(stale)' : ''}
          </Text>
        </View>
        {pauseUntil ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🚌</Text>
            <Text style={[styles.infoText, { color: palette.textMuted }]}>
              Stopped at {currentStop?.name ?? 'stop'} • {Math.max(0, Math.ceil((pauseUntil - Date.now()) / 1000))}s
            </Text>
          </View>
        ) : null}
        <View style={styles.routeForm}>
          <Text style={[styles.sectionLabel, { color: palette.textStrong }]}>Plan route</Text>
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
        </View>
        {isRouting ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🧭</Text>
            <Text style={[styles.infoText, { color: palette.textMuted }]}>
              Fetching route from selected location…
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: theme.tint },
            !selectedBusId ? styles.primaryButtonDisabled : undefined,
          ]}
          onPress={handleStartTrip}
          disabled={!selectedBusId}>
          <Text style={styles.primaryButtonText}>{isSimulating ? 'End Trip' : 'Start Trip'}</Text>
        </Pressable>
      </View>
      </ScrollView>
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
    marginTop: 8,
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
});
