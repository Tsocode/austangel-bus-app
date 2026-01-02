import { useMemo, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthContext } from '@/providers/AuthProvider';
import { formatUserName } from '@/utils/user';
import { SettingsButton } from '@/components/ui/SettingsButton';

type RosterItem = { id: string; name: string; status: 'expected' | 'on' | 'off' };

const DEMO_ROSTER: RosterItem[] = [
  { id: 'stu-1', name: 'Ada O.', status: 'expected' },
  { id: 'stu-2', name: 'Tunde A.', status: 'expected' },
  { id: 'stu-3', name: 'Ife K.', status: 'on' },
];

export default function AttendantScreen() {
  const { profile } = useAuthContext();
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
    rowDivider: isDark ? '#1f2937' : '#f1f5f9',
  };
  const [roster, setRoster] = useState<RosterItem[]>(DEMO_ROSTER);
  const [filter, setFilter] = useState('');
  const [note, setNote] = useState('');

  const filteredRoster = useMemo(() => {
    if (!filter.trim()) return roster;
    return roster.filter((item) =>
      item.name.toLowerCase().includes(filter.trim().toLowerCase())
    );
  }, [filter, roster]);

  const updateStatus = (id: string, status: RosterItem['status']) => {
    setRoster((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <SettingsButton />
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]}>
        <Text style={[styles.heading, { color: palette.textStrong }]}>Attendant Check-ins</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Track expected students and mark on/off bus. Offline queue and sync will be added.
        </Text>
        <Text style={[styles.meta, { color: palette.textSubtle }]}>
          User: {formatUserName(profile, 'Attendant')} • Bus: Assigned bus
        </Text>

        <View style={[styles.section, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Roster</Text>
          <TextInput
            placeholder="Search student"
            value={filter}
            onChangeText={setFilter}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong }]}
            placeholderTextColor={palette.textSubtle}
          />
          {filteredRoster.map((item) => (
            <View key={item.id} style={[styles.rosterRow, { borderBottomColor: palette.rowDivider }]}>
              <View>
                <Text style={[styles.rosterName, { color: palette.textStrong }]}>{item.name}</Text>
                <Text style={[styles.rosterId, { color: palette.textSubtle }]}>{item.id}</Text>
              </View>
              <View style={styles.rowButtons}>
                <Button
                  title="On"
                  color={item.status === 'on' ? '#22c55e' : undefined}
                  onPress={() => updateStatus(item.id, 'on')}
                  accessibilityLabel={`Mark ${item.name} on bus`}
                />
                <Button
                  title="Off"
                  color={item.status === 'off' ? '#f97316' : undefined}
                  onPress={() => updateStatus(item.id, 'off')}
                  accessibilityLabel={`Mark ${item.name} off bus`}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Exceptions & Notes</Text>
          <Text style={[styles.smallText, { color: palette.textSubtle }]}>
            Use this for missing riders, custody flags, or extra riders. Sends to admin.
          </Text>
          <TextInput
            placeholder="Enter a note to admins"
            value={note}
            onChangeText={setNote}
            style={[
              styles.input,
              { height: 80, backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.textStrong },
            ]}
            multiline
            placeholderTextColor={palette.textSubtle}
          />
          <Button
            title="Send note"
            onPress={() => Alert.alert('Note sent', 'Admins notified.')}
            color={theme.tint}
            accessibilityLabel="Send note to admins"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fb' },
  container: { flexGrow: 1, padding: 16, gap: 16 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569' },
  meta: { fontSize: 12, color: '#6b7280' },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  smallText: { fontSize: 13, color: '#6b7280' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rosterName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  rosterId: { fontSize: 12, color: '#6b7280' },
  rowButtons: { flexDirection: 'row', gap: 8 },
});
