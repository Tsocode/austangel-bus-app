export type TripStatus = 'requested' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'airport' | 'chauffeur' | 'tourism' | 'corporate' | 'wedding' | 'other';

export interface TravelTrip {
  id: string;
  tripType: TripType;
  
  // Participants
  passengerId: string;
  chauffeurdId?: string;
  travelGroupId?: string;    // If part of a group
  
  // Vehicle
  vehicleId?: string;
  
  // Route
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    name?: string;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    address: string;
    name?: string;
  };
  
  // Timing
  requestedTime: number;     // When trip was requested
  scheduledTime?: number;    // Planned start time
  startTime?: number;        // Actual start
  endTime?: number;          // Actual end
  estimatedDuration?: number; // In minutes
  
  // Status
  status: TripStatus;
  
  // Additional Info
  passengers?: number;       // Number of passengers
  specialRequests?: string;
  estimatedCost?: number;
  finalCost?: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}
