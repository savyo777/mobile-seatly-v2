import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { useColors, createStyles, borderRadius } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  mergeDinerAccounts,
  type DuplicateAccountInfo,
} from '@/lib/auth/accountMerge';

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
    backgroundColor: 'rgba(212, 165, 116, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: { fontSize: 20, fontWeight: '700', color: c.textPrimary },
  body: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  errorText: { fontSize: 13, lineHeight: 18, color: c.danger },
  buttonsRow: { gap: 10, marginTop: 6 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));

type Props = {
  info: DuplicateAccountInfo | null;
  /** Called after a successful merge. */
  onMerged: () => void;
  /** Called when the diner declines to merge. */
  onKeepSeparate: () => void;
};

/**
 * Post-login prompt shown when a diner has a second account sharing their email
 * or phone. Merging is irreversible and moves all history onto the older account.
 */
export function DinerMergeDialog({ info, onMerged, onKeepSeparate }: Props) {
  const c = useColors();
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!info) return null;

  const matchLabel =
    info.matchedOn === 'phone'
      ? 'phone number'
      : info.matchedOn === 'both'
        ? 'email and phone number'
        : 'email';
  const bookingLine =
    info.archivedBookingCount > 0
      ? ` It has ${info.archivedBookingCount} booking${info.archivedBookingCount === 1 ? '' : 's'} we'll move over.`
      : '';

  const handleMerge = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await mergeDinerAccounts(info);
      onMerged();
    } catch (e) {
      setError(friendlyError(e, 'Could not merge your accounts. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onKeepSeparate}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="git-merge-outline" size={26} color={c.gold} />
          </View>
          <Text style={styles.title}>Merge your accounts?</Text>
          <Text style={styles.body}>
            You have another Cenaiva account that uses the same {matchLabel} ({info.matchedValue}).
            {bookingLine} Merging keeps all your reservations, reviews, and saved cards in one place.
            This can’t be undone.
            {info.archivedIsCurrent
              ? ' You’ll be signed out and can sign back in with your other account.'
              : ''}
          </Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.buttonsRow}>
            {busy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={c.gold} />
                <Text style={styles.secondaryText}>Merging your accounts…</Text>
              </View>
            ) : (
              <Button title="Merge accounts" onPress={handleMerge} />
            )}
            {!busy ? (
              <Pressable onPress={onKeepSeparate} style={styles.secondaryBtn} accessibilityRole="button">
                <Text style={styles.secondaryText}>Keep separate</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
