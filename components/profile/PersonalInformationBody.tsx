import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mockCustomer } from '@/lib/mock/users';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';

const BIO_LIMIT = 150;

type FormState = {
  displayName: string;
  username: string;
  bio: string;
  email: string;
  phone: string;
};

function useForm(initial: FormState) {
  const [values, setValues] = useState(initial);
  const [original] = useState(initial);
  const isDirty = Object.keys(values).some(
    (k) => values[k as keyof FormState] !== original[k as keyof FormState],
  );
  const set = useCallback((field: keyof FormState) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);
  return { values, set, isDirty };
}

const useStyles = createStyles((c) => ({
  scroll: {
    paddingBottom: spacing['4xl'],
  },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  avatarRing: {
    borderWidth: 2,
    borderColor: c.gold,
    borderRadius: 50,
    padding: 3,
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.bgElevated,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.bgBase,
  },
  changePhotoLabel: {
    fontSize: 13,
    color: c.gold,
    fontWeight: '600',
  },

  group: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },

  fieldWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
  },
  fieldBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldPrefix: {
    fontSize: 15,
    color: c.textMuted,
    marginRight: 2,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
    paddingVertical: 2,
  },
  fieldInputFocused: {
    color: c.textPrimary,
  },

  bioWrap: {
    padding: spacing.md,
  },
  bioInput: {
    fontSize: 15,
    color: c.textPrimary,
    minHeight: 72,
    lineHeight: 22,
    paddingTop: 6,
    paddingBottom: 6,
    textAlignVertical: 'top',
  },
  bioCounter: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },

  saveBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.bgBase,
  },
  saveBtnTextDisabled: {
    color: c.textMuted,
  },
}));

export function PersonalInformationBody() {
  const c = useColors();
  const styles = useStyles();
  const { values, set, isDirty } = useForm({
    displayName: mockCustomer.fullName,
    username: 'alexj',
    bio: 'Chasing great meals across the city.',
    email: mockCustomer.email,
    phone: mockCustomer.phone,
  });

  const handleSave = useCallback(() => {
    Alert.alert('Saved', 'Your profile has been updated.');
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            {mockCustomer.avatarUrl ? (
              <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={36} color={c.textMuted} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.changePhotoLabel}>Change photo</Text>
        </View>

        {/* Identity fields */}
        <View style={styles.group}>
          <Field
            label="Display name"
            value={values.displayName}
            onChangeText={set('displayName')}
            placeholder="Your full name"
            autoCapitalize="words"
          />
          <Field
            label="Username"
            value={values.username}
            onChangeText={set('username')}
            placeholder="username"
            autoCapitalize="none"
            prefix="@"
            isLast
          />
        </View>

        {/* Bio */}
        <View style={styles.group}>
          <View style={styles.bioWrap}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              value={values.bio}
              onChangeText={(v) => v.length <= BIO_LIMIT && set('bio')(v)}
              placeholder="Write something about yourself…"
              placeholderTextColor={c.textMuted}
              style={styles.bioInput}
              multiline
              maxLength={BIO_LIMIT}
            />
            <Text style={styles.bioCounter}>
              {values.bio.length}/{BIO_LIMIT}
            </Text>
          </View>
        </View>

        {/* Contact fields */}
        <View style={styles.group}>
          <Field
            label="Email"
            value={values.email}
            onChangeText={set('email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone"
            value={values.phone}
            onChangeText={set('phone')}
            placeholder="+1 (000) 000-0000"
            keyboardType="phone-pad"
            isLast
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={!isDirty}
          style={({ pressed }) => [
            styles.saveBtn,
            !isDirty && styles.saveBtnDisabled,
            pressed && isDirty && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.saveBtnText, !isDirty && styles.saveBtnTextDisabled]}>
            Save changes
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  isLast?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
};

function Field({ label, value, onChangeText, placeholder, prefix, isLast, autoCapitalize, keyboardType }: FieldProps) {
  const c = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldWrap, !isLast && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        {prefix ? <Text style={styles.fieldPrefix}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          style={[styles.fieldInput, focused && styles.fieldInputFocused]}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          keyboardType={keyboardType ?? 'default'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}
