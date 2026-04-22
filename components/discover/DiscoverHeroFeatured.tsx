import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '@/lib/mock/restaurants';
import { getUrgencyCopy } from '@/lib/mock/discoverPresentation';
import { createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';

type Props = {
  restaurant: Restaurant;
  onPressCard: () => void;
  onPressReserve: () => void;
};

const useStyles = createStyles((c) => ({
  wrap: {
    marginBottom: spacing.lg,
  },
  cardOuter: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.25)',
    ...shadows.card,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  heroImage: {
    minHeight: 220,
    width: '100%',
    justifyContent: 'space-between',
  },
  heroImageRadius: {
    borderRadius: borderRadius.xl,
  },
  badgeBest: {
    alignSelf: 'flex-start',
    margin: spacing.md,
    backgroundColor: 'rgba(201, 168, 76, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  badgeBestText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroBottom: {
    padding: spacing.lg,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroAvailability: {
    ...typography.body,
    color: c.goldLight,
    fontWeight: '700',
  },
  heroSlot: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: c.gold,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    ...shadows.goldGlow,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
  },
}));

export function DiscoverHeroFeatured({ restaurant, onPressCard, onPressReserve }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const urgency = getUrgencyCopy(restaurant, t);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPressCard}
        style={({ pressed }) => [styles.cardOuter, pressed && styles.pressed]}
      >
        <ImageBackground
          source={{ uri: restaurant.coverPhotoUrl }}
          style={styles.heroImage}
          imageStyle={styles.heroImageRadius}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.88)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badgeBest}>
            <Text style={styles.badgeBestText}>{t('discover.badgeBestMatch')}</Text>
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroName} numberOfLines={2}>
              {restaurant.name}
            </Text>
            <Text style={styles.heroAvailability}>{urgency.line}</Text>
            {urgency.sub ? <Text style={styles.heroSlot}>{urgency.sub}</Text> : null}
            <Pressable onPress={onPressReserve} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
              <Text style={styles.ctaText}>{t('discover.reserveNow')}</Text>
            </Pressable>
          </View>
        </ImageBackground>
      </Pressable>
    </View>
  );
}
