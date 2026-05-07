import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  /* Avatar block */
  avatarBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -1,
  },
  changePhoto: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  changePhotoText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },

  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  field: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  fieldDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  fieldLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  fieldInput: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
    paddingVertical: 0,
  },
  fieldInputMulti: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
    minHeight: 22,
  },

  saveBtn: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
  },
}));

export default function PersonalDetailsScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

  const [firstName, setFirstName] = useState('Mark');
  const [lastName, setLastName] = useState('Henderson');
  const [role, setRole] = useState('Owner');
  const [email, setEmail] = useState('mark@novaristorante.com');
  const [phone, setPhone] = useState('+1 416 555 0142');
  const [pronouns, setPronouns] = useState('he/him');

  const initial = (firstName.trim()[0] ?? 'M').toUpperCase();

  const onSave = () => {
    Alert.alert('Saved', 'Your personal details have been updated.');
    router.back();
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Personal details"
          accentBack
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Your information</Text>
          <Text style={styles.introText}>
            Used inside Cenaiva and to verify the restaurant owner. Never shown to diners.
          </Text>
        </View>

        <View style={styles.avatarBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Pressable
            onPress={() => Alert.alert('Photo', 'Photo upload coming soon.')}
            style={({ pressed }) => [styles.changePhoto, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.changePhotoText}>Change photo</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>NAME</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>FIRST NAME</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.fieldInput}
              autoCapitalize="words"
              placeholderTextColor={c.textMuted}
            />
          </View>
          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>LAST NAME</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.fieldInput}
              autoCapitalize="words"
              placeholderTextColor={c.textMuted}
            />
          </View>
          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>PRONOUNS</Text>
            <TextInput
              value={pronouns}
              onChangeText={setPronouns}
              style={styles.fieldInputMulti}
              placeholder="optional"
              placeholderTextColor={c.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>CONTACT</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.fieldInput}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={c.textMuted}
            />
          </View>
          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>PHONE</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.fieldInput}
              keyboardType="phone-pad"
              placeholderTextColor={c.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>ROLE AT RESTAURANT</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ROLE</Text>
            <TextInput
              value={role}
              onChangeText={setRole}
              style={styles.fieldInput}
              placeholder="Owner, Manager, GM…"
              placeholderTextColor={c.textMuted}
            />
          </View>
        </View>

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.saveBtnText}>Save changes</Text>
        </Pressable>

      </ScrollView>
    </OwnerScreen>
  );
}
