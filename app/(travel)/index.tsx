import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthContext } from '@/providers/AuthProvider';

export default function TravelDashboard() {
  const router = useRouter();
  const { profile } = useAuthContext();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome back, {profile?.firstName || 'Guest'}! 👋
          </Text>
          <Text style={styles.subtitle}>Vehicle & Travel Services</Text>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Book Appointment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(travel)/book-appointment')}
            activeOpacity={0.8}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="directions-car" size={40} color="#2563eb" />
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Book an Appointment</Text>
              <Text style={styles.buttonSubtitle}>Schedule a ride or trip</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#6b7280" />
          </TouchableOpacity>

          {/* Monitor Trip Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(travel)/monitor-trip')}
            activeOpacity={0.8}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="location-on" size={40} color="#059669" />
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Monitor Trip</Text>
              <Text style={styles.buttonSubtitle}>Track your active trips</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Quick Info Cards */}
        <View style={styles.infoCardsContainer}>
          <View style={styles.infoCard}>
            <MaterialIcons name="check-circle" size={28} color="#2563eb" />
            <Text style={styles.infoCardLabel}>Completed</Text>
            <Text style={styles.infoCardValue}>0 trips</Text>
          </View>

          <View style={styles.infoCard}>
            <MaterialIcons name="star" size={28} color="#f59e0b" />
            <Text style={styles.infoCardLabel}>Rating</Text>
            <Text style={styles.infoCardValue}>--</Text>
          </View>

          <View style={styles.infoCard}>
            <MaterialIcons name="account-balance-wallet" size={28} color="#059669" />
            <Text style={styles.infoCardLabel}>Wallet</Text>
            <Text style={styles.infoCardValue}>$0.00</Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About Vehicle & Travel</Text>
          <Text style={styles.aboutText}>
            Easily book rides, track trips in real-time, and manage your transportation needs. Pay securely through the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  infoCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    justifyContent: 'space-between',
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  aboutSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  aboutText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
});
