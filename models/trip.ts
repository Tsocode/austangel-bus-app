export type TripShift = 'AM' | 'PM';

export interface Trip {
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  shift: TripShift;
  startTime?: number;
  endTime?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: number;
  updatedAt?: number;
}
