import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthContext } from '@/providers/AuthProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function TravelDashboard() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.text }]}>
            Welcome back, {profile?.firstName || 'Guest'}! 👋
          </Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Ride & Travel Service
          </Text>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          {/* Book Appointment Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.bookCard]}
            onPress={() => router.push('/(travel)/book-appointment')}>
            <View style={styles.cardContent}>
              <MaterialIcons name="directions-car" size={48} color="#fff" />
              <Text style={styles.cardTitle}>Book a Ride</Text>
              <Text style={styles.cardSubtitle}>
                Schedule your next trip
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" style={styles.cardArrow} />
          </TouchableOpacity>

          {/* Monitor Trip Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.monitorCard]}
            onPress={() => router.push('/(travel)/monitor-trip')}>
            <View style={styles.cardContent}>
              <MaterialIcons name="location-on" size={48} color="#fff" />
              <Text style={styles.cardTitle}>Track Trip</Text>
              <Text style={styles.cardSubtitle}>
                Monitor your active trips
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" style={styles.cardArrow} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.icon, opacity: 0.1 }]}>
            <MaterialIcons name="check-circle" size={32} color={theme.tint} />
            <Text style={[styles.statLabel, { color: theme.text }]}>Completed Trips</Text>
            <Text style={[styles.statValue, { color: theme.tint }]}>0</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.icon, opacity: 0.1 }]}>
            <MaterialIcons name="star" size={32} color={theme.tint} />
            <Text style={[styles.statLabel, { color: theme.text }]}>Rating</Text>
            <Text style={[styles.statValue, { color: theme.tint }]}>---</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.icon, opacity: 0.1 }]}>
            <MaterialIcons name="account-balance-wallet" size={32} color={theme.tint} />
            <Text style={[styles.statLabel, { color: theme.text }]}>Wallet</Text>
            <Text style={[styles.statValue, { color: theme.tint }]}>$0.00</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.infoSection, { borderTopColor: theme.icon, borderTopWidth: 1 }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>About This Service</Text>
          <Text style={[styles.infoText, { color: theme.icon }]}>
            Book rides on-demand or schedule in advance. Track your driver in real-time and pay securely through the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  actionCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookCard: {
    backgroundColor: '#0a7ea4',
  },
  monitorCard: {
    backgroundColor: '#059669',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  cardArrow: {
    marginLeft: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  infoSection: {
    paddingTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
