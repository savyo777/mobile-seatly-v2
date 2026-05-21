/**
 * Build 3d — "What restaurants see about me" screen. Implements
 * ToS §18 + §6.4: diner can review their auto-generated tags,
 * lifetime value score, and no-show risk score across every
 * restaurant they've dined at, and request a correction by email.
 *
 * Until the §6.4 scoring engine ships ("preparing — not yet active"),
 * most diners will see empty tags + zero scores. The screen still
 * surfaces the visibility and the correction path so users have
 * standing access to their own profiling data.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { useColors, createStyles, spacing, borderRadius, shadows, typography } from '@/lib/theme';
import { getMyProfileTags, type MyProfileTagsResult } from '@/lib/privacy/profileTags';
import { friendlyError } from '@/lib/errors/friendlyError';

const useStyles = createStyles((c) => ({
  intro: { fontSize: 13, color: c.textSecondary, lineHeight: 19, marginBottom: spacing.lg },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  aggregateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  metric: { flex: 1, minWidth: '45%' },
  metricValue: { fontSize: 22, fontWeight: '700', color: c.textPrimary },
  metricLabel: { fontSize: 11, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  tagText: { fontSize: 12, color: c.textPrimary },
  cardTitle: { ...typography.h3, color: c.textPrimary, marginBottom: spacing.xs },
  restaurantName: { fontSize: 15, fontWeight: '600', color: c.textPrimary, marginBottom: 2 },
  restaurantMeta: { fontSize: 12, color: c.textSecondary },
  empty: {
    fontSize: 13,
    color: c.textMuted,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: spacing.md,
  },
  correctionText: { fontSize: 13, color: c.gold, textDecorationLine: 'underline', flex: 1 },
  errorBox: {
    padding: spacing.lg,
    backgroundColor: `${c.danger}22`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: c.danger },
}));

export default function MyProfileDataScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyProfileTagsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyProfileTags();
      setData(result);
    } catch (err) {
      setError(friendlyError(err, "We couldn't load your profile data right now. Try again in a moment."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRequestCorrection = () => {
    Alert.alert(
      'Request a correction',
      'Email privacy@cenaiva.com describing what should be changed and we will respond within 30 days, per our Privacy Policy.',
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Copy email',
          onPress: () => {
            void import('react-native').then(({ Clipboard }) => {
              try {
                Clipboard.setString?.('privacy@cenaiva.com');
              } catch {
                /* best effort */
              }
            });
          },
        },
      ],
    );
  };

  return (
    <ProfileStackScreen
      title="What restaurants see"
      subtitle="The data restaurants on Cenaiva can see about you. You can request a review or correction at any time."
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          When you dine at a restaurant on Cenaiva, that restaurant sees the data below. Cenaiva does not currently generate AI tags or scoring values; once those become active (per Terms §6.4), they'll appear here too.
        </Text>

        {loading ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={c.gold} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} style={{ marginTop: spacing.sm }} accessibilityRole="button">
              <Text style={[styles.errorText, { textDecorationLine: 'underline' }]}>Try again</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            <ProfileSectionTitle>Across all restaurants</ProfileSectionTitle>
            <View style={styles.card}>
              <View style={styles.aggregateGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{data.aggregate.total_visits}</Text>
                  <Text style={styles.metricLabel}>Total visits</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{data.aggregate.restaurants_known_at}</Text>
                  <Text style={styles.metricLabel}>Restaurants</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>
                    {data.aggregate.max_no_show_risk_score > 0
                      ? data.aggregate.max_no_show_risk_score.toFixed(0)
                      : '—'}
                  </Text>
                  <Text style={styles.metricLabel}>No-show risk (max)</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>
                    {data.aggregate.max_lifetime_value_score > 0
                      ? data.aggregate.max_lifetime_value_score.toFixed(0)
                      : '—'}
                  </Text>
                  <Text style={styles.metricLabel}>Lifetime value (max)</Text>
                </View>
              </View>
              {data.aggregate.all_tags.length > 0 ? (
                <View style={styles.tagList}>
                  {data.aggregate.all_tags.map((t) => (
                    <View key={t} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.empty, { marginTop: spacing.sm }]}>
                  No tags yet. Scoring becomes active once Cenaiva ships its automated profiling feature (Terms §6.4).
                </Text>
              )}
            </View>

            <ProfileSectionTitle>Per restaurant</ProfileSectionTitle>
            {data.per_restaurant.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.empty}>
                  You haven't dined at any Cenaiva restaurants yet. Restaurants will see your profile once you complete your first visit.
                </Text>
              </View>
            ) : (
              data.per_restaurant.map((r) => (
                <View key={r.guest_id} style={styles.card}>
                  <Text style={styles.restaurantName}>{r.restaurant_name}</Text>
                  <Text style={styles.restaurantMeta}>
                    {r.total_visits} visit{r.total_visits === 1 ? '' : 's'}
                    {r.no_show_count > 0 ? ` · ${r.no_show_count} no-show${r.no_show_count === 1 ? '' : 's'}` : ''}
                    {r.last_visit_at ? ` · last visit ${new Date(r.last_visit_at).toLocaleDateString()}` : ''}
                  </Text>
                  {r.tags.length > 0 ? (
                    <View style={styles.tagList}>
                      {r.tags.map((t) => (
                        <View key={t} style={styles.tag}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))
            )}

            <Pressable onPress={handleRequestCorrection} style={styles.correctionRow} accessibilityRole="button">
              <Ionicons name="create-outline" size={18} color={c.gold} />
              <Text style={styles.correctionText}>
                Request a correction (email privacy@cenaiva.com)
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </ProfileStackScreen>
  );
}
