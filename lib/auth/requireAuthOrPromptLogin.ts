import type { Router } from 'expo-router';

// Apple 5.1.1(v): browse surfaces (discover/*, map) are open to
// unauthenticated visitors, but account-based actions inside those
// screens — Book a Table, Save/Favorite, Post Review, View Bookings,
// Open Profile — still require sign-in. Each gated tap should call this
// helper, which either runs the action (when signed in) or routes the
// user to the welcome screen with a returnTo so they land back exactly
// where they were trying to go.

export type AuthGateArgs = {
  isAuthenticated: boolean;
  router: Pick<Router, 'push' | 'replace'>;
  returnTo: string;
  onAuthed: () => void;
};

export function requireAuthOrPromptLogin({
  isAuthenticated,
  router,
  returnTo,
  onAuthed,
}: AuthGateArgs): void {
  if (isAuthenticated) {
    onAuthed();
    return;
  }
  const encoded = encodeURIComponent(returnTo);
  router.push(`/(auth)/welcome?returnTo=${encoded}` as never);
}
