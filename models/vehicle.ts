export type VehicleType = 'car' | 'suv' | 'minibus' | 'van' | 'coach';

export interface Vehicle {
  id: string;
  fleetId: string;
  make: string;              // e.g., "Toyota"
  model: string;             // e.g., "Hiace"
  year: number;
  color: string;
  plateNumber: string;
  vin?: string;              // Vehicle Identification Number (admin only)
  passengerCapacity: number;
  
  // Photos & Documents
  photoUrl?: string;         // Public vehicle photo
  registrationDocUrl?: string;
  insuranceDocUrl?: string;
  
  // Status
  verificationStatus: 'pending' | 'verified' | 'rejected';
  status: 'available' | 'in_use' | 'maintenance' | 'inactive';
  
  // Assignment
  assignedChauffeurdId?: string;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;         // Fleet operator ID
}
