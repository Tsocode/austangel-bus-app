import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/Colors';
import { DEFAULT_LOCATION } from '@/constants/geo';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Bus } from '@/models/bus';
import { useAuthContext } from '@/providers/AuthProvider';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { getBus } from '@/services/firestore/buses';
import { recordCheckin } from '@/services/firestore/checkins';
import { updateLiveLocation } from '@/services/realtime/locations';

export default function DriverToolsScreen() {
  const { profile, status } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    cardBg: isDark ? '#111827' : '#fff',
    border: isDark ? '#1f2937' : '#e5e7eb',
    textStrong: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#475569',
    textSubtle: isDark ? '#9ca3af' : '#64748b',
    inputBg: isDark ? '#0b1220' : '#fff',
    inputBorder: isDark ? '#1f2937' : '#d0d5dd',
  };
  const [bus, setBus] = useState<Bus | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [tripId, setTripId] = useState('demo-trip');
  const [childIdentifier, setChildIdentifier] = useState('');
  const [childName, setChildName] = useState('');
  const [checkinNote, setCheckinNote] = useState('');
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATION);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const broadcastTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const driverId = profile?.id ?? 'unknown-driver';
  const assignedBusId = profile?.assignedBusId ?? null;
  const isProfileLoading = status === 'loading';

  useEffect(() => {
    let isMounted = true;
    if (!assignedBusId) {
      setBus(null);
      return;
    }
    getBus(assignedBusId)
      .then((nextBus) => {
        if (isMounted) {
          setBus(nextBus);
        }
      })
      .catch((error) => {
        console.error('Failed to load bus', error);
        if (isMounted) {
          setBus(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [assignedBusId]);

  useEffect(() => {
    let isMounted = true;
    const fetchLocation = async () => {
      try {
        setIsFetchingLocation(true);
        const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus !== 'granted') {
          setLocationError('Location permission denied. Using fallback coordinates.');
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!isMounted) {
          return;
        }
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
      } catch (error) {
        console.warn('Unable to fetch driver location, falling back to default.', error);
        if (isMounted) {
          setLocationError('Unable to read GPS. Using fallback coordinates.');
        }
      } finally {
        if (isMounted) {
          setIsFetchingLocation(false);
        }
      }
    };
    fetchLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (broadcastTimer.current) {
        clearInterval(broadcastTimer.current);
        broadcastTimer.current = null;
      }
    };
  }, []);

  const busTitle = useMemo(() => {
    if (!bus) {
      return 'Unassigned bus';
    }
    return bus.nickname || `Bus ${bus.id.slice(0, 5).toUpperCase()}`;
  }, [bus]);

  const stopTrip = (message?: string) => {
    if (broadcastTimer.current) {
      clearInterval(broadcastTimer.current);
      broadcastTimer.current = null;
    }
    setIsSimulating(false);
    if (message) {
      setLastActionMessage(message);
    }
  };

  const handleTripToggle = async () => {
    if (!assignedBusId) {
      Alert.alert('No bus assigned', 'Ask an admin to assign a bus to your profile.');
      return;
    }
    if (isSimulating) {
      Haptics.selectionAsync().catch(() => undefined);
      stopTrip('Trip ended. Live updates stopped.');
      return;
    }
    if (isFetchingLocation) {
      Alert.alert('Acquiring GPS', 'Wait for your current location before broadcasting.');
      return;
    }
    try {
      Haptics.selectionAsync().catch(() => undefined);
      setIsSimulating(true);
      await updateLiveLocation(assignedBusId, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        updatedAt: Date.now(),
        speed: 18,
      });
      setLastActionMessage('Trip started. Parents can follow the bus in real time.');
      broadcastTimer.current = setInterval(async () => {
        try {
          await updateLiveLocation(assignedBusId, {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            updatedAt: Date.now(),
            speed: 18,
          });
        } catch (error) {
          console.warn('Trip update skipped', error);
        }
      }, 15000);
    } catch (error) {
      console.error('Trip start failed', error);
      setLastActionMessage('Trip start failed. Please try again.');
      setIsSimulating(false);
    } finally {
      if (!broadcastTimer.current) {
        setIsSimulating(false);
      }
    }
  };

  const handleRecordCheckin = async (type: 'boarded' | 'dropped') => {
    if (!assignedBusId) {
      Alert.alert('No bus assigned', 'Ask an admin to assign a bus to your profile.');
      return;
    }

    if (!tripId.trim()) {
      Alert.alert('Missing trip', 'Enter the active trip ID before recording.');
      return;
    }

    if (!childIdentifier.trim()) {
      Alert.alert('Missing child ID', 'Enter the student’s ID from the roster.');
      return;
    }

    const displayLabel = childName.trim() || childIdentifier.trim();
    const childId = childIdentifier.trim();

    try {
      Haptics.selectionAsync().catch(() => undefined);
      setIsRecording(true);
      await recordCheckin(tripId.trim(), childId, type, driverId, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        note: checkinNote || undefined,
      });
      setLastActionMessage(
        `${displayLabel} marked as ${type === 'boarded' ? 'boarded' : 'dropped'} at ${new Date().toLocaleTimeString()}`
      );
      setChildIdentifier('');
      setChildName('');
      setCheckinNote('');
    } catch (error) {
      console.error('Check-in failed', error);
      setLastActionMessage('Unable to record check-in. Please try again later.');
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <SettingsButton />
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]}>
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <Text style={[styles.heading, { color: palette.textStrong }]}>Driver Tools</Text>
          <Text style={[styles.description, { color: palette.textMuted }]}>
            Manage your assigned bus and report updates while you are on the road.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Assigned Bus</Text>
            <Text style={[styles.sectionValue, { color: palette.textMuted }]}>{busTitle}</Text>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
              Ask an admin to update your bus assignment or driver name.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Trip broadcast</Text>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
              Start a trip to publish live updates for your assigned bus.
            </Text>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
              {isFetchingLocation
                ? 'Fetching your current GPS fix…'
                : locationError ?? `Current fix: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
            </Text>
            <Button
              title={isSimulating ? 'End Trip' : 'Start Trip'}
              onPress={handleTripToggle}
              disabled={!assignedBusId || isProfileLoading || (isFetchingLocation && !isSimulating)}
              color={theme.tint}
              accessibilityLabel={isSimulating ? 'End trip broadcast' : 'Start trip broadcast'}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Quick Check-in</Text>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
              Capture boarding and drop-off events with timestamps and optional notes.
            </Text>
            <TextInput
              placeholder="Trip ID (e.g., morning-route-1)"
              value={tripId}
              onChangeText={setTripId}
              style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
              autoCapitalize="none"
              placeholderTextColor={palette.textSubtle}
            />
            <TextInput
              placeholder="Child ID from roster"
              value={childIdentifier}
              onChangeText={setChildIdentifier}
              style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
              autoCapitalize="none"
              placeholderTextColor={palette.textSubtle}
            />
            <TextInput
              placeholder="Child name"
              value={childName}
              onChangeText={setChildName}
              style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
              placeholderTextColor={palette.textSubtle}
            />
            <TextInput
              placeholder="Note (optional)"
              value={checkinNote}
              onChangeText={setCheckinNote}
              style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
              placeholderTextColor={palette.textSubtle}
            />
            <View style={styles.checkinButtons}>
              <Button
                title={isRecording ? 'Saving…' : 'Boarded'}
                onPress={() => handleRecordCheckin('boarded')}
                disabled={isRecording || !assignedBusId || isProfileLoading}
                color="#16a34a"
                accessibilityLabel="Record boarding"
              />
              <Button
                title={isRecording ? 'Saving…' : 'Dropped'}
                onPress={() => handleRecordCheckin('dropped')}
                disabled={isRecording || !assignedBusId || isProfileLoading}
                color="#dc2626"
                accessibilityLabel="Record drop-off"
              />
            </View>
          </View>

          {lastActionMessage ? (
            <Text style={[styles.status, { color: palette.textMuted }]}>{lastActionMessage}</Text>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Attendant helper (roster)</Text>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
              Use this when an attendant needs to log check-ins offline and sync later.
            </Text>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
              Offline queue: 0 pending • Last sync: just now
            </Text>
            <View style={styles.row}>
              <Button
                title="Open roster"
                onPress={() => Alert.alert('Roster', 'Coming soon')}
                color={theme.tint}
                accessibilityLabel="Open attendant roster"
              />
              <Button
                title="Sync now"
                onPress={() => Alert.alert('Sync', 'Coming soon')}
                color={theme.tint}
                accessibilityLabel="Sync roster now"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Safety & incidents</Text>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
              Send a quick incident to admins with one tap.
            </Text>
            <View style={styles.row}>
              <Button
                title="Delay"
                onPress={() => Alert.alert('Incident', 'Delay reported to admin.')}
                color={theme.tint}
                accessibilityLabel="Report delay incident"
              />
              <Button
                title="Vehicle issue"
                onPress={() => Alert.alert('Incident', 'Vehicle issue reported.')}
                color={theme.tint}
                accessibilityLabel="Report vehicle issue"
              />
              <Button
                title="SOS"
                color="#dc2626"
                onPress={() => Alert.alert('SOS', 'Admin notified.')}
                accessibilityLabel="Send SOS alert"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 24,
    backgroundColor: '#f4f6fb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    fontSize: 16,
    color: '#475569',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionHint: {
    fontSize: 14,
    color: '#64748b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  checkinButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 14,
    color: '#0369a1',
  },
});
