import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { DEFAULT_LOCATION, DEFAULT_ROUTE_POINTS } from '@/constants/geo';
import { Bus } from '@/models/bus';
import { Route, RouteStop } from '@/models/route';
import { useAuthContext } from '@/providers/AuthProvider';
import { listBuses, updateBusDriver } from '@/services/firestore/buses';
import { getRoute } from '@/services/firestore/routes';
import { LiveLocation, subscribeToLiveLocation, updateLiveLocation } from '@/services/realtime/locations';

const FALLBACK_ROUTE: Route = {
  id: 'demo-route-1',
  name: 'Downtown Route',
  stops: DEFAULT_ROUTE_POINTS.map((point, index) => ({
    id: `stop-${index}`,
    name: `Stop ${index + 1}`,
    latitude: point.latitude,
    longitude: point.longitude,
    order: index,
  })),
};

const FALLBACK_ROUTES: Record<string, Route> = {
  'demo-route-1': FALLBACK_ROUTE,
  'demo-route-2': {
    ...FALLBACK_ROUTE,
    id: 'demo-route-2',
    name: 'Victoria Express',
  },
};

const FALLBACK_BUSES: Bus[] = [
  { id: 'demo-bus-1', nickname: 'Austangel Bus 1', driverName: 'Mr. Adewale', routeId: 'demo-route-1' },
  { id: 'demo-bus-2', nickname: 'Austangel Bus 2', driverName: 'Mrs. Bisi', routeId: 'demo-route-2' },
];

export default function TrackScreen() {
  const { role } = useAuthContext();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(FALLBACK_ROUTE);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [driverDraft, setDriverDraft] = useState('');

  const selectedBus = useMemo(
    () => buses.find((bus) => bus.id === selectedBusId) ?? FALLBACK_BUSES[0],
    [buses, selectedBusId]
  );

  const currentLocation = liveLocation ?? {
    latitude: route.stops[0]?.latitude ?? DEFAULT_LOCATION.latitude,
    longitude: route.stops[0]?.longitude ?? DEFAULT_LOCATION.longitude,
  };

  useEffect(() => {
    let isMounted = true;
    listBuses()
      .then((items) => {
        if (!items.length) {
          items = FALLBACK_BUSES;
        }
        if (!isMounted) {
          return;
        }
        setBuses(items);
        const firstBus = items[0];
        setSelectedBusId(firstBus?.id ?? null);
        setDriverDraft(firstBus?.driverName ?? '');
      })
      .catch((error) => {
        console.error('Failed to load buses', error);
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

    const bus = buses.find((item) => item.id === selectedBusId);
    setDriverDraft(bus?.driverName ?? '');

    let unsubscribe: (() => void) | undefined;

    unsubscribe = subscribeToLiveLocation(selectedBusId, (location) => {
      setLiveLocation(location);
    });

    if (bus?.routeId) {
      const demoRoute = FALLBACK_ROUTES[bus.routeId];
      if (demoRoute) {
        setRoute(demoRoute);
      } else {
        getRoute(bus.routeId)
          .then((routeDoc) => {
            if (routeDoc) {
              setRoute(routeDoc);
            } else {
              setRoute(FALLBACK_ROUTE);
            }
          })
          .catch((error) => {
            console.warn('Route load failed, using fallback route.', error);
            setRoute(FALLBACK_ROUTE);
          });
      }
    } else {
      setRoute(FALLBACK_ROUTE);
    }

    return () => {
      unsubscribe?.();
    };
  }, [selectedBusId, buses]);

  const handleSelectBus = (busId: string) => {
    setSelectedBusId(busId);
    setIsEditingDriver(false);
  };

  const routePoints = useMemo<RouteStop[]>(() => {
    return route?.stops?.length ? route.stops : FALLBACK_ROUTE.stops;
  }, [route]);

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

  const handleStartSimulation = async () => {
    if (!selectedBusId) {
      return;
    }
    const targetPoint = routePoints[0] ?? { ...DEFAULT_LOCATION };
    try {
      await updateLiveLocation(selectedBusId, {
        latitude: targetPoint.latitude,
        longitude: targetPoint.longitude,
        updatedAt: Date.now(),
        speed: 16,
        heading: 90,
      });
      Alert.alert('Simulation started', 'Parents will see the bus move shortly.');
    } catch (error) {
      console.error('Simulation failed', error);
      Alert.alert('Simulation failed', 'Unable to publish simulation location.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading buses…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Your child&apos;s bus is being monitored in real time</Text>
        </View>

      <View style={styles.selectorSection}>
        <Text style={styles.sectionLabel}>Select Bus:</Text>
        <View style={styles.busButtonRow}>
          {buses.map((bus) => {
            const isActive = bus.id === selectedBusId;
            return (
              <Pressable
                key={bus.id}
                style={[styles.busButton, isActive ? styles.busButtonActive : styles.busButtonInactive]}
                onPress={() => handleSelectBus(bus.id)}>
                <Text style={[styles.busButtonText, isActive ? styles.busButtonTextActive : {}]}>
                  {bus.nickname || `Bus ${bus.id.slice(0, 5).toUpperCase()}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}>
          <Polyline
            coordinates={routePoints.map((stop) => ({
              latitude: stop.latitude,
              longitude: stop.longitude,
            }))}
            strokeWidth={6}
            strokeColor="#2563eb"
          />
          {routePoints.map((stop) => (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              title={stop.name}
              pinColor="#f59e0b"
            />
          ))}
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Bus location"
            description={selectedBus?.nickname}
            pinColor="#1d4ed8"
          />
        </MapView>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          {selectedBus?.nickname ?? 'Austangel Bus'} - {route?.name ?? 'Route'}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🕒</Text>
          <Text style={styles.infoText}>ETA: 20 min</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>Current area: Near Victoria Island</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🚌</Text>
          {role === 'admin' && isEditingDriver ? (
            <View style={styles.editRow}>
              <TextInput
                value={driverDraft}
                onChangeText={setDriverDraft}
                style={styles.driverInput}
                placeholder="Driver name"
              />
              <Pressable onPress={handleSaveDriverName} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.infoText}>
              Driver: {selectedBus?.driverName ?? 'Assign driver'}
              {role === 'admin' ? (
                <Text style={styles.editLink} onPress={() => setIsEditingDriver(true)}>
                  {' '}
                  (Edit)
                </Text>
              ) : null}
            </Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>➡️</Text>
          <Text style={styles.infoText}>Next stop: Falomo in 4 min</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleStartSimulation}>
          <Text style={styles.primaryButtonText}>Start Simulation</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  mapCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 20,
    height: 260,
  },
  map: {
    width: '100%',
    height: '100%',
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
});
