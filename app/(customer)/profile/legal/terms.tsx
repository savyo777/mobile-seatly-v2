/**
 * Cenaiva Consumer Terms of Service screen.
 *
 * Renders the canonical 40-section Terms via the generic LegalScreen
 * component. Content lives in `lib/legal/termsContent.ts` and is kept
 * in sync with the web sister repo's `apps/web/src/lib/legal/termsContent.ts`.
 *
 * The "Effective" + "Last updated" header line is composed from
 * `lib/legal/versions.ts` so a single version bump there flows
 * through both the screen header AND the consent gate's stamp.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { LegalScreen } from '@/components/profile/LegalScreen';
import { createStyles, spacing, typography } from '@/lib/theme';
import {
  TERMS_SECTIONS,
  TERMS_INTRO,
  TERMS_EFFECTIVE_DATE,
  TERMS_LAST_UPDATED,
} from '@/lib/legal/termsContent';

const useStyles = createStyles((c) => ({
  intro: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  paragraph: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  meta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginBottom: spacing.xs,
  },
}));

export default function TermsScreen() {
  const styles = useStyles();
  // Synthesize a header "section" with the meta line + intro paragraph.
  // LegalScreen renders sections in order — putting this first gives us
  // the version stamp at the top without modifying the renderer.
  const headerSection = {
    paragraphs: [
      `Effective ${TERMS_EFFECTIVE_DATE} · Last updated ${TERMS_LAST_UPDATED}`,
      TERMS_INTRO,
    ],
  };
  return <LegalScreen title="Terms of Service" sections={[headerSection, ...TERMS_SECTIONS]} />;
}
