/**
 * Build 3c — In-app refund request form. Per Cenaiva ToS §10.3:
 * "For duplicate charges or verified failed transactions, contact
 * support@cenaiva.com and we will investigate and resolve within
 * 5 business days." This screen replaces the manual email-only
 * contact path with an in-app form that creates an audited
 * refund_requests row + pings support@cenaiva.com automatically.
 *
 * For obvious duplicate-PI cases (two charges to the same PI
 * within 5 min), the server auto-issues the refund + flags the
 * row as auto_resolved without human review.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, ScreenWrapper } from '@/components/ui';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { submitRefundRequest, type RefundReasonCode } from '@/lib/refunds/refundRequests';
import { friendlyError } from '@/lib/errors/friendlyError';

const REASONS: Array<{ code: RefundReasonCode; title: string; subtitle: string }> = [
  {
    code: 'duplicate',
    title: 'Duplicate charge',
    subtitle: 'My card was charged more than once for the same booking',
  },
  {
    code: 'failed',
    title: 'Failed transaction',
    subtitle: 'I was charged but my booking didn\'t complete',
  },
  {
    code: 'other',
    title: 'Other',
    subtitle: 'Tell us what happened below',
  },
];

const useStyles = createStyles((c) => ({
  scroll: { padding: spacing.lg, gap: spacing.lg },
  header: { marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  reasonCard: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  reasonCardActive: { borderColor: c.gold, borderWidth: 1.5 },
  reasonText: { flex: 1 },
  reasonTitle: { fontSize: 15, fontWeight: '600', color: c.textPrimary, marginBottom: 2 },
  reasonSubtitle: { fontSize: 12, color: c.textSecondary, lineHeight: 16 },
  note: { fontSize: 12, color: c.textMuted, lineHeight: 16 },
  textInput: {
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    color: c.textPrimary,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
}));

export default function RequestRefundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { bookingId: id } = useLocalSearchParams<{ bookingId: string }>();
  const [reasonCode, setReasonCode] = useState<RefundReasonCode | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reasonCode) {
      Alert.alert('Please pick a reason', 'Choose the option that best matches what happened.');
      return;
    }
    if (reasonCode === 'other' && reasonText.trim().length < 10) {
      Alert.alert(
        'Please tell us a bit more',
        'For "Other" reasons, please describe what happened (at least 10 characters) so support can help.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitRefundRequest({
        reservation_id: id,
        reason_code: reasonCode,
        reason_text: reasonText.trim() || undefined,
      });
      Alert.alert(
        result.status === 'auto_resolved' ? 'Refund issued' : 'Request received',
        result.message,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(
        'Could not submit',
        friendlyError(err, 'Your refund request could not be submitted. Please try again or email support@cenaiva.com.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Request a refund</Text>
            <Text style={styles.subtitle}>
              Refunds are issued to your original card and appear on your statement within 5 business days.
            </Text>
          </View>

          <View>
            <Text style={styles.sectionLabel}>What happened?</Text>
            {REASONS.map((r) => {
              const isActive = reasonCode === r.code;
              return (
                <TouchableOpacity
                  key={r.code}
                  style={[styles.reasonCard, isActive && styles.reasonCardActive]}
                  onPress={() => setReasonCode(r.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Ionicons
                    name={isActive ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isActive ? c.gold : c.textMuted}
                  />
                  <View style={styles.reasonText}>
                    <Text style={styles.reasonTitle}>{r.title}</Text>
                    <Text style={styles.reasonSubtitle}>{r.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View>
            <Text style={styles.sectionLabel}>Additional detail (optional)</Text>
            <TextInput
              value={reasonText}
              onChangeText={setReasonText}
              placeholder="Anything else our support team should know"
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={5}
              maxLength={2000}
              accessibilityLabel="Additional refund detail"
              style={styles.textInput}
            />
          </View>

          <Text style={styles.note}>
            For obvious duplicate charges, your refund may be issued automatically and you'll see it on your card within 5 business days. Other cases are reviewed by Cenaiva support and resolved within 5 business days per our Terms of Service.
          </Text>
        </ScrollView>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: c.bgBase, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}>
          <Button
            title={submitting ? 'Submitting…' : 'Submit refund request'}
            onPress={handleSubmit}
            disabled={!reasonCode || submitting}
          />
          {submitting ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={c.gold} /> : null}
        </View>
      </View>
    </ScreenWrapper>
  );
}
