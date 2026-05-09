import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { PromotionOfferCard } from '@/components/profile/PromotionOfferCard';
import { mockPromotions as DEMO_PROMOTIONS } from '@/lib/mock/profileScreens';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

const mockPromotions: typeof DEMO_PROMOTIONS = isDemoModeEnabled() ? DEMO_PROMOTIONS : [];

export default function PromotionsScreen() {
  const { t } = useTranslation();
  return (
    <ProfileStackScreen title={t('profile.promotions')}>
      <View style={styles.list}>
        {mockPromotions.map((o) => (
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
