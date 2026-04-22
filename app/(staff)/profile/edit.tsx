import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SectionCard } from '@/components/owner/SectionCard';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  OWNER_BUSINESS_PROFILE,
  OWNER_BUSINESS_HOURS,
} from '@/lib/mock/ownerApp';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },

  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 6,
  },
  fieldDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    paddingVertical: 4,
    minHeight: 28,
  },
  inputMultiline: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    minHeight: 80,
    paddingVertical: 4,
    lineHeight: 22,
  },

  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 52,
  },
  hoursLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
    flex: 1,
  },
  hoursTime: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },

  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: 0.2,
  },
}));

function formatHour(h: string | null) {
  if (!h) return 'Closed';
  const [hh, mm] = h.split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour}:${String(mm).padStart(2, '0')} ${ampm}`;
}

export default function EditBusinessProfileScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const p = OWNER_BUSINESS_PROFILE;
  const [name, setName] = useState(p.name);
  const [cuisine, setCuisine] = useState(p.cuisine);
  const [description, setDescription] = useState(p.description);
  const [phone, setPhone] = useState(p.phone);
  const [email, setEmail] = useState(p.email);
  const [address, setAddress] = useState(p.address);
  const [website, setWebsite] = useState(p.website);

  const save = () => {
    Alert.alert('Saved', 'Business profile updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top }} />
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Business profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
      >
        <Text style={styles.heading}>Edit profile</Text>

        <SectionCard sectionTitle="Basics">
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholderTextColor={c.textMuted}
              style={styles.input}
            />
          </View>
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Cuisine</Text>
            <TextInput
              value={cuisine}
              onChangeText={setCuisine}
              placeholderTextColor={c.textMuted}
              style={styles.input}
            />
          </View>
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={c.textMuted}
              style={styles.inputMultiline}
              multiline
              textAlignVertical="top"
            />
          </View>
        </SectionCard>

        <SectionCard sectionTitle="Contact">
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor={c.textMuted}
              style={styles.input}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={c.textMuted}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Website</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholderTextColor={c.textMuted}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholderTextColor={c.textMuted}
              style={styles.inputMultiline}
              multiline
              textAlignVertical="top"
            />
          </View>
        </SectionCard>

        <SectionCard sectionTitle="Hours" marginBottom={spacing.xl}>
          {OWNER_BUSINESS_HOURS.map((h, i) => (
            <View
              key={h.day}
              style={[styles.hoursRow, i > 0 && styles.fieldDivider]}
            >
              <Text style={styles.hoursLabel}>{h.label}</Text>
              <Text style={styles.hoursTime}>
                {h.open ? `${formatHour(h.open)} – ${formatHour(h.close)}` : 'Closed'}
              </Text>
            </View>
          ))}
        </SectionCard>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save changes</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
