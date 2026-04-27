import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isStaffLike: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  isStaffLike: false,
  signOut: async () => {},
});

function resolveIsStaffLike(user: User | null): boolean {
  if (!user) return false;
  const roleFromMetadata =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);
  if (!roleFromMetadata) return false;
  const role = roleFromMetadata.toLowerCase();
  return role === 'owner' || role === 'manager' || role === 'staff' || role === 'host' || role === 'server' || role === 'kitchen' || role === 'bar';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const isAuthenticated = Boolean(session);
  const isStaffLike = resolveIsStaffLike(user);
  const value = useMemo(
    () => ({ session, user, loading, isAuthenticated, isStaffLike, signOut }),
    [session, user, loading, isAuthenticated, isStaffLike],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthSession(): AuthCtx {
  return useContext(Ctx);
}
