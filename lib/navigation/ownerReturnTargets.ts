import type { Href } from 'expo-router';

export type OwnerReturnTarget = 'settings' | 'business' | 'home';

const OWNER_RETURN_HREFS: Record<OwnerReturnTarget, Href> = {
  settings: '/(staff)/settings',
  business: '/(staff)/profile',
  home: '/(staff)/home',
};

function firstParamValue(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null;
  return typeof value === 'string' ? value : null;
}

export function getOwnerReturnHref(returnTo: unknown): Href | null {
  const target = firstParamValue(returnTo);
  if (target === 'settings' || target === 'business' || target === 'home') {
    return OWNER_RETURN_HREFS[target];
  }
  return null;
}

export function withOwnerReturnTarget(route: string, returnTo: OwnerReturnTarget): string {
  const hashIndex = route.indexOf('#');
  const beforeHash = hashIndex >= 0 ? route.slice(0, hashIndex) : route;
  const hash = hashIndex >= 0 ? route.slice(hashIndex) : '';
  const separator = beforeHash.includes('?') ? '&' : '?';
  return `${beforeHash}${separator}returnTo=${encodeURIComponent(returnTo)}${hash}`;
}
