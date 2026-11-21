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
  passenger: '/(travel)/trips',
  chauffeur: '/(travel)/dashboard',
  fleet_operator: '/(travel)/fleet',
  travel_organizer: '/(travel)/groups',
  travel_admin: '/(travel)/admin',
};

export function getLandingRouteForRole(
  role: SchoolRole | TravelRole | null | undefined,
  service?: ServiceType
): Href {
  if (!role) {
    return '/(tabs)/home';
  }

  // Determine which service based on role
  const isSchoolRole = ['admin', 'driver', 'parent', 'attendant'].includes(role as string);

  if (isSchoolRole) {
    return SCHOOL_ROLE_LANDING[role as SchoolRole] ?? '/(tabs)/home';
  } else {
    return TRAVEL_ROLE_LANDING[role as TravelRole] ?? '/(travel)/trips';
  }
}

export function getServiceFromRole(role: SchoolRole | TravelRole | null | undefined): ServiceType {
  if (!role) return 'school';
  
  const isSchoolRole = ['admin', 'driver', 'parent', 'attendant'].includes(role as string);
  return isSchoolRole ? 'school' : 'travel';
}
