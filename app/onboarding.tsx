import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  ListRenderItem,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';

const { width: W, height: H } = Dimensions.get('window');

function DiscoverIllustration({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View style={ill.wrap}>
      <View style={[ill.card, { marginBottom: 12, backgroundColor: c.bgSurface, borderColor: c.border }]}>
        <View style={[ill.cardImg, { backgroundColor: 'rgba(201,168,76,0.18)' }]} />
        <View style={ill.cardBody}>
          <View style={ill.cardRow}>
            <View style={[ill.pill, { width: 100, backgroundColor: c.bgElevated }]} />
            <View style={ill.starRow}>
              {[0,1,2,3,4].map(i => (
                <Ionicons key={i} name="star" size={10} color={c.gold} />
              ))}
            </View>
          </View>
          <View style={[ill.pill, { width: 140, marginTop: 6, backgroundColor: c.bgElevated }]} />
          <View style={[ill.bookBtn, { backgroundColor: c.gold }]}>
            <Text style={[ill.bookBtnText, { color: c.bgBase }]}>Book a Table</Text>
          </View>
        </View>
      </View>
      <View style={[ill.card, ill.cardSmall, { backgroundColor: c.bgSurface, borderColor: c.border }]}>
        <View style={[ill.cardImg, ill.cardImgSmall, { backgroundColor: 'rgba(201,168,76,0.18)' }]} />
        <View style={ill.cardBody}>
          <View style={[ill.pill, { width: 80, backgroundColor: c.bgElevated }]} />
          <View style={[ill.pill, { width: 120, marginTop: 6, backgroundColor: c.bgElevated }]} />
        </View>
      </View>
      <View style={[ill.mapPin, { backgroundColor: c.bgSurface, borderColor: c.gold }]}>
        <Ionicons name="location" size={18} color={c.gold} />
      </View>
    </View>
  );
}

function BookIllustration({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View style={ill.wrap}>
      <View style={[ill.confirmCard, { backgroundColor: c.bgSurface, borderColor: c.border }]}>
        <View style={[ill.confirmIcon, { backgroundColor: c.success }]}>
          <Ionicons name="checkmark" size={32} color="#fff" />
        </View>
        <Text style={[ill.confirmTitle, { color: c.textPrimary }]}>Reservation Confirmed</Text>
        <Text style={[ill.confirmSub, { color: c.textMuted }]}>Nova Ristorante</Text>
        <View style={[ill.confirmDivider, { backgroundColor: c.border }]} />
        <View style={ill.confirmRow}>
          <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
          <Text style={[ill.confirmMeta, { color: c.textMuted }]}>Tonight · 7:30 PM</Text>
        </View>
        <View style={ill.confirmRow}>
          <Ionicons name="people-outline" size={14} color={c.textMuted} />
          <Text style={[ill.confirmMeta, { color: c.textMuted }]}>Party of 2 · Table 6</Text>
        </View>
        <View style={[ill.confirmRow, { marginTop: 4 }]}>
          <Ionicons name="ticket-outline" size={14} color={c.gold} />
          <Text style={[ill.confirmMeta, { color: c.gold }]}>SEAT-T0N1G8T</Text>
        </View>
      </View>
      <View style={ill.steps}>
        {['Date', 'Time', 'Table', 'Done'].map((s, i) => (
          <View key={s} style={ill.step}>
            <View style={[ill.stepDot, { backgroundColor: c.bgElevated, borderColor: c.border }, i < 3 && { backgroundColor: c.gold }]}>
              {i < 3 ? <Ionicons name="checkmark" size={9} color={c.bgBase} /> : null}
            </View>
            <Text style={[ill.stepLabel, { color: c.textMuted }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RewardsIllustration({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View style={ill.wrap}>
      <View style={[ill.postCard, { backgroundColor: c.bgSurface, borderColor: c.border }]}>
        <View style={[ill.postImg, { backgroundColor: 'rgba(201,168,76,0.18)' }]} />
        <View style={ill.postFooter}>
          <View style={ill.postUser}>
            <View style={[ill.postAvatar, { backgroundColor: c.bgElevated, borderColor: c.gold }]} />
            <View>
              <View style={[ill.pill, { width: 60, backgroundColor: c.bgElevated }]} />
              <View style={[ill.pill, { width: 90, marginTop: 4, backgroundColor: c.bgElevated }]} />
            </View>
          </View>
          <View style={ill.postActions}>
            <Ionicons name="heart" size={16} color="#EF4444" />
            <Ionicons name="bookmark" size={16} color={c.gold} style={{ marginLeft: 8 }} />
          </View>
        </View>
      </View>
      <View style={ill.pointsBadge}>
        <Ionicons name="star" size={16} color={c.gold} />
        <Text style={[ill.pointsText, { color: c.gold }]}>+25 points earned!</Text>
      </View>
      <View style={ill.loyaltyBar}>
        <View style={[ill.loyaltyTrack, { backgroundColor: c.bgElevated }]}>
          <View style={[ill.loyaltyFill, { backgroundColor: c.gold }]} />
        </View>
        <Text style={[ill.loyaltyLabel, { color: c.textMuted }]}>1,250 / 2,000 pts · Silver</Text>
      </View>
    </View>
  );
}

type Slide = {
  id: string;
  bg: string;
  IllustrationKey: 'discover' | 'book' | 'rewards';
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    bg: 'rgba(201,168,76,0.08)',
    IllustrationKey: 'discover',
    title: 'Discover great restaurants',
    subtitle: 'Browse nearby spots, filter by vibe, and find your next favourite table.',
  },
  {
    id: '2',
    bg: 'rgba(34,197,94,0.07)',
    IllustrationKey: 'book',
    title: 'Book a table in seconds',
    subtitle: 'Pick a date, choose your table, and confirm — your reservation is instant.',
  },
  {
    id: '3',
    bg: 'rgba(201,168,76,0.08)',
    IllustrationKey: 'rewards',
    title: 'Post meals, earn rewards',
    subtitle: 'Share your food, follow friends, and collect loyalty points with every visit.',
  },
];

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
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
    color: c.gold,
    letterSpacing: -0.5,
  },
  skip: {
    ...typography.body,
    color: c.textMuted,
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
    color: c.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: c.textSecondary,
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
    backgroundColor: c.gold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: c.textMuted,
    opacity: 0.4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    ...typography.body,
    fontWeight: '700',
    color: c.bgBase,
  },
}));

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
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
      <View style={[styles.illArea, { backgroundColor: item.bg }]}>
        {item.IllustrationKey === 'discover' && <DiscoverIllustration c={c} />}
        {item.IllustrationKey === 'book' && <BookIllustration c={c} />}
        {item.IllustrationKey === 'rewards' && <RewardsIllustration c={c} />}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.appName}>Cenaiva</Text>
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

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

      <View style={styles.textBlock}>
        <Text style={styles.title}>{SLIDES[activeIndex].title}</Text>
        <Text style={styles.subtitle}>{SLIDES[activeIndex].subtitle}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.id} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Next'}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={18} color={c.bgBase} />}
        </Pressable>
      </View>
    </View>
  );
}

