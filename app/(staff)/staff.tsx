import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { STAFF_ROSTER } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

export default function OwnerStaffScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <Text style={styles.title}>{t('owner.staffTitle')}</Text>
      <Text style={styles.sub}>{t('owner.staffSubtitle')}</Text>

      {STAFF_ROSTER.map((member, i) => (
        <Animated.View key={member.id} entering={FadeInDown.delay(i * 45)}>
          <GlassCard style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.name}>{member.name}</Text>
              <View style={[styles.pill, member.onClock ? styles.pillOn : styles.pillOff]}>
                <Text style={styles.pillText}>
                  {member.onClock ? t('owner.staffOnClock') : t('owner.staffOff')}
                </Text>
              </View>
            </View>
            <Text style={styles.role}>{member.role}</Text>
            <Text style={styles.shift}>{member.shift}</Text>
          </GlassCard>
        </Animated.View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    marginBottom: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
    flex: 1,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
  },
  pillOn: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
  },
  pillOff: {
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: ownerColors.textSecondary,
  },
  role: {
    fontSize: 14,
    fontWeight: '700',
    color: ownerColors.gold,
  },
  shift: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginTop: 6,
  },
});
