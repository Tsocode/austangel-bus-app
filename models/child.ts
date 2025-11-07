export interface ChildProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  guardianIds: string[];
  defaultBusId?: string;
  photoURL?: string;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}
