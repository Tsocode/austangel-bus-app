import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

const rideTypes = [
  { id: 'standard', name: 'Standard', emoji: '🚗', baseRate: 2.5 },
  { id: 'comfort', name: 'Comfort', emoji: '🚘', baseRate: 3.5 },
  { id: 'premium', name: 'Premium', emoji: '🚙', baseRate: 5.0 },
];

export default function BookAppointmentScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [passengers, setPassengers] = useState('');
  const [rideType, setRideType] = useState('standard');
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [loading, setLoading] = useState(false);

  const calculateFare = () => {
    if (!pickupLocation || !dropoffLocation || !passengers) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedRide = rideTypes.find((r) => r.id === rideType);
    const baseDistance = 10;
    const fare = selectedRide?.baseRate! * baseDistance;
    setEstimatedFare(fare);
  };

  const handleProceedToPayment = async () => {
    if (!estimatedFare) {
      alert('Please calculate fare first');
      return;
    }

    setLoading(true);
    try {
      // TODO: Integrate with payment gateway
      // For now, just navigate to payment confirmation
      alert('Payment integration coming soon!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pickup Location */}
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Pickup Location</Text>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: '#e5e7eb',
                backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb',
              },
            ]}>
            <MaterialIcons name="location-on" size={20} color="#2563eb" />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Enter pickup location"
              placeholderTextColor="#9ca3af"
              value={pickupLocation}
              onChangeText={setPickupLocation}
            />
          </View>
        </View>

        {/* Dropoff Location */}
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Dropoff Location</Text>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: '#e5e7eb',
                backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb',
              },
            ]}>
            <MaterialIcons name="location-on" size={20} color="#2563eb" />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Enter dropoff location"
              placeholderTextColor="#9ca3af"
              value={dropoffLocation}
              onChangeText={setDropoffLocation}
            />
          </View>
        </View>

        {/* Date & Time Row */}
        <View style={styles.row}>
          <View style={[styles.formSection, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Date</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: '#e5e7eb',
                  backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb',
                },
              ]}>
              <MaterialIcons name="calendar-today" size={20} color="#2563eb" />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#9ca3af"
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>

          <View style={[styles.formSection, { flex: 1, marginLeft: 12 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Time</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: '#e5e7eb',
                  backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb',
                },
              ]}>
              <MaterialIcons name="access-time" size={20} color="#2563eb" />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="HH:MM"
                placeholderTextColor="#9ca3af"
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>
        </View>

        {/* Passengers */}
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Number of Passengers</Text>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: '#e5e7eb',
                backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb',
              },
            ]}>
            <MaterialIcons name="people" size={20} color="#2563eb" />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Number of passengers"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={passengers}
              onChangeText={setPassengers}
            />
          </View>
        </View>

        {/* Ride Type Selection */}
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Ride Type</Text>
          <View style={styles.rideTypeContainer}>
            {rideTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.rideTypeCard,
                  {
                    borderColor: rideType === type.id ? '#2563eb' : '#e5e7eb',
                    backgroundColor: rideType === type.id ? '#eff6ff' : 'transparent',
                  },
                ]}
                onPress={() => setRideType(type.id)}>
                <Text style={styles.rideTypeEmoji}>{type.emoji}</Text>
                <Text style={[styles.rideTypeName, { color: theme.colors.text }]}>
                  {type.name}
                </Text>
                <Text style={styles.rideTypePrice}>${(type.baseRate * 5).toFixed(0)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Estimated Fare Card */}
        <View
          style={[
            styles.fareCard,
            {
              backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb',
              borderColor: '#e5e7eb',
            },
          ]}>
          <View style={styles.fareContent}>
            <View>
              <Text style={[styles.fareLabel, { color: '#6b7280' }]}>Estimated Fare</Text>
              <Text style={[styles.fareAmount, { color: '#2563eb' }]}>
                ${estimatedFare.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity style={styles.calculateButton} onPress={calculateFare}>
              <Text style={styles.calculateButtonText}>Calculate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Proceed Button */}
        <TouchableOpacity
          style={[styles.proceedButton, loading && styles.proceedButtonDisabled]}
          onPress={handleProceedToPayment}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
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
    paddingBottom: 30,
  },
  formSection: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'System',
  },
  rideTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  rideTypeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  rideTypeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  rideTypeName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  rideTypePrice: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  fareCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  fareContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  calculateButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  calculateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    gap: 10,
    marginBottom: 20,
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  proceedButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
