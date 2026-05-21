import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
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
  PRIVACY_VERSION,
  PRIVACY_EFFECTIVE_DATE,
} from '@/lib/legal/versions';
import {
  TERMS_INTRO,
  TERMS_SECTIONS,
} from '@/lib/legal/termsContent';
import {
  PRIVACY_INTRO,
  PRIVACY_PLAIN_LANGUAGE_SUMMARY,
  PRIVACY_SECTIONS,
  PRIVACY_SUB_PROCESSORS,
  PRIVACY_SUB_PROCESSORS_LAST_REVIEWED,
} from '@/lib/legal/privacyContent';

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
  // Modal styles
  modalRoot: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalTitle: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseBtn: {
    padding: spacing.sm,
  },
  modalScroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  modalMeta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  modalIntro: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  modalSectionHeading: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalParagraph: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  modalCalloutBox: {
    backgroundColor: c.bgSurface,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  modalCalloutLabel: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  modalCalloutItem: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
}));

type DocType = 'terms' | 'privacy' | null;

export default function ConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { recordLegalConsent, signOut } = useAuthSession();
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Modal-based doc reader: opening Terms/Privacy NEVER leaves the
  // consent screen (so back gestures can't bypass the gate).
  const [openDoc, setOpenDoc] = useState<DocType>(null);

  const handleAccept = async () => {
    if (!agree || submitting) return;
    setSubmitting(true);
    try {
      await recordLegalConsent();
      // AuthContext state updates synchronously; the gate in
      // app/_layout.tsx will release on the next render and redirect
      // to the appropriate home (customer or staff) — that path
      // already exists at the bottom of the gate effect.
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
            onPress={() => setOpenDoc('terms')}
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
            onPress={() => setOpenDoc('privacy')}
            style={({ pressed }) => [styles.docBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Read Privacy Policy"
          >
            <View style={styles.docBtnTextWrap}>
              <Text style={styles.docBtnLabel}>Read Privacy Policy</Text>
              <Text style={styles.docBtnSub}>
                Version {PRIVACY_VERSION} · Effective {PRIVACY_EFFECTIVE_DATE}
              </Text>
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

      {/* Fullscreen doc reader. Lives inside the consent screen so
          dismissing it via the X button (or iOS swipe-to-dismiss on
          a presentationStyle="fullScreen" modal) returns to consent
          rather than escaping to /(customer)/discover. This is the
          fix for the gate-bypass bug reported 2026-05-21. */}
      <Modal
        visible={openDoc !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpenDoc(null)}
      >
        <DocReader doc={openDoc} onClose={() => setOpenDoc(null)} />
      </Modal>
    </ScreenWrapper>
  );
}

function DocReader({ doc, onClose }: { doc: DocType; onClose: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const titleLabel = doc === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  return (
    <SafeAreaView style={styles.modalRoot}>
      <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.modalTitle}>{titleLabel}</Text>
        <Pressable
          onPress={onClose}
          style={styles.modalCloseBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={c.textPrimary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.modalScroll}
        showsVerticalScrollIndicator={true}
      >
        {doc === 'terms' ? <TermsBody /> : doc === 'privacy' ? <PrivacyBody /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TermsBody() {
  const styles = useStyles();
  return (
    <>
      <Text style={styles.modalMeta}>
        Effective {TERMS_EFFECTIVE_DATE} · Last updated {TERMS_LAST_UPDATED}
      </Text>
      <Text style={styles.modalIntro}>{TERMS_INTRO}</Text>
      {TERMS_SECTIONS.map((section, i) => (
        <View key={i}>
          {section.heading ? (
            <Text style={styles.modalSectionHeading}>{section.heading}</Text>
          ) : null}
          {section.paragraphs.map((p, j) => (
            <Text key={j} style={styles.modalParagraph}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function PrivacyBody() {
  const styles = useStyles();
  return (
    <>
      <Text style={styles.modalMeta}>
        Version {PRIVACY_VERSION} · Effective {PRIVACY_EFFECTIVE_DATE}
      </Text>
      <Text style={styles.modalIntro}>{PRIVACY_INTRO}</Text>

      <View style={styles.modalCalloutBox}>
        <Text style={styles.modalCalloutLabel}>PLAIN-LANGUAGE SUMMARY</Text>
        {PRIVACY_PLAIN_LANGUAGE_SUMMARY.map((bullet, i) => (
          <Text key={i} style={styles.modalCalloutItem}>
            • {bullet}
          </Text>
        ))}
      </View>

      {PRIVACY_SECTIONS.map((section, i) => (
        <View key={i}>
          {section.heading ? (
            <Text style={styles.modalSectionHeading}>{section.heading}</Text>
          ) : null}
          {section.paragraphs.map((p, j) => (
            <Text key={j} style={styles.modalParagraph}>
              {p}
            </Text>
          ))}
        </View>
      ))}

      <Text style={styles.modalSectionHeading}>Schedule A — Sub-Processors</Text>
      <Text style={styles.modalParagraph}>
        The following sub-processors may process personal information described in this Policy. Each is bound by contractual data-protection obligations no less protective than those in this Policy.
      </Text>
      {PRIVACY_SUB_PROCESSORS.map((sp, i) => (
        <Text key={i} style={styles.modalParagraph}>
          • {sp.name} — {sp.service} ({sp.region})
        </Text>
      ))}
      <Text style={styles.modalParagraph}>
        The most recent sub-processor list is published at https://cenaiva.com/legal/sub-processors.
      </Text>
      <Text style={styles.modalParagraph}>
        This Privacy Policy v{PRIVACY_VERSION} was last reviewed and updated on {PRIVACY_SUB_PROCESSORS_LAST_REVIEWED}.
      </Text>
    </>
  );
}
