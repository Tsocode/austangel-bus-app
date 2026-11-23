import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { Bus } from '@/models/bus';
import { Checkin, CheckinType } from '@/models/checkin';
import { Trip } from '@/models/trip';
import { getBus, listBusesForSchoolStaff } from '@/services/firestore/buses';
import {
  BusRosterStudent,
  finishSchoolTrip,
  recordSchoolCheckin,
  startSchoolTrip,
  subscribeToBusRoster,
  subscribeToBusTrips,
  subscribeToTripCheckins,
} from '@/services/firestore/school';
import { updateLiveLocation } from '@/services/realtime/locations';

type Coordinate = { latitude: number; longitude: number };

export default function DriverToolsScreen() {
  const { profile, role, status } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [bus, setBus] = useState<Bus | null>(null);
  const [roster, setRoster] = useState<BusRosterStudent[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [locationStatus, setLocationStatus] = useState('Location is shared while a school trip is active.');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCheckin, setIsSavingCheckin] = useState(false);
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const staffId = profile?.id;
  const assignedBusId = profile?.assignedBusId;
  const isDriver = role === 'driver';
  const isAttendant = role === 'attendant';
  const assignedBus = useMemo(() => bus, [bus]);
  const isTripActive = activeTrip?.status === 'in_progress';
  const latestStatusByStudent = useMemo(() => {
    const latest = new Map<string, Checkin>();
    for (const checkin of [...checkins].sort((a, b) => a.timestamp - b.timestamp)) latest.set(checkin.childId, checkin);
    return latest;
  }, [checkins]);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setErrorMessage(null);
    const resolveBus = async () => {
      if (staffId) {
        if (assignedBusId) {
          try {
            const assigned = await getBus(assignedBusId);
            if (assigned) return assigned;
          } catch {
            // Assignment may have changed since this cached profile was loaded.
          }
        }
        const buses = await listBusesForSchoolStaff(staffId);
        return buses[0] ?? null;
      }
      return null;
    };

    let stopRoster: (() => void) | undefined;
    let stopTrips: (() => void) | undefined;
    resolveBus().then((nextBus) => {
      if (!alive) return;
      setBus(nextBus);
      if (!nextBus) {
        setRoster([]);
        setActiveTrip(null);
        return;
      }
      stopRoster = subscribeToBusRoster(nextBus.id, setRoster, (error) => {
        if (alive) setErrorMessage(`Could not load this bus roster: ${error.message}`);
      });
      stopTrips = subscribeToBusTrips(nextBus.id, (trips) => {
        const current = trips.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))[0] ?? null;
        setActiveTrip(current);
      }, (error) => {
        if (alive) setErrorMessage(`Could not load school trips: ${error.message}`);
      });
    }).catch((error: unknown) => {
      if (alive) setErrorMessage(error instanceof Error ? error.message : 'Could not load the assigned bus.');
    }).finally(() => { if (alive) setIsLoading(false); });

    return () => {
      alive = false;
      stopRoster?.();
      stopTrips?.();
    };
  }, [assignedBusId, staffId]);

  useEffect(() => {
    if (!activeTrip?.id) {
      setCheckins([]);
      return;
    }
    return subscribeToTripCheckins(activeTrip.id, setCheckins, (error) => {
      setErrorMessage(`Could not load trip check-ins: ${error.message}`);
    });
  }, [activeTrip?.id]);

  useEffect(() => {
    if (!isDriver || !activeTrip || !assignedBus || !staffId) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const startGpsWatch = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setLocationStatus('Location permission is required to broadcast the bus GPS.');
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (cancelled) return;
        const publish = (coords: Location.LocationObjectCoords) => {
          const next = { latitude: coords.latitude, longitude: coords.longitude };
          setLocation(next);
          setLocationStatus(`GPS active · ${new Date().toLocaleTimeString()}`);
          void updateLiveLocation(assignedBus.id, {
            ...next,
            ...(coords.heading == null || coords.heading < 0 || coords.heading > 360 ? {} : { heading: coords.heading }),
            ...(coords.speed == null ? {} : { speed: Math.max(0, coords.speed * 3.6) }),
            updatedAt: Date.now(),
          }).catch((error) => {
            console.error('Could not publish live school bus GPS:', error);
            setLocationStatus('GPS is on, but the bus location could not be sent. Check your connection.');
          });
        };
        publish(position.coords);
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 8 },
          (nextPosition) => publish(nextPosition.coords)
        );
        if (cancelled) subscription.remove();
        else locationSubscription.current = subscription;
      } catch (error) {
        console.error('School bus GPS watch failed:', error);
        setLocationStatus('Could not start GPS. Check that location services are enabled.');
      }
    };
    void startGpsWatch();
    return () => {
      cancelled = true;
      subscription?.remove();
      if (locationSubscription.current === subscription) locationSubscription.current = null;
    };
  }, [isDriver, activeTrip?.id, assignedBus?.id, staffId]);

  const handleTripToggle = async () => {
    if (!staffId || !assignedBus) {
      Alert.alert('No bus assigned', 'Ask an administrator to assign you to a school bus.');
      return;
    }
    if (!assignedBus.routeId) {
      Alert.alert('Route not assigned', 'Ask an administrator to assign a route to this bus before starting a trip.');
      return;
    }
    if (isTripActive && activeTrip) {
      try {
        await finishSchoolTrip(activeTrip.id);
        locationSubscription.current?.remove();
        locationSubscription.current = null;
        Haptics.selectionAsync().catch(() => undefined);
      } catch (error) {
        Alert.alert('Could not end trip', error instanceof Error ? error.message : 'Please try again.');
      }
      return;
    }
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Allow location access before starting a school bus trip.');
        return;
      }
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await startSchoolTrip(assignedBus.id, assignedBus.routeId, staffId);
      Haptics.selectionAsync().catch(() => undefined);
    } catch (error) {
      console.error('Could not start school trip:', error);
      Alert.alert('Could not start trip', error instanceof Error ? error.message : 'Check your GPS and try again.');
    }
  };

  const handleCheckin = async (student: BusRosterStudent, type: CheckinType) => {
    if (!staffId || !assignedBus || !activeTrip) {
      Alert.alert('No active trip', 'The driver must start this bus trip before recording attendance.');
      return;
    }
    try {
      setIsSavingCheckin(true);
      await recordSchoolCheckin(activeTrip.id, assignedBus.id, student, type, staffId, location, note);
      setNote('');
      Haptics.selectionAsync().catch(() => undefined);
    } catch (error) {
      console.error('Could not record student check-in:', error);
      Alert.alert('Check-in was not saved', error instanceof Error ? error.message : 'Check your connection and try again.');
    } finally {
      setIsSavingCheckin(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}><ActivityIndicator style={{ marginTop: 40 }} color={theme.tint} /></SafeAreaView>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <SettingsButton />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.heading, { color: theme.text }]}>{isAttendant ? 'Attendant Check-ins' : 'Driver Tools'}</Text>
            {!assignedBus ? (
              <Text style={[styles.description, { color: theme.icon }]}>No school bus is assigned to your profile yet. Ask an administrator to add you to a bus.</Text>
            ) : <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Assigned Bus</Text>
                <Text style={[styles.sectionValue, { color: theme.text }]}>{assignedBus.nickname || `Bus ${assignedBus.id.slice(0, 6)}`}</Text>
                <Text style={[styles.sectionHint, { color: theme.icon }]}>{assignedBus.plateNumber || 'No plate number'} · {assignedBus.routeId ? `Route ${assignedBus.routeId}` : 'No route assigned'}</Text>
              </View>

              {isDriver ? <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>School trip GPS</Text>
                <Text style={[styles.sectionHint, { color: theme.icon }]}>{isTripActive ? locationStatus : 'Start the trip to share continuous GPS with parents and the school.'}</Text>
                <Button title={isTripActive ? 'End Trip' : 'Start Trip'} onPress={handleTripToggle} color={theme.tint} />
              </View> : null}

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Student roster</Text>
                <Text style={[styles.sectionHint, { color: theme.icon }]}>
                  {activeTrip ? `Active trip · ${activeTrip.shift ?? ''} ${activeTrip.date ?? ''}` : isDriver ? 'Start a trip before marking students.' : 'Waiting for the driver to start the bus trip.'}
                </Text>
                {roster.length === 0 ? <Text style={[styles.sectionHint, { color: theme.icon }]}>No students are assigned to this bus. Assign each student a defaultBusId under their parent account.</Text> : null}
                {roster.map((student) => {
                  const lastCheckin = latestStatusByStudent.get(student.id);
                  const statusLabel = !lastCheckin ? 'Expected' : lastCheckin.type === 'boarded' ? 'On bus' : 'Dropped off';
                  return <View key={`${student.parentId}/${student.id}`} style={[styles.studentRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.studentDetails}>
                      <Text style={[styles.studentName, { color: theme.text }]}>{student.displayName}</Text>
                      <Text style={[styles.sectionHint, { color: theme.icon }]}>{statusLabel}</Text>
                    </View>
                    <View style={styles.checkinActions}>
                      <Button title="On" onPress={() => handleCheckin(student, 'boarded')} disabled={!activeTrip || isSavingCheckin} color="#16a34a" />
                      <Button title="Off" onPress={() => handleCheckin(student, 'dropped')} disabled={!activeTrip || isSavingCheckin} color="#d97706" />
                    </View>
                  </View>;
                })}
                <TextInput value={note} onChangeText={setNote} placeholder="Optional note for the next check-in" placeholderTextColor={theme.icon} style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} maxLength={500} />
              </View>
            </>}
            {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { width: '100%', alignSelf: 'center', maxWidth: 1000, flexGrow: 1, paddingHorizontal: Layout.pageGutter, paddingTop: 88, paddingBottom: 36 },
  card: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 22 },
  heading: { fontSize: 24, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionValue: { fontSize: 16, fontWeight: '600' },
  sectionHint: { fontSize: 13, lineHeight: 19 },
  studentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 10 },
  studentDetails: { flex: 1, gap: 2 },
  studentName: { fontSize: 14, fontWeight: '600' },
  checkinActions: { flexDirection: 'row', gap: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  error: { color: '#dc2626', fontSize: 13 },
});
