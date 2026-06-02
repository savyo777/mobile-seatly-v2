import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { useColors, createStyles, borderRadius } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { deleteAccount } from '@/lib/services/accountSecurity';
import { friendlyError } from '@/lib/errors/friendlyError';
import { formatCents } from '@/lib/stripe/stripeFee';

const useStyles = createStyles((c) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: { fontSize: 20, fontWeight: '700', color: c.textPrimary },
  body: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: c.textPrimary, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: c.textPrimary,
    backgroundColor: c.bgBase,
  },
  errorText: { fontSize: 13, lineHeight: 18, color: c.danger },
  buttonsRow: { gap: 10, marginTop: 6 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));

type Props = {
  visible: boolean;
  /** Called to dismiss the dialog (Cancel / backdrop). */
  onClose: () => void;
  /** Called after the account is deleted and the local session is cleared. */
  onDeleted: () => void;
};

/**
 * Type-to-confirm account-deletion dialog. Cross-platform (no iOS-only
 * Alert.prompt). Requires the diner to retype the email on their account — the
 * same value the canonical delete-account edge fn validates server-side — then
 * surfaces how many upcoming reservations were cancelled + refunded.
 */
export function DeleteAccountDialog({ visible, onClose, onDeleted }: Props) {
  const c = useColors();
  const styles = useStyles();
  const [email, setEmail] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTyped('');
    setError(null);
    let active = true;
    void getSupabase()
      ?.auth.getSession()
      .then(({ data }) => {
        if (active) setEmail(data.session?.user?.email ?? null);
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const matches = !!email && typed.trim().toLowerCase() === email.toLowerCase();

  const handleDelete = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteAccount(typed.trim());
      const refunded = result.refundTotalCents > 0;
      const cancelled = result.cancelledReservationIds.length;
      onDeleted();
      if (cancelled > 0 || refunded) {
        Alert.alert(
          'Account deleted',
          `We cancelled ${cancelled} upcoming reservation${cancelled === 1 ? '' : 's'}` +
            (refunded ? ` and refunded ${formatCents(result.refundTotalCents)}` : '') +
            '. Refunds settle to your original card within ~5 business days.',
        );
      }
    } catch (e) {
      setError(friendlyError(e, 'Could not delete your account. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="trash-outline" size={26} color={c.danger} />
          </View>
          <Text style={styles.title}>Delete account</Text>
          <Text style={styles.body}>
            This is permanent and cannot be undone. We’ll cancel and refund any upcoming
            reservations first, then remove your account and personal data. Records we’re
            legally required to keep are de-identified, not retained against you.
          </Text>
          {email ? (
            <>
              <Text style={styles.label}>Type {email} to confirm</Text>
              <TextInput
                style={styles.input}
                value={typed}
                onChangeText={setTyped}
                placeholder={email}
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!busy}
                accessibilityLabel="Confirm your email to delete your account"
              />
            </>
          ) : (
            <Text style={styles.body}>
              Your account has no email on file. Please contact help@cenaiva.com to delete it.
            </Text>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.buttonsRow}>
            {busy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={c.danger} />
                <Text style={styles.secondaryText}>Deleting your account…</Text>
              </View>
            ) : (
              <Button
                title="Delete account"
                variant="danger"
                onPress={handleDelete}
                disabled={!matches}
              />
            )}
            {!busy ? (
              <Pressable onPress={onClose} style={styles.secondaryBtn} accessibilityRole="button">
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
