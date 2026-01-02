import type { Href } from 'expo-router';

import { UserRole } from '@/models/user';

const ROLE_LANDING: Record<UserRole, Href> = {
  parent: '/track',
  driver: '/driver-tools',
  attendant: '/attendant',
  admin: '/admin',
};

export function getLandingRouteForRole(role: UserRole | null | undefined): Href {
  if (!role) {
    return '/track';
  }
  return ROLE_LANDING[role] ?? '/track';
}
