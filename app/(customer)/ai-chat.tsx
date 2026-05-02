import React, { useEffect } from 'react';
import { ScreenWrapper } from '@/components/ui';
import { CenaivaVoiceShell } from '@/components/cenaiva/CenaivaVoiceShell';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';

export default function AiChatScreen() {
  const assistant = useCenaivaAssistant();

  useEffect(() => {
    assistant.open();
  }, []);

  return (
    <ScreenWrapper scrollable={false} withKeyboardAvoiding padded={false}>
      <CenaivaVoiceShell />
    </ScreenWrapper>
  );
}
