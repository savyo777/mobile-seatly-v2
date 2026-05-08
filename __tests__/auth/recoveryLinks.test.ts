import {
  getRecoveryAuthCodeFromUrl,
  getRecoveryTokenHashFromUrl,
  getRecoveryTokensFromUrl,
} from '@/lib/auth/recoveryLinks';

describe('recovery link parsing', () => {
  it('parses recovery token_hash links', () => {
    expect(
      getRecoveryTokenHashFromUrl('cenaiva://reset-password?token_hash=abc123&type=recovery'),
    ).toEqual({ tokenHash: 'abc123', type: 'recovery' });
  });

  it('parses recovery implicit-flow token links', () => {
    expect(
      getRecoveryTokensFromUrl(
        'cenaiva://reset-password#access_token=access&refresh_token=refresh&type=recovery',
      ),
    ).toEqual({ accessToken: 'access', refreshToken: 'refresh', type: 'recovery' });
  });

  it('only exchanges PKCE codes for recovery callbacks', () => {
    expect(getRecoveryAuthCodeFromUrl('cenaiva://auth-callback?code=recovery-code&type=recovery'))
      .toBe('recovery-code');
    expect(getRecoveryAuthCodeFromUrl('cenaiva://auth-callback?code=oauth-code')).toBeNull();
  });

  it('ignores Expo dev-client launch URLs', () => {
    expect(
      getRecoveryAuthCodeFromUrl('cenaiva://expo-development-client/?code=not-auth&type=recovery'),
    ).toBeNull();
    expect(
      getRecoveryTokensFromUrl(
        'cenaiva://expo-development-client/#access_token=a&refresh_token=r&type=recovery',
      ),
    ).toBeNull();
  });
});
