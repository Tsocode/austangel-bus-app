import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface Trip {
  id: string;
  status: 'active' | 'completed' | 'cancelled';
  pickup: string;
  dropoff: string;
  time: string;
  fare: number;
  driverName: string;
  driverRating: number;
  vehicleType: string;
  estimatedArrival: string;
  currentLocation: string;
}

export default function MonitorTripScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [trips, setTrips] = useState<Trip[]>([
    {
      id: 'TRIP-001',
      status: 'active',
      pickup: '123 Main St',
      dropoff: '456 Oak Ave',
      time: 'Today, 2:30 PM',
      fare: 15.75,
      driverName: 'John Smith',
      driverRating: 4.8,
      vehicleType: 'Toyota Camry',
      estimatedArrival: '8 minutes',
      currentLocation: '250 m away',
    },
    {
      id: 'TRIP-002',
      status: 'completed',
      pickup: '789 Pine Rd',
      dropoff: '321 Elm St',
      time: 'Today, 1:00 PM',
      fare: 12.50,
      driverName: 'Sarah Johnson',
      driverRating: 5.0,
      vehicleType: 'Honda Civic',
      estimatedArrival: 'Completed',
      currentLocation: 'Destination reached',
    },
    {
      id: 'TRIP-003',
      status: 'active',
      pickup: '555 Maple Dr',
      dropoff: '999 Cedar Ln',
      time: 'Today, 4:00 PM',
      fare: 22.25,
      driverName: 'Mike Chen',
      driverRating: 4.9,
      vehicleType: 'Toyota Prius',
      estimatedArrival: '15 minutes',
      currentLocation: '1.2 km away',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#059669';
      case 'completed':
        return '#0a7ea4';
      case 'cancelled':
        return '#dc2626';
      default:
        return theme.tint;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'directions-car';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate refreshing trips from server
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In real app, would fetch from Firestore
    } finally {
      setLoading(false);
    }
  };

  const handleTripDetails = (tripId: string) => {
    setSelectedTrip(selectedTrip === tripId ? null : tripId);
  };

  const TripCard = ({ trip }: { trip: Trip }) => {
    const isExpanded = selectedTrip === trip.id;
    const statusColor = getStatusColor(trip.status);

    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          {
            backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f9fafb',
            borderColor: statusColor,
            borderWidth: 2,
            borderLeftWidth: 4,
          },
        ]}
        onPress={() => handleTripDetails(trip.id)}>
        {/* Header */}
        <View style={styles.tripHeader}>
          <View style={styles.tripTitleSection}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <MaterialIcons
                name={getStatusIcon(trip.status) as any}
                size={14}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tripRoute, { color: theme.text }]}>
                {trip.pickup.split(' ')[0]} → {trip.dropoff.split(' ')[0]}
              </Text>
              <Text style={[styles.tripTime, { color: theme.icon }]}>
                {trip.time}
              </Text>
            </View>
          </View>
          <View style={styles.tripFare}>
            <Text style={[styles.fareAmount, { color: statusColor }]}>
              ${trip.fare.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.icon, opacity: 0.2 }]} />

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialIcons name="schedule" size={16} color={theme.tint} />
                <Text style={[styles.statText, { color: theme.text }]}>
                  {trip.estimatedArrival}
                </Text>
              </View>
              <View style={styles.stat}>
                <MaterialIcons name="location-on" size={16} color={theme.tint} />
                <Text style={[styles.statText, { color: theme.text }]}>
                  {trip.currentLocation}
                </Text>
              </View>
            </View>

            {/* Driver Info */}
            <View style={[styles.driverSection, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff' }]}>
              <View style={styles.driverInfo}>
                <MaterialIcons name="account-circle" size={40} color={theme.tint} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.driverName, { color: theme.text }]}>
                    {trip.driverName}
                  </Text>
                  <View style={styles.ratingRow}>
                    <MaterialIcons name="star" size={14} color="#fbbf24" />
                    <Text style={[styles.rating, { color: theme.text }]}>
                      {trip.driverRating}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.vehicleTag, { backgroundColor: theme.tint }]}>
                <MaterialIcons name="directions-car" size={14} color="#fff" />
                <Text style={styles.vehicleType}>{trip.vehicleType}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.tint, opacity: 0.1 }]}>
                <MaterialIcons name="phone" size={18} color={theme.tint} />
                <Text style={[styles.actionButtonText, { color: theme.tint }]}>Call Driver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.tint, opacity: 0.1 }]}>
                <MaterialIcons name="message" size={18} color={theme.tint} />
                <Text style={[styles.actionButtonText, { color: theme.tint }]}>Message</Text>
              </TouchableOpacity>

              {trip.status === 'active' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#dc2626', opacity: 0.1 }]}>
                  <MaterialIcons name="cancel" size={18} color="#dc2626" />
                  <Text style={[styles.actionButtonText, { color: '#dc2626' }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Your Trips</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.tint }]}
          onPress={handleRefresh}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.tint} size="small" />
          ) : (
            <MaterialIcons name="refresh" size={20} color={theme.tint} />
          )}
        </TouchableOpacity>
      </View>

      {/* Empty State or Trip List */}
      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="directions-car" size={64} color={theme.icon} />
          <Text style={[styles.emptyStateText, { color: theme.text }]}>
            No trips yet
          </Text>
          <Text style={[styles.emptyStateSubtext, { color: theme.icon }]}>
            Book your first ride to get started
          </Text>
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: theme.tint }]}
            onPress={() => router.push('/(travel)/book-appointment')}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.bookButtonText}>Book a Ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={trip => trip.id}
          renderItem={({ item }) => <TripCard trip={item} />}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  refreshButton: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  tripCard: {
    borderRadius: 12,
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripTitleSection: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tripRoute: {
    fontSize: 14,
    fontWeight: '600',
  },
  tripTime: {
    fontSize: 12,
    marginTop: 4,
  },
  tripFare: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  driverSection: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  driverName: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  vehicleType: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 24,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
