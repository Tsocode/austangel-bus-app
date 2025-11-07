export type CheckinType = 'boarded' | 'dropped';

export interface Checkin {
  id: string;
  tripId: string;
  childId: string;
  type: CheckinType;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  note?: string;
  recordedBy: string; // driverId
}
