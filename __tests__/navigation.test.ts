import { getLandingRouteForRole } from '@/utils/navigation';

describe('navigation helpers', () => {
  it('returns default landing for unknown role', () => {
    expect(getLandingRouteForRole(null)).toBe('/track');
  });

  it('returns landing for driver', () => {
    expect(getLandingRouteForRole('driver')).toBe('/driver-tools');
  });

  it('returns landing for parent', () => {
    expect(getLandingRouteForRole('parent')).toBe('/track');
  });

  it('returns landing for attendant', () => {
    expect(getLandingRouteForRole('attendant')).toBe('/attendant');
  });

  it('returns landing for admin', () => {
    expect(getLandingRouteForRole('admin')).toBe('/admin');
  });
});
