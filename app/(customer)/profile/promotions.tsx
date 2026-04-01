import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { PromotionOfferCard } from '@/components/profile/PromotionOfferCard';
import { mockPromotions } from '@/lib/mock/profileScreens';

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
