import React from 'react';
import { ScreenWrapper } from '@/components/ui';
import { AiChatPanel } from '@/components/ai/AiChatPanel';

export default function AiChatScreen() {
  return (
    <ScreenWrapper scrollable={false} withKeyboardAvoiding padded>
      <AiChatPanel />
    </ScreenWrapper>
  );
}
