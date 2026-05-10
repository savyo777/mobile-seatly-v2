import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { PromotionOfferCard } from '@/components/profile/PromotionOfferCard';
import { mockPromotions as DEMO_PROMOTIONS, type PromotionOffer } from '@/lib/mock/profileScreens';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchActivePromotions, type PromotionRow } from '@/lib/promotions/getPromotions';

const initialPromotions: PromotionOffer[] = isDemoModeEnabled() ? DEMO_PROMOTIONS : [];

function formatExpires(endsAt: string | null): string {
  if (!endsAt) return 'No expiration';
  try {
    const d = new Date(endsAt);
    if (Number.isNaN(d.getTime())) return 'No expiration';
    return `Expires ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } catch {
    return 'No expiration';
  }
}

function formatDiscount(row: PromotionRow): string | undefined {
  if (typeof row.discount_value !== 'number' || row.discount_value <= 0) return undefined;
  if (row.discount_unit === 'percent') return `${Math.round(row.discount_value)}% off`;
  if (row.discount_unit === 'amount') return `$${row.discount_value.toFixed(0)} off`;
  return undefined;
}

function mapPromotionRow(row: PromotionRow): PromotionOffer {
  const termParts: string[] = [];
  if (row.promo_code) termParts.push(`Code: ${row.promo_code}`);
  if (typeof row.min_order_amount === 'number' && row.min_order_amount > 0) {
    termParts.push(`Min order $${row.min_order_amount.toFixed(0)}`);
  }
  if (row.applies_to) termParts.push(`Applies to ${row.applies_to.replace(/_/g, ' ')}`);
  if (typeof row.max_uses === 'number' && row.max_uses > 0) {
    termParts.push(`Up to ${row.max_uses} uses`);
  }
  return {
    id: row.id,
    headline: row.title,
    description: row.description ?? '',
    expiresLabel: formatExpires(row.ends_at),
    terms: termParts.length ? termParts.join(' · ') : 'See restaurant for full terms.',
    badge: formatDiscount(row),
  };
}

export default function PromotionsScreen() {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<PromotionOffer[]>(initialPromotions);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void (async () => {
      try {
        const rows = await fetchActivePromotions({ limit: 20 });
        if (!active) return;
        setPromotions(rows.map(mapPromotionRow));
      } catch (err) {
        console.warn('[promotions] fetch failed', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProfileStackScreen title={t('profile.promotions')}>
      <View style={styles.list}>
        {promotions.map((o) => (
          <PromotionOfferCard key={o.id} offer={o} />
        ))}
      </View>
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24,
  },
});
