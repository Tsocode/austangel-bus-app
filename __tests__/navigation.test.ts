import { getLandingRouteForRole } from '@/utils/navigation';

describe('navigation helpers', () => {
  it('returns default landing for unknown role', () => {
    expect(getLandingRouteForRole(null)).toBe('/(tabs)/track');
  });

  it('returns landing for driver', () => {
    expect(getLandingRouteForRole('driver')).toBe('/(tabs)/driver-tools');
  });

});
