/**
 * Cenaiva Sub-Processors list — standalone screen.
 *
 * 13 rows from Schedule A. Reuses the same array Privacy Policy renders
 * (single source of truth for the 30-day notice obligation under
 * Privacy §7 + Partner Agreement §10.5).
 */

import React from 'react';
import { LegalScreen } from '@/components/profile/LegalScreen';
import {
  PRIVACY_SUB_PROCESSORS,
  PRIVACY_SUB_PROCESSORS_LAST_REVIEWED,
  PRIVACY_SUB_PROCESSORS_NOTICE_DAYS,
} from '@/lib/legal/privacyContent';

export default function SubProcessorsScreen() {
  const intro = {
    paragraphs: [
      `Last reviewed ${PRIVACY_SUB_PROCESSORS_LAST_REVIEWED}.`,
      `Cenaiva uses the following third-party providers to deliver the platform. Each is bound by contractual data-protection obligations no less protective than our Privacy Policy. We will give at least ${PRIVACY_SUB_PROCESSORS_NOTICE_DAYS} days' notice in the app or by email before adding a sub-processor that processes personal information in a materially new way.`,
    ],
  };

  const tableSection = {
    heading: 'Current sub-processors',
    paragraphs: PRIVACY_SUB_PROCESSORS.map(
      (sp) => `• ${sp.name} — ${sp.service} (${sp.region})`,
    ),
  };

  const linkSection = {
    heading: 'Cross-references',
    paragraphs: [
      '• Consumer Privacy Policy: see Schedule A',
      '• Restaurant Partner Agreement: see Schedule A',
      '• Published list: https://cenaiva.com/legal/sub-processors',
    ],
  };

  return (
    <LegalScreen title="Sub-Processors" sections={[intro, tableSection, linkSection]} />
  );
}
