import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  STAFF_ROSTER as DEMO_STAFF_ROSTER,
  EXPENSE_LINES as DEMO_EXPENSE_LINES,
  EXPORT_OPTIONS as DEMO_EXPORT_OPTIONS,
} from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { getSupabase } from '@/lib/supabase/client';

const STAFF_ROSTER: typeof DEMO_STAFF_ROSTER = isDemoModeEnabled() ? DEMO_STAFF_ROSTER : [];
const EXPENSE_LINES: typeof DEMO_EXPENSE_LINES = isDemoModeEnabled() ? DEMO_EXPENSE_LINES : [];
const EXPORT_OPTIONS: typeof DEMO_EXPORT_OPTIONS = isDemoModeEnabled() ? DEMO_EXPORT_OPTIONS : [];
import { formatCurrency } from '@/lib/utils/formatCurrency';

type RestaurantSettings = {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  hours_json: Record<string, unknown> | null;
  plan: string | null;
  currency: string | null;
  timezone: string | null;
  tax_rate: number | null;
  trial_ends_at: string | null;
  stripe_onboarding_complete: boolean | null;
  billing_card_brand: string | null;
  billing_card_last4: string | null;
  billing_card_exp_month: number | null;
  billing_card_exp_year: number | null;
};

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topSubline: { fontSize: 13, fontWeight: '500', color: c.textMuted, marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },

  sectionPad: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },

  // Restaurant settings
  settingsCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  settingsDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  settingsRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Staff
  staffCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  staffDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  staffInitials: { fontSize: 12, fontWeight: '800', color: c.gold },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  staffRole: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  staffShift: { fontSize: 12, color: c.textMuted },
  clockBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Expenses
  expenseCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.sm,
  },
  expenseDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  expenseInfo: { flex: 1 },
  expenseLabel: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  expensePeriod: { fontSize: 11, color: c.textMuted, marginTop: 1 },
  expenseAmount: { fontSize: 15, fontWeight: '800', color: c.textPrimary },

  // Export
  exportCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.sm,
  },
  exportDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  exportSub: { fontSize: 11, color: c.textMuted, marginTop: 1 },
}));

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function OwnerBusinessScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void (async () => {
      const profile = await fetchCurrentUserProfile().catch(() => null);
      const restaurantId = profile?.restaurantId ?? null;
      const supabase = getSupabase();
      if (!restaurantId || !supabase) return;
      const { data } = await supabase
        .from('restaurants')
        .select(
          'id,name,address,phone,hours_json,plan,currency,timezone,tax_rate,trial_ends_at,stripe_onboarding_complete,billing_card_brand,billing_card_last4,billing_card_exp_month,billing_card_exp_year',
        )
        .eq('id', restaurantId)
        .maybeSingle();
      if (!active) return;
      setSettings((data ?? null) as RestaurantSettings | null);
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalExpenses = EXPENSE_LINES.reduce((sum, e) => sum + e.amount, 0);
  const trialEndsLabel = settings?.trial_ends_at
    ? new Date(settings.trial_ends_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const billingCardLine = settings?.billing_card_last4
    ? `${(settings.billing_card_brand ?? 'Card').toUpperCase()} •••• ${settings.billing_card_last4}${
        settings.billing_card_exp_month && settings.billing_card_exp_year
          ? ` · ${String(settings.billing_card_exp_month).padStart(2, '0')}/${String(
              settings.billing_card_exp_year,
            ).slice(-2)}`
          : ''
      }`
    : null;
  const hoursJsonPreview = settings?.hours_json
    ? Object.entries(settings.hours_json)
        .slice(0, 7)
        .map(([day, val]) => `${day}: ${typeof val === 'string' ? val : JSON.stringify(val)}`)
        .join('  ·  ')
    : null;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topSubline}>Operations</Text>
          <Text style={styles.title}>Business</Text>
        </View>

        {/* Restaurant settings (live from `restaurants`) */}
        {settings ? (
          <View style={styles.sectionPad}>
            <Text style={styles.sectionLabel}>{settings.name ?? 'Restaurant'}</Text>
            <View style={styles.settingsCard}>
              {settings.address ? (
                <View style={styles.settingsRow}>
                  <Ionicons name="location-outline" size={16} color={c.textMuted} />
                  <Text style={styles.settingsRowText}>{settings.address}</Text>
                </View>
              ) : null}
              {settings.phone ? (
                <View style={[styles.settingsRow, styles.settingsDivider]}>
                  <Ionicons name="call-outline" size={16} color={c.textMuted} />
                  <Text style={styles.settingsRowText}>{settings.phone}</Text>
                </View>
              ) : null}
              {hoursJsonPreview ? (
                <View style={[styles.settingsRow, styles.settingsDivider]}>
                  <Ionicons name="time-outline" size={16} color={c.textMuted} />
                  <Text style={styles.settingsRowText} numberOfLines={2}>
                    {hoursJsonPreview}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.settingsRow, styles.settingsDivider]}>
                <Ionicons name="card-outline" size={16} color={c.textMuted} />
                <Text style={styles.settingsRowText}>
                  Plan: {(settings.plan ?? 'free').toUpperCase()}
                  {trialEndsLabel ? ` · Trial ends ${trialEndsLabel}` : ''}
                </Text>
              </View>
              <View style={[styles.settingsRow, styles.settingsDivider]}>
                <Ionicons name="cash-outline" size={16} color={c.textMuted} />
                <Text style={styles.settingsRowText}>
                  Currency {(settings.currency ?? '—').toUpperCase()}
                  {' · '}
                  Tax {settings.tax_rate != null ? `${(settings.tax_rate * 100).toFixed(2)}%` : '—'}
                  {settings.timezone ? ` · ${settings.timezone}` : ''}
                </Text>
              </View>
              <View style={[styles.settingsRow, styles.settingsDivider]}>
                <Ionicons
                  name={settings.stripe_onboarding_complete ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  size={16}
                  color={settings.stripe_onboarding_complete ? '#22C55E' : c.gold}
                />
                <Text style={styles.settingsRowText}>
                  Stripe payouts {settings.stripe_onboarding_complete ? 'connected' : 'pending'}
                </Text>
              </View>
              {billingCardLine ? (
                <View style={[styles.settingsRow, styles.settingsDivider]}>
                  <Ionicons name="wallet-outline" size={16} color={c.textMuted} />
                  <Text style={styles.settingsRowText}>{billingCardLine}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Staff on clock */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>
            Staff · {STAFF_ROSTER.filter((s) => s.onClock).length} on clock
          </Text>
          <View style={styles.staffCard}>
            {STAFF_ROSTER.map((member, i) => (
              <View key={member.id} style={[styles.staffRow, i > 0 && styles.staffDivider]}>
                <View style={styles.staffAvatar}>
                  <Text style={styles.staffInitials}>{initials(member.name)}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffRole}>{member.role}</Text>
                </View>
                <Text style={styles.staffShift}>{member.shift}</Text>
                <View
                  style={[
                    styles.clockBadge,
                    { backgroundColor: member.onClock ? '#22C55E' : c.border },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Expenses */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>
            Expenses · {formatCurrency(totalExpenses, 'cad')} tracked
          </Text>
          <View style={styles.expenseCard}>
            {EXPENSE_LINES.map((line, i) => (
              <View key={line.id} style={[styles.expenseRow, i > 0 && styles.expenseDivider]}>
                <Ionicons name="receipt-outline" size={18} color={c.textMuted} />
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseLabel}>{line.label}</Text>
                  <Text style={styles.expensePeriod}>{line.period}</Text>
                </View>
                <Text style={styles.expenseAmount}>{formatCurrency(line.amount, 'cad')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Export */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Export</Text>
          <View style={styles.exportCard}>
            {EXPORT_OPTIONS.map((opt, i) => (
              <Pressable
                key={opt.id}
                style={({ pressed }) => [styles.exportRow, i > 0 && styles.exportDivider, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="download-outline" size={18} color={c.gold} />
                <View style={styles.exportInfo}>
                  <Text style={styles.exportTitle}>{opt.title}</Text>
                  <Text style={styles.exportSub}>{opt.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
