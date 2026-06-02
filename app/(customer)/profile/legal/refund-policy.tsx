/**
 * Cenaiva Refund Policy screen (diner-facing).
 *
 * Plain-language companion to Terms §11.3, rendered via the generic
 * LegalScreen component. Content lives in `lib/legal/refundPolicyContent.ts`,
 * ported verbatim from the web sister repo's RefundPolicyPage. The version
 * meta line is composed from `lib/legal/versions.ts`.
 */

import React from 'react';
import { LegalScreen } from '@/components/profile/LegalScreen';
import {
  REFUND_POLICY_SECTIONS,
  REFUND_POLICY_INTRO,
  TERMS_EFFECTIVE_DATE,
  TERMS_LAST_UPDATED,
} from '@/lib/legal/refundPolicyContent';

export default function RefundPolicyScreen() {
  const headerSection = {
    paragraphs: [
      `Effective ${TERMS_EFFECTIVE_DATE} · Last updated ${TERMS_LAST_UPDATED}`,
      REFUND_POLICY_INTRO,
    ],
  };
  return <LegalScreen title="Refund Policy" sections={[headerSection, ...REFUND_POLICY_SECTIONS]} />;
}
