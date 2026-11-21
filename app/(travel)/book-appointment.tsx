import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function BookAppointmentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [rideType, setRideType] = useState('economy');
  const [loading, setLoading] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState(0);

  const rideTypes = [
    { id: 'economy', name: 'Economy', emoji: '🚗', baseRate: 2.5 },
    { id: 'comfort', name: 'Comfort', emoji: '🚙', baseRate: 3.5 },
    { id: 'premium', name: 'Premium', emoji: '🚘', baseRate: 5.0 },
  ];

  const calculateFare = () => {
    // Simple fare calculation: baseRate * distance + passenger fee
    const baseRate = rideTypes.find(r => r.id === rideType)?.baseRate || 2.5;
    const passengerFee = (parseInt(passengers) - 1) * 1.5;
    const distance = 5; // Mock distance
    const fare = baseRate * distance + passengerFee;
    setEstimatedFare(fare);
  };

  const handleProceedToPayment = async () => {
    if (!pickupLocation || !dropoffLocation || !date || !time) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Simulate booking creation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Navigate to payment screen
      router.push({
        pathname: '/(travel)/payment',
        params: {
          tripId: `TRIP-${Date.now()}`,
          pickup: pickupLocation,
          dropoff: dropoffLocation,
          fare: estimatedFare.toFixed(2),
          rideType,
          passengerCount: passengers,
          date,
          time,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Pickup Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Pickup Location</Text>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: theme.icon,
                backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
              },
            ]}>
            <MaterialIcons name="location-on" size={20} color={theme.tint} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Enter pickup location"
              placeholderTextColor={theme.icon}
              value={pickupLocation}
              onChangeText={setPickupLocation}
            />
          </View>
        </View>

        {/* Dropoff Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Dropoff Location</Text>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: theme.icon,
                backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
              },
            ]}>
            <MaterialIcons name="location-on" size={20} color={theme.tint} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Enter dropoff location"
              placeholderTextColor={theme.icon}
              value={dropoffLocation}
              onChangeText={setDropoffLocation}
            />
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.row}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Date</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: theme.icon,
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                },
              ]}>
              <MaterialIcons name="calendar-today" size={20} color={theme.tint} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={theme.icon}
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>

          <View style={[styles.section, { flex: 1, marginLeft: 12 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Time</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: theme.icon,
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                },
              ]}>
              <MaterialIcons name="schedule" size={20} color={theme.tint} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="HH:MM"
                placeholderTextColor={theme.icon}
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>
        </View>

        {/* Passengers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Passengers</Text>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: theme.icon,
                backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
              },
            ]}>
            <MaterialIcons name="people" size={20} color={theme.tint} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Number of passengers"
              placeholderTextColor={theme.icon}
              keyboardType="numeric"
              value={passengers}
              onChangeText={setPassengers}
            />
          </View>
        </View>

        {/* Ride Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ride Type</Text>
          <View style={styles.rideTypeContainer}>
            {rideTypes.map(ride => (
              <TouchableOpacity
                key={ride.id}
                style={[
                  styles.rideTypeCard,
                  {
                    borderColor: rideType === ride.id ? theme.tint : theme.icon,
                    backgroundColor:
                      rideType === ride.id
                        ? colorScheme === 'dark'
                          ? '#1a3a4a'
                          : '#e0f2fe'
                        : colorScheme === 'dark'
                          ? '#2a2a2a'
                          : '#f5f5f5',
                  },
                ]}
                onPress={() => setRideType(ride.id)}>
                <Text style={styles.rideEmoji}>{ride.emoji}</Text>
                <Text style={[styles.rideName, { color: theme.text }]}>{ride.name}</Text>
                <Text style={[styles.rideRate, { color: theme.icon }]}>
                  ${ride.baseRate.toFixed(2)}/km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fare Estimate */}
        <TouchableOpacity
          style={[styles.estimateButton, { backgroundColor: theme.tint }]}
          onPress={calculateFare}>
          <MaterialIcons name="calculate" size={20} color="#fff" />
          <Text style={styles.estimateButtonText}>Calculate Fare</Text>
        </TouchableOpacity>

        {estimatedFare > 0 && (
          <View style={[styles.fareCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f9fafb' }]}>
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: theme.text }]}>Estimated Fare:</Text>
              <Text style={[styles.fareAmount, { color: theme.tint }]}>
                ${estimatedFare.toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.fareNote, { color: theme.icon }]}>
              Final fare may vary based on actual distance and traffic
            </Text>
          </View>
        )}

        {/* Proceed to Payment Button */}
        <TouchableOpacity
          style={[
            styles.bookButton,
            { backgroundColor: theme.tint, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={handleProceedToPayment}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="payment" size={20} color="#fff" />
              <Text style={styles.bookButtonText}>Proceed to Payment</Text>
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
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  sectionTitle: {
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
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  rideTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  rideTypeCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  rideEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  rideName: {
    fontSize: 12,
    fontWeight: '600',
  },
  rideRate: {
    fontSize: 11,
    marginTop: 2,
  },
  estimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  estimateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fareCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  fareNote: {
    fontSize: 11,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
