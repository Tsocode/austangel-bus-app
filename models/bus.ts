export interface Bus {
  id: string;
  nickname: string;
  plateNumber?: string;
  driverId?: string;
  driverName?: string;
  assignedAttendants?: string[];
  parentIds?: string[];
  routeId?: string;
  updatedAt?: number;
}
