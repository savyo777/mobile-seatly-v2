import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useColors } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import {
  getAppShellPreference,
  getCachedAppShellPreference,
} from '@/lib/navigation/appShellPreference';
import { detectDuplicateDinerAccount, type DuplicateAccountInfo } from '@/lib/auth/accountMerge';
import { DinerMergeDialog } from '@/components/account/DinerMergeDialog';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const c = useColors();
  const { loading, isAuthenticated, isStaffLike, role, signOut } = useAuthSession();
  const [duplicate, setDuplicate] = useState<DuplicateAccountInfo | null>(null);
  // Once the diner picks merge / keep-separate, never re-run detection (which
  // would otherwise re-surface the same dupe on the keep-separate path).
  const decidedRef = useRef(false);

  const goHome = useCallback(async () => {
    if (isAuthenticated) {
      const pref = getCachedAppShellPreference() ?? (await getAppShellPreference());
      if (pref === 'staff' && isStaffLike) {
        router.replace('/(staff)');
        return;
      }
    }
    router.replace('/(customer)');
  }, [router, isAuthenticated, isStaffLike]);

  useEffect(() => {
    if (loading || (isAuthenticated && role === null)) return;
    if (duplicate || decidedRef.current) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
        const params = new URLSearchParams(queryPart);
        if (params.get('type') === 'recovery') {
          router.replace('/(auth)/reset-password?recovery=1');
          return;
        }
      }
      if (isAuthenticated) {
        // Best-effort duplicate-account detection — never blocks sign-in.
        const dupe = await detectDuplicateDinerAccount();
        if (cancelled || decidedRef.current) return;
        if (dupe) {
          setDuplicate(dupe);
          return; // the merge dialog owns routing from here
        }
      }
      if (!cancelled) await goHome();
    }, 40);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [router, loading, isAuthenticated, isStaffLike, role, duplicate, goHome]);

  const handleMerged = useCallback(async () => {
    const archivedWasCurrent = duplicate?.archivedIsCurrent ?? false;
    decidedRef.current = true;
    setDuplicate(null);
    if (archivedWasCurrent) {
      // The signed-in account was absorbed + hard-deleted by the merge — its
      // session is dead. Sign out and let the diner sign back in as the survivor.
      try {
        await signOut();
      } catch {
        // best-effort
      }
      router.replace('/onboarding');
    } else {
      await goHome();
    }
  }, [duplicate, signOut, router, goHome]);

  const handleKeepSeparate = useCallback(() => {
    decidedRef.current = true;
    setDuplicate(null);
    void goHome();
  }, [goHome]);

  return (
    <View style={[styles.root, { backgroundColor: c.bgBase }]}>
      <ActivityIndicator color={c.gold} />
      <DinerMergeDialog
        info={duplicate}
        onMerged={handleMerged}
        onKeepSeparate={handleKeepSeparate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
