import {
  getOwnerReturnHref,
  withOwnerReturnTarget,
} from '@/lib/navigation/ownerReturnTargets';

describe('owner return targets', () => {
  it('maps supported return targets to staff routes', () => {
    expect(getOwnerReturnHref('home')).toBe('/(staff)/home');
    expect(getOwnerReturnHref('business')).toBe('/(staff)/profile');
    expect(getOwnerReturnHref('settings')).toBe('/(staff)/settings');
  });

  it('ignores unsupported return targets', () => {
    expect(getOwnerReturnHref('reservations')).toBeNull();
    expect(getOwnerReturnHref(undefined)).toBeNull();
  });

  it('appends return targets without dropping existing params or hashes', () => {
    expect(withOwnerReturnTarget('/(staff)/notifications', 'business')).toBe(
      '/(staff)/notifications?returnTo=business',
    );
    expect(withOwnerReturnTarget('/(staff)/payment-method?source=settings', 'settings')).toBe(
      '/(staff)/payment-method?source=settings&returnTo=settings',
    );
    expect(withOwnerReturnTarget('/(staff)/notifications#top', 'home')).toBe(
      '/(staff)/notifications?returnTo=home#top',
    );
  });
});
