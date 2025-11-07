export interface TrackingPermission {
  id: string;
  parentId: string;
  busId: string;
  childId?: string;
  grantedBy: string;
  startsAt: number;
  expiresAt: number;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  createdAt?: number;
  updatedAt?: number;
}
