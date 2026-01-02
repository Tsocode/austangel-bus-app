import { AustangelUser } from '@/models/user';

type NameFallback = 'Austangel' | 'Attendant';

export const formatUserName = (
  profile: AustangelUser | null | undefined,
  fallback: NameFallback = 'Austangel'
): string => {
  const firstName = profile?.firstName?.trim() ?? '';
  const lastName = profile?.lastName?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  if (fullName) {
    return fullName;
  }
  const displayName = profile?.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  const email = profile?.email?.trim();
  if (email) {
    return email;
  }
  return fallback;
};

export const formatRoleLabel = (role?: string | null): string => {
  if (!role) {
    return 'Parent';
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
};
