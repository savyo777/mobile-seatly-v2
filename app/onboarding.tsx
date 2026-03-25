import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItem,
  TouchableOpacity,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/lib/theme';
import { Button } from '@/components/ui';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: 'onboarding.slide1Title' | 'onboarding.slide2Title' | 'onboarding.slide3Title';
  subtitleKey: 'onboarding.slide1Subtitle' | 'onboarding.slide2Subtitle' | 'onboarding.slide3Subtitle';
};

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'map-outline',
    titleKey: 'onboarding.slide1Title',
    subtitleKey: 'onboarding.slide1Subtitle',
  },
  {
    id: '2',
    icon: 'calendar-outline',
    titleKey: 'onboarding.slide2Title',
    subtitleKey: 'onboarding.slide2Subtitle',
  },
  {
    id: '3',
    icon: 'gift-outline',
    titleKey: 'onboarding.slide3Title',
    subtitleKey: 'onboarding.slide3Subtitle',
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const skipBarHeight = 48;
  const footerMinHeight = 120;
  const slideHeight = Math.max(
    320,
    windowHeight - insets.top - insets.bottom - skipBarHeight - footerMinHeight,
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (typeof idx === 'number') setActiveIndex(idx);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;

  const goToLogin = useCallback(() => {
    router.replace('/(auth)/welcome');
  }, [router]);

  const renderItem: ListRenderItem<Slide> = useCallback(
    ({ item }) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH, minHeight: slideHeight }]}>
        <Ionicons name={item.icon} size={96} color={colors.gold} style={styles.slideIcon} />
        <Text style={styles.title}>{t(item.titleKey)}</Text>
        <Text style={styles.subtitle}>{t(item.subtitleKey)}</Text>
      </View>
    ),
    [t, slideHeight],
  );

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    setActiveIndex(Math.min(Math.max(idx, 0), SLIDES.length - 1));
  }, []);

  const lastIndex = SLIDES.length - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.skipRow}>
        <View style={styles.skipSpacer} />
        <TouchableOpacity onPress={goToLogin} hitSlop={12}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listWrap}>
        <FlatList
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.id}
              style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {activeIndex === lastIndex && (
          <Button title={t('onboarding.getStarted')} onPress={goToLogin} size="lg" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  skipSpacer: {
    flex: 1,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  listWrap: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  slideIcon: {
    marginBottom: spacing['3xl'],
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.lg,
    gap: spacing['2xl'],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.gold,
    width: 22,
  },
  dotInactive: {
    backgroundColor: colors.textMuted,
  },
});
