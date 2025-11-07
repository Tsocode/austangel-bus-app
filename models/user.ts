export type UserRole = 'admin' | 'driver' | 'parent';

export interface AustangelUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
  assignedBusId?: string;
  childIds?: string[];
  phoneNumber?: string;
  photoURL?: string;
  createdAt?: number;
  updatedAt?: number;
}
