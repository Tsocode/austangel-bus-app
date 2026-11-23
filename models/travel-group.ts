export interface TravelGroup {
  id: string;
  name: string;
  description?: string;
  
  // Organization
  organizerId: string;       // User who created the group
  memberIds: string[];       // All member UIDs
  invitedEmails?: string[];  // Invited but not yet joined
  
  // Travel Details
  destination: {
    latitude: number;
    longitude: number;
    address: string;
    name: string;
  };
  startDate: number;         // Timestamp
  endDate?: number;          // Timestamp
  
  // Vehicle & Chauffeur
  vehicleId?: string;
  chauffeurdId?: string;
  
  // Status
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  
  // Privacy
  isPrivate: boolean;        // Not searchable/visible to others
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  
  // Photos
  photoUrl?: string;
}

export interface TravelGroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'organizer' | 'member';
  joinedAt: number;
  status: 'active' | 'left' | 'removed';
}
