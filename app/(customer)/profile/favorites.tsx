import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { SavedRestaurantsList } from '@/components/profile/SavedRestaurantsList';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  return (
    <ProfileStackScreen title={t('profile.quickFavorites')}>
      <SavedRestaurantsList subtitle="Your favorite venues, synced across devices for quick booking and rewards." />
    </ProfileStackScreen>
  );
}
