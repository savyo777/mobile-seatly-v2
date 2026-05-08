export type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
  type: string;
};

function paramsFromUrl(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const hashPart = url.includes('#') ? url.split('#')[1] ?? '' : '';

  for (const part of [hashPart, queryPart]) {
    if (!part) continue;
    new URLSearchParams(part).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }

  return params;
}

function routePart(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.split('?')[0]?.split('#')[0]?.toLowerCase() ?? '';
  }
}

function isRecoveryRoute(url: string): boolean {
  const route = routePart(url);
  return route.includes('reset-password') || route.includes('auth-callback');
}

export function getRecoveryTokensFromUrl(url: string): RecoveryTokens | null {
  const params = paramsFromUrl(url);
  const type = params.get('type') ?? '';
  const accessToken = params.get('access_token') ?? '';
  const refreshToken = params.get('refresh_token') ?? '';
  if (type !== 'recovery' || !accessToken || !refreshToken) return null;
  if (!isRecoveryRoute(url)) return null;
  return { type, accessToken, refreshToken };
}

export function getRecoveryAuthCodeFromUrl(url: string): string | null {
  if (!isRecoveryRoute(url)) return null;
  const params = paramsFromUrl(url);
  const code = params.get('code');
  const type = params.get('type');
  if (!code || type !== 'recovery') return null;
  return code;
}

export function getRecoveryTokenHashFromUrl(url: string): { tokenHash: string; type: string } | null {
  if (!isRecoveryRoute(url)) return null;
  const params = paramsFromUrl(url);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash && type === 'recovery') return { tokenHash, type };
  return null;
}
