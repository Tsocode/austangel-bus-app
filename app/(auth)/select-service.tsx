import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuthContext } from '@/providers/AuthProvider';
import { ServiceType } from '@/models/user';

export default function SelectServiceScreen() {
  const router = useRouter();
  const { profile, switchService, primaryService } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType>(primaryService || 'school');

  useEffect(() => {
    if (!profile) {
      router.replace('/(auth)/login');
    }
  }, [profile]);

  const handleServiceSelect = async (service: ServiceType) => {
    setLoading(true);
    try {
      setSelectedService(service);
      if (switchService) {
        await switchService(service);
      }
      
      // Navigate to the appropriate dashboard
      if (service === 'school') {
        router.replace('/(tabs)/track');
      } else {
        router.replace('/(travel)');
      }
    } catch (error) {
      console.error('Failed to switch service:', error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Service</Text>
          <Text style={styles.subtitle}>
            Welcome back, {profile?.firstName || profile?.displayName || 'User'}!
          </Text>
        </View>

        {/* School Transport Option */}
        <TouchableOpacity
          style={[
            styles.serviceCard,
            selectedService === 'school' && styles.serviceCardSelected,
          ]}
          onPress={() => handleServiceSelect('school')}
          disabled={loading}
          activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="directions-bus" size={48} color="#2563eb" />
          </View>
          <Text style={styles.serviceName}>School Transport</Text>
          <Text style={styles.serviceDescription}>
            Track school buses, manage attendance, and stay connected with drivers
          </Text>
          {selectedService === 'school' && (
            <View style={styles.selectedBadge}>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.selectedText}>Selected</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Vehicle & Travel Option */}
        <TouchableOpacity
          style={[
            styles.serviceCard,
            selectedService === 'travel' && styles.serviceCardSelected,
          ]}
          onPress={() => handleServiceSelect('travel')}
          disabled={loading}
          activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="directions-car" size={48} color="#dc2626" />
          </View>
          <Text style={styles.serviceName}>Vehicle & Travel</Text>
          <Text style={styles.serviceDescription}>
            Book rides, manage group trips, or offer private transportation services
          </Text>
          {selectedService === 'travel' && (
            <View style={styles.selectedBadge}>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.selectedText}>Selected</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.continueButtonDisabled]}
          onPress={() => handleServiceSelect(selectedService)}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue to App</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Can Switch Later Note */}
        <Text style={styles.switchNote}>
          💡 You can switch services anytime from your profile settings
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    shadowOpacity: 0.15,
  },
  iconContainer: {
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  selectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  continueButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  switchNote: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 20,
  },
});
