import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  ListRenderItem,
  ViewToken,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius, typography, type Palette } from '@/lib/theme';
import { key } from '@/lib/storage/keys';

// Persistence: once the user finishes or skips onboarding we set this flag
// in AsyncStorage. `app/index.tsx` reads it on cold start and routes
// straight to `/(auth)/welcome` instead of replaying onboarding. Cleared
// on app reinstall; no dev toggle.
export const ONBOARDING_SEEN_KEY = key('onboardingSeen');

const { width: W, height: H } = Dimensions.get('window');

// Frame ~= a small phone-shaped card. The four slide mocks render inside
// one of these so the user sees a consistent "preview" of the real app
// rather than four mismatched illustrations.
const FRAME_W = Math.min(W * 0.74, 320);
const FRAME_H = FRAME_W * 1.55;

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  Mock: React.FC;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    title: "Find tonight's table",
    subtitle:
      'The whole city, mapped. Dark Cenaiva style, gold markers, tap any spot for the details.',
    Mock: DiscoverMock,
  },
  {
    id: '2',
    title: 'Hey Cenaiva',
    subtitle:
      'Just ask. "Book me a table for two at 7" — the assistant finds it, holds it, confirms it.',
    Mock: HeyCenaivaMock,
  },
  {
    id: '3',
    title: 'Snap & share',
    subtitle:
      'Take a photo of the meal, tag the spot, pick where to share. Done in three taps.',
    Mock: SnapMock,
  },
  {
    id: '4',
    title: 'Book it in seconds',
    subtitle:
      'Pick the date, the time, the party — done. Confirmation lands instantly.',
    Mock: BookMock,
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
    height: H * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
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
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 28,
    backgroundColor: c.bgBase,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,76,0.3)',
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
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

  const finish = async () => {
    // AsyncStorage failures here are non-fatal — worst case the user sees
    // onboarding once more on next cold start. Don't block navigation.
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // ignore
    }
    router.replace('/(auth)/welcome');
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      return;
    }
    void finish();
  };

  const skip = () => void finish();
  const isLast = activeIndex === SLIDES.length - 1;

  const renderItem: ListRenderItem<Slide> = ({ item }) => {
    const Mock = item.Mock;
    return (
      <View style={[styles.slide, { width: W }]}>
        <View style={styles.illArea}>
          <View style={styles.frame} pointerEvents="none">
            <Mock />
          </View>
        </View>
      </View>
    );
  };

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

// -----------------------------------------------------------------------------
// Slide mocks. Each one is a static visual replica of the real screen — same
// colors / typography / layout as the live components, but pure View+Text so
// onboarding doesn't pull in providers, native map tiles, hooks, or
// AsyncStorage reads at mount time. If the live UI drifts, update the mocks
// here too (low frequency — the underlying design system is what changes
// most often, and those tokens flow through automatically via useColors).
// -----------------------------------------------------------------------------

const DEMO_COVER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
const DEMO_FOOD = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800';

