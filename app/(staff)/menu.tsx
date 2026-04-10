import React, { useMemo } from 'react';
import { Text, StyleSheet, Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { mockMenuItems, type MenuItem } from '@/lib/mock/menuItems';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

const OWNER_MENU_RESTAURANT_ID = 'r1';

export default function OwnerMenuScreen() {
  const { t } = useTranslation();

  const byCategory = useMemo(() => {
    const items = mockMenuItems.filter((m) => m.restaurantId === OWNER_MENU_RESTAURANT_ID);
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, []);

  return (
    <OwnerScreen>
      <Text style={styles.title}>{t('owner.menuTitle')}</Text>
      <Text style={styles.sub}>{t('owner.menuSubtitle')}</Text>

      {[...byCategory.entries()].map(([category, items], sectionIndex) => (
        <View key={category} style={styles.section}>
          <Text style={styles.sectionLabel}>{category}</Text>
          {items.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(sectionIndex * 40 + i * 30)}>
              <GlassCard style={styles.card}>
                <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.price}>{formatCurrency(item.price, 'cad')}</Text>
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.badge}>{item.isAvailable ? t('owner.menuAvailable') : t('owner.menuUnavailable')}</Text>
                    {item.isFeatured ? <Text style={styles.featured}>{t('owner.menuFeatured')}</Text> : null}
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          ))}
        </View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: 18,
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: ownerColors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    marginBottom: 10,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.bgElevated,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: ownerColors.text,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: ownerColors.gold,
    marginTop: 4,
  },
  desc: {
    fontSize: 13,
    color: ownerColors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: ownerColors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  featured: {
    fontSize: 11,
    fontWeight: '800',
    color: ownerColors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: ownerColors.goldSubtle,
  },
});
