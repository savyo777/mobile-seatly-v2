// Helpers for resolving "the current user's id" in screens and components.
//
// Production code should always use the authenticated user's id. In demo
// mode (EXPO_PUBLIC_CENAIVA_DEMO_MODE=true), we fall back to mockCustomer.id
// so the demo flows keep working without sign-in. The fallback is opt-in:
// if demo mode is off and the user is unauthenticated, these helpers return
// null, and the caller must handle the unauthenticated case explicitly
// rather than silently writing data under a fake id.

import { useMemo } from 'react';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { mockCustomer } from '@/lib/mock/users';

export function getDemoFallbackUserId(): string | null {
  return isDemoModeEnabled() ? mockCustomer.id : null;
}

/**
 * Resolves the current user id. Returns the authenticated user's id when
 * signed in; otherwise returns the demo fallback (when demo mode is on) or
 * `null`. Use the `null` case to gate write operations behind a sign-in
 * requirement.
 */
export function useCurrentUserId(): string | null {
  const { user, isAuthenticated } = useAuthSession();
  return useMemo(() => {
    if (isAuthenticated && user?.id) return user.id;
    return getDemoFallbackUserId();
  }, [isAuthenticated, user?.id]);
}
