import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatCard } from '@/components/owner/StatCard';
import { SectionCard } from '@/components/owner/SectionCard';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { findGuest, type OwnerGuest } from '@/lib/mock/guests';
import { formatCurrency } from '@/lib/utils/formatCurrency';

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function riskTone(score: number): { label: string; color: string } {
  if (score >= 50) return { label: 'High risk', color: '#EF4444' };
  if (score >= 25) return { label: 'Moderate', color: '#D4A574' };
  return { label: 'Low risk', color: '#22C55E' };
}

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,162,74,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.gold,
  },
  vipPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 0.6,
  },
  heroMeta: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    gap: 6,
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
    letterSpacing: 0.1,
  },

  blockedBanner: {
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  blockedText: {
    flex: 1,
    fontSize: 13,
    color: c.danger,
    fontWeight: '600',
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statHalf: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '50%',
  },

  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.md,
  },
  kvDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  kvLabel: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  kvValue: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1.5,
    justifyContent: 'flex-end',
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },

  noteRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  noteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.1,
  },
  notePinned: { color: c.gold },
  noteBody: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  noteMeta: {
    fontSize: 12,
    color: c.textMuted,
  },

  surveyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  surveyStars: {
    flexDirection: 'row',
    gap: 2,
  },
  surveyDate: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  surveyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
    width: 90,
  },

  incidentRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  incidentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incidentAllergen: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  incidentMeta: {
    fontSize: 12,
    color: c.textMuted,
  },
  incidentBody: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },

  commRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  commText: { flex: 1, gap: 2 },
  commSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  commMeta: {
    fontSize: 12,
    color: c.textMuted,
  },
  commStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
    letterSpacing: 0.1,
  },

  ltRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  ltLeft: { flex: 1, gap: 2 },
  ltDesc: { fontSize: 14, color: c.textPrimary, fontWeight: '500' },
  ltDate: { fontSize: 12, color: c.textMuted },
  ltPoints: { fontSize: 15, fontWeight: '800' },

  emptyRow: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
  },
}));

function severityStyle(s: 'mild' | 'moderate' | 'severe') {
  if (s === 'severe') return { bg: 'rgba(239,68,68,0.14)', color: '#EF4444' };
  if (s === 'moderate') return { bg: 'rgba(212,165,116,0.16)', color: '#D4A574' };
  return { bg: 'rgba(113,113,122,0.14)', color: '#A1A1AA' };
}

function Stars({ count }: { count: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={14}
          color={i < count ? c.gold : c.textMuted}
        />
      ))}
    </View>
  );
}

