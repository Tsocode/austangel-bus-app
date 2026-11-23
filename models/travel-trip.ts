export type TripStatus = 'requested' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'airport' | 'chauffeur' | 'tourism' | 'corporate' | 'wedding' | 'other';
export type TravelServiceClass = 'standard' | 'comfort' | 'premium';
export type TravelPaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refund_pending' | 'refunded';

export interface TravelLocation {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
}

export interface TravelBookingInput {
  pickupLocation: TravelLocation;
  dropoffLocation: TravelLocation;
  passengers: number;
  serviceClass: TravelServiceClass;
  scheduledTime: number;
}

export interface TravelFareQuote {
  amountCents: number;
  currency: string;
  straightLineKm: number;
  estimatedRoadKm: number;
}

export interface TravelTrip {
  id: string;
  tripType: TripType;
  
  // Participants
  passengerId: string;
  driverId?: string;
  travelGroupId?: string;    // If part of a group
  
  // Vehicle
  vehicleId?: string;
  
  // Route
  pickupLocation: TravelLocation;
  dropoffLocation: TravelLocation;
  
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
  estimatedCostCents?: number;
  estimatedDistanceKm?: number;
  currency?: string;
  serviceClass?: TravelServiceClass;
  paymentStatus?: TravelPaymentStatus;
  paymentIntentId?: string;
  refundId?: string;
  cancellationReason?: string;
  paidAt?: number;
  finalCost?: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}