// Slide 1 — Discover map with gold cluster, $$ pill, Relocate chip, popup.
function DiscoverMock() {
  const c = useColors();
  const styles = mockStyles(c);
  return (
    <View style={styles.mapShell}>
      {/* Dark map tile + a few faux road strokes. */}
      <View style={styles.roadDiag} />
      <View style={styles.roadDiag2} />
      <View style={styles.roadVert} />
      <View style={styles.roadHorz} />

      {/* Relocate pill, top-left. */}
      <View style={styles.relocate}>
        <Ionicons name="locate" size={11} color="#C9A84C" />
        <Text style={styles.relocateText}>Relocate</Text>
      </View>

      {/* Gold cluster bubble — count "2". */}
      <View style={[styles.cluster, { top: '40%', left: '24%' }]}>
        <View style={styles.clusterInner}>
          <Text style={styles.clusterCount}>2</Text>
        </View>
      </View>
      {/* Single $$ price pill — visually identical to RestaurantMapMarker. */}
      <View style={[styles.pricePill, { top: '32%', left: '62%' }]}>
        <Text style={styles.priceText}>$$</Text>
      </View>

      {/* Bottom-docked popup — visually mirrors MapRestaurantPopup at
          ~half-scale. Cover photo, name in serif, price + cuisine row,
          and the "Booked up tonight" + NotifyMe pill at the bottom. */}
      <View style={styles.popup}>
        <Image source={{ uri: DEMO_COVER }} style={styles.popupCover} contentFit="cover" />
        <View style={styles.popupActions}>
          <View style={styles.popupIcon}>
            <Ionicons name="heart-outline" size={12} color="#fff" />
          </View>
          <View style={styles.popupIcon}>
            <Ionicons name="bookmark-outline" size={12} color="#fff" />
          </View>
          <View style={styles.popupIcon}>
            <Ionicons name="close" size={12} color="#fff" />
          </View>
        </View>
        <View style={styles.popupBody}>
          <Text style={styles.popupName} numberOfLines={1}>Nova Ristorante</Text>
          <View style={styles.popupMeta}>
            <Text>
              <Text style={styles.popupPrice}>$$$</Text>
            </Text>
            <Text style={styles.popupMetaDot}>·</Text>
            <Text style={styles.popupMetaText}>Italian</Text>
            <Text style={styles.popupMetaDot}>·</Text>
            <Text style={styles.popupMetaText}>Downtown</Text>
          </View>
          <View style={styles.notifyPill}>
            <Ionicons name="notifications-outline" size={10} color="#0A0A0A" />
            <Text style={styles.notifyText}>Notify me</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Slide 2 — Hey Cenaiva voice assistant. Reuses the Discover frame look
// but adds a live transcript pill above the gold FAB.
function HeyCenaivaMock() {
  const c = useColors();
  const styles = mockStyles(c);
  return (
    <View style={styles.mapShell}>
      <View style={styles.roadDiag} />
      <View style={styles.roadDiag2} />
      <View style={styles.roadHorz} />

      {/* Same cluster + price pill from the discover slide — implies you're
          mid-browse when you ask the assistant for help. */}
      <View style={[styles.cluster, { top: '36%', left: '50%' }]}>
        <View style={styles.clusterInner}>
          <Text style={styles.clusterCount}>3</Text>
        </View>
      </View>

      {/* Transcript pill — what the user just said. */}
      <View style={styles.transcript}>
        <View style={styles.transcriptDot} />
        <Text style={styles.transcriptHead}>Listening…</Text>
        <Text style={styles.transcriptQuote} numberOfLines={2}>
          "Find me a quiet spot for date night"
        </Text>
      </View>

      {/* The real AiChatFab look — gold round button bottom-right. */}
      <View style={styles.aiFab}>
        <Ionicons name="chatbubble-ellipses" size={20} color="#0A0A0A" />
      </View>
    </View>
  );
}

// Slide 3 — Snap & share. Mirrors the camera viewfinder + filter ring.
function SnapMock() {
  const c = useColors();
  const styles = mockStyles(c);
  return (
    <View style={styles.cameraShell}>
      {/* Viewfinder photo of a dish. */}
      <Image source={{ uri: DEMO_FOOD }} style={StyleSheet.absoluteFill} contentFit="cover" />

      {/* Top chrome: flash + close. */}
      <View style={styles.cameraTop}>
        <View style={styles.glassBtn}>
          <Ionicons name="close" size={14} color="#fff" />
        </View>
        <View style={styles.glassBtn}>
          <Ionicons name="flash-outline" size={14} color="#fff" />
        </View>
      </View>

      {/* Filter ring carousel — small horizontal pills, center one is
          selected and circled in gold. */}
      <View style={styles.filterRing}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.filterChip, i === 2 && styles.filterChipActive]}>
            <View style={styles.filterChipFill} />
          </View>
        ))}
      </View>

      {/* Big shutter + flip + library. */}
      <View style={styles.cameraBottom}>
        <View style={styles.glassBtn}>
          <Ionicons name="images-outline" size={14} color="#fff" />
        </View>
        <View style={styles.shutterOuter}>
          <View style={styles.shutterInner} />
        </View>
        <View style={styles.glassBtn}>
          <Ionicons name="camera-reverse-outline" size={14} color="#fff" />
        </View>
      </View>
    </View>
  );
}

