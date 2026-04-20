import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SnapGrid } from '@/components/snaps/SnapGrid';
import { listTopTags, listTrendingPosts } from '@/lib/mock/social';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const posts = useMemo(() => listTrendingPosts(7), []);
  const topTags = useMemo(() => listTopTags(10), []);

  const Header = (
    <View style={styles.headerBlock}>
      <Text style={styles.sectionTitle}>{t('explore.topTags')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {topTags.map(({ tag, count }) => (
          <Pressable
            key={tag}
            onPress={() =>
              router.push(
                `/(customer)/discover/tag/${encodeURIComponent(tag.replace(/^#/, ''))}` as Href,
              )
            }
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.chipText}>{tag}</Text>
            <Text style={styles.chipCount}>{count}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.sectionTitle}>{t('explore.whatsPopping')}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('explore.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <SnapGrid
        posts={posts}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        emptyLabel={t('explore.empty')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerBlock: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
  },
  chipRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
  },
  chipCount: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
  },
});
