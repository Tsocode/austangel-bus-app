import type { Href } from 'expo-router';

import { SchoolRole, TravelRole, ServiceType } from '@/models/user';

// School Transport routes
const SCHOOL_ROLE_LANDING: Record<SchoolRole, Href> = {
  parent: '/(tabs)/track',
  driver: '/(tabs)/driver-tools',
  attendant: '/(tabs)/attendant',
  admin: '/(tabs)/admin',
};

// Vehicle & Travel routes
const TRAVEL_ROLE_LANDING: Record<TravelRole, Href> = {
  passenger: '/(travel)',
  driver: '/(travel)',
};

export function getLandingRouteForRole(
  role: SchoolRole | TravelRole | null | undefined,
  service?: ServiceType
): Href {
  if (!role) {
    return '/(tabs)/home';
  }

  if (service === 'travel') {
    return TRAVEL_ROLE_LANDING[role as TravelRole] ?? '/(travel)';
  }

  // A driver can use either service; without an explicit service, keep the
  // existing school transport default.
  const isSchoolRole = ['admin', 'driver', 'parent', 'attendant'].includes(role as string);

  if (isSchoolRole) {
    return SCHOOL_ROLE_LANDING[role as SchoolRole] ?? '/(tabs)/home';
  } else {
    return TRAVEL_ROLE_LANDING[role as TravelRole] ?? '/(travel)';
  }
}

export function getServiceFromRole(role: SchoolRole | TravelRole | null | undefined): ServiceType {
  if (!role) return 'school';
  
  const isSchoolRole = ['admin', 'driver', 'parent', 'attendant'].includes(role as string);
  return isSchoolRole ? 'school' : 'travel';
}
