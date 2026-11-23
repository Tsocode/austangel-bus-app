export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type InvitationType = 'travel_group' | 'fleet' | 'trip';

export interface Invitation {
  id: string;
  type: InvitationType;
  
  // Parties Involved
  fromUserId: string;        // Who sent the invitation
  toEmail: string;           // Recipient email
  toUserId?: string;         // If already registered
  
  // Target
  groupId?: string;          // For group invitations
  fleetId?: string;          // For fleet invitations
  tripId?: string;           // For trip invitations
  
  // Details
  message?: string;
  status: InvitationStatus;
  
  // Timing
  createdAt: number;
  expiresAt: number;         // Invitation expires after 30 days
  acceptedAt?: number;
  
  // Role (what role they're being invited as)
  invitedRole?: 'member' | 'organizer' | 'chauffeur' | 'admin';
}
