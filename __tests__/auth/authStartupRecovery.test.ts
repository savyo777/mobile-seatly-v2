import { isUnusablePersistedSupabaseAuthError } from '@/lib/supabase/authErrors';

describe('Supabase auth startup recovery', () => {
  it('treats Supabase AuthApiError startup failures as unusable persisted sessions', () => {
    expect(
      isUnusablePersistedSupabaseAuthError({
        name: 'AuthApiError',
        message: 'Invalid Refresh Token: Already Used',
        status: 400,
      }),
    ).toBe(true);
  });

  it('recognizes refresh token and invalid grant variants', () => {
    expect(
      isUnusablePersistedSupabaseAuthError({
        message: 'invalid_grant: refresh token not found',
      }),
    ).toBe(true);
    expect(isUnusablePersistedSupabaseAuthError({ code: 'refresh_token_not_found' })).toBe(true);
  });

  it('does not classify transient network auth errors as bad persisted sessions', () => {
    expect(
      isUnusablePersistedSupabaseAuthError({
        name: 'AuthRetryableFetchError',
        message: 'Failed to fetch',
      }),
    ).toBe(false);
  });
});
