export type WakeGreetingUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  const firstName = normalized.split(' ')[0]?.replace(/[^a-zA-Z'-]/g, '');
  return firstName || null;
}

function nameFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return null;
  const firstSegment = localPart.split(/[._+-]/)[0];
  if (!firstSegment) return null;
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}

export function resolveWakeGreetingName(user: WakeGreetingUser): string | null {
  const metadata = user?.user_metadata ?? {};
  return (
    cleanName(metadata.first_name) ??
    cleanName(metadata.full_name) ??
    cleanName(metadata.name) ??
    cleanName(metadata.display_name) ??
    nameFromEmail(user?.email) ??
    null
  );
}

export function resolveWakeGreetingPeriod(now: Date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

export function buildWakeGreeting(user: WakeGreetingUser, now: Date = new Date()): string {
  const name = resolveWakeGreetingName(user);
  const period = resolveWakeGreetingPeriod(now);
  return name
    ? `Good ${period}, ${name}. How may I help with your reservation?`
    : `Good ${period}. How may I help with your reservation?`;
}
