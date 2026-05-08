function valueToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function collectErrorText(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) {
    const cause =
      'cause' in error ? collectErrorText((error as Error & { cause?: unknown }).cause) : '';
    return [error.name, error.message, cause].filter(Boolean).join(' ');
  }
  if (typeof error !== 'object') return String(error);

  const record = error as Record<string, unknown>;
  const fields = [
    record.name,
    record.message,
    record.code,
    record.error,
    record.error_description,
    record.status,
    collectErrorText(record.cause),
  ];
  return fields.map(valueToText).filter(Boolean).join(' ');
}

export function isUnusablePersistedSupabaseAuthError(error: unknown): boolean {
  const text = collectErrorText(error);
  if (!text) return false;

  // Only use this for persisted-session recovery. Supabase reports rejected
  // refresh/session state through AuthApiError, and keeping that storage around
  // makes the app fail the same way on every startup.
  if (/\bAuthApiError\b/i.test(text)) return true;

  return /invalid refresh token|refresh token not found|refresh token.*already used|already used|invalid_grant|bad_jwt|invalid jwt|jwt expired|session.*not found|session_not_found|refresh_token_not_found|refresh token.*reus/i.test(
    text,
  );
}
