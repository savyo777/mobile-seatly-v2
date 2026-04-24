import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  FlatList,
  ScrollView,
  LayoutAnimation,
  UIManager,
  type ListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CRM_AI_INSIGHTS,
  CRM_SPOTLIGHT,
  type CrmGuest,
} from '@/lib/mock/ownerApp';
import {
  type CrmFilterId,
  type CrmSortId,
  daysSinceLastVisit,
  matchesMultiFilters,
  matchesSingleFilter,
  searchMatchesGuest,
  sortGuests,
} from '@/lib/crm/guestIntel';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Space below last list item so content clears tab bar + FAB (matches OwnerScreen). */
const TAB_BAR_SCROLL_PADDING = 110;

const FILTERS: CrmFilterId[] = [
  'all',
  'vip',
  'high_spenders',
  'frequent',
  'at_risk',
  'new',
  'upcoming',
];

const SORTS: CrmSortId[] = ['highest_spend', 'most_visits', 'churn_risk', 'upcoming_res'];

function filterKey(f: CrmFilterId): string {
  const m: Record<CrmFilterId, string> = {
    all: 'owner.crmFilterAll',
    vip: 'owner.crmFilterVip',
    high_spenders: 'owner.crmFilterHighSpend',
    frequent: 'owner.crmFilterFrequent',
    at_risk: 'owner.crmFilterAtRisk',
    new: 'owner.crmFilterNew',
    upcoming: 'owner.crmFilterUpcoming',
  };
  return m[f];
}

function sortKey(s: CrmSortId): string {
  const m: Record<CrmSortId, string> = {
    highest_spend: 'owner.crmSortHighestSpend',
    most_visits: 'owner.crmSortMostVisits',
    churn_risk: 'owner.crmSortChurnRisk',
    upcoming_res: 'owner.crmSortUpcoming',
  };
  return m[s];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({
  text,
  query,
  style,
}: {
  text: string;
  query: string;
  style?: object;
}) {
  const q = query.trim();
  if (!q) {
    return <Text style={style}>{text}</Text>;
  }
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <Text key={i} style={[style, styles.searchHit]}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

function CrmBackdrop({ onPress }: { onPress: () => void }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFillObject, styles.modalDim]} />
      ) : (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
      )}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} accessibilityRole="button" />
    </View>
  );
}

function deriveLiveLine(g: CrmGuest, t: TFunction): string | null {
  if (g.isSeated && g.seatedLabel) {
    return t('owner.crmLiveSeated', { where: g.seatedLabel });
  }
  if (g.hasUpcomingReservation && g.upcomingReservationTime) {
    return t('owner.crmLiveArriving', { time: g.upcomingReservationTime });
  }
  const days = daysSinceLastVisit(g.lastVisitDate);
  if (days != null && days > 30) {
    return t('owner.crmInactive30');
  }
  return null;
}

function mergeGuest(base: CrmGuest, o?: Partial<CrmGuest>): CrmGuest {
  return { ...base, ...o };
}

