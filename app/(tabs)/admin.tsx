import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { createBus, updateBusDriver } from '@/services/firestore/buses';

export default function AdminToolsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    cardBg: isDark ? '#111827' : '#fff',
    border: isDark ? '#1f2937' : '#e5e7eb',
    textStrong: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#475569',
    textSubtle: isDark ? '#9ca3af' : '#6b7280',
    inputBg: isDark ? '#0b1220' : '#f8fafc',
    inputBorder: isDark ? '#1f2937' : '#d0d5dd',
  };
  const [busId, setBusId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverId, setDriverId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [newBusId, setNewBusId] = useState('');
  const [newBusName, setNewBusName] = useState('');
  const [newPlateNumber, setNewPlateNumber] = useState('');
  const [newRouteId, setNewRouteId] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverId, setNewDriverId] = useState('');
  const [isCreatingBus, setIsCreatingBus] = useState(false);
  const [createStatusMessage, setCreateStatusMessage] = useState<string | null>(null);

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

  const handleCreateBus = async () => {
    if (!newBusName.trim()) {
      Alert.alert('Missing bus name', 'Add a bus nickname to continue.');
      return;
    }

    setCreateStatusMessage(null);
    setIsCreatingBus(true);
    try {
      const createdId = await createBus({
        id: newBusId.trim() ? newBusId.trim() : null,
        nickname: newBusName.trim(),
        plateNumber: newPlateNumber.trim() || null,
        routeId: newRouteId.trim() || null,
        driverName: newDriverName.trim() || null,
        driverId: newDriverId.trim() || null,
      });
      setNewBusId('');
      setNewBusName('');
      setNewPlateNumber('');
      setNewRouteId('');
      setNewDriverName('');
      setNewDriverId('');
      setCreateStatusMessage(`Bus added (${createdId}).`);
    } catch (error) {
      console.error('Create bus failed', error);
      setCreateStatusMessage('Unable to add bus. Check network or permissions.');
    } finally {
      setIsCreatingBus(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <SettingsButton />
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]}>
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <Text style={[styles.heading, { color: palette.textStrong }]}>Admin Console</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>
          Manage buses, drivers, and temporary permissions. Full CRUD screens will be added as the
          data model evolves.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Driver Assignment</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
            Enter the bus ID and update the driver name. This reflects instantly on the parent
            Track screen.
          </Text>
          <TextInput
            placeholder="Bus ID"
            value={busId}
            onChangeText={setBusId}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            placeholder="Driver name (e.g., Mrs. Adesuwa)"
            value={driverName}
            onChangeText={setDriverName}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            placeholder="Driver user ID (optional)"
            value={driverId}
            onChangeText={setDriverId}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <Button
            title={isSaving ? 'Saving…' : 'Save'}
            onPress={handleSaveDriver}
            disabled={isSaving}
            color={theme.tint}
            accessibilityLabel="Save driver assignment"
          />
          {statusMessage ? <Text style={[styles.status, { color: palette.textMuted }]}>{statusMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Add a bus</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
            Create new buses so admins can assign routes and drivers.
          </Text>
          <TextInput
            placeholder="Bus ID (optional)"
            value={newBusId}
            onChangeText={setNewBusId}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            placeholder="Bus nickname (e.g., Austangel Bus 3)"
            value={newBusName}
            onChangeText={setNewBusName}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            placeholder="Plate number (optional)"
            value={newPlateNumber}
            onChangeText={setNewPlateNumber}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            placeholder="Route ID (optional)"
            value={newRouteId}
            onChangeText={setNewRouteId}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            placeholder="Driver name (optional)"
            value={newDriverName}
            onChangeText={setNewDriverName}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            placeholderTextColor={palette.textSubtle}
          />
          <TextInput
            placeholder="Driver user ID (optional)"
            value={newDriverId}
            onChangeText={setNewDriverId}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <Button
            title={isCreatingBus ? 'Creating…' : 'Add bus'}
            onPress={handleCreateBus}
            disabled={isCreatingBus}
            color={theme.tint}
            accessibilityLabel="Add a new bus"
          />
          {createStatusMessage ? <Text style={[styles.status, { color: palette.textMuted }]}>{createStatusMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Permissions & Requests</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
            TODO: Handle temporary tracking access requests from parents and approvals.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Live ops board</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Active buses: 6 • Delays: 2 • Incidents: 1</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Stale feeds: Bus 4 (8m), Bus 6 (12m)</Text>
          <Button
            title="Open live view"
            onPress={() => Alert.alert('Live ops', 'Coming soon')}
            color={theme.tint}
            accessibilityLabel="Open live ops view"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Attendance anomalies</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Missing board: Kemi A. (Route 5) • Unexpected rider: Idowu O.</Text>
          <Button
            title="View attendance"
            onPress={() => Alert.alert('Attendance', 'Coming soon')}
            color={theme.tint}
            accessibilityLabel="View attendance anomalies"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Reports & exports</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>On-time performance, ridership totals, incident log.</Text>
          <Button
            title="Export CSV"
            onPress={() => Alert.alert('Export', 'Coming soon')}
            color={theme.tint}
            accessibilityLabel="Export reports to CSV"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Device & health</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Low battery: Bus 2 (15%) • GPS off: Bus 7 • No signal: Bus 6</Text>
          <Button
            title="Notify drivers"
            onPress={() => Alert.alert('Notify', 'Coming soon')}
            color={theme.tint}
            accessibilityLabel="Notify drivers about device health"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>AI Assistant</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>
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
