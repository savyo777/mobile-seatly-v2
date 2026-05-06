import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingRight: spacing.sm,
  },
  backText: { ...typography.body, color: c.textSecondary },
  brandWordmark: {
    color: c.gold,
    fontWeight: '700',
    letterSpacing: 4,
    fontSize: 12,
  },
  topRight: { width: 60 },

  /* Hero */
  hero: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    marginBottom: spacing.xl,
    backgroundColor: c.bgSurface,
  },
  heroGradient: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  medallion: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.32)',
    marginBottom: spacing.xs,
  },
  heroEyebrow: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 2,
    marginBottom: 2,
  },
  heroTitle: {
    ...typography.serifDisplay,
    color: c.textPrimary,
    fontSize: 30,
    lineHeight: 38,
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    color: c.textSecondary,
    lineHeight: 24,
    maxWidth: 340,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(201,168,76,0.22)',
    marginVertical: spacing.md,
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
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trialText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },

  /* Sections */
  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.4,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },

  /* Numbered feature list */
  featureList: {
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: spacing.lg,
  },
  featureNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.30)',
    marginTop: 2,
  },
  featureNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.5,
  },
  featureTextWrap: { flex: 1 },
  featureTitle: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureText: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 20,
  },

  /* Path preview */
  pathCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pathIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.16)',
  },
  pathIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.gold,
  },
  pathLabel: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  pathConnector: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(201,168,76,0.25)',
    marginLeft: 11,
  },

  /* Footer */
  footer: { marginTop: spacing.sm, gap: spacing.md },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  helperText: {
    ...typography.bodySmall,
    color: c.textMuted,
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.brandWordmark}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(201,168,76,0.20)', 'rgba(201,168,76,0.04)', 'rgba(0,0,0,0.10)']}
            locations={[0, 0.55, 1]}
            style={styles.heroGradient}
          >
            <View style={styles.medallion}>
              <Ionicons name="storefront-outline" size={26} color={c.gold} />
            </View>
            <Text style={styles.heroEyebrow}>RESTAURANT ONBOARDING</Text>
            <Text style={styles.heroTitle}>Bring your{'\n'}restaurant to Cenaiva</Text>
            <Text style={styles.heroSubtitle}>
              A guided setup to publish your venue, accept reservations, and connect with diners
              who already love discovering new tables here.
            </Text>

            <View style={styles.hairline} />

            <View style={styles.trialRow}>
              <View style={styles.trialPill}>
                <Ionicons name="sparkles-outline" size={14} color={c.gold} />
                <Text style={styles.trialText}>3 months free</Text>
              </View>
              <View style={styles.trialPill}>
                <Ionicons name="card-outline" size={14} color={c.gold} />
                <Text style={styles.trialText}>No charge during trial</Text>
              </View>
              <View style={styles.trialPill}>
                <Ionicons name="time-outline" size={14} color={c.gold} />
                <Text style={styles.trialText}>~3 minutes</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.sectionLabel}>WHAT YOU UNLOCK</Text>
        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <View style={styles.featureNumber}>
              <Text style={styles.featureNumberText}>01</Text>
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>A polished public profile</Text>
              <Text style={styles.featureText}>
                A curated venue page with your menu, hours, and signature moments — designed to
                feel like a magazine listing, not a generic directory entry.
              </Text>
            </View>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureRow}>
            <View style={styles.featureNumber}>
              <Text style={styles.featureNumberText}>02</Text>
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Reservations, ready to go</Text>
              <Text style={styles.featureText}>
                Booking flow, guest notes, and party-size handling — set up the moment your
                restaurant goes live.
              </Text>
            </View>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureRow}>
            <View style={styles.featureNumber}>
              <Text style={styles.featureNumberText}>03</Text>
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Verified ownership</Text>
              <Text style={styles.featureText}>
                We confirm the business so the listing stays tied to the people actually running
                the room.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <View style={styles.pathCard}>
          <View style={styles.pathRow}>
            <View style={styles.pathIndex}>
              <Text style={styles.pathIndexText}>1</Text>
            </View>
            <Text style={styles.pathLabel}>Share a few business details</Text>
          </View>
          <View style={styles.pathConnector} />
          <View style={styles.pathRow}>
            <View style={styles.pathIndex}>
              <Text style={styles.pathIndexText}>2</Text>
            </View>
            <Text style={styles.pathLabel}>Add a payment method for after the trial</Text>
          </View>
          <View style={styles.pathConnector} />
          <View style={styles.pathRow}>
            <View style={styles.pathIndex}>
              <Text style={styles.pathIndexText}>3</Text>
            </View>
            <Text style={styles.pathLabel}>Go live and start taking bookings</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Begin onboarding"
            onPress={() => router.push('/(customer)/profile/register-restaurant-form')}
            size="lg"
          />
          <View style={styles.helperRow}>
            <Ionicons name="lock-closed-outline" size={12} color={c.textMuted} />
            <Text style={styles.helperText}>Your information is encrypted and never shared.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
