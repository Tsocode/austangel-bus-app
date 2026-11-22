import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuthContext } from '@/providers/AuthProvider';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TravelTrip } from '@/models/travel-trip';
import {
  acceptTrip,
  cancelTrip,
  completeTrip,
  startTrip,
  subscribeToAvailableTrips,
  subscribeToDriverLocation,
  subscribeToDriverTrips,
  subscribeToUserTrips,
  updateDriverLocation,
} from '@/services/firebase-travel';

type LiveLocation = {
  latitude: number;
  longitude: number;
  timestamp?: number;
};

export default function MonitorTripScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useAuthContext();
  const uid = profile?.id;
  const isTravelDriver = profile?.travelRole === 'driver' ||
    (profile?.role === 'driver' && profile?.primaryService === 'travel');

  const [myTrips, setMyTrips] = useState<TravelTrip[]>([]);
  const [availableTrips, setAvailableTrips] = useState<TravelTrip[]>([]);
  const [locations, setLocations] = useState<Record<string, LiveLocation | null>>({});
  const [loading, setLoading] = useState(true);
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const handleError = (error: Error) => {
      console.error('Unable to load travel trips:', error);
      setLoadError(error.message || 'Could not load trips.');
      setLoading(false);
    };

    if (isTravelDriver) {
      const assignedUnsubscribe = subscribeToDriverTrips(uid, (trips) => {
        setMyTrips(trips);
        setLoading(false);
      }, handleError);
      const availableUnsubscribe = subscribeToAvailableTrips((trips) => {
        setAvailableTrips(trips.filter((trip) => !trip.driverId));
        setLoading(false);
      }, handleError);
      return () => {
        assignedUnsubscribe();
        availableUnsubscribe();
      };
    }

    setAvailableTrips([]);
    return subscribeToUserTrips(uid, (trips) => {
      setMyTrips(trips);
      setLoading(false);
    }, handleError);
  }, [uid, isTravelDriver]);

  const trackableTrips = useMemo(
    () => myTrips.filter((trip) => trip.driverId && ['accepted', 'in_progress'].includes(trip.status)),
    [myTrips]
  );

  useEffect(() => {
    const unsubscribes = trackableTrips.map((trip) =>
      subscribeToDriverLocation(
        trip.driverId!,
        (location) => setLocations((current) => ({
          ...current,
          [trip.id]: location as LiveLocation | null,
        })),
        (error) => console.warn(`Could not subscribe to trip ${trip.id} location:`, error)
      )
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [trackableTrips]);

  const activeDriverTrip = isTravelDriver
    ? myTrips.find((trip) => trip.status === 'in_progress')
    : undefined;

  useEffect(() => {
    if (!uid || !activeDriverTrip || Platform.OS === 'web') return;

    let active = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    const beginLocationUpdates = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Location permission needed', 'Allow location access to share your trip location with the passenger.');
          return;
        }
        if (!active) return;
        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (position) => {
            void updateDriverLocation(uid, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              speed: position.coords.speed ?? undefined,
              bearing: position.coords.heading ?? undefined,
              accuracy: position.coords.accuracy ?? undefined,
              tripId: activeDriverTrip.id,
            }).catch((error) => console.error('Failed to publish travel driver location:', error));
          }
        );
      } catch (error) {
        console.error('Could not start travel location tracking:', error);
        Alert.alert('Location unavailable', 'The driver location could not be started. Check location services and try again.');
      }
    };

    void beginLocationUpdates();
    return () => {
      active = false;
      locationSubscription?.remove();
    };
  }, [uid, activeDriverTrip?.id, activeDriverTrip?.status]);

  const performAction = async (trip: TravelTrip, action: 'accept' | 'start' | 'complete' | 'cancel') => {
    if (!uid || busyTripId) return;
    setBusyTripId(trip.id);
    try {
      if (action === 'accept') await acceptTrip(trip.id, uid);
      if (action === 'start') await startTrip(trip.id);
      if (action === 'complete') await completeTrip(trip.id);
      if (action === 'cancel') await cancelTrip(trip.id, 'Cancelled by passenger');
    } catch (error) {
      console.error(`Travel trip ${action} failed:`, error);
      Alert.alert('Could not update trip', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyTripId(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return '#059669';
    if (status === 'cancelled') return '#dc2626';
    if (status === 'in_progress') return '#2563eb';
    return '#d97706';
  };

  const renderTrip = (trip: TravelTrip, available = false) => {
    const location = locations[trip.id];
    const actionIsBusy = busyTripId === trip.id;
    const canCancel = !isTravelDriver && ['requested', 'accepted'].includes(trip.status);

    return (
      <View key={trip.id} style={[styles.tripCard, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff', borderColor: theme.icon }]}>
        <View style={styles.tripHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.route, { color: theme.text }]}>
              {trip.pickupLocation?.address ?? 'Pickup'} → {trip.dropoffLocation?.address ?? 'Dropoff'}
            </Text>
            <Text style={[styles.time, { color: theme.icon }]}>
              {trip.scheduledTime ? new Date(trip.scheduledTime).toLocaleString() : `Requested ${new Date(trip.requestedTime).toLocaleString()}`}
            </Text>
          </View>
          <Text style={[styles.status, { color: statusColor(trip.status) }]}>
            {available ? 'AVAILABLE' : trip.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <View style={styles.tripMeta}>
          <Text style={[styles.metaText, { color: theme.text }]}>
            {trip.passengers ?? 1} passenger{(trip.passengers ?? 1) === 1 ? '' : 's'}
          </Text>
          <Text style={[styles.fare, { color: theme.tint }]}>
            {typeof trip.estimatedCostCents === 'number'
              ? new Intl.NumberFormat(undefined, { style: 'currency', currency: (trip.currency ?? 'usd').toUpperCase() }).format(trip.estimatedCostCents / 100)
              : 'Fare pending'}
          </Text>
        </View>

        {!isTravelDriver && trip.driverId && ['accepted', 'in_progress'].includes(trip.status) && (
          <View style={[styles.locationBox, { backgroundColor: colorScheme === 'dark' ? '#111827' : '#eff6ff' }]}>
            <MaterialIcons name="location-on" size={18} color={theme.tint} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {location
                ? `Driver at ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}${location.timestamp ? ` · Updated ${new Date(location.timestamp).toLocaleTimeString()}` : ''}`
                : 'Waiting for the driver’s live location…'}
            </Text>
          </View>
        )}

        {isTravelDriver && !available && trip.status === 'accepted' && (
          <ActionButton title="Start trip" icon="play-arrow" busy={actionIsBusy} onPress={() => performAction(trip, 'start')} tint={theme.tint} />
        )}
        {isTravelDriver && !available && trip.status === 'in_progress' && (
          <ActionButton title="Complete trip" icon="check" busy={actionIsBusy} onPress={() => performAction(trip, 'complete')} tint="#059669" />
        )}
        {isTravelDriver && available && (
          <ActionButton title="Accept trip" icon="check" busy={actionIsBusy} onPress={() => performAction(trip, 'accept')} tint={theme.tint} />
        )}
        {canCancel && (
          <ActionButton title="Cancel trip" icon="cancel" busy={actionIsBusy} onPress={() => performAction(trip, 'cancel')} tint="#dc2626" />
        )}
      </View>
    );
  };

  const allTrips = myTrips;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>{isTravelDriver ? 'Driver trips' : 'Your trips'}</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            {isTravelDriver ? 'Accept and manage assigned rides' : 'Your live bookings and trip history'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(travel)/book-appointment')} style={[styles.bookIcon, { backgroundColor: theme.tint }]} accessibilityRole="button" accessibilityLabel="Book a ride">
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 32 }} color={theme.tint} /> : null}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      {!loading && isTravelDriver && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Available requests</Text>
          {availableTrips.length
            ? availableTrips.map((trip) => renderTrip(trip, true))
            : <Text style={[styles.emptyText, { color: theme.icon }]}>No available requests right now.</Text>}
        </>
      )}

      {!loading && <Text style={[styles.sectionTitle, { color: theme.text }]}>{isTravelDriver ? 'Your accepted trips' : 'Trip history'}</Text>}
      {!loading && !allTrips.length ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="directions-car" size={54} color={theme.icon} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No trips yet</Text>
          {!isTravelDriver && (
            <TouchableOpacity style={[styles.bookButton, { backgroundColor: theme.tint }]} onPress={() => router.push('/(travel)/book-appointment')}>
              <Text style={styles.bookButtonText}>Book a ride</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <FlatList
        data={allTrips}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item }) => renderTrip(item)}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

function ActionButton({ title, icon, busy, onPress, tint }: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  busy: boolean;
  onPress: () => void;
  tint: string;
}) {
  return (
    <TouchableOpacity disabled={busy} onPress={onPress} style={[styles.actionButton, { backgroundColor: tint, opacity: busy ? 0.7 : 1 }]}>
      {busy ? <ActivityIndicator color="#fff" /> : <MaterialIcons name={icon} size={18} color="#fff" />}
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  bookIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginTop: 8, marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 28 },
  tripCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  tripHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  route: { flex: 1, fontSize: 14, fontWeight: '600' },
  time: { fontSize: 11, marginTop: 5 },
  status: { fontSize: 10, fontWeight: '700' },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  metaText: { fontSize: 12 },
  fare: { fontSize: 14, fontWeight: '700' },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, marginTop: 12 },
  locationText: { flex: 1, fontSize: 11 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, padding: 12, marginTop: 12 },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyText: { marginHorizontal: 20, marginBottom: 14, fontSize: 13 },
  bookButton: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 11, marginTop: 14 },
  bookButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  error: { color: '#dc2626', paddingHorizontal: 20, marginVertical: 8 },
});
