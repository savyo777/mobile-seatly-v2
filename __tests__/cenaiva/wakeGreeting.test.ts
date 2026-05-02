import { buildWakeGreeting, resolveWakeGreetingName } from '@/lib/cenaiva/voice/wakeGreeting';

describe('wake greeting', () => {
  it('prefers first_name when present', () => {
    expect(
      buildWakeGreeting({
        email: 'fallback@example.com',
        user_metadata: { first_name: 'Savyo', full_name: 'Steven Georgy' },
      }),
    ).toBe('Hey Savyo, how can I help you?');
  });

  it('uses the first name from full_name', () => {
    expect(
      buildWakeGreeting({
        email: 'fallback@example.com',
        user_metadata: { full_name: 'Steven Georgy' },
      }),
    ).toBe('Hey Steven, how can I help you?');
  });

  it('falls back to a readable email name', () => {
    expect(resolveWakeGreetingName({ email: 'steven.georgy@example.com', user_metadata: {} })).toBe(
      'Steven',
    );
  });

  it('uses a generic greeting if no name is available', () => {
    expect(buildWakeGreeting(null)).toBe('Hey, how can I help you?');
  });
});
