import React from 'react';
import { CenaivaAssistantBoundary } from '@/components/cenaiva/CenaivaAssistantBoundary';
import { CenaivaVoiceShell } from '@/components/cenaiva/CenaivaVoiceShell';

export type AiChatPanelProps = {
  onClose?: () => void;
  visible?: boolean;
  withKeyboardAvoiding?: boolean;
  hideTitle?: boolean;
};

export function AiChatPanel({ onClose }: AiChatPanelProps) {
  return (
    <CenaivaAssistantBoundary onClose={onClose}>
      <CenaivaVoiceShell onClose={onClose} />
    </CenaivaAssistantBoundary>
  );
}
