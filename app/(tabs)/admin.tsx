import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateBusDriver } from '@/services/firestore/buses';

export default function AdminToolsScreen() {
  const [busId, setBusId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverId, setDriverId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveDriver = async () => {
    if (!busId) {
      Alert.alert('Missing bus', 'Provide the bus ID you want to update.');
      return;
    }

    setStatusMessage(null);
    setIsSaving(true);
    try {
      await updateBusDriver(busId.trim(), {
        driverId: driverId ? driverId.trim() : null,
        driverName: driverName ? driverName.trim() : null,
      });
      setDriverName('');
      setDriverId('');
      setStatusMessage('Driver assignment saved. Track cards now show the new name.');
    } catch (error) {
      console.error('Driver update failed', error);
      setStatusMessage('Failed to save driver. Check network or permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
        <Text style={styles.heading}>Admin Console</Text>
        <Text style={styles.description}>
          Manage buses, drivers, and temporary permissions. Full CRUD screens will be added as the
          data model evolves.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Assignment</Text>
          <Text style={styles.sectionHint}>
            Enter the bus ID and update the driver name. This reflects instantly on the parent
            Track screen.
          </Text>
          <TextInput
            placeholder="Bus ID"
            value={busId}
            onChangeText={setBusId}
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Driver name (e.g., Mrs. Adesuwa)"
            value={driverName}
            onChangeText={setDriverName}
            style={styles.input}
          />
          <TextInput
            placeholder="Driver user ID (optional)"
            value={driverId}
            onChangeText={setDriverId}
            style={styles.input}
            autoCapitalize="none"
          />
          <Button title={isSaving ? 'Saving…' : 'Save'} onPress={handleSaveDriver} disabled={isSaving} />
          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions & Requests</Text>
          <Text style={styles.sectionHint}>
            TODO: Handle temporary tracking access requests from parents and approvals.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Assistant</Text>
          <Text style={styles.sectionHint}>
            Placeholder for the future parent/admin AI chatbot entry point.
          </Text>
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
  status: {
    fontSize: 14,
    color: '#0369a1',
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
    gap: 28,
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
    backgroundColor: '#f8fafc',
  },
});
