import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Button, Checkbox } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  LATEST_LEGAL_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_LAST_UPDATED,
} from '@/lib/legal/versions';

const useStyles = createStyles((c) => ({
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  docButtons: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bgSurface,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  docBtnTextWrap: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  docBtnLabel: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  docBtnSub: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  agreeRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  agreeLabel: {
    ...typography.body,
    color: c.textPrimary,
    lineHeight: 22,
  },
  acceptBtnWrap: {
    marginBottom: spacing.md,
  },
  signOutBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  signOutText: {
    ...typography.body,
    color: c.textSecondary,
    fontWeight: '500',
  },
  versionLine: {
    ...typography.bodySmall,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
}));

export default function ConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { recordLegalConsent, signOut } = useAuthSession();
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openTerms = () => {
    router.push('/(customer)/profile/legal/terms' as never);
  };
  const openPrivacy = () => {
    router.push('/(customer)/profile/legal/privacy-policy' as never);
  };

  const handleAccept = async () => {
    if (!agree || submitting) return;
    setSubmitting(true);
    try {
      await recordLegalConsent();
      // AuthContext state updates synchronously after the write resolves;
      // the gate in app/_layout.tsx will release on the next render and
      // redirect to the appropriate home (customer or staff).
    } catch (err) {
      Alert.alert('Could not save', friendlyError(err, 'Please try again in a moment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignored; signOut clears local state regardless
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Before you continue</Text>
          <Text style={styles.subtitle}>
            We've updated our Terms of Service and Privacy Policy. Please review and accept to continue using Cenaiva.
          </Text>
        </View>

        <View style={styles.docButtons}>
          <Pressable
            onPress={openTerms}
            style={({ pressed }) => [styles.docBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Read Terms of Service"
          >
            <View style={styles.docBtnTextWrap}>
              <Text style={styles.docBtnLabel}>Read Terms of Service</Text>
              <Text style={styles.docBtnSub}>
                Effective {TERMS_EFFECTIVE_DATE} · Last updated {TERMS_LAST_UPDATED}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />
          </Pressable>

          <Pressable
            onPress={openPrivacy}
            style={({ pressed }) => [styles.docBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Read Privacy Policy"
          >
            <View style={styles.docBtnTextWrap}>
              <Text style={styles.docBtnLabel}>Read Privacy Policy</Text>
              <Text style={styles.docBtnSub}>Version 1.1 · Effective {TERMS_LAST_UPDATED}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.agreeRow}>
          <Checkbox
            checked={agree}
            onChange={setAgree}
            label={
              <Text style={styles.agreeLabel}>
                I have read and agree to the Terms of Service and Privacy Policy.
              </Text>
            }
          />
        </View>

        <View style={styles.acceptBtnWrap}>
          <Button
            title={submitting ? 'Saving…' : 'Accept and continue'}
            onPress={handleAccept}
            disabled={!agree || submitting}
          />
        </View>

        <Pressable onPress={handleSignOut} style={styles.signOutBtn} accessibilityRole="button">
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.versionLine}>
          Effective {TERMS_LAST_UPDATED} · Version {LATEST_LEGAL_VERSION}
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
