import { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { assignSchoolBusFleet, createBus, listBuses, listSchoolStaff, SchoolStaffOption } from '@/services/firestore/buses';
import { Bus } from '@/models/bus';
import { BusRosterStudent, listStudentsForAdmin, setStudentDefaultBus } from '@/services/firestore/school';
import { createRoute, listRoutes } from '@/services/firestore/routes';
import { Route } from '@/models/route';

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
  const [routeId, setRouteId] = useState('');
  const [fleetRoutes, setFleetRoutes] = useState<Route[]>([]);
  const [driverId, setDriverId] = useState('');
  const [attendantIds, setAttendantIds] = useState<string[]>([]);
  const [fleetBuses, setFleetBuses] = useState<Bus[]>([]);
  const [schoolStaff, setSchoolStaff] = useState<SchoolStaffOption[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(true);
  const [students, setStudents] = useState<BusRosterStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<BusRosterStudent | null>(null);
  const [studentBusId, setStudentBusId] = useState('');
  const [isSavingStudentBus, setIsSavingStudentBus] = useState(false);
  const [studentAssignmentMessage, setStudentAssignmentMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [newBusId, setNewBusId] = useState('');
  const [newBusName, setNewBusName] = useState('');
  const [newPlateNumber, setNewPlateNumber] = useState('');
  const [newRouteId, setNewRouteId] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [routeStartName, setRouteStartName] = useState('Start');
  const [routeStartLatitude, setRouteStartLatitude] = useState('');
  const [routeStartLongitude, setRouteStartLongitude] = useState('');
  const [routeEndName, setRouteEndName] = useState('End');
  const [routeEndLatitude, setRouteEndLatitude] = useState('');
  const [routeEndLongitude, setRouteEndLongitude] = useState('');
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routeCreateMessage, setRouteCreateMessage] = useState<string | null>(null);
  const [newDriverId, setNewDriverId] = useState('');
  const [isCreatingBus, setIsCreatingBus] = useState(false);
  const [createStatusMessage, setCreateStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listBuses(), listSchoolStaff(), listStudentsForAdmin(), listRoutes()]).then(([buses, staff, childDocs, routes]) => {
      if (!alive) return;
      setFleetBuses(buses);
      setSchoolStaff(staff);
      setStudents(childDocs);
      setFleetRoutes(routes);
    }).catch((error: unknown) => {
      console.error('Could not load school fleet:', error);
      if (alive) setStatusMessage('Could not load buses and staff. Check administrator access.');
    }).finally(() => { if (alive) setIsLoadingFleet(false); });
    return () => { alive = false; };
  }, []);

  const saveStudentBus = async () => {
    if (!selectedStudent?.parentId) {
      Alert.alert('Select a student', 'Choose a student account first.');
      return;
    }
    setIsSavingStudentBus(true);
    setStudentAssignmentMessage(null);
    try {
      await setStudentDefaultBus(selectedStudent.parentId, selectedStudent.id, studentBusId || null);
      setStudents((current) => current.map((student) => student.id === selectedStudent.id && student.parentId === selectedStudent.parentId
        ? { ...student, defaultBusId: studentBusId || undefined }
        : student));
      setSelectedStudent({ ...selectedStudent, defaultBusId: studentBusId || undefined });
      setStudentAssignmentMessage(studentBusId ? `Assigned ${selectedStudent.displayName} to ${studentBusId}.` : `Removed ${selectedStudent.displayName} from their bus.`);
    } catch (error) {
      console.error('Student bus assignment failed:', error);
      setStudentAssignmentMessage(error instanceof Error ? error.message : 'Could not assign this student.');
    } finally {
      setIsSavingStudentBus(false);
    }
  };

  const handleCreateRoute = async () => {
    if ([routeStartLatitude, routeStartLongitude, routeEndLatitude, routeEndLongitude].some((value) => !value.trim())) {
      setRouteCreateMessage('Enter latitude and longitude for both stops.');
      return;
    }
    setIsCreatingRoute(true);
    setRouteCreateMessage(null);
    try {
      const routeId = await createRoute(newRouteName, [
        { id: 'start', name: routeStartName, latitude: Number(routeStartLatitude), longitude: Number(routeStartLongitude), order: 0 },
        { id: 'end', name: routeEndName, latitude: Number(routeEndLatitude), longitude: Number(routeEndLongitude), order: 1 },
      ]);
      setFleetRoutes(await listRoutes());
      setNewRouteId(routeId);
      setNewRouteName('');
      setRouteCreateMessage(`Route created (${routeId}). You can assign it to a bus now.`);
    } catch (error) {
      console.error('Route creation failed:', error);
      setRouteCreateMessage(error instanceof Error ? error.message : 'Could not create route.');
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const handleSaveDriver = async () => {
    if (!busId) {
      Alert.alert('Missing bus', 'Provide the bus ID you want to update.');
      return;
    }

    setStatusMessage(null);
    setIsSaving(true);
    try {
      await assignSchoolBusFleet(busId.trim(), driverId.trim() || null, attendantIds, routeId.trim() || null);
      setBusId('');
      setRouteId('');
      setDriverId('');
      setAttendantIds([]);
      const [buses, staff] = await Promise.all([listBuses(), listSchoolStaff()]);
      setFleetBuses(buses);
      setSchoolStaff(staff);
      setStatusMessage('Bus driver and attendant assignments saved.');
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
        driverName: null,
        driverId: null,
      });
      if (newDriverId.trim()) await assignSchoolBusFleet(createdId, newDriverId.trim(), [], newRouteId.trim() || null);
      setNewBusId('');
      setNewBusName('');
      setNewPlateNumber('');
      setNewRouteId('');
      setNewDriverId('');
      setFleetBuses(await listBuses());
      setCreateStatusMessage(`Bus added${newDriverId.trim() ? ' and driver assigned' : ''} (${createdId}).`);
    } catch (error) {
      console.error('Create bus failed', error);
      setCreateStatusMessage('Unable to add bus. Check network or permissions.');
    } finally {
      setIsCreatingBus(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
        <SettingsButton />
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <Text style={[styles.heading, { color: palette.textStrong }]}>Admin Console</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>
          Manage buses, drivers, and temporary permissions. Full CRUD screens will be added as the
          data model evolves.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Driver Assignment</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Choose a bus, assign its school driver, and select any attendants. A staff member is moved off their previous bus automatically.</Text>
          {isLoadingFleet ? <ActivityIndicator color={theme.tint} /> : null}
          <View style={styles.options}>
            {fleetBuses.map((bus) => <Pressable key={bus.id} onPress={() => { setBusId(bus.id); setRouteId(bus.routeId ?? ''); setDriverId(bus.driverId ?? ''); setAttendantIds(bus.assignedAttendants ?? []); }} style={[styles.option, { borderColor: busId === bus.id ? theme.tint : palette.inputBorder, backgroundColor: busId === bus.id ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>{bus.nickname || `Bus ${bus.id.slice(0, 6)}`}</Text>
              <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>{bus.id}</Text>
            </Pressable>)}
          </View>
          <TextInput
            placeholder="Bus ID"
            value={busId}
            onChangeText={setBusId}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Routes</Text>
          <View style={styles.options}>
            {fleetRoutes.map((route) => <Pressable key={route.id} onPress={() => setRouteId(route.id)} style={[styles.option, { borderColor: routeId === route.id ? theme.tint : palette.inputBorder, backgroundColor: routeId === route.id ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>{route.name}</Text>
              <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>{route.id}</Text>
            </Pressable>)}
            <Pressable onPress={() => setRouteId('')} style={[styles.option, { borderColor: !routeId ? theme.tint : palette.inputBorder, backgroundColor: !routeId ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>No route assigned</Text>
            </Pressable>
          </View>
          <TextInput
            placeholder="Driver user ID (optional)"
            value={driverId}
            onChangeText={setDriverId}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            autoCapitalize="none"
            placeholderTextColor={palette.textSubtle}
          />
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>School drivers</Text>
          <View style={styles.options}>
            {schoolStaff.filter((staff) => staff.role === 'driver').map((staff) => <Pressable key={staff.id} onPress={() => setDriverId(driverId === staff.id ? '' : staff.id)} style={[styles.option, { borderColor: driverId === staff.id ? theme.tint : palette.inputBorder, backgroundColor: driverId === staff.id ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>{staff.name}</Text>
              <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>{staff.id}{staff.assignedBusId ? ` · ${staff.assignedBusId}` : ' · Unassigned'}</Text>
            </Pressable>)}
          </View>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Attendants (tap to toggle)</Text>
          <View style={styles.options}>
            {schoolStaff.filter((staff) => staff.role === 'attendant').map((staff) => <Pressable key={staff.id} onPress={() => setAttendantIds((current) => current.includes(staff.id) ? current.filter((id) => id !== staff.id) : [...current, staff.id])} style={[styles.option, { borderColor: attendantIds.includes(staff.id) ? theme.tint : palette.inputBorder, backgroundColor: attendantIds.includes(staff.id) ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>{staff.name}{attendantIds.includes(staff.id) ? ' ✓' : ''}</Text>
              <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>{staff.id}{staff.assignedBusId ? ` · ${staff.assignedBusId}` : ' · Unassigned'}</Text>
            </Pressable>)}
          </View>
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
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Student bus roster</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Assign students to a bus. Drivers and attendants will then see this live roster and can record check-ins during the active trip.</Text>
          <View style={styles.options}>
            {students.map((student) => {
              const key = `${student.parentId}/${student.id}`;
              const isSelected = selectedStudent?.id === student.id && selectedStudent.parentId === student.parentId;
              return <Pressable key={key} onPress={() => { setSelectedStudent(student); setStudentBusId(student.defaultBusId ?? ''); setStudentAssignmentMessage(null); }} style={[styles.option, { borderColor: isSelected ? theme.tint : palette.inputBorder, backgroundColor: isSelected ? `${theme.tint}18` : palette.inputBg }]}>
                <Text style={[styles.optionText, { color: palette.textStrong }]}>{student.displayName}</Text>
                <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>Parent {student.parentId.slice(0, 8)} · {student.defaultBusId ? `Bus ${student.defaultBusId}` : 'Unassigned'}</Text>
              </Pressable>;
            })}
          </View>
          {selectedStudent ? <>
            <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Bus for {selectedStudent.displayName}</Text>
            <View style={styles.options}>
              {fleetBuses.map((bus) => <Pressable key={bus.id} onPress={() => setStudentBusId(bus.id)} style={[styles.option, { borderColor: studentBusId === bus.id ? theme.tint : palette.inputBorder, backgroundColor: studentBusId === bus.id ? `${theme.tint}18` : palette.inputBg }]}>
                <Text style={[styles.optionText, { color: palette.textStrong }]}>{bus.nickname || `Bus ${bus.id.slice(0, 6)}`}</Text>
                <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>{bus.id}</Text>
              </Pressable>)}
              <Pressable onPress={() => setStudentBusId('')} style={[styles.option, { borderColor: !studentBusId ? theme.tint : palette.inputBorder, backgroundColor: !studentBusId ? `${theme.tint}18` : palette.inputBg }]}>
                <Text style={[styles.optionText, { color: palette.textStrong }]}>Unassign from bus</Text>
              </Pressable>
            </View>
            <Button title={isSavingStudentBus ? 'Saving…' : 'Save student assignment'} onPress={saveStudentBus} disabled={isSavingStudentBus} color={theme.tint} />
          </> : null}
          {studentAssignmentMessage ? <Text style={[styles.status, { color: palette.textMuted }]}>{studentAssignmentMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Add a route</Text>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Enter the real start and end coordinates. Drivers need an assigned route before they can start a school trip.</Text>
          <TextInput placeholder="Route name" value={newRouteName} onChangeText={setNewRouteName} style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]} placeholderTextColor={palette.textSubtle} />
          <TextInput placeholder="Start stop name" value={routeStartName} onChangeText={setRouteStartName} style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]} placeholderTextColor={palette.textSubtle} />
          <View style={styles.coordinateRow}>
            <TextInput placeholder="Start latitude" value={routeStartLatitude} onChangeText={setRouteStartLatitude} keyboardType="decimal-pad" style={[styles.input, styles.coordinateInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]} placeholderTextColor={palette.textSubtle} />
            <TextInput placeholder="Start longitude" value={routeStartLongitude} onChangeText={setRouteStartLongitude} keyboardType="decimal-pad" style={[styles.input, styles.coordinateInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]} placeholderTextColor={palette.textSubtle} />
          </View>
          <TextInput placeholder="End stop name" value={routeEndName} onChangeText={setRouteEndName} style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]} placeholderTextColor={palette.textSubtle} />
          <View style={styles.coordinateRow}>
            <TextInput placeholder="End latitude" value={routeEndLatitude} onChangeText={setRouteEndLatitude} keyboardType="decimal-pad" style={[styles.input, styles.coordinateInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]} placeholderTextColor={palette.textSubtle} />
            <TextInput placeholder="End longitude" value={routeEndLongitude} onChangeText={setRouteEndLongitude} keyboardType="decimal-pad" style={[styles.input, styles.coordinateInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]} placeholderTextColor={palette.textSubtle} />
          </View>
          <Button title={isCreatingRoute ? 'Creating…' : 'Create route'} onPress={handleCreateRoute} disabled={isCreatingRoute} color={theme.tint} />
          {routeCreateMessage ? <Text style={[styles.status, { color: palette.textMuted }]}>{routeCreateMessage}</Text> : null}
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
    </KeyboardAvoidingView>
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
  coordinateRow: { flexDirection: 'row', gap: 8 },
  coordinateInput: { flex: 1, minWidth: 0 },
  options: { gap: 8, maxHeight: 190 },
  option: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  optionText: { fontSize: 13, fontWeight: '600' },
  optionMeta: { fontSize: 10 },
});