// Slide 4 — Book it in seconds. Visual replica of the booking review card.
function BookMock() {
  const c = useColors();
  const styles = mockStyles(c);
  return (
    <View style={styles.bookShell}>
      {/* Title block with the restaurant in serif. */}
      <Text style={styles.bookHeader}>Reservation</Text>
      <Text style={styles.bookName}>Nova Ristorante</Text>
      <Text style={styles.bookSubhead}>123 King Street West · Downtown</Text>

      <View style={styles.bookRowBlock}>
        <View style={styles.bookRow}>
          <Ionicons name="calendar-outline" size={14} color="#C9A84C" />
          <Text style={styles.bookRowLabel}>Tonight, Friday</Text>
        </View>
        <View style={styles.bookRow}>
          <Ionicons name="time-outline" size={14} color="#C9A84C" />
          <Text style={styles.bookRowLabel}>7:30 PM · Table 6</Text>
        </View>
        <View style={styles.bookRow}>
          <Ionicons name="people-outline" size={14} color="#C9A84C" />
          <Text style={styles.bookRowLabel}>Party of 2</Text>
        </View>
        <View style={styles.bookRow}>
          <Ionicons name="card-outline" size={14} color="#C9A84C" />
          <Text style={styles.bookRowLabel}>$25 deposit · refundable</Text>
        </View>
      </View>

      {/* Gold confirm button at the bottom. */}
      <View style={styles.bookCta}>
        <Text style={styles.bookCtaText}>Confirm booking</Text>
        <Ionicons name="arrow-forward" size={14} color="#0A0A0A" />
      </View>

      {/* 4-step progress: Date · Time · Table · Done. */}
      <View style={styles.bookSteps}>
        {['Date', 'Time', 'Table', 'Done'].map((s, i) => (
          <View key={s} style={styles.bookStep}>
            <View style={[styles.bookStepDot, i < 3 && styles.bookStepDotDone]}>
              {i < 3 ? <Ionicons name="checkmark" size={9} color="#0A0A0A" /> : null}
            </View>
            <Text style={styles.bookStepLabel}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Shared stylesheet for all four mocks. Using a factory rather than the
// project's `createStyles` so we can reference live theme colors AND
// hardcode the gold/black brand tones the live components also bake in
// (CENAIVA_MAP_STYLE, RestaurantClusterMarker, etc.) without redirecting
// through theme tokens that don't have exactly those values.
function mockStyles(c: Palette) {
  return StyleSheet.create({
    // -- map shell shared by Discover + Hey Cenaiva
    mapShell: {
      flex: 1,
      backgroundColor: '#0A0A0A',
      position: 'relative',
    },
    roadDiag: {
      position: 'absolute',
      top: '20%',
      left: -20,
      right: -20,
      height: 2,
      backgroundColor: '#242424',
      transform: [{ rotate: '-18deg' }],
    },
    roadDiag2: {
      position: 'absolute',
      top: '62%',
      left: -20,
      right: -20,
      height: 2,
      backgroundColor: '#1F1F1F',
      transform: [{ rotate: '14deg' }],
    },
    roadVert: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '45%',
      width: 2,
      backgroundColor: '#1A1A1A',
    },
    roadHorz: {
      position: 'absolute',
      top: '48%',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: '#1A1A1A',
    },
    relocate: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(15,15,15,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(201,168,76,0.4)',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 99,
    },
    relocateText: {
      color: '#C9A84C',
      fontSize: 10,
      fontWeight: '700',
    },
    cluster: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(201,168,76,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(245,230,200,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clusterInner: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#C9A84C',
      borderWidth: 1.5,
      borderColor: '#0A0A0A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clusterCount: {
      color: '#0A0907',
      fontFamily: 'Menlo',
      fontWeight: '700',
      fontSize: 8,
      lineHeight: 10,
    },
    pricePill: {
      position: 'absolute',
      height: 18,
      paddingHorizontal: 6,
      borderRadius: 9,
      backgroundColor: '#0A0A0A',
      borderWidth: 1,
      borderColor: 'rgba(201,168,76,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    priceText: {
      color: '#C9A84C',
      fontSize: 9,
      fontWeight: '700',
      fontFamily: 'Menlo',
    },
    popup: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      right: 12,
      borderRadius: 14,
      backgroundColor: c.bgSurface,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    popupCover: {
      width: '100%',
      height: 70,
    },
    popupActions: {
      position: 'absolute',
      top: 6,
      right: 6,
      flexDirection: 'row',
      gap: 4,
    },
    popupIcon: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(10,10,10,0.7)',
      borderWidth: 0.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    popupBody: {
      padding: 10,
      gap: 4,
    },
    popupName: {
      color: c.textPrimary,
      fontFamily: 'Fraunces',
      fontWeight: '700',
      fontSize: 14,
    },
    popupMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    popupPrice: {
      color: '#C9A84C',
      fontSize: 10,
      fontWeight: '700',
    },
    popupMetaDot: {
      color: c.textMuted,
      fontSize: 9,
    },
    popupMetaText: {
      color: c.textSecondary,
      fontSize: 9,
    },
    notifyPill: {
      alignSelf: 'flex-start',
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#C9A84C',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 99,
    },
    notifyText: {
      color: '#0A0A0A',
      fontSize: 9,
      fontWeight: '700',
    },

    // -- Hey Cenaiva extras
    transcript: {
      position: 'absolute',
      bottom: 78,
      right: 18,
      maxWidth: '70%',
      backgroundColor: 'rgba(15,15,15,0.95)',
      borderWidth: 1,
      borderColor: 'rgba(201,168,76,0.5)',
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
    },
    transcriptDot: {
      position: 'absolute',
      top: 10,
      left: 10,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#C9A84C',
    },
    transcriptHead: {
      color: '#C9A84C',
      fontSize: 9,
      fontWeight: '700',
      paddingLeft: 12,
    },
    transcriptQuote: {
      color: c.textPrimary,
      fontSize: 11,
      fontStyle: 'italic',
      lineHeight: 14,
    },
    aiFab: {
      position: 'absolute',
      right: 12,
      bottom: 18,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#C9A84C',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#C9A84C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 8,
    },

    // -- Camera (Slide 3)
    cameraShell: {
      flex: 1,
      backgroundColor: '#000',
      position: 'relative',
    },
    cameraTop: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    glassBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(15,15,15,0.6)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterRing: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 70,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    filterChip: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipActive: {
      borderColor: '#C9A84C',
      transform: [{ scale: 1.1 }],
    },
    filterChipFill: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(201,168,76,0.4)',
    },
    cameraBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 24,
    },
    shutterOuter: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 3,
      borderColor: '#C9A84C',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterInner: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#C9A84C',
    },

    // -- Booking review (Slide 4)
    bookShell: {
      flex: 1,
      backgroundColor: c.bgBase,
      padding: 18,
      gap: 10,
    },
    bookHeader: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    bookName: {
      color: c.textPrimary,
      fontFamily: 'Fraunces',
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    bookSubhead: {
      color: c.textSecondary,
      fontSize: 11,
    },
    bookRowBlock: {
      marginTop: 6,
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.bgSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bookRowLabel: {
      color: c.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    bookCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#C9A84C',
      paddingVertical: 12,
      borderRadius: 99,
      marginTop: 6,
    },
    bookCtaText: {
      color: '#0A0A0A',
      fontSize: 13,
      fontWeight: '700',
    },
    bookSteps: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginTop: 'auto',
    },
    bookStep: {
      alignItems: 'center',
      gap: 4,
    },
    bookStepDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookStepDotDone: {
      backgroundColor: '#C9A84C',
      borderColor: '#C9A84C',
    },
    bookStepLabel: {
      color: c.textMuted,
      fontSize: 9,
      fontWeight: '600',
    },
  });
}
