import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  inner: { flex: 1, paddingTop: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },
  title: { ...typography.serifDisplay, color: c.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: c.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  banner: {
    backgroundColor: `${c.gold}14`,
    borderColor: `${c.gold}40`,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { ...typography.bodySmall, color: c.textPrimary, lineHeight: 20 },
}));

export default function RegisterRestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: c.gold, fontWeight: '700', letterSpacing: 4 }}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        <Text style={styles.title}>Register your restaurant</Text>
        <Text style={styles.subtitle}>Start with your free trial details.</Text>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Get 3 months free when you register your restaurant. After 3 months, your card will be billed
            automatically.
          </Text>
        </View>
        <Button title="Continue" onPress={() => router.push('/(customer)/profile/register-restaurant-form')} size="lg" />
      </View>
    </ScreenWrapper>
  );
}
