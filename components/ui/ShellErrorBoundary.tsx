import React from 'react';
import { usePathname, useRouter, type Href } from 'expo-router';
import { installRouterCrashGuard } from '@/lib/runtime/installCrashGuards';
import { AppErrorBoundary } from './AppErrorBoundary';

type Props = {
  children: React.ReactNode;
  fallbackHref: Href;
};

export function ShellErrorBoundary({ children, fallbackHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const handleGoHome = React.useCallback(() => {
    router.replace(fallbackHref);
  }, [fallbackHref, router]);
  React.useEffect(() => {
    installRouterCrashGuard({ getFallbackHref: () => fallbackHref });
  }, [fallbackHref]);

  return (
    <AppErrorBoundary resetKey={pathname} onGoHome={handleGoHome}>
      {children}
    </AppErrorBoundary>
  );
}
