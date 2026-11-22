import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsButton } from '@/components/ui/SettingsButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Checkin, CheckinType } from '@/models/checkin';
import { Trip } from '@/models/trip';
import { getBus, listBusesForSchoolStaff } from '@/services/firestore/buses';
import {
  BusRosterStudent,
  recordSchoolCheckin,
  subscribeToBusRoster,
  subscribeToBusTrips,
  subscribeToTripCheckins,
} from '@/services/firestore/school';

export default function AttendantScreen() {
  const { profile, status } = useAuthContext();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [bus, setBus] = useState<{ id: string; nickname?: string } | null>(null);
  const [roster, setRoster] = useState<BusRosterStudent[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [filter, setFilter] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let stopRoster: (() => void) | undefined;
    let stopTrips: (() => void) | undefined;
    setIsLoading(true);
    const loadAssignedBus = async () => {
      if (profile?.assignedBusId) return getBus(profile.assignedBusId);
      if (profile?.id) return (await listBusesForSchoolStaff(profile.id))[0] ?? null;
      return null;
    };
    loadAssignedBus().then((assignedBus) => {
      if (!alive) return;
      if (!assignedBus) {
        setBus(null);
        setRoster([]);
        return;
      }
      setBus(assignedBus);
      stopRoster = subscribeToBusRoster(assignedBus.id, setRoster, (error) => setErrorMessage(error.message));
      stopTrips = subscribeToBusTrips(assignedBus.id, (trips) => {
        const current = trips.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))[0] ?? null;
        setActiveTrip(current);
      }, (error) => setErrorMessage(error.message));
    }).catch((error: unknown) => {
      if (alive) setErrorMessage(error instanceof Error ? error.message : 'Could not load your assigned bus.');
    }).finally(() => { if (alive) setIsLoading(false); });
    return () => {
      alive = false;
      stopRoster?.();
      stopTrips?.();
    };
  }, [profile?.id, profile?.assignedBusId]);

  useEffect(() => {
    if (!activeTrip?.id) {
      setCheckins([]);
      return;
    }
    return subscribeToTripCheckins(activeTrip.id, setCheckins, (error) => setErrorMessage(error.message));
  }, [activeTrip?.id]);

  const latestStatus = useMemo(() => {
    const states = new Map<string, Checkin>();
    for (const checkin of [...checkins].sort((a, b) => a.timestamp - b.timestamp)) states.set(checkin.childId, checkin);
    return states;
  }, [checkins]);

  const filteredRoster = useMemo(() => {
    const search = filter.trim().toLocaleLowerCase();
    return search ? roster.filter((student) => student.displayName.toLocaleLowerCase().includes(search)) : roster;
  }, [filter, roster]);

  const saveCheckin = async (student: BusRosterStudent, type: CheckinType) => {
    if (!activeTrip || !bus || !profile?.id) {
      Alert.alert('Trip not active', 'Check-ins can be recorded after the driver starts this bus trip.');
      return;
    }
    try {
      setSavingStudentId(student.id);
      await recordSchoolCheckin(activeTrip.id, bus.id, student, type, profile.id, null, note);
      setNote('');
    } catch (error) {
      console.error('Attendant check-in failed:', error);
      Alert.alert('Check-in not saved', error instanceof Error ? error.message : 'Check your connection and try again.');
    } finally {
      setSavingStudentId(null);
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
          <Text style={[styles.heading, { color: theme.text }]}>Attendant Check-ins</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            {bus ? `${bus.nickname || `Bus ${bus.id.slice(0, 6)}`} · ${activeTrip ? 'Trip active' : 'Waiting for driver'}` : 'An administrator must assign you to a school bus.'}
          </Text>
          {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}

          {bus ? <View style={[styles.section, { backgroundColor: colorScheme === 'dark' ? '#111827' : '#fff', borderColor: colorScheme === 'dark' ? '#1f2937' : '#e5e7eb' }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Assigned student roster</Text>
            <TextInput
              placeholder="Search student"
              value={filter}
              onChangeText={setFilter}
              style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#0b1220' : '#f8fafc', borderColor: colorScheme === 'dark' ? '#374151' : '#d0d5dd', color: theme.text }]}
              placeholderTextColor={theme.icon}
            />
            <TextInput
              placeholder="Optional note for the next check-in"
              value={note}
              onChangeText={setNote}
              maxLength={500}
              style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#0b1220' : '#f8fafc', borderColor: colorScheme === 'dark' ? '#374151' : '#d0d5dd', color: theme.text }]}
              placeholderTextColor={theme.icon}
            />
            {roster.length === 0 ? <Text style={[styles.empty, { color: theme.icon }]}>No students are assigned to this bus. Their parent account needs to set the child&apos;s defaultBusId.</Text> : null}
            {filteredRoster.map((student) => {
              const checkin = latestStatus.get(student.id);
              const statusLabel = !checkin ? 'Expected' : checkin.type === 'boarded' ? 'On bus' : 'Dropped off';
              return <View key={`${student.parentId}/${student.id}`} style={[styles.row, { borderBottomColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}>
                <View style={styles.studentDetails}>
                  <Text style={[styles.studentName, { color: theme.text }]}>{student.displayName}</Text>
                  <Text style={[styles.studentStatus, { color: theme.icon }]}>{statusLabel}</Text>
                </View>
                <View style={styles.actions}>
                  <Button title={savingStudentId === student.id ? '…' : 'On'} onPress={() => saveCheckin(student, 'boarded')} disabled={!activeTrip || savingStudentId !== null} color="#16a34a" />
                  <Button title={savingStudentId === student.id ? '…' : 'Off'} onPress={() => saveCheckin(student, 'dropped')} disabled={!activeTrip || savingStudentId !== null} color="#d97706" />
                </View>
              </View>;
            })}
          </View> : null}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, padding: 18, gap: 14 },
  heading: { fontSize: 23, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  section: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 9, gap: 10 },
  studentDetails: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600' },
  studentStatus: { fontSize: 12, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 5 },
  empty: { fontSize: 13, lineHeight: 19 },
  error: { color: '#dc2626', fontSize: 13 },
});
