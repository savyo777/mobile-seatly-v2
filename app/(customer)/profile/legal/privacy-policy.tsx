/**
 * Cenaiva Privacy Policy v1.1 screen.
 *
 * Renders the canonical 18-section Privacy Policy + plain-language
 * summary callout + Schedule A sub-processors table.
 *
 * Content lives in `lib/legal/privacyContent.ts`.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LegalScreen } from '@/components/profile/LegalScreen';
import { createStyles, spacing, typography } from '@/lib/theme';
import {
  PRIVACY_SECTIONS,
  PRIVACY_INTRO,
  PRIVACY_PLAIN_LANGUAGE_SUMMARY,
  PRIVACY_SUB_PROCESSORS,
  PRIVACY_SUB_PROCESSORS_LAST_REVIEWED,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_LAST_UPDATED,
  PRIVACY_VERSION,
} from '@/lib/legal/privacyContent';

export default function PrivacyPolicyScreen() {
  // Assemble the full section list:
  //   1. Header: version / effective date + intro paragraph
  //   2. Plain-language summary (rendered as bulleted paragraphs)
  //   3. The 18 numbered sections
  //   4. Schedule A: sub-processors table as bulleted rows
  const headerSection = {
    paragraphs: [
      `Version ${PRIVACY_VERSION} · Effective ${PRIVACY_EFFECTIVE_DATE} · Last updated ${PRIVACY_LAST_UPDATED}`,
      PRIVACY_INTRO,
    ],
  };

  const summarySection = {
    heading: 'Plain-language summary',
    paragraphs: PRIVACY_PLAIN_LANGUAGE_SUMMARY.map((bullet) => `• ${bullet}`),
  };

  const scheduleASection = {
    heading: 'Schedule A — Sub-Processors',
    paragraphs: [
      'The following sub-processors may process personal information described in this Policy. Each is bound by contractual data-protection obligations no less protective than those in this Policy.',
      ...PRIVACY_SUB_PROCESSORS.map(
        (sp) => `• ${sp.name} — ${sp.service} (${sp.region})`,
      ),
      'The most recent sub-processor list is published at https://cenaiva.com/legal/sub-processors.',
      `This Privacy Policy v${PRIVACY_VERSION} was last reviewed and updated on ${PRIVACY_SUB_PROCESSORS_LAST_REVIEWED}.`,
    ],
  };

  return (
    <LegalScreen
      title="Privacy Policy"
      sections={[headerSection, summarySection, ...PRIVACY_SECTIONS, scheduleASection]}
    />
  );
}
