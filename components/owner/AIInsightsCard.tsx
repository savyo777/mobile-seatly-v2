import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace } from '@/lib/theme/ownerTheme';
import { OwnerSectionLabel } from './OwnerSectionLabel';

type Props = {
  title: string;
  insight: string;
  onSeeMore?: () => void;
  seeMoreLabel?: string;
};

/** Dashboard teaser: one short line + optional link to full AI */
export function AIInsightsCard({ title, insight, onSeeMore, seeMoreLabel = 'See more' }: Props) {
  const styles = useStyles();
  if (!insight.trim()) return null;

  return (
    <View style={styles.wrap}>
      <OwnerSectionLabel marginBottom={ownerSpace.xs}>{title}</OwnerSectionLabel>
      <View style={styles.shell}>
        <Text style={[styles.text, onSeeMore ? styles.textWithLink : styles.textSolo]}>{insight}</Text>
        {onSeeMore ? (
          <Pressable onPress={onSeeMore} style={({ pressed }) => [styles.seeMoreRow, pressed && styles.pressed]}>
            <Text style={styles.seeMoreText}>{seeMoreLabel}</Text>
            <Text style={styles.seeMoreChevron}>›</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  wrap: {
    marginBottom: ownerSpace.md,
  },
  shell: {
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
    overflow: 'hidden',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: ownerColors.textSecondary,
    paddingHorizontal: ownerSpace.md,
    paddingTop: ownerSpace.sm,
  },
  textSolo: {
    paddingBottom: ownerSpace.sm,
  },
  textWithLink: {
    paddingBottom: ownerSpace.xs,
  },
  seeMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: ownerSpace.md,
    paddingBottom: ownerSpace.sm,
    paddingTop: 2,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.gold,
  },
  seeMoreChevron: {
    fontSize: 18,
    fontWeight: '600',
    color: ownerColors.gold,
    marginTop: -1,
  },
  pressed: {
    opacity: 0.85,
  },
  };
});
