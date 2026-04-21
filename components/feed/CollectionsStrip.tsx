import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { feedCollections } from '@/lib/mock/feedCollections';
import { colors, spacing, borderRadius } from '@/lib/theme';

interface Props {
  onPressCollection?: (id: string) => void;
}

export function CollectionsStrip({ onPressCollection }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerLabel}>DISCOVER</Text>
        </View>
        <Pressable hitSlop={8}>
          <Text style={styles.seeAll}>See all →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {feedCollections.map((col) => (
          <Pressable
            key={col.id}
            onPress={() => onPressCollection?.(col.id)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.82 }]}
          >
            <LinearGradient
              colors={col.gradient as [string, string]}
              style={styles.tileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.tileInner}>
                <Text style={styles.tileEmoji}>{col.emoji}</Text>
                <View style={styles.tileBottom}>
                  <Text style={styles.tileTitle} numberOfLines={2}>{col.title}</Text>
                  <Text style={styles.tileSubtitle}>{col.subtitle}</Text>
                </View>
              </View>
              {/* Gold top-edge glow */}
              <LinearGradient
                colors={['rgba(201,162,74,0.18)', 'transparent']}
                style={styles.tileTopGlow}
              />
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const TILE_W = 148;
const TILE_H = 188;

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    marginVertical: 8,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.4,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
  },

  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tileGradient: {
    flex: 1,
  },
  tileTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  tileInner: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  tileEmoji: {
    fontSize: 32,
  },
  tileBottom: {
    gap: 3,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  tileSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