const ill = {
  wrap: { width: W * 0.82, alignItems: 'center' as const, position: 'relative' as const },
  card: { width: '100%' as const, borderRadius: 12, overflow: 'hidden' as const, borderWidth: 0.5 },
  cardSmall: { width: '88%' as const, alignSelf: 'flex-end' as const, opacity: 0.7 },
  cardImg: { width: '100%' as const, height: 80 },
  cardImgSmall: { height: 52 },
  cardBody: { padding: 10 },
  cardRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  starRow: { flexDirection: 'row' as const, gap: 1 },
  pill: { height: 8, borderRadius: 4 },
  bookBtn: { marginTop: 10, borderRadius: 6, paddingVertical: 6, alignItems: 'center' as const },
  bookBtnText: { fontSize: 11, fontWeight: '700' as const },
  mapPin: { position: 'absolute' as const, top: -10, right: 8, borderRadius: 14, width: 28, height: 28, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1 },
  confirmCard: { width: '100%' as const, borderRadius: 12, padding: 18, alignItems: 'center' as const, borderWidth: 0.5 },
  confirmIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 10 },
  confirmTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 3 },
  confirmSub: { fontSize: 13, marginBottom: 12 },
  confirmDivider: { width: '100%' as const, height: 0.5, marginBottom: 10 },
  confirmRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 5, alignSelf: 'flex-start' as const },
  confirmMeta: { fontSize: 12 },
  steps: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, width: '100%' as const, marginTop: 14, paddingHorizontal: 8 },
  step: { alignItems: 'center' as const, gap: 4 },
  stepDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1 },
  stepLabel: { fontSize: 10, fontWeight: '600' as const },
  postCard: { width: '100%' as const, borderRadius: 12, overflow: 'hidden' as const, borderWidth: 0.5 },
  postImg: { width: '100%' as const, height: 90 },
  postFooter: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 10 },
  postUser: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  postAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 1 },
  postActions: { flexDirection: 'row' as const, alignItems: 'center' as const },
  pointsBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)' },
  pointsText: { fontSize: 13, fontWeight: '700' as const },
  loyaltyBar: { width: '100%' as const, marginTop: 12, gap: 6 },
  loyaltyTrack: { width: '100%' as const, height: 6, borderRadius: 3, overflow: 'hidden' as const },
  loyaltyFill: { width: '62%' as const, height: '100%' as const, borderRadius: 3 },
  loyaltyLabel: { fontSize: 11, textAlign: 'center' as const },
};
