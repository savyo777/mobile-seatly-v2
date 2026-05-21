/**
 * Restaurant Partner Agreement — version history screen.
 *
 * Single source: `PARTNER_AGREEMENT_HISTORY` in
 * `lib/legal/partnerAgreementContent.ts`. Append a row when a new
 * version ships.
 */

import React from 'react';
import { LegalScreen } from '@/components/profile/LegalScreen';
import { PARTNER_AGREEMENT_HISTORY } from '@/lib/legal/partnerAgreementContent';

export default function AgreementHistoryScreen() {
  const intro = {
    paragraphs: [
      'Version history for the Cenaiva Restaurant Partner Agreement. Restaurant Partners receive at least 30 days\' notice via email or in the Partner Dashboard before material changes take effect (Partner Agreement §20).',
    ],
  };

  const historySections = PARTNER_AGREEMENT_HISTORY.map((entry) => ({
    heading: `Version ${entry.version} — Effective ${entry.effectiveDate}`,
    paragraphs: [entry.summary],
  }));

  return (
    <LegalScreen
      title="Agreement History"
      sections={[intro, ...historySections]}
    />
  );
}
