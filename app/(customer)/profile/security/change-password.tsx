import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { changePassword } from '@/lib/services/accountSecurity';

type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

function getPasswordChecks(pw: string): PasswordChecks {
  return {
    minLength: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[!@#$%^&*_\-?.]/.test(pw),
  };
}

const useStyles = createStyles((c) => ({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
  },
  inputRowFocused: {
    borderColor: c.gold,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: c.textPrimary,
  },
  eyeBtn: {
    padding: spacing.sm,
  },
  fieldError: {
    ...typography.bodySmall,
    color: c.danger,
    marginTop: spacing.xs,
  },
  rules: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  ruleItem: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1200',
  },
}));

function PasswordField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={label}
          placeholderTextColor={c.textMuted}
          style={styles.textInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => setVisible((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textMuted} />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const checks = getPasswordChecks(next);
  const isPasswordValid = Object.values(checks).every(Boolean);

  const validate = () => {
    const e: typeof errors = {};
    if (!current) e.current = 'Required';
    if (!isPasswordValid)
      e.next = t('profile.passwordTooWeak');
    if (next !== confirm) e.confirm = t('profile.passwordMismatch');
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await changePassword(current, next);
      Alert.alert('Done', t('profile.passwordChanged'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const ready = current.length > 0 && next.length >= 8 && confirm.length > 0;

  return (
    <ProfileStackScreen title={t('profile.changePassword')}>
      <PasswordField
        label={t('profile.currentPassword')}
        value={current}
        onChange={(v) => { setCurrent(v); setErrors((e) => ({ ...e, current: undefined })); }}
        error={errors.current}
      />
      <PasswordField
        label={t('profile.newPassword')}
        value={next}
        onChange={(v) => { setNext(v); setErrors((e) => ({ ...e, next: undefined })); }}
        error={errors.next}
      />
      <PasswordField
        label={t('profile.confirmPassword')}
        value={confirm}
        onChange={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: undefined })); }}
        error={errors.confirm}
      />
      <Text style={styles.rules}>
        Minimum 8 characters · Uppercase, lowercase, and a number
      </Text>
      <Text style={styles.ruleItem}>{`${checks.minLength ? '✓' : '○'} At least 8 characters`}</Text>
      <Text style={styles.ruleItem}>{`${checks.uppercase ? '✓' : '○'} At least 1 uppercase letter`}</Text>
      <Text style={styles.ruleItem}>{`${checks.lowercase ? '✓' : '○'} At least 1 lowercase letter`}</Text>
      <Text style={styles.ruleItem}>{`${checks.number ? '✓' : '○'} At least 1 number`}</Text>
      <Text style={styles.ruleItem}>{`${checks.special ? '✓' : '○'} At least 1 special character (! @ # $ % ^ & * _ - ? .)`}</Text>
      <Pressable
        onPress={handleSubmit}
        disabled={!ready || loading || !isPasswordValid}
        style={[styles.submitBtn, (!ready || loading || !isPasswordValid) && styles.submitBtnDisabled]}
      >
        {loading
          ? <ActivityIndicator color="#1A1200" />
          : <Text style={styles.submitText}>Update password</Text>
        }
      </Pressable>
    </ProfileStackScreen>
  );
}
