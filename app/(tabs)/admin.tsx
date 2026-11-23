import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { assignSchoolBusFleet, createBus, listBuses, listSchoolStaff, SchoolStaffOption } from '@/services/firestore/buses';
import { Bus } from '@/models/bus';
import { BusRosterStudent, listStudentsForAdmin, setStudentDefaultBus } from '@/services/firestore/school';
import { createRoute, listRoutes } from '@/services/firestore/routes';
import { Route } from '@/models/route';

export default function AdminToolsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    cardBg: theme.surface,
    border: theme.border,
    textStrong: theme.text,
    textMuted: theme.icon,
    textSubtle: theme.icon,
    inputBg: theme.surfaceMuted,
    inputBorder: theme.border,
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

  const refreshAdminData = useCallback(async () => {
    setIsLoadingFleet(true);
    const results = await Promise.allSettled([
      listBuses(),
      listSchoolStaff(),
      listStudentsForAdmin(),
      listRoutes(),
    ]);
    const failures: string[] = [];

    if (results[0].status === 'fulfilled') setFleetBuses(results[0].value);
    else failures.push('buses');
    if (results[1].status === 'fulfilled') setSchoolStaff(results[1].value);
    else failures.push('school staff');
    if (results[2].status === 'fulfilled') setStudents(results[2].value);
    else failures.push('student roster');
    if (results[3].status === 'fulfilled') setFleetRoutes(results[3].value);
    else failures.push('routes');

    if (failures.length) {
      console.error('Some admin data could not be loaded:', results.filter((result) => result.status === 'rejected'));
      setStatusMessage(`Could not load ${failures.join(', ')}. Check admin access or tap Refresh to retry.`);
    } else {
      setStatusMessage(null);
    }
    setIsLoadingFleet(false);
    return failures;
  }, []);

  useEffect(() => {
    void refreshAdminData();
  }, [refreshAdminData]);

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
    const rawCoordinates = [routeStartLatitude, routeStartLongitude, routeEndLatitude, routeEndLongitude];
    if (rawCoordinates.some((value) => !value.trim())) {
      setRouteCreateMessage('Enter latitude and longitude for both stops.');
      return;
    }
    const coordinates = rawCoordinates.map(Number);
    const [startLatitude, startLongitude, endLatitude, endLongitude] = coordinates;
    if (!newRouteName.trim() || !routeStartName.trim() || !routeEndName.trim()) {
      setRouteCreateMessage('Enter a route name and names for both stops.');
      return;
    }
    if (coordinates.some((value) => !Number.isFinite(value)) ||
        startLatitude < -90 || startLatitude > 90 || endLatitude < -90 || endLatitude > 90 ||
        startLongitude < -180 || startLongitude > 180 || endLongitude < -180 || endLongitude > 180) {
      setRouteCreateMessage('Enter valid coordinates: latitude from -90 to 90 and longitude from -180 to 180.');
      return;
    }
    setIsCreatingRoute(true);
    setRouteCreateMessage(null);
    try {
      const routeId = await createRoute(newRouteName, [
        { id: 'start', name: routeStartName, latitude: startLatitude, longitude: startLongitude, order: 0 },
        { id: 'end', name: routeEndName, latitude: endLatitude, longitude: endLongitude, order: 1 },
      ]);
      await refreshAdminData();
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
    if (!busId.trim()) {
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
      const failedRefreshes = await refreshAdminData();
      setStatusMessage(failedRefreshes.length
        ? 'Assignments saved, but some lists did not refresh. Tap Refresh to reload them.'
        : 'Bus, route, driver, and attendant assignments saved.');
    } catch (error) {
      console.error('Driver update failed', error);
      setStatusMessage(error instanceof Error ? error.message : 'Could not save this assignment. Check the bus, staff roles, and connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBus = async () => {
    if (!newBusName.trim()) {
      Alert.alert('Missing bus name', 'Add a bus nickname to continue.');
      return;
    }

    const requestedDriverId = newDriverId.trim();
    const requestedRouteId = newRouteId.trim();
    if (requestedRouteId && !fleetRoutes.some((route) => route.id === requestedRouteId)) {
      setCreateStatusMessage('Choose a route from the existing route list.');
      return;
    }
    if (requestedDriverId && !schoolStaff.some((staff) => staff.id === requestedDriverId && staff.role === 'driver')) {
      setCreateStatusMessage('Choose a school driver from the loaded staff list.');
      return;
    }

    setCreateStatusMessage(null);
    setIsCreatingBus(true);
    try {
      const createdId = await createBus({
        id: newBusId.trim() ? newBusId.trim() : null,
        nickname: newBusName.trim(),
        plateNumber: newPlateNumber.trim() || null,
        routeId: null,
        driverName: null,
        driverId: null,
      });
      setNewBusId('');
      setNewBusName('');
      setNewPlateNumber('');
      setNewRouteId('');
      setNewDriverId('');
      let assignmentError: string | null = null;
      if (requestedDriverId || requestedRouteId) {
        try {
          await assignSchoolBusFleet(createdId, requestedDriverId || null, [], requestedRouteId || null);
        } catch (error) {
          assignmentError = error instanceof Error ? error.message : 'The bus was created, but its assignment could not be saved.';
        }
      }
      const failedRefreshes = await refreshAdminData();
      if (assignmentError) {
        setCreateStatusMessage(`Bus ${createdId} was created, but its assignment failed: ${assignmentError} Select it in Driver Assignment to retry.`);
      } else if (failedRefreshes.length) {
        setCreateStatusMessage(`Bus ${createdId} was added, but some lists did not refresh. Tap Refresh to reload.`);
      } else {
        setCreateStatusMessage(`Bus added${requestedDriverId ? ' and driver assigned' : ''} (${createdId}).`);
      }
    } catch (error) {
      console.error('Create bus failed', error);
      setCreateStatusMessage(error instanceof Error ? error.message : 'Unable to add bus. Check admin access and the connection.');
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
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
        <Text style={[styles.heading, { color: palette.textStrong }]}>Admin Console</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>
          Manage school buses, routes, staff assignments, and student rosters.
        </Text>
          </View>
          <Pressable
            onPress={() => void refreshAdminData()}
            disabled={isLoadingFleet}
            accessibilityRole="button"
            accessibilityLabel="Refresh admin data"
            style={[styles.refreshButton, { borderColor: palette.border, backgroundColor: palette.inputBg, opacity: isLoadingFleet ? 0.6 : 1 }]}>
            {isLoadingFleet ? <ActivityIndicator size="small" color={theme.tint} /> : <MaterialIcons name="refresh" size={19} color={theme.tint} />}
            <Text style={[styles.refreshText, { color: theme.tint }]}>Refresh</Text>
          </Pressable>
        </View>
        {statusMessage ? <Text style={[styles.status, { color: palette.textMuted }]}>{statusMessage}</Text> : null}

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
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Route (optional)</Text>
          <View style={styles.options}>
            {fleetRoutes.map((route) => <Pressable key={route.id} onPress={() => setNewRouteId(newRouteId === route.id ? '' : route.id)} style={[styles.option, { borderColor: newRouteId === route.id ? theme.tint : palette.inputBorder, backgroundColor: newRouteId === route.id ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>{route.name}{newRouteId === route.id ? ' · Selected' : ''}</Text>
              <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>{route.id}</Text>
            </Pressable>)}
            <Pressable onPress={() => setNewRouteId('')} style={[styles.option, { borderColor: !newRouteId ? theme.tint : palette.inputBorder, backgroundColor: !newRouteId ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>No route</Text>
            </Pressable>
          </View>
          <Text style={[styles.sectionHint, { color: palette.textSubtle }]}>Driver (optional)</Text>
          <View style={styles.options}>
            {schoolStaff.filter((staff) => staff.role === 'driver').map((staff) => <Pressable key={staff.id} onPress={() => setNewDriverId(newDriverId === staff.id ? '' : staff.id)} style={[styles.option, { borderColor: newDriverId === staff.id ? theme.tint : palette.inputBorder, backgroundColor: newDriverId === staff.id ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>{staff.name}{newDriverId === staff.id ? ' · Selected' : ''}</Text>
              <Text style={[styles.optionMeta, { color: palette.textSubtle }]}>{staff.id}{staff.assignedBusId ? ` · Currently on ${staff.assignedBusId}` : ' · Unassigned'}</Text>
            </Pressable>)}
            <Pressable onPress={() => setNewDriverId('')} style={[styles.option, { borderColor: !newDriverId ? theme.tint : palette.inputBorder, backgroundColor: !newDriverId ? `${theme.tint}18` : palette.inputBg }]}>
              <Text style={[styles.optionText, { color: palette.textStrong }]}>No driver</Text>
            </Pressable>
          </View>
          <Button
            title={isCreatingBus ? 'Creating…' : 'Add bus'}
            onPress={handleCreateBus}
            disabled={isCreatingBus}
            color={theme.tint}
            accessibilityLabel="Add a new bus"
          />
          {createStatusMessage ? <Text style={[styles.status, { color: palette.textMuted }]}>{createStatusMessage}</Text> : null}
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
    width: '100%',
    alignSelf: 'center',
    maxWidth: Layout.pageWidth,
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 88,
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, gap: 6 },
  refreshButton: { minHeight: 44, minWidth: 96, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  refreshText: { fontSize: 13, fontWeight: '700' },
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
  options: { gap: 8 },
  option: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  optionText: { fontSize: 13, fontWeight: '600' },
  optionMeta: { fontSize: 10 },
});
