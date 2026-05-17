import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import i18n from '@/lib/i18n';
import {
  clearPersistedSupabaseSession,
  clearSupabaseStorageOnly,
  clearUnusablePersistedSupabaseSession,
  getSupabase,
} from '@/lib/supabase/client';
import { isUnusablePersistedSupabaseAuthError } from '@/lib/supabase/authErrors';
import { clearAppShellPreference } from '@/lib/navigation/appShellPreference';
import { resolveIsStaffLike } from '@/lib/auth/roles';
import { registerPushTokenForCurrentUser } from '@/lib/notifications/pushToken';

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

const ROLE_LOOKUP_FALLBACK_MS = 450;

function resolveRoleFromMetadata(user: User | null): string | null {
  if (!user) return null;
  // Read ONLY app_metadata.role — that's server-set (and locked behind
  // the service-role / SECURITY DEFINER RPCs that hand out owner +
  // staff roles). Never read user_metadata.role — user_metadata is
  // mutable by the user via `auth.updateUser({ data: {...} })`, so a
  // malicious client could spoof their own role to 'owner' and flash
  // owner chrome before the user_profiles lookup completes. This was
  // closed in the 2026-05-17 security audit.
  const roleFromMetadata = user.app_metadata?.role as string | undefined;
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
    (phone ? phone : i18n.t('common.fallbackNewUser'));

  return {
    auth_user_id: user.id,
    email,
    full_name: fullName,
    role,
    ...(phone ? { phone } : {}),
  };
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
        let authSupabase = supabase;
        if (error && isUnusablePersistedSupabaseAuthError(error)) {
          await clearPersistedSupabaseSession();
          authSupabase = getSupabase() ?? supabase;
          activeSupabase = authSupabase;
        }
        if (!cancelled) {
          setSession(error ? null : data.session ?? null);
          if (!error && data.session) {
            void authSupabase.auth.startAutoRefresh();
          }
        }
        if (cancelled) return;

        const { data: sub } = authSupabase.auth.onAuthStateChange((event, next) => {
          if (!cancelled) {
            if (event === 'SIGNED_OUT') {
              void clearAppShellPreference();
              void authSupabase.auth.stopAutoRefresh();
            } else if (next) {
              void authSupabase.auth.startAutoRefresh();
              if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                void registerPushTokenForCurrentUser();
              }
            }
            setSession(next);
            setLoading(false);
          }
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch (error) {
        if (isUnusablePersistedSupabaseAuthError(error)) {
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

    // Prefer a live profile role, but never let that network lookup become a
    // visible multi-second app-shell spinner.
    const metadataRole = resolveRoleFromMetadata(currentUser);
    const fallbackRole = metadataRole ?? 'customer';
    setRole(metadataRole);
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setRole(fallbackRole);
    }, ROLE_LOOKUP_FALLBACK_MS);

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
          if (!error && !data) {
            void supabase.from('user_profiles').upsert(
              resolveDefaultProfile(currentUser, fallbackRole),
              { onConflict: 'auth_user_id' },
            ).then(() => undefined, () => undefined);
          }
          if (!cancelled) setRole(fallbackRole);
        }
      } catch {
        if (!cancelled) setRole(fallbackRole);
      } finally {
        clearTimeout(fallbackTimer);
      }
    };
    void loadRole();
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      await supabase.auth.stopAutoRefresh();
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error && isUnusablePersistedSupabaseAuthError(error)) {
        // Corrupt session — clear storage only. Do NOT null the client so
        // the onAuthStateChange subscription registered at startup stays alive.
        await clearSupabaseStorageOnly();
      }
    } catch (error) {
      if (isUnusablePersistedSupabaseAuthError(error)) {
        await clearSupabaseStorageOnly();
      }
    } finally {
      // supabase.auth.signOut already wiped AsyncStorage; this is belt-and-suspenders.
      // Use storage-only clear — nulling the client (clearPersistedSupabaseSession)
      // would destroy AuthProvider's onAuthStateChange subscription and break
      // every subsequent login until the app is restarted.
      await clearSupabaseStorageOnly();
      await clearAppShellPreference();
      setSession(null);
      setRole(null);
    }
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
