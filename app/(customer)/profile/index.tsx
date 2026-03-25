import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper, Card, Button } from '@/components/ui';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <ScreenWrapper>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <Card style={styles.profileCard}>
        {mockCustomer.avatarUrl ? (
          <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.avatar} />
        ) : null}
        <Text style={styles.name}>{mockCustomer.fullName}</Text>
        <Text style={styles.email}>{mockCustomer.email}</Text>
        <Text style={styles.phone}>{mockCustomer.phone}</Text>
      </Card>

      <Card style={styles.rowCard}>
        <Text style={styles.rowLabel}>{t('profile.personalInfo')}</Text>
      </Card>
      <Card style={styles.rowCard}>
        <Text style={styles.rowLabel}>{t('profile.notifications')}</Text>
      </Card>

      <Button title={t('common.logout')} onPress={() => {}} variant="danger" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    backgroundColor: colors.bgElevated,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  phone: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rowCard: {
    marginBottom: spacing.sm,
  },
  rowLabel: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
