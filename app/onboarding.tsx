import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  ListRenderItem,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const { width: W, height: H } = Dimensions.get('window');

// ─── Slide illustrations ────────────────────────────────────────────────────

function DiscoverIllustration() {
  return (
    <View style={ill.wrap}>
      {/* Mock restaurant card */}
      <View style={[ill.card, { marginBottom: 12 }]}>
        <View style={ill.cardImg} />
        <View style={ill.cardBody}>
          <View style={ill.cardRow}>
            <View style={[ill.pill, { width: 100 }]} />
            <View style={ill.starRow}>
              {[0,1,2,3,4].map(i => (
                <Ionicons key={i} name="star" size={10} color={colors.gold} />
              ))}
            </View>
          </View>
          <View style={[ill.pill, { width: 140, marginTop: 6 }]} />
          <View style={ill.bookBtn}>
            <Text style={ill.bookBtnText}>Book a Table</Text>
          </View>
        </View>
      </View>
      {/* Second card, smaller */}
      <View style={[ill.card, ill.cardSmall]}>
        <View style={[ill.cardImg, ill.cardImgSmall]} />
        <View style={ill.cardBody}>
          <View style={[ill.pill, { width: 80 }]} />
          <View style={[ill.pill, { width: 120, marginTop: 6 }]} />
        </View>
      </View>
      {/* Map pin decoration */}
      <View style={ill.mapPin}>
        <Ionicons name="location" size={18} color={colors.gold} />
      </View>
    </View>
  );
}

function BookIllustration() {
  return (
    <View style={ill.wrap}>
      {/* Confirmation card */}
      <View style={ill.confirmCard}>
        <View style={ill.confirmIcon}>
          <Ionicons name="checkmark" size={32} color="#fff" />
        </View>
        <Text style={ill.confirmTitle}>Reservation Confirmed</Text>
        <Text style={ill.confirmSub}>Nova Ristorante</Text>
        <View style={ill.confirmDivider} />
        <View style={ill.confirmRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={ill.confirmMeta}>Tonight · 7:30 PM</Text>
        </View>
        <View style={ill.confirmRow}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <Text style={ill.confirmMeta}>Party of 2 · Table 6</Text>
        </View>
        <View style={[ill.confirmRow, { marginTop: 4 }]}>
          <Ionicons name="ticket-outline" size={14} color={colors.gold} />
          <Text style={[ill.confirmMeta, { color: colors.gold }]}>SEAT-T0N1G8T</Text>
        </View>
      </View>
      {/* Steps preview */}
      <View style={ill.steps}>
        {['Date', 'Time', 'Table', 'Done'].map((s, i) => (
          <View key={s} style={ill.step}>
            <View style={[ill.stepDot, i < 3 && { backgroundColor: colors.gold }]}>
              {i < 3 ? <Ionicons name="checkmark" size={9} color={colors.bgBase} /> : null}
            </View>
            <Text style={ill.stepLabel}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RewardsIllustration() {
  return (
    <View style={ill.wrap}>
      {/* Food post card */}
      <View style={ill.postCard}>
        <View style={ill.postImg} />
        <View style={ill.postFooter}>
          <View style={ill.postUser}>
            <View style={ill.postAvatar} />
            <View>
              <View style={[ill.pill, { width: 60 }]} />
              <View style={[ill.pill, { width: 90, marginTop: 4 }]} />
            </View>
          </View>
          <View style={ill.postActions}>
            <Ionicons name="heart" size={16} color="#EF4444" />
            <Ionicons name="bookmark" size={16} color={colors.gold} style={{ marginLeft: 8 }} />
          </View>
        </View>
      </View>
      {/* Points earned badge */}
      <View style={ill.pointsBadge}>
        <Ionicons name="star" size={16} color={colors.gold} />
        <Text style={ill.pointsText}>+25 points earned!</Text>
      </View>
      {/* Loyalty bar */}
      <View style={ill.loyaltyBar}>
        <View style={ill.loyaltyTrack}>
          <View style={ill.loyaltyFill} />
        </View>
        <Text style={ill.loyaltyLabel}>1,250 / 2,000 pts · Silver</Text>
      </View>
    </View>
  );
}

// ─── Slide data ─────────────────────────────────────────────────────────────

type Slide = {
  id: string;
  bg: string;
  Illustration: React.FC;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    bg: 'rgba(201,168,76,0.08)',
    Illustration: DiscoverIllustration,
    title: 'Discover great restaurants',
    subtitle: 'Browse nearby spots, filter by vibe, and find your next favourite table.',
  },
  {
    id: '2',
    bg: 'rgba(34,197,94,0.07)',
    Illustration: BookIllustration,
    title: 'Book a table in seconds',
    subtitle: 'Pick a date, choose your table, and confirm — your reservation is instant.',
  },
  {
    id: '3',
    bg: 'rgba(201,168,76,0.08)',
    Illustration: RewardsIllustration,
    title: 'Post meals, earn rewards',
    subtitle: 'Share your food, follow friends, and collect loyalty points with every visit.',
  },
];

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (typeof idx === 'number') setActiveIndex(idx);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  const skip = () => router.replace('/(auth)/welcome');

  const isLast = activeIndex === SLIDES.length - 1;

  const renderItem: ListRenderItem<Slide> = ({ item }) => (
    <View style={[styles.slide, { width: W }]}>
      {/* Illustration area */}
      <View style={[styles.illArea, { backgroundColor: item.bg }]}>
        <item.Illustration />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      {/* Skip */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.appName}>Cenaiva</Text>
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
      />

      {/* Text content — updates with active slide */}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{SLIDES[activeIndex].title}</Text>
        <Text style={styles.subtitle}>{SLIDES[activeIndex].subtitle}</Text>
      </View>

      {/* Dots + CTA */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Next'}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={18} color={colors.bgBase} />}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.gold,
    letterSpacing: -0.5,
  },
  skip: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  flatList: {
    flexGrow: 0,
  },
  slide: {
    alignItems: 'center',
  },
  illArea: {
    width: W,
    height: H * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.gold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.bgBase,
  },
});

// ─── Illustration styles ─────────────────────────────────────────────────────

const ill = StyleSheet.create({
  wrap: {
    width: W * 0.82,
    alignItems: 'center',
    position: 'relative',
  },

  // Discover
  card: {
    width: '100%',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardSmall: {
    width: '88%',
    alignSelf: 'flex-end',
    opacity: 0.7,
  },
  cardImg: {
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  cardImgSmall: {
    height: 52,
  },
  cardBody: {
    padding: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
    gap: 1,
  },
  pill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgElevated,
  },
  bookBtn: {
    marginTop: 10,
    backgroundColor: colors.gold,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bgBase,
  },
  mapPin: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: colors.bgSurface,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },

  // Book
  confirmCard: {
    width: '100%',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: 18,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  confirmIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  confirmSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  confirmDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  confirmMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  step: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // Rewards
  postCard: {
    width: '100%',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  postImg: {
    width: '100%',
    height: 90,
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  loyaltyBar: {
    width: '100%',
    marginTop: 12,
    gap: 6,
  },
  loyaltyTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  loyaltyFill: {
    width: '62%',
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  loyaltyLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
