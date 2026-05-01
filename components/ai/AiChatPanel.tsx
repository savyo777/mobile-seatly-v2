import React from 'react';
import { CenaivaVoiceShell } from '@/components/cenaiva/CenaivaVoiceShell';

export type AiChatPanelProps = {
  onClose?: () => void;
  visible?: boolean;
  withKeyboardAvoiding?: boolean;
  hideTitle?: boolean;
};

export function AiChatPanel({ onClose }: AiChatPanelProps) {
  return <CenaivaVoiceShell onClose={onClose} />;
}
