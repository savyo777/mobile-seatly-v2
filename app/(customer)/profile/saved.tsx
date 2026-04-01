import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { SavedRestaurantsList } from '@/components/profile/SavedRestaurantsList';

export default function SavedScreen() {
  const { t } = useTranslation();
  return (
    <ProfileStackScreen title={t('profile.savedRestaurants')}>
      <SavedRestaurantsList subtitle="Places you have saved — tap through to view details, menus, and book a table." />
    </ProfileStackScreen>
  );
}
