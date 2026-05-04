import {
  buildWakeGreeting,
  resolveWakeGreetingName,
  resolveWakeGreetingPeriod,
} from '@/lib/cenaiva/voice/wakeGreeting';

describe('wake greeting', () => {
  it('prefers first_name when present', () => {
    expect(
      buildWakeGreeting({
        email: 'fallback@example.com',
        user_metadata: { first_name: 'Savyo', full_name: 'Steven Georgy' },
      }, new Date('2026-05-03T09:00:00')),
    ).toBe('Good morning, Savyo. How may I help with your reservation?');
  });

  it('uses the first name from full_name', () => {
    expect(
      buildWakeGreeting({
        email: 'fallback@example.com',
        user_metadata: { full_name: 'Steven Georgy' },
      }, new Date('2026-05-03T14:00:00')),
    ).toBe('Good afternoon, Steven. How may I help with your reservation?');
  });

  it('falls back to a readable email name', () => {
    expect(resolveWakeGreetingName({ email: 'steven.georgy@example.com', user_metadata: {} })).toBe(
      'Steven',
    );
  });

  it('uses a generic greeting if no name is available', () => {
    expect(buildWakeGreeting(null, new Date('2026-05-03T20:00:00'))).toBe(
      'Good evening. How may I help with your reservation?',
    );
  });

  it('resolves the greeting period from local time', () => {
    expect(resolveWakeGreetingPeriod(new Date('2026-05-03T05:00:00'))).toBe('morning');
    expect(resolveWakeGreetingPeriod(new Date('2026-05-03T12:00:00'))).toBe('afternoon');
    expect(resolveWakeGreetingPeriod(new Date('2026-05-03T17:00:00'))).toBe('evening');
    expect(resolveWakeGreetingPeriod(new Date('2026-05-03T02:00:00'))).toBe('evening');
  });
});
