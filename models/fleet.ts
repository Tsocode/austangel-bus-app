export interface Fleet {
  id: string;
  name: string;
  companyName?: string;
  
  // Administration
  operatorId: string;        // Owner/primary admin
  adminIds: string[];        // Other admins
  
  // Company Info
  registrationNumber?: string;
  taxId?: string;
  phoneNumber?: string;
  email?: string;
  
  // Address
  headquarters?: {
    address: string;
    city: string;
    state?: string;
    country: string;
  };
  
  // Documents
  businessLicenseUrl?: string;
  insuranceCertificateUrl?: string;
  
  // Status
  verificationStatus: 'pending' | 'verified' | 'rejected';
  status: 'active' | 'suspended' | 'inactive';
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface FleetMember {
  id: string;
  fleetId: string;
  userId: string;
  role: 'admin' | 'chauffeur' | 'mechanic' | 'dispatcher';
  joinedAt: number;
  status: 'active' | 'suspended' | 'left';
}