function KV({
  label,
  value,
  isFirst,
  styles,
}: {
  label: string;
  value: React.ReactNode;
  isFirst?: boolean;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <View style={[styles.kvRow, !isFirst && styles.kvDivider]}>
      <Text style={styles.kvLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.kvValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function TagChips({
  items,
  styles,
}: {
  items: string[];
  styles: ReturnType<typeof useStyles>;
}) {
  if (items.length === 0) {
    return <Text style={styles.kvValue}>—</Text>;
  }
  return (
    <View style={styles.chipWrap}>
      {items.map((t) => (
        <View key={t} style={styles.tagChip}>
          <Text style={styles.tagChipText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export default function GuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guest = findGuest(id ?? '');
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!guest) {
    return (
      <View style={styles.root}>
        <View style={{ paddingTop: insets.top + spacing.md }} />
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
          </Pressable>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
          <Text style={styles.emptyText}>Guest not found.</Text>
        </View>
      </View>
    );
  }

  const g: OwnerGuest = guest;
  const risk = riskTone(g.noShowRiskScore);

  const callGuest = () => Alert.alert('Call', `Call ${g.fullName} at ${g.phone}?`, [{ text: 'OK' }]);
  const messageGuest = () =>
    Alert.alert('Message', `Send a message to ${g.fullName}?`, [{ text: 'OK' }]);
  const emailGuest = () => Alert.alert('Email', `Email ${g.email}?`, [{ text: 'OK' }]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.lg,
        }}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() =>
              Alert.alert('Edit', `Edit ${g.fullName}?`, [{ text: 'Later', style: 'cancel' }])
            }
            accessibilityLabel="Edit guest"
          >
            <Ionicons name="create-outline" size={18} color={c.textPrimary} />
          </Pressable>
        </View>

        {g.isBlocked ? (
          <View style={styles.blockedBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={c.danger} />
            <Text style={styles.blockedText}>This guest is blocked from new bookings.</Text>
          </View>
        ) : null}

        <View style={styles.heroBlock}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials(g.fullName)}</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.heroName}>{g.fullName}</Text>
            {g.isVip ? (
              <View style={styles.vipPill}>
                <Ionicons name="star" size={10} color={c.gold} />
                <Text style={styles.vipPillText}>VIP</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroMeta}>
            {g.loyaltyTier.charAt(0).toUpperCase() + g.loyaltyTier.slice(1)} member ·{' '}
            {g.totalVisits} visits
          </Text>

          <View style={styles.quickActions}>
            <Pressable style={styles.actionBtn} onPress={callGuest}>
              <View style={styles.actionCircle}>
                <Ionicons name="call-outline" size={20} color={c.textPrimary} />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={messageGuest}>
              <View style={styles.actionCircle}>
                <Ionicons name="chatbubble-outline" size={20} color={c.textPrimary} />
              </View>
              <Text style={styles.actionLabel}>Message</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={emailGuest}>
              <View style={styles.actionCircle}>
                <Ionicons name="mail-outline" size={20} color={c.textPrimary} />
              </View>
              <Text style={styles.actionLabel}>Email</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatCard style={styles.statHalf} label="Total visits" value={String(g.totalVisits)} />
          <StatCard
            style={styles.statHalf}
            label="Total spend"
            accentValue
            value={formatCurrency(g.totalSpend, 'cad')}
          />
          <StatCard
            style={styles.statHalf}
            label="Avg per visit"
            value={formatCurrency(g.averageSpendPerVisit, 'cad')}
          />
          <StatCard style={styles.statHalf} label="Last visit" value={formatDate(g.lastVisitAt)} />
        </View>

        <SectionCard sectionTitle="Contact">
          <KV label="Phone" value={g.phone} styles={styles} isFirst />
          <KV label="Email" value={g.email} styles={styles} />
          <KV
            label="Language"
            value={g.preferredLanguage === 'fr' ? 'French' : 'English'}
            styles={styles}
          />
          {g.birthday ? <KV label="Birthday" value={formatDate(g.birthday)} styles={styles} /> : null}
          {g.anniversary ? (
            <KV label="Anniversary" value={formatDate(g.anniversary)} styles={styles} />
          ) : null}
        </SectionCard>

        <SectionCard sectionTitle="Preferences">
          <KV
            label="Allergies"
            value={<TagChips items={g.allergies} styles={styles} />}
            styles={styles}
            isFirst
          />
          <KV
            label="Dietary"
            value={<TagChips items={g.dietaryRestrictions} styles={styles} />}
            styles={styles}
          />
          {g.seatingPreference ? (
            <KV label="Seating" value={g.seatingPreference} styles={styles} />
          ) : null}
          {g.noisePreference ? (
            <KV label="Noise" value={g.noisePreference} styles={styles} />
          ) : null}
          <KV
            label="Favourite dishes"
            value={<TagChips items={g.favouriteDishes} styles={styles} />}
            styles={styles}
          />
          <KV
            label="Favourite drinks"
            value={<TagChips items={g.favouriteDrinks} styles={styles} />}
            styles={styles}
          />
          {g.preferredServerName ? (
            <KV label="Preferred server" value={g.preferredServerName} styles={styles} />
          ) : null}
        </SectionCard>

        <SectionCard sectionTitle="Loyalty">
          <KV
            label="Tier"
            value={g.loyaltyTier.charAt(0).toUpperCase() + g.loyaltyTier.slice(1)}
            styles={styles}
            isFirst
          />
          <KV
            label="Points balance"
            value={g.loyaltyPointsBalance.toLocaleString()}
            styles={styles}
          />
          <KV
            label="Earned total"
            value={g.loyaltyPointsEarnedTotal.toLocaleString()}
            styles={styles}
          />
          <KV
            label="Redeemed"
            value={g.loyaltyPointsRedeemedTotal.toLocaleString()}
            styles={styles}
          />
        </SectionCard>

        {g.loyaltyTx.length > 0 ? (
          <SectionCard sectionTitle="Recent activity">
            {g.loyaltyTx.map((tx, i) => (
              <View key={tx.id} style={[styles.ltRow, i > 0 && styles.kvDivider]}>
                <View style={styles.ltLeft}>
                  <Text style={styles.ltDesc}>{tx.description}</Text>
                  <Text style={styles.ltDate}>{formatDate(tx.createdAt)}</Text>
                </View>
                <Text
                  style={[
                    styles.ltPoints,
                    { color: tx.points >= 0 ? c.gold : c.danger },
                  ]}
                >
                  {tx.points >= 0 ? '+' : ''}
                  {tx.points}
                </Text>
              </View>
            ))}
          </SectionCard>
        ) : null}

        <SectionCard sectionTitle="Financials">
          <KV
            label="Highest bill"
            value={formatCurrency(g.highestSingleBill, 'cad')}
            styles={styles}
            isFirst
          />
          <KV label="Food spend" value={formatCurrency(g.foodSpendTotal, 'cad')} styles={styles} />
          <KV
            label="Drinks spend"
            value={formatCurrency(g.drinksSpendTotal, 'cad')}
            styles={styles}
          />
          <KV
            label="Deposits paid"
            value={formatCurrency(g.totalDepositsPaid, 'cad')}
            styles={styles}
          />
          {g.totalDepositsForfeited > 0 ? (
            <KV
              label="Deposits forfeited"
              value={formatCurrency(g.totalDepositsForfeited, 'cad')}
              styles={styles}
            />
          ) : null}
          {g.preferredPaymentLast4 ? (
            <KV
              label="Default card"
              value={`${g.preferredPaymentBrand ?? 'Card'} ···· ${g.preferredPaymentLast4}`}
              styles={styles}
            />
          ) : null}
        </SectionCard>

        <SectionCard sectionTitle="Risk & history">
          <KV
            label="No-show risk"
            value={
              <Text style={[styles.kvValue, { color: risk.color }]}>
                {risk.label} · {g.noShowRiskScore}
              </Text>
            }
            styles={styles}
            isFirst
          />
          <KV label="No-shows" value={g.noShowCount} styles={styles} />
          <KV label="Cancellations" value={g.cancellationCount} styles={styles} />
          <KV label="Lifetime value" value={`${g.lifetimeValueScore} / 100`} styles={styles} />
          <KV label="Source" value={g.acquisitionSource} styles={styles} />
          {g.lastContactedAt ? (
            <KV label="Last contacted" value={formatDate(g.lastContactedAt)} styles={styles} />
          ) : null}
          <KV label="First visit" value={formatDate(g.firstVisitAt)} styles={styles} />
          <KV
            label="Opt-ins"
            value={`${g.smsOptIn ? 'SMS' : ''}${g.smsOptIn && g.emailOptIn ? ' · ' : ''}${g.emailOptIn ? 'Email' : ''}${!g.smsOptIn && !g.emailOptIn ? 'None' : ''}`}
            styles={styles}
          />
        </SectionCard>

        <SectionCard sectionTitle="Notes">
          {g.notes.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No notes yet.</Text>
            </View>
          ) : (
            g.notes.map((n, i) => (
              <View key={n.id} style={[styles.noteRow, i > 0 && styles.kvDivider]}>
                <View style={styles.noteTop}>
                  {n.isPinned ? (
                    <Ionicons name="pin" size={12} style={styles.notePinned} />
                  ) : null}
                  <Text style={styles.noteCategory}>{n.category}</Text>
                </View>
                <Text style={styles.noteBody}>{n.note}</Text>
                <Text style={styles.noteMeta}>
                  {n.staffName} · {formatDate(n.createdAt)}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        {g.surveys.length > 0 ? (
          <SectionCard sectionTitle="Survey ratings">
            {g.surveys.map((s, i) => (
              <View key={s.id} style={[{ paddingVertical: spacing.md }, i > 0 && styles.kvDivider]}>
                <View style={styles.surveyRow}>
                  <Text style={styles.surveyLabel}>Overall</Text>
                  <Stars count={s.overall} />
                  <Text style={styles.surveyDate}>{formatDate(s.createdAt)}</Text>
                </View>
                <View style={styles.surveyRow}>
                  <Text style={styles.surveyLabel}>Food</Text>
                  <Stars count={s.food} />
                  <View style={{ width: 72 }} />
                </View>
                <View style={styles.surveyRow}>
                  <Text style={styles.surveyLabel}>Service</Text>
                  <Stars count={s.service} />
                  <View style={{ width: 72 }} />
                </View>
                <View style={styles.surveyRow}>
                  <Text style={styles.surveyLabel}>Ambience</Text>
                  <Stars count={s.ambience} />
                  <View style={{ width: 72 }} />
                </View>
              </View>
            ))}
          </SectionCard>
        ) : null}

        {g.incidents.length > 0 ? (
          <SectionCard sectionTitle="Allergy incidents">
            {g.incidents.map((inc, i) => {
              const sev = severityStyle(inc.severity);
              return (
                <View key={inc.id} style={[styles.incidentRow, i > 0 && styles.kvDivider]}>
                  <View style={styles.incidentTop}>
                    <Text style={styles.incidentAllergen}>{inc.allergen}</Text>
                    <View style={[styles.severityPill, { backgroundColor: sev.bg }]}>
                      <Text style={[styles.severityText, { color: sev.color }]}>{inc.severity}</Text>
                    </View>
                  </View>
                  <Text style={styles.incidentBody}>{inc.actionTaken}</Text>
                  <Text style={styles.incidentMeta}>
                    {inc.dishName ? `${inc.dishName} · ` : ''}
                    {formatDate(inc.createdAt)}
                  </Text>
                </View>
              );
            })}
          </SectionCard>
        ) : null}

        {g.comms.length > 0 ? (
          <SectionCard sectionTitle="Communications" marginBottom={spacing['2xl']}>
            {g.comms.map((cm, i) => {
              const icon =
                cm.channel === 'email'
                  ? 'mail-outline'
                  : cm.channel === 'sms'
                  ? 'chatbubble-outline'
                  : 'notifications-outline';
              return (
                <View key={cm.id} style={[styles.commRow, i > 0 && styles.kvDivider]}>
                  <Ionicons name={icon as never} size={18} color={c.textMuted} />
                  <View style={styles.commText}>
                    <Text style={styles.commSubject} numberOfLines={1}>
                      {cm.subject}
                    </Text>
                    <Text style={styles.commMeta}>
                      {cm.type} · {formatDate(cm.sentAt)}
                    </Text>
                  </View>
                  <Text style={styles.commStatus}>{cm.status}</Text>
                </View>
              );
            })}
          </SectionCard>
        ) : null}

        {g.carDetails ? (
          <SectionCard sectionTitle="Valet" marginBottom={spacing['2xl']}>
            <KV
              label="Vehicle"
              value={`${g.carDetails.make} ${g.carDetails.model}`}
              styles={styles}
              isFirst
            />
            <KV label="Plate" value={g.carDetails.plate} styles={styles} />
          </SectionCard>
        ) : null}
      </ScrollView>
    </View>
  );
}
