import React, { useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui';
import { CenaivaVoiceShell } from '@/components/cenaiva/CenaivaVoiceShell';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';

export default function AiChatScreen() {
  const assistant = useCenaivaAssistant();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();

  // useFocusEffect: only opens when this screen is actually navigated to.
  // Wake word triggering is handled by CenaivaAssistantProvider independently.
  useFocusEffect(
    useCallback(() => {
      assistant.open();
    }, [assistant]),
  );

  const closeRoute = () => {
    router.replace((returnTo || '/(customer)/discover') as never);
  };

  return (
    <ScreenWrapper scrollable={false} withKeyboardAvoiding padded={false}>
      <CenaivaVoiceShell onClose={closeRoute} />
    </ScreenWrapper>
  );
}
