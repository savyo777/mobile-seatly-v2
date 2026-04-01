import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { PersonalInformationBody } from '@/components/profile/PersonalInformationBody';

export default function PersonalInfoScreen() {
  const { t } = useTranslation();
  return (
    <ProfileStackScreen title={t('profile.personalInfo')} subtitle={t('profile.personalInfoSub')}>
      <PersonalInformationBody />
    </ProfileStackScreen>
  );
}
