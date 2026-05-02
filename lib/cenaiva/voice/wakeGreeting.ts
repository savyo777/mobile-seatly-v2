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

export function buildWakeGreeting(user: WakeGreetingUser): string {
  const name = resolveWakeGreetingName(user);
  return name ? `Hey ${name}, how can I help you?` : 'Hey, how can I help you?';
}
