import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

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
  return roleFromMetadata.toLowerCase();
}

function resolveIsStaffLike(role: string | null): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'manager' || role === 'staff' || role === 'host' || role === 'server' || role === 'kitchen' || role === 'bar';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const hydrateSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setSession(data.session ?? null);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void hydrateSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) {
        setSession(next);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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
        const { data } = await supabase
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
          // Fallback to metadata only when profile role is unavailable.
          setRole(resolveRoleFromMetadata(currentUser));
        }
      } catch {
        if (!cancelled) setRole(resolveRoleFromMetadata(currentUser));
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
    await supabase.auth.signOut();
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
