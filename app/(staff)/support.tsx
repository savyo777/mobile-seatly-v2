import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const SUPPORT_EMAIL = 'help@cenaiva.app';
const FAQ_ITEMS = [
  {
    q: 'How do I update billing details?',
    a: 'Open Payment method from Settings, then add or replace the card used for billing.',
  },
  {
    q: 'How do I change staff access?',
    a: 'Use Team, Staff members, Roles & permissions, or Staff PIN codes from Settings.',
  },
  {
    q: 'Where do I change reservation settings?',
    a: 'Go to Settings, then open Reservation settings to change booking rules for your restaurant.',
  },
  {
    q: 'Where do I set business hours?',
    a: 'Open Business hours from Settings to update the days and times your restaurant takes bookings.',
  },
  {
    q: 'How do I manage closures and holidays?',
    a: 'Use Holidays & closures in Settings to add dates when your restaurant is closed.',
  },
  {
    q: 'How do I review my subscription?',
    a: 'Open Subscription plan from Settings to see your plan status, cancellation note, and billing links.',
  },
  {
    q: 'Where do I see past invoices?',
    a: 'Open Billing history from Settings. The invoice rows are informational because Stripe emails receipts.',
  },
  {
    q: 'How do I add a new payment card?',
    a: 'Open Payment method in Settings, then tap Add payment card to enter a new card.',
  },
  {
    q: 'How do I invite a team member?',
    a: 'Open Staff members or Team from Settings, then use Invite team member to send an invite.',
  },
  {
    q: 'How do I add or edit staff PIN codes?',
    a: 'Open Staff PIN codes from Settings, then use Add staff PIN code or the edit action on an existing PIN.',
  },
  {
    q: 'Who do I contact for account help?',
    a: `Email ${SUPPORT_EMAIL} and include your restaurant name plus the issue you are seeing.`,
  },
];

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  rowSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  faqCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  faqRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  faqRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  faqQuestion: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  faqAnswer: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },
  hero: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.h2,
    color: c.textPrimary,
  },
  heroText: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },
}));

export default function SupportScreen() {
  const c = useColors();
  const styles = useStyles();
  const [openFaq, setOpenFaq] = useState<string | null>(FAQ_ITEMS[0]?.q ?? null);

  const openEmail = (subject: string) => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`);
  };

  return (
    <OwnerScreen
      header={<SubpageHeader title="Support" accentBack />}
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Support</Text>
        <Text style={styles.introText}>Get help fast without leaving the restaurant side.</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>CONTACT</Text>
        <Text style={styles.heroTitle}>We reply by email</Text>
        <Text style={styles.heroText}>
          Use the support address below for billing, account, or restaurant setup questions.
        </Text>
      </View>

      <View style={styles.card}>
        <Pressable
          onPress={() => openEmail('Restaurant Support')}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgElevated }]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="mail-outline" size={16} color={c.gold} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Email support</Text>
            <Text style={styles.rowSub}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
        </Pressable>
      </View>

      <Text style={styles.introTitle}>FAQ</Text>
      <View style={styles.faqCard}>
        {FAQ_ITEMS.map((item, index) => {
          const open = openFaq === item.q;
          return (
            <Pressable
              key={item.q}
              onPress={() => setOpenFaq((prev) => (prev === item.q ? null : item.q))}
              style={[
                styles.faqRow,
                index > 0 && styles.faqRowDivider,
              ]}
            >
              <Text style={styles.faqQuestion}>{item.q}</Text>
              {open ? <Text style={styles.faqAnswer}>{item.a}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </OwnerScreen>
  );
}
