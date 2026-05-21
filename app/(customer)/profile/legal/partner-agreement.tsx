/**
 * Cenaiva Restaurant Partner Agreement v2.1 screen.
 *
 * Renders the canonical 24-section agreement + Schedule A. Same
 * underlying content as the web sister repo's
 * `apps/web/src/pages/partners/AgreementPage.tsx`.
 *
 * Surfaced from both Profile → Legal (diner curiosity) and the
 * owner-facing Legal hub at `app/(staff)/legal.tsx`.
 */

import React from 'react';
import { LegalScreen } from '@/components/profile/LegalScreen';
import {
  PARTNER_AGREEMENT_SECTIONS,
  PARTNER_AGREEMENT_INTRO,
  PARTNER_AGREEMENT_SUB_PROCESSORS,
  PARTNER_AGREEMENT_VERSION,
  PARTNER_AGREEMENT_EFFECTIVE_DATE,
  PARTNER_AGREEMENT_LAST_UPDATED,
} from '@/lib/legal/partnerAgreementContent';

export default function PartnerAgreementScreen() {
  const headerSection = {
    paragraphs: [
      `Version ${PARTNER_AGREEMENT_VERSION} · Effective ${PARTNER_AGREEMENT_EFFECTIVE_DATE} · Last updated ${PARTNER_AGREEMENT_LAST_UPDATED}`,
      PARTNER_AGREEMENT_INTRO,
    ],
  };

  const scheduleASection = {
    heading: 'Schedule A — Sub-Processors',
    paragraphs: [
      'Cenaiva engages the following Sub-Processors to deliver the Platform. Each Sub-Processor is bound by contractual data-protection obligations that are no less protective than those in this Agreement. Locations listed are the primary processing regions; some providers may operate global infrastructure.',
      ...PARTNER_AGREEMENT_SUB_PROCESSORS.map(
        (sp) => `• ${sp.name} — ${sp.service} (${sp.region})`,
      ),
      'The most recent Sub-Processor list is also published at https://cenaiva.com/partners/sub-processors and updated as changes are made under Section 10.5.',
      `This Restaurant Partner Agreement v${PARTNER_AGREEMENT_VERSION} was last reviewed and updated on ${PARTNER_AGREEMENT_LAST_UPDATED}.`,
    ],
  };

  return (
    <LegalScreen
      title="Restaurant Partner Agreement"
      sections={[headerSection, ...PARTNER_AGREEMENT_SECTIONS, scheduleASection]}
    />
  );
}
