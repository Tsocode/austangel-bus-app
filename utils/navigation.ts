import type { Href } from 'expo-router';

import { UserRole } from '@/models/user';

const ROLE_LANDING: Record<UserRole, Href> = {
  parent: '/(tabs)/track',
  driver: '/(tabs)/driver-tools',
  admin: '/(tabs)/admin',
};

export function getLandingRouteForRole(role: UserRole | null | undefined): Href {
  if (!role) {
    return '/(tabs)/track';
  }
  return ROLE_LANDING[role] ?? '/(tabs)/track';
}
