// School Transport roles
export type SchoolRole = 'admin' | 'driver' | 'parent' | 'attendant';

// Vehicle & Travel roles
export type TravelRole = 'passenger' | 'driver';

// All possible roles
export type UserRole = SchoolRole | TravelRole;

// Service type indicates which platform user is using
export type ServiceType = 'school' | 'travel';

export interface AustangelUser {
  id: string;
  email: string;
  
  // Service & Role Management
  primaryService?: ServiceType;           // Which service user typically uses
  schoolRole?: SchoolRole;                // School transport role
  travelRole?: TravelRole;                // Vehicle & travel role
  
  // Deprecated - kept for backward compatibility
  role?: UserRole;                        // Legacy - will be migrated
  
  // Profile Info
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  
  // School Transport Fields
  assignedBusId?: string;                 // For school drivers/attendants
  childIds?: string[];                    // For school parents
  
  // Vehicle & Travel Fields
  fleetId?: string;                       // For chauffeurs/fleet operators
  travelGroupIds?: string[];              // For passengers/organizers
  verificationStatus?: 'pending' | 'verified' | 'rejected';  // For chauffeurs
  licenseNumber?: string;                 // For chauffeurs (encrypted in production)
  
  // Timestamps
  createdAt?: number;
  updatedAt?: number;
}
