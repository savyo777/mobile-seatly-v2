import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { changeEmail, resendVerificationEmail } from '@/lib/services/accountSecurity';
import { useAuthSession } from '@/lib/auth/AuthContext';

const useStyles = createStyles((c) => ({
  currentLabel: {
    ...typography.label,
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  currentValue: {
    ...typography.body,
    color: c.textSecondary,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
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
  hint: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  submitBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
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

export default function ChangeEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const { user } = useAuthSession();

  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'pwd' | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const currentEmail = user?.email ?? '';

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async () => {
    if (!isValidEmail(newEmail)) { setEmailError('Enter a valid email address'); return; }
    if (!password) return;
    setLoading(true);
    try {
      await changeEmail(newEmail, password);
      Alert.alert('Check your inbox', t('profile.emailVerificationSent', { email: newEmail }), [
        {
          text: 'Resend',
          onPress: async () => {
            try {
              await resendVerificationEmail(newEmail);
              Alert.alert('Sent', `Verification email resent to ${newEmail}.`);
            } catch (resendErr: any) {
              Alert.alert('Error', resendErr?.message ?? 'Failed to resend verification email.');
            }
          },
        },
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const ready = isValidEmail(newEmail) && password.length > 0;

  return (
    <ProfileStackScreen title={t('profile.changeEmail')}>
      <Text style={styles.currentLabel}>CURRENT EMAIL</Text>
      <Text style={styles.currentValue}>{currentEmail || 'Not available'}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>{t('profile.newEmail').toUpperCase()}</Text>
        <View style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused]}>
          <TextInput
            value={newEmail}
            onChangeText={(v) => { setNewEmail(v); setEmailError(''); }}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            placeholder="you@example.com"
            placeholderTextColor={c.textMuted}
            style={styles.textInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CONFIRM WITH PASSWORD</Text>
        <View style={[styles.inputRow, focusedField === 'pwd' && styles.inputRowFocused]}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
            onFocus={() => setFocusedField('pwd')}
            onBlur={() => setFocusedField(null)}
            placeholder="Current password"
            placeholderTextColor={c.textMuted}
            style={styles.textInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textMuted} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.hint}>
        We'll send a verification link to your new address. Your current email stays active until you confirm.
      </Text>

      <Pressable
        onPress={handleSubmit}
        disabled={!ready || loading}
        style={[styles.submitBtn, (!ready || loading) && styles.submitBtnDisabled]}
      >
        {loading
          ? <ActivityIndicator color="#1A1200" />
          : <Text style={styles.submitText}>Send verification email</Text>
        }
      </Pressable>
    </ProfileStackScreen>
  );
}
