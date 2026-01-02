export type UserRole = 'admin' | 'driver' | 'parent' | 'attendant';

export interface AustangelUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  assignedBusId?: string;
  childIds?: string[];
  phoneNumber?: string;
  photoURL?: string;
  createdAt?: number;
  updatedAt?: number;
}
