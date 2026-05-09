import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';

type Method = 'sms' | 'email';

const useStyles = createStyles((c) => ({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.30)',
  },
  heroTitle: {
    ...typography.h2,
    color: c.textPrimary,
    textAlign: 'center',
  },
  heroBody: {
    ...typography.body,
    color: c.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },

  toggleCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  toggleDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },

  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHelper: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  methodCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  rowPressed: { backgroundColor: c.bgElevated },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  methodText: { flex: 1, gap: 2 },
  methodTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  methodDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  methodBadge: {
    ...typography.label,
    color: c.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.12)',
    overflow: 'hidden',
  },
  verificationCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  verificationTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  verificationText: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },
  codeInput: {
    ...typography.h2,
    color: c.textPrimary,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  codeError: {
    ...typography.bodySmall,
    color: c.danger,
    lineHeight: 16,
  },
  verifyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
  },
  verifyBtnDisabled: {
    opacity: 0.45,
  },
  verifyBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
  },
  verificationActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  linkText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },
}));

const METHODS: { key: Method; icon: keyof typeof Ionicons.glyphMap; label: string; sub: string }[] = [
  {
    key: 'sms',
    icon: 'chatbox-outline',
    label: 'Text message (SMS)',
    sub: 'Receive a 6-digit code on your phone.',
  },
  {
    key: 'email',
    icon: 'mail-outline',
    label: 'Email',
    sub: 'Receive a code at your account email.',
  },
];

export default function TwoFactorScreen() {
  const c = useColors();
  const styles = useStyles();
  const { user } = useAuthSession();
  const [enabled, setEnabled] = useState(false);
  const [activeMethod, setActiveMethod] = useState<Method | null>(null);
  const [pendingMethod, setPendingMethod] = useState<Method | null>(null);
  const [sentCode, setSentCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const phoneTarget = user?.phone?.trim() ?? '';
  const emailTarget = user?.email?.trim() ?? '';
  const phoneAvailable = phoneTarget.length > 0;
  const emailAvailable = emailTarget.length > 0;

  const targetForMethod = (method: Method) => (method === 'sms' ? phoneTarget : emailTarget);
  const methodAvailable = (method: Method) =>
    method === 'sms' ? phoneAvailable : emailAvailable;

  const sendVerificationCode = (method: Method) => {
    if (!methodAvailable(method)) {
      Alert.alert(
        method === 'sms' ? 'No phone on file' : 'No email on file',
        method === 'sms'
          ? 'Add a phone number to your profile before enabling SMS-based two-factor authentication.'
          : 'Add an email to your profile before enabling email-based two-factor authentication.',
      );
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setPendingMethod(method);
    setSentCode(code);
    setCodeInput('');
    setCodeError('');
    Alert.alert(
      method === 'sms' ? 'SMS code sent' : 'Email code sent',
      `We sent a 6-digit code to ${targetForMethod(method)}.\n\nDevelopment code: ${code}`,
    );
  };

  const onToggle = (next: boolean) => {
    if (!next) {
      Alert.alert('Turn off two-factor?', 'Your account will only require your password to sign in.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => {
            setEnabled(false);
            setActiveMethod(null);
            setPendingMethod(null);
            setSentCode('');
            setCodeInput('');
            setCodeError('');
          },
        },
      ]);
      return;
    }
    sendVerificationCode(activeMethod ?? 'sms');
  };

  const onPickMethod = (m: Method) => {
    if (enabled && activeMethod === m) return;
    sendVerificationCode(m);
  };

  const onVerifyCode = () => {
    const normalized = codeInput.replace(/\D/g, '');
    if (!pendingMethod || normalized.length !== 6) {
      setCodeError('Enter the 6-digit code.');
      return;
    }
    if (normalized !== sentCode) {
      setCodeError('That code does not match. Try again.');
      return;
    }
    setEnabled(true);
    setActiveMethod(pendingMethod);
    setPendingMethod(null);
    setSentCode('');
    setCodeInput('');
    setCodeError('');
    Alert.alert('Two-factor enabled', `${METHODS.find((item) => item.key === pendingMethod)?.label} is now active.`);
  };

  const onCancelVerification = () => {
    setPendingMethod(null);
    setSentCode('');
    setCodeInput('');
    setCodeError('');
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Two-factor authentication"
          accentBack
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark-outline" size={36} color={c.gold} />
        </View>
        <Text style={styles.heroTitle}>Add a second step at sign-in</Text>
        <Text style={styles.heroBody}>
          Even if someone learns your password, they still won't be able to get into your account.
        </Text>
      </View>

      <View style={styles.toggleCard}>
        <View style={styles.toggleIcon}>
          <Ionicons name="lock-closed-outline" size={18} color={c.gold} />
        </View>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>
            Two-factor is {enabled ? 'on' : 'off'}
          </Text>
          <Text style={styles.toggleDesc}>
            {enabled
              ? 'A code is required after your password.'
              : 'Turn on to require a code at every sign-in.'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: c.gold, false: c.border }}
          thumbColor="#fff"
        />
      </View>

      <Text style={styles.sectionLabel}>VERIFICATION METHOD</Text>
      <Text style={styles.sectionHelper}>
        Pick how you'd like to receive the second-step code.
      </Text>
      <View style={styles.methodCard}>
        {METHODS.map((m, i) => {
          const isActive = enabled && activeMethod === m.key;
          const isPending = pendingMethod === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => onPickMethod(m.key)}
              style={({ pressed }) => [
                styles.methodRow,
                i > 0 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={m.label}
            >
              <View style={styles.methodIconWrap}>
                <Ionicons name={m.icon} size={18} color={c.gold} />
              </View>
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>{m.label}</Text>
                <Text style={styles.methodDesc}>{m.sub}</Text>
              </View>
              {isActive ? <Text style={styles.methodBadge}>ACTIVE</Text> : null}
              {isPending ? <Text style={styles.methodBadge}>VERIFY</Text> : null}
              {!isActive && !isPending ? (
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {pendingMethod ? (
        <View style={styles.verificationCard}>
          <Text style={styles.verificationTitle}>
            Enter the {pendingMethod === 'sms' ? 'SMS' : 'email'} code
          </Text>
          <Text style={styles.verificationText}>
            We sent a 6-digit code to {targetForMethod(pendingMethod)}. Two-factor stays off until
            this code is verified.
          </Text>
          <TextInput
            value={codeInput}
            onChangeText={(value) => {
              setCodeInput(value.replace(/\D/g, '').slice(0, 6));
              if (codeError) setCodeError('');
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={c.textMuted}
            style={styles.codeInput}
            accessibilityLabel="Two-factor verification code"
          />
          {codeError ? <Text style={styles.codeError}>{codeError}</Text> : null}
          <Pressable
            onPress={onVerifyCode}
            disabled={codeInput.length !== 6}
            style={({ pressed }) => [
              styles.verifyBtn,
              codeInput.length !== 6 && styles.verifyBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.verifyBtnText}>Verify code</Text>
          </Pressable>
          <View style={styles.verificationActions}>
            <Pressable onPress={() => sendVerificationCode(pendingMethod)} hitSlop={8}>
              <Text style={styles.linkText}>Resend code</Text>
            </Pressable>
            <Pressable onPress={onCancelVerification} hitSlop={8}>
              <Text style={styles.linkText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </OwnerScreen>
  );
}