export default function OwnerCrmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [guestOverrides, setGuestOverrides] = useState<Record<string, Partial<CrmGuest>>>({});
  const [singleFilter, setSingleFilter] = useState<CrmFilterId>('all');
  const [multiMode, setMultiMode] = useState(false);
  const [multiFilters, setMultiFilters] = useState<Set<Exclude<CrmFilterId, 'all'>>>(new Set());
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CrmSortId>('highest_spend');
  const [insightIdx, setInsightIdx] = useState(0);
  const [detailGuest, setDetailGuest] = useState<CrmGuest | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [messageGuest, setMessageGuest] = useState<CrmGuest | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [noteGuest, setNoteGuest] = useState<CrmGuest | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const swipeRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const guests = useMemo(
    () => CRM_SPOTLIGHT.map((g) => mergeGuest(g, guestOverrides[g.id])),
    [guestOverrides],
  );

  const filtered = useMemo(() => {
    let list = guests.filter((g) => searchMatchesGuest(g, query));
    if (multiMode) {
      list = list.filter((g) => matchesMultiFilters(g, multiFilters));
    } else {
      list = list.filter((g) => matchesSingleFilter(g, singleFilter));
    }
    return sortGuests(list, sort);
  }, [guests, query, multiMode, multiFilters, singleFilter, sort]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [singleFilter, multiMode, multiFilters, sort, query]);

  useEffect(() => {
    const id = setInterval(() => {
      setInsightIdx((i) => (i + 1) % CRM_AI_INSIGHTS.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const insight = CRM_AI_INSIGHTS[insightIdx % CRM_AI_INSIGHTS.length];

  const patchGuest = useCallback((id: string, patch: Partial<CrmGuest>) => {
    setGuestOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  const onChipPress = useCallback(
    (f: CrmFilterId) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (multiMode) {
        if (f === 'all') {
          setMultiFilters(new Set());
          setMultiMode(false);
          setSingleFilter('all');
          return;
        }
        setMultiFilters((prev) => {
          const next = new Set(prev);
          if (next.has(f as Exclude<CrmFilterId, 'all'>)) {
            next.delete(f as Exclude<CrmFilterId, 'all'>);
          } else {
            next.add(f as Exclude<CrmFilterId, 'all'>);
          }
          return next;
        });
        return;
      }
      setSingleFilter(f);
    },
    [multiMode],
  );

  const onChipLongPress = useCallback((f: CrmFilterId) => {
    if (f === 'all') return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMultiMode(true);
    setMultiFilters(new Set([f as Exclude<CrmFilterId, 'all'>]));
  }, []);

  const openFilterMenu = useCallback(() => {
    Alert.alert(t('owner.crmGuestsTitle'), undefined, [
      ...FILTERS.map((f) => ({
        text: t(filterKey(f)),
        onPress: () => onChipPress(f),
      })),
      { text: t('owner.menuCancel'), style: 'cancel' as const, onPress: () => undefined },
    ]);
  }, [t, onChipPress]);

  const reserveGuest = useCallback(
    (g: CrmGuest) => {
      swipeRefs.current.get(g.id)?.close();
      router.push(`/(staff)/reservations?crmGuestId=${encodeURIComponent(g.id)}&crmGuestName=${encodeURIComponent(g.name)}` as never);
    },
    [router],
  );

  /** FAB sits above tab / home indicator; does not affect list flow (absolute). */
  const fabBottomOffset = 100 + insets.bottom;
  const listPaddingBottom = 120 + TAB_BAR_SCROLL_PADDING + insets.bottom;

  const renderGuest = useCallback(
    ({ item: g }: ListRenderItemInfo<CrmGuest>) => {
      const live = deriveLiveLine(g, t);
      const highChurn = g.churnRisk > 40;
      const isNew = g.totalVisits <= 2;

      return (
        <View>
          <Swipeable
            ref={(r) => {
              swipeRefs.current.set(g.id, r);
            }}
            friction={2}
            overshootLeft={false}
            overshootRight={false}
            renderLeftActions={() => (
              <View style={styles.swipeRow}>
                <Pressable
                  onPress={() => reserveGuest(g)}
                  style={({ pressed }) => [styles.swipeBtn, styles.swipeGold, pressed && styles.swipePressed]}
                >
                  <Text style={styles.swipeBtnText}>{t('owner.crmReserve')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    swipeRefs.current.get(g.id)?.close();
                    setMessageGuest(g);
                    setMessageBody('');
                  }}
                  style={({ pressed }) => [styles.swipeBtn, styles.swipeNeutral, pressed && styles.swipePressed]}
                >
                  <Text style={styles.swipeBtnText}>{t('owner.crmMessage')}</Text>
                </Pressable>
              </View>
            )}
            renderRightActions={() => (
              <View style={styles.swipeRow}>
                <Pressable
                  onPress={() => {
                    swipeRefs.current.get(g.id)?.close();
                    setNoteGuest(g);
                    setNoteDraft('');
                  }}
                  style={({ pressed }) => [styles.swipeBtn, styles.swipeNeutral, pressed && styles.swipePressed]}
                >
                  <Text style={styles.swipeBtnText}>{t('owner.crmAddNote')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    patchGuest(g.id, { isVIP: true });
                    swipeRefs.current.get(g.id)?.close();
                  }}
                  style={({ pressed }) => [styles.swipeBtn, styles.swipeGold, pressed && styles.swipePressed]}
                >
                  <Text style={styles.swipeBtnText}>{t('owner.crmSwipeTagVip')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    patchGuest(g.id, { churnRisk: Math.min(100, g.churnRisk + 12) });
                    swipeRefs.current.get(g.id)?.close();
                  }}
                  style={({ pressed }) => [styles.swipeBtn, styles.swipeRisk, pressed && styles.swipePressed]}
                >
                  <Text style={styles.swipeBtnText}>{t('owner.crmSwipeRisk')}</Text>
                </Pressable>
              </View>
            )}
          >
            <Pressable onPress={() => setDetailGuest(g)} style={({ pressed }) => [pressed && styles.cardPressed]}>
              <View
                style={[
                  styles.card,
                  g.isVIP && styles.cardVip,
                  highChurn && styles.cardRisk,
                  isNew && !g.isVIP && styles.cardNew,
                ]}
              >
                <View style={[styles.cardAccent, { backgroundColor: accentForGuest(g) }]} />
                <View style={styles.cardBody}>
                  <View style={styles.rowTop}>
                    <HighlightedText text={g.name} query={query} style={styles.guestName} />
                    {g.isVIP ? (
                      <View style={styles.vipPill}>
                        <Text style={styles.vipText}>{t('owner.crmVip')}</Text>
                      </View>
                    ) : secondaryTag(g) ? (
                      <View style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{secondaryTagLabel(t, secondaryTag(g)!)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.metricsRow}>
                    <Text style={styles.metricTxt}>{t('owner.crmVisits', { count: g.totalVisits })}</Text>
                    <Text style={styles.metricSep}>·</Text>
                    <Text style={styles.metricTxt}>{t('owner.crmAvg', { amount: formatCurrency(g.avgSpend, 'cad') })}</Text>
                    <Text style={styles.metricSep}>·</Text>
                    <Text style={styles.metricTxt} numberOfLines={1}>
                      {g.frequency}
                    </Text>
                  </View>

                  <View style={styles.bonusRow}>
                    <Text style={styles.bonusLabel}>{t('owner.crmLifetimeValue')}</Text>
                    <Text style={styles.bonusVal}>{g.ltvScore}</Text>
                    <Text style={styles.bonusLabel}>{t('owner.crmPredictedTonight')}</Text>
                    <Text style={styles.bonusVal}>{formatCurrency(g.predictedSpendTonight, 'cad')}</Text>
                    <Text style={styles.bonusLabel}>{t('owner.crmMetricChurn')}</Text>
                    <Text style={[styles.bonusVal, g.churnRisk > 40 && styles.bonusWarn]}>{g.churnRisk}%</Text>
                  </View>

                  <HighlightedText text={`${t('owner.crmPreferences')}: ${g.preferencesShort}`} query={query} style={styles.prefLine} />

                  <Text style={styles.nextBest}>
                    <Text style={styles.nextBestLabel}>{t('owner.crmNextBestAction')}: </Text>
                    {g.nextBestAction}
                  </Text>

                  <Text style={styles.aiLine}>
                    <Text style={styles.aiLineLabel}>{t('owner.crmAiPrediction')}: </Text>
                    {g.aiLine}
                  </Text>

                  {live ? (
                    <View style={styles.livePill}>
                      <View
                        style={[
                          styles.liveDot,
                          {
                            backgroundColor: g.isSeated ? ownerColors.success : ownerColors.gold,
                          },
                        ]}
                      />
                      <Text style={styles.liveText}>{live}</Text>
                    </View>
                  ) : null}

                  <View style={styles.quickRow}>
                    <Pressable
                      onPress={() => reserveGuest(g)}
                      style={({ pressed }) => [styles.quickBtn, pressed && styles.quickPressed]}
                    >
                      <Text style={styles.quickBtnText}>{t('owner.crmReserve')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setMessageGuest(g);
                        setMessageBody('');
                      }}
                      style={({ pressed }) => [styles.quickBtn, pressed && styles.quickPressed]}
                    >
                      <Text style={styles.quickBtnText}>{t('owner.crmMessage')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setNoteGuest(g);
                        setNoteDraft('');
                      }}
                      style={({ pressed }) => [styles.quickBtn, pressed && styles.quickPressed]}
                    >
                      <Text style={styles.quickBtnText}>{t('owner.crmAddNote')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          </Swipeable>
        </View>
      );
    },
    [t, query, patchGuest, reserveGuest],
  );

  const headerRight = (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => setSortOpen(true)}
        style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconPressed]}
        accessibilityLabel={t('owner.crmSortTitle')}
      >
        <Ionicons name="swap-vertical-outline" size={20} color={ownerColors.gold} />
      </Pressable>
      <Pressable
        onPress={openFilterMenu}
        style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconPressed]}
      >
        <Ionicons name="filter-outline" size={20} color={ownerColors.gold} />
      </Pressable>
      <Pressable
        onPress={() => setAiOpen(true)}
        style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconPressed]}
      >
        <Ionicons name="sparkles-outline" size={20} color={ownerColors.gold} />
      </Pressable>
    </View>
  );

  const listHeader = (
    <>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={ownerColors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('owner.crmSearchPlaceholder')}
          placeholderTextColor={ownerColors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <Pressable onPress={() => setInsightIdx((i) => (i + 1) % CRM_AI_INSIGHTS.length)} style={styles.aiStrip}>
        <View style={styles.aiStripGlow} />
        <View style={styles.aiStripInner}>
          <View style={styles.aiStripTop}>
            <Text style={styles.aiStripHint}>{t('owner.crmAiStripHint')}</Text>
            <Ionicons name="sparkles" size={16} color={ownerColors.gold} />
          </View>
          <Text style={styles.aiStripHeadline}>{insight.headline}</Text>
          <Text style={styles.aiStripSub}>{insight.sub}</Text>
          <View style={styles.dotRow}>
            {CRM_AI_INSIGHTS.map((item, i) => (
              <View key={item.id} style={[styles.dot, i === insightIdx % CRM_AI_INSIGHTS.length && styles.dotOn]} />
            ))}
          </View>
        </View>
      </Pressable>

      {multiMode ? (
        <View style={styles.multiBanner}>
          <Text style={styles.multiBannerText}>
            {t('owner.crmMultiActive', { count: multiFilters.size })} · {t('owner.crmMultiModeHint')}
          </Text>
          <Pressable onPress={() => { setMultiMode(false); setMultiFilters(new Set()); setSingleFilter('all'); }}>
            <Text style={styles.multiExit}>{t('owner.crmExitMulti')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.chipScrollOuter}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
        {FILTERS.map((f) => {
          const on = multiMode
            ? f !== 'all' && multiFilters.has(f as Exclude<CrmFilterId, 'all'>)
            : singleFilter === f;
          return (
            <Pressable
              key={f}
              onPress={() => onChipPress(f)}
              onLongPress={() => onChipLongPress(f)}
              delayLongPress={380}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(filterKey(f))}</Text>
            </Pressable>
          );
        })}
        </ScrollView>
      </View>

      <Text style={styles.listSection}>{t('owner.crmScreenTitle')}</Text>
    </>
  );

  return (
    <>
      <SafeAreaView style={styles.rootSafe} edges={['top', 'left', 'right']}>
        <View style={styles.mainShell}>
          <View style={styles.fixedHeader}>
            <View style={styles.fixedHeaderRow}>
              <Pressable
                onPress={() => router.replace('/(staff)/home' as never)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={28} color={ownerColors.gold} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.fixedHeaderTitle}>{t('owner.crmGuestsTitle')}</Text>
                <Text style={styles.fixedHeaderSub}>{t('owner.crmGuestsSubtitle')}</Text>
              </View>
              {headerRight}
            </View>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(g) => g.id}
            style={styles.list}
            renderItem={renderGuest}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={<Text style={styles.empty}>{t('common.noResults')}</Text>}
            contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            extraData={{ guestOverrides, query, sort, singleFilter, multiMode, multiFilters }}
          />

          <Pressable
            onPress={() => setAiOpen(true)}
            style={({ pressed }) => [styles.fab, { bottom: fabBottomOffset }, pressed && styles.fabPressed]}
          >
            <Ionicons name="sparkles" size={24} color={ownerColors.bg} />
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sortOverlay} onPress={() => setSortOpen(false)}>
          <View style={styles.sortSheet}>
            <Text style={styles.sortTitle}>{t('owner.crmSortTitle')}</Text>
            {SORTS.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setSort(s);
                  setSortOpen(false);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                }}
                style={[styles.sortRow, sort === s && styles.sortRowOn]}
              >
                <Text style={[styles.sortRowText, sort === s && styles.sortRowTextOn]}>{t(sortKey(s))}</Text>
                {sort === s ? <Ionicons name="checkmark" size={20} color={ownerColors.gold} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={detailGuest != null} animationType="fade" transparent onRequestClose={() => setDetailGuest(null)}>
        <View style={styles.modalRoot}>
          <CrmBackdrop onPress={() => setDetailGuest(null)} />
          {detailGuest ? (
            <View style={styles.detailSheet}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailTitle}>{detailGuest.name}</Text>
                <View style={styles.detailMetrics}>
                  <View style={styles.detailMetricBox}>
                    <Text style={styles.dmLabel}>{t('owner.crmLifetimeValue')}</Text>
                    <Text style={styles.dmVal}>{detailGuest.ltvScore}</Text>
                  </View>
                  <View style={styles.detailMetricBox}>
                    <Text style={styles.dmLabel}>{t('owner.crmPredictedTonight')}</Text>
                    <Text style={styles.dmVal}>{formatCurrency(detailGuest.predictedSpendTonight, 'cad')}</Text>
                  </View>
                  <View style={styles.detailMetricBox}>
                    <Text style={styles.dmLabel}>{t('owner.crmMetricChurn')}</Text>
                    <Text style={[styles.dmVal, detailGuest.churnRisk > 40 && styles.bonusWarn]}>{detailGuest.churnRisk}%</Text>
                  </View>
                </View>
                <Text style={styles.detailSection}>{t('owner.crmDetailVisitHistory')}</Text>
                {detailGuest.visitHistory.map((v) => (
                  <Text key={v.date} style={styles.detailLine}>
                    {v.date} · {v.spend > 0 ? formatCurrency(v.spend, 'cad') : '—'}
                  </Text>
                ))}
                <Text style={styles.detailSection}>{t('owner.crmDetailSpendChart')}</Text>
                <View style={styles.chartRow}>
                  {detailGuest.visitHistory
                    .filter((v) => v.spend > 0)
                    .map((v, idx, arr) => {
                      const max = Math.max(...arr.map((x) => x.spend), 1);
                      const h = Math.max(12, (v.spend / max) * 72);
                      return (
                        <View key={v.date + idx} style={styles.chartCol}>
                          <View style={[styles.chartBar, { height: h }]} />
                          <Text style={styles.chartLbl} numberOfLines={1}>
                            {v.date}
                          </Text>
                        </View>
                      );
                    })}
                </View>
                <Text style={styles.detailSection}>{t('owner.crmDetailFavorites')}</Text>
                <Text style={styles.detailBody}>{detailGuest.favoriteDishes.join(' · ')}</Text>
                <Text style={styles.detailSection}>{t('owner.crmDetailPreferredTable')}</Text>
                <Text style={styles.detailBody}>{detailGuest.preferredTable}</Text>
                <Text style={styles.detailSection}>{t('owner.crmDetailNotes')}</Text>
                <Text style={styles.detailBody}>{detailGuest.notes}</Text>
                <Text style={styles.detailSection}>{t('owner.crmDetailNoShow')}</Text>
                <Text style={styles.detailBody}>{detailGuest.noShowNote}</Text>
                <Text style={styles.detailSection}>{t('owner.crmDetailAiSuggestions')}</Text>
                {detailGuest.aiSuggestions.map((s) => (
                  <View key={s} style={styles.sugRow}>
                    <Ionicons name="sparkles-outline" size={16} color={ownerColors.gold} />
                    <Text style={styles.sugText}>{s}</Text>
                  </View>
                ))}
                <Pressable onPress={() => setDetailGuest(null)} style={styles.detailClose}>
                  <Text style={styles.detailCloseText}>{t('owner.menuCancel')}</Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={messageGuest != null} transparent animationType="slide" onRequestClose={() => setMessageGuest(null)}>
        <View style={styles.msgModalRoot}>
          <Pressable style={styles.msgDim} onPress={() => setMessageGuest(null)} />
          <View style={[styles.msgSheet, { paddingBottom: insets.bottom + ownerSpace.md }]}>
            <Text style={styles.msgTitle}>
              {messageGuest ? t('owner.crmMessageTitle', { name: messageGuest.name }) : ''}
            </Text>
            <TextInput
              value={messageBody}
              onChangeText={setMessageBody}
              placeholder={t('owner.crmMessagePlaceholder')}
              placeholderTextColor={ownerColors.textMuted}
              style={styles.msgInput}
              multiline
            />
            <Pressable
              onPress={() => {
                setMessageGuest(null);
                Alert.alert(t('owner.crmMessageSend'), t('owner.crmComingSoonAction'));
              }}
              style={styles.msgSend}
            >
              <Text style={styles.msgSendText}>{t('owner.crmMessageSend')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={noteGuest != null} transparent animationType="slide" onRequestClose={() => setNoteGuest(null)}>
        <View style={styles.msgModalRoot}>
          <Pressable style={styles.msgDim} onPress={() => setNoteGuest(null)} />
          <View style={[styles.msgSheet, { paddingBottom: insets.bottom + ownerSpace.md }]}>
            <Text style={styles.msgTitle}>
              {noteGuest ? t('owner.crmNoteTitle', { name: noteGuest.name }) : ''}
            </Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder={t('owner.crmNotePlaceholder')}
              placeholderTextColor={ownerColors.textMuted}
              style={styles.msgInput}
              multiline
            />
            <Pressable
              onPress={() => {
                if (noteGuest && noteDraft.trim()) {
                  const base = CRM_SPOTLIGHT.find((x) => x.id === noteGuest.id);
                  if (base) {
                    const prev = mergeGuest(base, guestOverrides[noteGuest.id]);
                    patchGuest(noteGuest.id, { notes: `${prev.notes}\n${noteDraft.trim()}` });
                  }
                }
                setNoteGuest(null);
                setNoteDraft('');
              }}
              style={styles.msgSend}
            >
              <Text style={styles.msgSendText}>{t('owner.crmNoteSave')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={aiOpen} animationType="slide" transparent onRequestClose={() => setAiOpen(false)}>
        <View style={styles.aiModalRoot}>
          <Pressable style={styles.aiModalDim} onPress={() => setAiOpen(false)} />
          <View style={[styles.aiSheet, { paddingBottom: insets.bottom + ownerSpace.md }]}>
            <Text style={styles.aiSheetTitle}>{t('owner.crmAskAiTitle')}</Text>
            <Text style={styles.aiSheetSub}>{t('owner.crmAskAiSubtitle')}</Text>
            {[t('owner.crmAskAiEx1'), t('owner.crmAskAiEx2'), t('owner.crmAskAiEx3')].map((ex) => (
              <Pressable
                key={ex}
                onPress={() => {
                  setAiOpen(false);
                  Alert.alert(t('owner.crmAskAiTitle'), t('owner.crmAskAiMock'));
                }}
                style={({ pressed }) => [styles.aiPrompt, pressed && styles.aiPromptPressed]}
              >
                <Text style={styles.aiPromptText}>{ex}</Text>
                <Ionicons name="chevron-forward" size={18} color={ownerColors.goldMuted} />
              </Pressable>
            ))}
            <Pressable onPress={() => setAiOpen(false)} style={styles.aiClose}>
              <Text style={styles.aiCloseText}>{t('owner.menuCancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function accentForGuest(g: CrmGuest): string {
  if (g.isVIP) return ownerColors.gold;
  if (g.churnRisk > 40) return ownerColors.danger;
  if (g.totalVisits <= 2) return ownerColors.textMuted;
  if (g.avgSpend > 120) return ownerColors.success;
  return ownerColors.border;
}

function secondaryTag(g: CrmGuest): 'at_risk' | 'new' | 'high_value' | null {
  if (g.isVIP) return null;
  if (g.churnRisk > 40) return 'at_risk';
  if (g.totalVisits <= 2) return 'new';
  if (g.avgSpend > 120) return 'high_value';
  return null;
}

function secondaryTagLabel(t: (k: string) => string, tag: NonNullable<ReturnType<typeof secondaryTag>>): string {
  if (tag === 'at_risk') return t('owner.crmTagAtRisk');
  if (tag === 'new') return t('owner.crmTagNew');
  return t('owner.crmTagHighValue');
}

const styles = StyleSheet.create({
  rootSafe: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainShell: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  fixedHeader: {
    paddingHorizontal: 16,
    paddingTop: ownerSpace.xs,
    paddingBottom: ownerSpace.sm,
    backgroundColor: '#000',
  },
  fixedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fixedHeaderTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  fixedHeaderSub: {
    fontSize: 13,
    fontWeight: '500',
    color: ownerColors.textMuted,
    marginTop: 1,
  },
  list: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconPressed: { opacity: 0.88 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: ownerSpace.md,
    paddingHorizontal: ownerSpace.sm,
    paddingVertical: 10,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
  },
  searchInput: { flex: 1, color: ownerColors.text, fontSize: 15, minHeight: 36 },
  searchHit: { backgroundColor: ownerColors.goldSubtle, color: ownerColors.gold, fontWeight: '700' },
  aiStrip: {
    marginBottom: ownerSpace.md,
    borderRadius: ownerRadii['2xl'],
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
  },
  aiStripGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(212, 175, 55, 0.06)' },
  aiStripInner: { padding: ownerSpace.md },
  aiStripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  aiStripHint: { fontSize: 13, fontWeight: '600', color: ownerColors.textMuted },
  aiStripHeadline: { fontSize: 17, fontWeight: '800', color: ownerColors.text, marginBottom: 6 },
  aiStripSub: { fontSize: 14, color: ownerColors.textMuted, lineHeight: 20 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ownerColors.border },
  dotOn: { backgroundColor: ownerColors.gold, width: 8, height: 8, borderRadius: 4 },
  multiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ownerSpace.sm,
    paddingVertical: 8,
    paddingHorizontal: ownerSpace.sm,
    borderRadius: ownerRadii.sm,
    backgroundColor: ownerColors.goldSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
  },
  multiBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: ownerColors.gold, marginRight: 8 },
  multiExit: { fontSize: 13, fontWeight: '800', color: ownerColors.gold },
  chipScrollOuter: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    marginBottom: 0,
  },
  chipRow: {
    gap: 8,
    paddingBottom: ownerSpace.md,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
  },
  chipOn: { borderColor: ownerColors.gold, backgroundColor: ownerColors.goldSubtle },
  chipText: { fontSize: 12, fontWeight: '700', color: ownerColors.textMuted },
  chipTextOn: { color: ownerColors.gold },
  listSection: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.3,
    marginBottom: ownerSpace.sm,
  },
  empty: { fontSize: 14, color: ownerColors.textMuted, fontStyle: 'italic', paddingVertical: ownerSpace.lg },
  card: {
    flexDirection: 'row',
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    marginBottom: ownerSpace.sm,
    overflow: 'hidden',
  },
  cardVip: { borderColor: 'rgba(212, 175, 55, 0.45)', shadowColor: ownerColors.gold, shadowOpacity: 0.12, shadowRadius: 8 },
  cardRisk: { shadowColor: ownerColors.danger, shadowOpacity: 0.18, shadowRadius: 10 },
  cardNew: { opacity: 0.96 },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: ownerSpace.md, paddingLeft: ownerSpace.sm },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ownerSpace.sm,
    marginBottom: 6,
    minWidth: 0,
  },
  guestName: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '800', color: ownerColors.text },
  vipPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  vipText: { fontSize: 10, fontWeight: '800', color: ownerColors.gold, letterSpacing: 0.5 },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  tagPillText: { fontSize: 11, fontWeight: '600', color: ownerColors.textSecondary },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricTxt: { fontSize: 13, fontWeight: '600', color: ownerColors.textSecondary },
  metricSep: { color: ownerColors.goldMuted, fontWeight: '700' },
  bonusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 },
  bonusLabel: { fontSize: 12, fontWeight: '600', color: ownerColors.textMuted },
  bonusVal: { fontSize: 13, fontWeight: '800', color: ownerColors.text, marginRight: ownerSpace.sm },
  bonusWarn: { color: ownerColors.danger },
  prefLine: { fontSize: 14, color: ownerColors.textSecondary, lineHeight: 20, marginBottom: 6 },
  nextBest: { fontSize: 13, fontWeight: '600', color: ownerColors.gold, marginBottom: 6 },
  nextBestLabel: { fontWeight: '800', color: ownerColors.goldMuted },
  aiLine: { fontSize: 13, color: ownerColors.textMuted, lineHeight: 19, fontStyle: 'italic', marginBottom: 8 },
  aiLineLabel: { fontWeight: '700', fontStyle: 'normal', color: ownerColors.gold },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    marginBottom: ownerSpace.sm,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 12, fontWeight: '700', color: ownerColors.text },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
  },
  quickPressed: { opacity: 0.88, backgroundColor: ownerColors.goldSubtle },
  quickBtnText: { fontSize: 12, fontWeight: '800', color: ownerColors.gold },
  cardPressed: { opacity: 0.94 },
  swipeRow: { flexDirection: 'row', marginBottom: ownerSpace.sm },
  swipeBtn: { justifyContent: 'center', alignItems: 'center', minWidth: 72, paddingVertical: ownerSpace.md, marginLeft: 4, borderRadius: ownerRadii.sm, paddingHorizontal: 6 },
  swipeGold: { backgroundColor: ownerColors.goldSubtle, borderWidth: StyleSheet.hairlineWidth, borderColor: ownerColors.goldMuted },
  swipeNeutral: { backgroundColor: ownerColors.bgGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: ownerColors.border },
  swipeRisk: { backgroundColor: 'rgba(248, 113, 113, 0.15)' },
  swipePressed: { opacity: 0.88 },
  swipeBtnText: { fontSize: 9, fontWeight: '800', color: ownerColors.text, textTransform: 'uppercase', textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ownerColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  sortOverlay: { flex: 1, justifyContent: 'center', padding: ownerSpace.lg, backgroundColor: 'rgba(0,0,0,0.5)' },
  sortSheet: {
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    padding: ownerSpace.sm,
  },
  sortTitle: { fontSize: 16, fontWeight: '800', color: ownerColors.text, marginBottom: ownerSpace.sm, paddingHorizontal: ownerSpace.sm },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: ownerSpace.md,
    borderRadius: ownerRadii.md,
  },
  sortRowOn: { backgroundColor: ownerColors.goldSubtle },
  sortRowText: { fontSize: 15, fontWeight: '600', color: ownerColors.text },
  sortRowTextOn: { color: ownerColors.gold, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalDim: { backgroundColor: 'rgba(0,0,0,0.82)' },
  detailSheet: {
    maxHeight: '92%',
    backgroundColor: ownerColors.bgSurface,
    borderTopLeftRadius: ownerRadii.xl,
    borderTopRightRadius: ownerRadii.xl,
    padding: ownerSpace.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  detailTitle: { fontSize: 22, fontWeight: '800', color: ownerColors.text, marginBottom: ownerSpace.md },
  detailMetrics: { flexDirection: 'row', gap: ownerSpace.sm, marginBottom: ownerSpace.md },
  detailMetricBox: {
    flex: 1,
    padding: ownerSpace.sm,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
  },
  dmLabel: { fontSize: 12, fontWeight: '600', color: ownerColors.textMuted, marginBottom: 4 },
  dmVal: { fontSize: 16, fontWeight: '800', color: ownerColors.text },
  detailSection: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.3,
    marginTop: ownerSpace.md,
    marginBottom: 6,
  },
  detailLine: { fontSize: 14, color: ownerColors.textSecondary, marginBottom: 4 },
  detailBody: { fontSize: 15, color: ownerColors.textSecondary, lineHeight: 22 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 88, marginBottom: ownerSpace.sm },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBar: { width: '100%', maxWidth: 36, borderRadius: 4, backgroundColor: ownerColors.gold, opacity: 0.85, marginBottom: 6 },
  chartLbl: { fontSize: 9, color: ownerColors.textMuted, textAlign: 'center' },
  sugRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  sugText: { flex: 1, fontSize: 14, color: ownerColors.textSecondary, lineHeight: 20 },
  detailClose: { marginTop: ownerSpace.lg, alignSelf: 'center', paddingVertical: 12 },
  detailCloseText: { fontSize: 16, fontWeight: '600', color: ownerColors.textMuted },
  msgModalRoot: { flex: 1, justifyContent: 'flex-end' },
  msgDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  msgSheet: {
    backgroundColor: ownerColors.bgSurface,
    borderTopLeftRadius: ownerRadii.xl,
    borderTopRightRadius: ownerRadii.xl,
    padding: ownerSpace.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  msgTitle: { fontSize: 18, fontWeight: '800', color: ownerColors.text, marginBottom: ownerSpace.md },
  msgInput: {
    minHeight: 100,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    padding: ownerSpace.md,
    color: ownerColors.text,
    fontSize: 15,
    marginBottom: ownerSpace.md,
    textAlignVertical: 'top',
    backgroundColor: ownerColors.bgElevated,
  },
  msgSend: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: ownerSpace.lg,
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.goldSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
  },
  msgSendText: { fontSize: 16, fontWeight: '800', color: ownerColors.gold },
  aiModalRoot: { flex: 1, justifyContent: 'flex-end' },
  aiModalDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  aiSheet: {
    backgroundColor: ownerColors.bgSurface,
    borderTopLeftRadius: ownerRadii.xl,
    borderTopRightRadius: ownerRadii.xl,
    padding: ownerSpace.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  aiSheetTitle: { fontSize: 18, fontWeight: '800', color: ownerColors.text, marginBottom: 4 },
  aiSheetSub: { fontSize: 13, color: ownerColors.textMuted, marginBottom: ownerSpace.md },
  aiPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ownerSpace.md,
    paddingHorizontal: ownerSpace.sm,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    marginBottom: ownerSpace.sm,
    backgroundColor: ownerColors.bgElevated,
  },
  aiPromptPressed: { opacity: 0.9, backgroundColor: ownerColors.bgGlass },
  aiPromptText: { flex: 1, fontSize: 15, fontWeight: '600', color: ownerColors.text, marginRight: ownerSpace.sm },
  aiClose: { marginTop: ownerSpace.sm, alignSelf: 'center' },
  aiCloseText: { fontSize: 15, fontWeight: '600', color: ownerColors.textMuted },
});
