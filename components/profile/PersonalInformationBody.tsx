import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

export function PersonalInformationBody() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(mockCustomer.fullName);
  const [email, setEmail] = useState(mockCustomer.email);
  const [phone, setPhone] = useState(mockCustomer.phone);
  const [dob] = useState('May 12, 1998');
  const [city] = useState('Milton, Ontario');
  const [language] = useState('English');

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#1E1A14', '#12100E', '#0A0A0A']} style={styles.heroBand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.avatarRing}>
          {mockCustomer.avatarUrl ? (
            <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <Ionicons name="person" size={44} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.heroName}>{mockCustomer.fullName}</Text>
        <Text style={styles.heroMeta}>{mockCustomer.email}</Text>
        <Pressable
          style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.8 }]}
          onPress={() => {}}
          accessibilityRole="button"
        >
          <Text style={styles.photoBtnText}>{t('common.edit')} photo</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.toolbar}>
        <Button
          title={editing ? t('common.done') : t('common.edit')}
          onPress={() => setEditing(!editing)}
          variant="outlined"
          size="sm"
          fullWidth={false}
          style={styles.actionBtn}
        />
      </View>

      <ProfileSectionTitle>Account</ProfileSectionTitle>
      <View style={styles.surface}>
        <Input
          label={t('profile.fullNameLabel')}
          value={fullName}
          onChangeText={setFullName}
          editable={editing}
          icon="person-outline"
        />
        <Input
          label={t('profile.emailLabel')}
          value={email}
          onChangeText={setEmail}
          editable={editing}
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />
        <Input
          label={t('profile.phoneLabel')}
          value={phone}
          onChangeText={setPhone}
          editable={editing}
          keyboardType="phone-pad"
          icon="call-outline"
        />
      </View>

      <ProfileSectionTitle>Profile details</ProfileSectionTitle>
      <View style={styles.surface}>
        <ReadOnlyRow label="Date of birth" value={dob} icon="calendar-outline" />
        <ReadOnlyRow label="City" value={city} icon="location-outline" />
        <ReadOnlyRow label="Preferred language" value={language} icon="language-outline" last />
      </View>

      <Button title={t('common.save')} onPress={() => setEditing(false)} variant="primary" size="md" style={styles.save} />
    </View>
  );
}

function ReadOnlyRow({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  return (
    <View style={[styles.readRow, !last && styles.readRowBorder]}>
      <View style={styles.readLeft}>
        <View style={styles.readIcon}>
          <Ionicons name={icon} size={17} color={colors.gold} />
        </View>
        <View style={styles.readText}>
          <Text style={styles.readLabel}>{label}</Text>
          <Text style={styles.readValue}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing['2xl'],
  },
  heroBand: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
    overflow: 'hidden',
  },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.4)',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bgElevated,
  },
  avatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  photoBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  photoBtnText: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
  },
  actionBtn: {
    minWidth: 120,
  },
  surface: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    marginBottom: spacing.lg,
  },
  save: {
    marginTop: spacing.sm,
  },
  readRow: {
    paddingVertical: spacing.md,
  },
  readRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  readLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  readIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
  },
  readText: {
    flex: 1,
  },
  readLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: 4,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  readValue: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
