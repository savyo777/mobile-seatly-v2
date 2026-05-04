import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import {
  clearPersistedSupabaseSession,
  clearUnusablePersistedSupabaseSession,
  getSupabase,
} from '@/lib/supabase/client';
import { clearAppShellPreference } from '@/lib/navigation/appShellPreference';
import { resolveIsStaffLike } from '@/lib/auth/roles';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isStaffLike: boolean;
  role: string | null;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  isStaffLike: false,
  role: null,
  signOut: async () => {},
});

function resolveRoleFromMetadata(user: User | null): string | null {
  if (!user) return null;
  const roleFromMetadata =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);
  if (!roleFromMetadata) return null;
  const normalized = roleFromMetadata.toLowerCase();
  if (normalized === 'diner') return 'customer';
  if (normalized === 'diner_and_owner') return 'diner_and_owner';
  return normalized;
}

function resolveDefaultProfile(user: User, role: string) {
  const email = (user.email ?? '').toLowerCase();
  const phone = (user.phone ?? '').trim();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (email ? email.split('@')[0] : '') ||
    (phone ? phone : 'New user');

  return {
    auth_user_id: user.id,
    email,
    full_name: fullName,
    role,
    ...(phone ? { phone } : {}),
  };
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: unknown }).message)
        : String(error ?? '');
  return /invalid refresh token|refresh token not found/i.test(message);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let activeSupabase: ReturnType<typeof getSupabase> = null;
    let unsubscribe: (() => void) | null = null;

    const hydrateSession = async () => {
      try {
        await clearUnusablePersistedSupabaseSession();
        if (cancelled) return;
        const supabase = getSupabase();
        if (!supabase) {
          if (!cancelled) setLoading(false);
          return;
        }
        activeSupabase = supabase;
        const { data, error } = await supabase.auth.getSession();
        if (error && isInvalidRefreshTokenError(error)) {
          await clearPersistedSupabaseSession();
        }
        if (!cancelled) {
          setSession(error ? null : data.session ?? null);
          if (!error && data.session) {
            void supabase.auth.startAutoRefresh();
          }
        }
        if (cancelled) return;

        const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
          if (!cancelled) {
            if (event === 'SIGNED_OUT') {
              void clearAppShellPreference();
              void supabase.auth.stopAutoRefresh();
            } else if (next) {
              void supabase.auth.startAutoRefresh();
            }
            setSession(next);
            setLoading(false);
          }
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch (error) {
        if (isInvalidRefreshTokenError(error)) {
          await clearPersistedSupabaseSession();
        }
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void hydrateSession();

    return () => {
      cancelled = true;
      if (activeSupabase) void activeSupabase.auth.stopAutoRefresh();
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !session) return;

    if (AppState.currentState === 'active') {
      void supabase.auth.startAutoRefresh();
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      sub.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, [session]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setRole(null);
      return;
    }
    let cancelled = false;

    const currentUser = session?.user ?? null;
    if (!currentUser) {
      setRole(null);
      return;
    }

    // Resolve from user_profiles first to avoid stale metadata causing wrong redirects.
    // Keep role null while loading so guarded layouts can avoid flash/misroute.
    setRole(null);
    const loadRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('auth_user_id', currentUser.id)
          .maybeSingle();
        if (!cancelled) {
          const profileRole = typeof data?.role === 'string' ? data.role.toLowerCase() : null;
          if (profileRole) {
            setRole(profileRole);
            return;
          }
          const fallbackRole = resolveRoleFromMetadata(currentUser) ?? 'customer';
          if (!error && !data) {
            await supabase.from('user_profiles').upsert(
              resolveDefaultProfile(currentUser, fallbackRole),
              { onConflict: 'auth_user_id' },
            );
          }
          if (!cancelled) setRole(fallbackRole);
        }
      } catch {
        if (!cancelled) setRole(resolveRoleFromMetadata(currentUser) ?? 'customer');
      }
    };
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.stopAutoRefresh();
    const { error } = await supabase.auth.signOut();
    if (error && isInvalidRefreshTokenError(error)) {
      await clearPersistedSupabaseSession();
    }
    setRole(null);
  };

  const user = session?.user ?? null;
  const isAuthenticated = Boolean(session);
  const isStaffLike = resolveIsStaffLike(role);
  const value = useMemo(
    () => ({ session, user, loading, isAuthenticated, isStaffLike, role, signOut }),
    [session, user, loading, isAuthenticated, isStaffLike, role],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthSession(): AuthCtx {
  return useContext(Ctx);
}
