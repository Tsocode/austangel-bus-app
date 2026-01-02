import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const FAQS = [
  {
    question: 'How do I start tracking a bus?',
    answer:
      'Make sure your profile is linked to a bus or a child. Then open Track and select the bus.',
  },
  {
    question: 'What if the bus location looks stale?',
    answer:
      'Stale locations usually mean the driver has not started the trip or has poor signal.',
  },
  {
    question: 'How do I report a problem?',
    answer: 'Open the Report issue button on Home or send a note from the Help screen.',
  },
];

export default function HelpScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const palette = {
    screenBg: theme.background,
    heroBg: isDark ? '#0f172a' : '#EEF2FF',
    cardBg: isDark ? '#111827' : '#fff',
    border: isDark ? '#1f2937' : '#E5E7EB',
    textStrong: isDark ? '#f8fafc' : '#111827',
    textMuted: isDark ? '#94a3b8' : '#4B5563',
    textSubtle: isDark ? '#9ca3af' : '#475569',
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.screenBg }]}>
      <SettingsButton />
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screenBg }]}>
      <ThemedView style={[styles.hero, { backgroundColor: palette.heroBg }]}>
        <ThemedText type="title">Help & Support</ThemedText>
        <ThemedText type="default" style={[styles.subtle, { color: palette.textMuted }]}>
          Answers to common questions, plus ways to contact the team.
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Quick help</ThemedText>
        <View style={styles.list}>
          <Text style={[styles.listItem, { color: palette.textStrong }]}>• Track your assigned bus in real time</Text>
          <Text style={[styles.listItem, { color: palette.textStrong }]}>• Check in riders as they board or drop off</Text>
          <Text style={[styles.listItem, { color: palette.textStrong }]}>• Report issues directly to the admin team</Text>
        </View>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">FAQ</ThemedText>
        {FAQS.map((item) => (
          <View key={item.question} style={styles.faqRow}>
            <Text style={[styles.faqQuestion, { color: palette.textStrong }]}>{item.question}</Text>
            <Text style={[styles.faqAnswer, { color: palette.textSubtle }]}>{item.answer}</Text>
          </View>
        ))}
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
        <ThemedText type="subtitle">Contact</ThemedText>
        <Text style={[styles.contactText, { color: palette.textStrong }]}>Support email: support@austangel.com</Text>
        <Text style={[styles.contactText, { color: palette.textStrong }]}>Phone: +234 (0) 800-123-4567</Text>
        <Text style={[styles.contactText, { color: palette.textStrong }]}>Hours: Mon–Fri, 8:00am–6:00pm</Text>
      </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 18,
    paddingTop: 48,
    gap: 14,
  },
  hero: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  subtle: {
    color: '#4B5563',
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  list: {
    gap: 6,
  },
  listItem: {
    fontSize: 14,
    color: '#1F2937',
  },
  faqRow: {
    gap: 4,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  contactText: {
    fontSize: 13,
    color: '#111827',
  },
});
