import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { startChangePhone, confirmChangePhone } from '@/lib/services/accountSecurity';
import { normalizePhoneToE164 } from '@/lib/services/phoneAuth';
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
  resendRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  resendText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },
}));

export default function ChangePhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const { user } = useAuthSession();

  const currentPhone = user?.phone ? `+${user.phone}` : '';

  const [step, setStep] = useState<'enter' | 'verify'>('enter');
  const [newPhone, setNewPhone] = useState('');
  const [pendingE164, setPendingE164] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [focusedField, setFocusedField] = useState<'phone' | 'code' | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');

  const phoneLooksValid = useMemo(() => normalizePhoneToE164(newPhone) !== null, [newPhone]);

  const handleSendCode = async () => {
    setPhoneError('');
    if (!phoneLooksValid) {
      setPhoneError('Enter a valid phone number (include country code, or 10-digit US number).');
      return;
    }
    setLoading(true);
    try {
      const { phoneE164 } = await startChangePhone(newPhone);
      setPendingE164(phoneE164);
      setStep('verify');
      Alert.alert('Code sent', `We sent a 6-digit code to ${phoneE164}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setCodeError('');
    if (!pendingE164) return;
    if (code.replace(/\D/g, '').length !== 6) {
      setCodeError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await confirmChangePhone(pendingE164, code);
      Alert.alert('Phone updated', `Your phone number is now ${pendingE164}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to confirm code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingE164) return;
    setLoading(true);
    try {
      await startChangePhone(pendingE164);
      Alert.alert('Code resent', `A new 6-digit code was sent to ${pendingE164}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileStackScreen title={t('profile.changePhone')}>
      <Text style={styles.currentLabel}>CURRENT PHONE NUMBER</Text>
      <Text style={styles.currentValue}>{currentPhone || 'Not set'}</Text>

      {step === 'enter' ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>NEW PHONE NUMBER</Text>
            <View style={[styles.inputRow, focusedField === 'phone' && styles.inputRowFocused]}>
              <TextInput
                value={newPhone}
                onChangeText={(v) => {
                  setNewPhone(v);
                  setPhoneError('');
                }}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                placeholder="+1 555 123 4567"
                placeholderTextColor={c.textMuted}
                style={styles.textInput}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}
          </View>

          <Text style={styles.hint}>
            We&apos;ll send a 6-digit code by SMS. Your current number stays active until you confirm the new
            one.
          </Text>

          <Pressable
            onPress={handleSendCode}
            disabled={!phoneLooksValid || loading}
            style={[styles.submitBtn, (!phoneLooksValid || loading) && styles.submitBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#1A1200" />
            ) : (
              <Text style={styles.submitText}>Send verification code</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>VERIFICATION CODE</Text>
            <View style={[styles.inputRow, focusedField === 'code' && styles.inputRowFocused]}>
              <TextInput
                value={code}
                onChangeText={(v) => {
                  setCode(v);
                  setCodeError('');
                }}
                onFocus={() => setFocusedField('code')}
                onBlur={() => setFocusedField(null)}
                placeholder="123456"
                placeholderTextColor={c.textMuted}
                style={styles.textInput}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {codeError ? <Text style={styles.fieldError}>{codeError}</Text> : null}
          </View>

          <Text style={styles.hint}>
            Enter the 6-digit code we sent to {pendingE164}. Standard message rates may apply.
          </Text>

          <Pressable
            onPress={handleConfirm}
            disabled={loading || code.replace(/\D/g, '').length !== 6}
            style={[
              styles.submitBtn,
              (loading || code.replace(/\D/g, '').length !== 6) && styles.submitBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#1A1200" />
            ) : (
              <Text style={styles.submitText}>Confirm new number</Text>
            )}
          </Pressable>

          <Pressable onPress={handleResend} disabled={loading} style={styles.resendRow} hitSlop={8}>
            <Text style={styles.resendText}>Resend code</Text>
          </Pressable>
        </>
      )}
    </ProfileStackScreen>
  );
}
