import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_LOCATION } from '@/constants/geo';
import { Bus } from '@/models/bus';
import { useAuthContext } from '@/providers/AuthProvider';
import { getBus } from '@/services/firestore/buses';
import { recordCheckin } from '@/services/firestore/checkins';
import { updateLiveLocation } from '@/services/realtime/locations';

export default function DriverToolsScreen() {
  const { profile } = useAuthContext();
  const [bus, setBus] = useState<Bus | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [childName, setChildName] = useState('');
  const [checkinNote, setCheckinNote] = useState('');
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const driverId = profile?.id ?? 'unknown-driver';
  const assignedBusId = profile?.assignedBusId ?? null;

  useEffect(() => {
    if (!assignedBusId) {
      setBus(null);
      return;
    }
    getBus(assignedBusId)
      .then(setBus)
      .catch((error) => {
        console.error('Failed to load bus', error);
        setBus(null);
      });
  }, [assignedBusId]);

  const busTitle = useMemo(() => {
    if (!bus) {
      return 'Unassigned bus';
    }
    return bus.nickname || `Bus ${bus.id.slice(0, 5).toUpperCase()}`;
  }, [bus]);

  const handleStartSimulation = async () => {
    if (!assignedBusId) {
      Alert.alert('No bus assigned', 'Ask an admin to assign a bus to your profile.');
      return;
    }
    try {
      setIsSimulating(true);
      await updateLiveLocation(assignedBusId, {
        ...DEFAULT_LOCATION,
        updatedAt: Date.now(),
        speed: 18,
      });
      setLastActionMessage('Simulation broadcast. Parents now see the updated location.');
    } catch (error) {
      console.error('Simulation failed', error);
      setLastActionMessage('Simulation failed. Please try again.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRecordCheckin = async (type: 'boarded' | 'dropped') => {
    if (!assignedBusId) {
      Alert.alert('No bus assigned', 'Ask an admin to assign a bus to your profile.');
      return;
    }

    if (!childName.trim()) {
      Alert.alert('Missing child name', 'Enter the child’s name before recording.');
      return;
    }

    const childId = childName.trim().toLowerCase().replace(/\s+/g, '-');

    try {
      await recordCheckin('demo-trip', childId, type, driverId, {
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
        note: checkinNote || undefined,
      });
      setLastActionMessage(
        `${childName.trim()} marked as ${type === 'boarded' ? 'boarded' : 'dropped'} at ${new Date().toLocaleTimeString()}`
      );
      setChildName('');
      setCheckinNote('');
    } catch (error) {
      console.error('Check-in failed', error);
      setLastActionMessage('Unable to record check-in. Please try again later.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Driver Tools</Text>
          <Text style={styles.description}>
            Manage your assigned bus and report updates while you are on the road.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Bus</Text>
            <Text style={styles.sectionValue}>{busTitle}</Text>
            <Text style={styles.sectionHint}>
              Ask an admin to update your bus assignment or driver name.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Simulation</Text>
            <Text style={styles.sectionHint}>
              Trigger a mock position update so parents can preview live tracking.
            </Text>
            <Button
              title={isSimulating ? 'Publishing…' : 'Start Simulation'}
              onPress={handleStartSimulation}
              disabled={isSimulating}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Check-in</Text>
            <Text style={styles.sectionHint}>
              Capture boarding and drop-off events with timestamps and optional notes.
            </Text>
            <TextInput
              placeholder="Child name"
              value={childName}
              onChangeText={setChildName}
              style={styles.input}
            />
            <TextInput
              placeholder="Note (optional)"
              value={checkinNote}
              onChangeText={setCheckinNote}
              style={styles.input}
            />
            <View style={styles.checkinButtons}>
              <Button title="Boarded" onPress={() => handleRecordCheckin('boarded')} />
              <Button title="Dropped" onPress={() => handleRecordCheckin('dropped')} />
            </View>
          </View>

          {lastActionMessage ? <Text style={styles.status}>{lastActionMessage}</Text> : null}
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
  status: {
    fontSize: 14,
    color: '#0369a1',
  },
});
