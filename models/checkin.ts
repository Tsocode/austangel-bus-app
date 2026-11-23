export type CheckinType = 'boarded' | 'dropped';

export interface Checkin {
  id: string;
  tripId: string;
  busId: string;
  childId: string;
  parentId: string;
  type: CheckinType;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  note?: string;
  recordedBy: string; // driverId
}
