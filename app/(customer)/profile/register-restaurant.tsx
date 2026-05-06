import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  inner: { flex: 1, paddingTop: spacing.lg },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },
  hero: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    marginBottom: spacing.lg,
    backgroundColor: c.bgSurface,
  },
  heroGradient: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroKickerText: {
    ...typography.label,
    color: c.gold,
    fontWeight: '700',
  },
  heroTitle: {
    ...typography.h2,
    color: c.textPrimary,
  },
  heroSubtitle: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    maxWidth: 320,
  },
  trialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trialText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
  },
  featureCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    marginTop: 1,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  featureText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  footer: {
    marginTop: spacing.xl,
  },
}));

export default function RegisterRestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: c.gold, fontWeight: '700', letterSpacing: 4 }}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(201,168,76,0.22)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.08)']}
            locations={[0, 0.55, 1]}
            style={styles.heroGradient}
          >
            <View style={styles.heroKicker}>
              <Ionicons name="storefront-outline" size={14} color={c.gold} />
              <Text style={styles.heroKickerText}>Restaurant onboarding</Text>
            </View>
            <Text style={styles.heroTitle}>Register your restaurant</Text>
            <Text style={styles.heroSubtitle}>
              Create your venue profile, unlock booking tools, and start bringing Cenaiva diners to your tables.
            </Text>
            <View style={styles.trialRow}>
              <View style={styles.trialPill}>
                <Ionicons name="sparkles-outline" size={14} color={c.gold} />
                <Text style={styles.trialText}>3 months free</Text>
              </View>
              <View style={styles.trialPill}>
                <Ionicons name="card-outline" size={14} color={c.gold} />
                <Text style={styles.trialText}>Billing starts after trial</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you get</Text>
          <View style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="person-add-outline" size={16} color={c.gold} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>A public restaurant profile</Text>
                <Text style={styles.featureText}>
                  Show your venue details, highlight your menu, and give diners a clear place to discover you.
                </Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="calendar-outline" size={16} color={c.gold} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Booking-ready flow</Text>
                <Text style={styles.featureText}>
                  Set up the restaurant side of Cenaiva so guests can move from discovery to reservations faster.
                </Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark-outline" size={16} color={c.gold} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Owner verification</Text>
                <Text style={styles.featureText}>
                  Confirm the restaurant account and keep the registration tied to the right business.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next step</Text>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>We will ask for a few business details, then payment setup.</Text>
            <Text style={styles.featureText}>
              It is a short onboarding flow designed to feel more like a guided setup than a form dump.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={() => router.push('/(customer)/profile/register-restaurant-form')}
            size="lg"
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
