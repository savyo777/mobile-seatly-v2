import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import {
  ScheduleBottomSheet,
  ScheduleCenterModal,
  SheetPrimaryButton,
  SheetSecondaryButton,
} from '@/components/owner/ScheduleBottomSheet';
import {
  OWNER_PROMOTIONS,
  type OwnerPromotion,
  type PromoAttentionReason,
  type PromoStatus,
  type PromoType,
} from '@/lib/mock/ownerApp';
import { createStyles, useColors } from '@/lib/theme';
import {
  ownerColors,
  ownerColorsFromPalette,
  ownerRadii,
  ownerSpace,
  OWNER_TAB_SCROLL_BOTTOM_PADDING,
} from '@/lib/theme/ownerTheme';
import { formatCurrency } from '@/lib/utils/formatCurrency';

const TODAY = '2026-04-18';
const SECTION_PREVIEW = 3;
const ALL_PREVIEW = 2;

const DOW_KEYS = [
  'owner.promoDayMon',
  'owner.promoDayTue',
  'owner.promoDayWed',
  'owner.promoDayThu',
  'owner.promoDayFri',
  'owner.promoDaySat',
  'owner.promoDaySun',
] as const;

const PROMO_TYPES: { value: PromoType; labelKey: string }[] = [
  { value: 'percent_off', labelKey: 'owner.promoTypePercent' },
  { value: 'fixed_discount', labelKey: 'owner.promoTypeFixed' },
  { value: 'free_item', labelKey: 'owner.promoTypeFree' },
  { value: 'happy_hour', labelKey: 'owner.promoTypeHappyHour' },
  { value: 'birthday', labelKey: 'owner.promoTypeBirthday' },
  { value: 'first_time_guest', labelKey: 'owner.promoTypeFirstTime' },
];

const ATTENTION_I18N: Record<PromoAttentionReason, string> = {
  low_engagement: 'owner.promoAttentionLowEngagement',
  no_redemptions_recent: 'owner.promoAttentionNoRedemptions',
  overlapping_time: 'owner.promoAttentionOverlapping',
  expired_still_listed: 'owner.promoAttentionExpiredVisible',
  scheduled_zero_usage: 'owner.promoAttentionScheduledZero',
};

function clonePromos(list: OwnerPromotion[]): OwnerPromotion[] {
  return list.map((p) => ({
    ...p,
    appliesTo: { ...p.appliesTo },
    analytics: { ...p.analytics },
    daysOfWeek: [...p.daysOfWeek],
  }));
}

function emptyPromo(): OwnerPromotion {
  return {
    id: '',
    name: '',
    type: 'percent_off',
    startDate: TODAY,
    endDate: '2026-12-31',
    startTime: '5:00 PM',
    endTime: '10:00 PM',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    appliesTo: {
      dineIn: true,
      takeout: false,
      bar: false,
      patio: false,
      menuItems: false,
      guestGroups: false,
    },
    autoApply: false,
    description: '',
    status: 'draft',
    targetAudience: '',
    whereApplies: '',
    analytics: { redemptions: 0, guestsReached: 0, revenueGenerated: 0 },
    estimatedLiftPct: 0,
  };
}

function deriveStatusFromDates(p: Pick<OwnerPromotion, 'startDate' | 'endDate'>): PromoStatus {
  if (p.endDate < TODAY) return 'expired';
  if (p.startDate > TODAY) return 'scheduled';
  return 'live';
}

function mergeStatusOnSave(prev: PromoStatus, derived: PromoStatus): PromoStatus {
  if (prev === 'paused') return 'paused';
  if (prev === 'draft') {
    if (derived === 'expired') return 'expired';
    return derived;
  }
  return derived;
}

function statusLabelKey(s: PromoStatus): string {
  switch (s) {
    case 'live':
      return 'owner.promoStatusLive';
    case 'scheduled':
      return 'owner.promoStatusScheduled';
    case 'paused':
      return 'owner.promoStatusPaused';
    case 'expired':
      return 'owner.promoStatusExpired';
    default:
      return 'owner.promoStatusDraft';
  }
}

/** Short badge label (dashboard): scheduled → “Soon”. */
function badgeLabelKey(s: PromoStatus): string {
  if (s === 'scheduled') return 'owner.promoBadgeSoon';
  return statusLabelKey(s);
}

function statusBadgeStyle(s: PromoStatus): { bg: string; border: string; text: string } {
  switch (s) {
    case 'live':
      return {
        bg: 'rgba(34, 197, 94, 0.14)',
        border: 'rgba(34, 197, 94, 0.45)',
        text: '#86EFAC',
      };
    case 'scheduled':
      return {
        bg: 'rgba(212, 175, 55, 0.14)',
        border: 'rgba(212, 175, 55, 0.45)',
        text: ownerColors.gold,
      };
    case 'paused':
      return {
        bg: 'rgba(161, 161, 170, 0.12)',
        border: 'rgba(161, 161, 170, 0.35)',
        text: ownerColors.textSecondary,
      };
    case 'expired':
      return {
        bg: 'rgba(113, 113, 122, 0.1)',
        border: 'rgba(82, 82, 91, 0.35)',
        text: '#71717A',
      };
    default:
      return {
        bg: 'transparent',
        border: 'rgba(255,255,255,0.18)',
        text: ownerColors.textMuted,
      };
  }
}

function edgeBarColor(s: PromoStatus): string {
  switch (s) {
    case 'live':
      return '#22C55E';
    case 'scheduled':
      return ownerColors.gold;
    case 'paused':
      return '#71717A';
    case 'expired':
      return 'rgba(113,113,122,0.35)';
    default:
      return 'rgba(255,255,255,0.22)';
  }
}

function resumeFromPaused(p: OwnerPromotion): PromoStatus {
  if (p.endDate < TODAY) return 'expired';
  if (p.startDate > TODAY) return 'scheduled';
  return 'live';
}

function formatWhereShort(p: OwnerPromotion): string {
  const parts: string[] = [];
  if (p.appliesTo.dineIn) parts.push('Dine-in');
  if (p.appliesTo.takeout) parts.push('To-go');
  if (p.appliesTo.bar) parts.push('Bar');
  if (p.appliesTo.patio) parts.push('Patio');
  if (p.appliesTo.menuItems) parts.push('Menu');
  if (p.appliesTo.guestGroups) parts.push('Groups');
  return parts.slice(0, 3).join(' · ') || '—';
}

function timeWindow(p: OwnerPromotion): string {
  return `${p.startTime}–${p.endTime}`;
}

function isToggleable(p: OwnerPromotion): boolean {
  return p.status === 'live' || p.status === 'scheduled' || p.status === 'paused';
}

function isToggleOn(p: OwnerPromotion): boolean {
  return p.status === 'live' || p.status === 'scheduled';
}

function attentionReasonLabel(p: OwnerPromotion, t: (k: string) => string): string | undefined {
  if (p.attentionReason) return t(ATTENTION_I18N[p.attentionReason]);
  if (p.status === 'expired') return t('owner.promoAttentionExpiredVisible');
  return undefined;
}

function useRollingInt(target: number, duration = 700) {
  const [v, setV] = useState(0);
  const posRef = useRef(0);
  useEffect(() => {
    const start = posRef.current;
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const el = Date.now() - t0;
      const p = Math.min(1, el / duration);
      const eased = 1 - (1 - p) ** 3;
      const next = Math.round(start + (target - start) * eased);
      setV(next);
      posRef.current = next;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function LivePulse({ active, children }: { active: boolean; children: React.ReactNode }) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (!active) {
      o.value = 1;
      return;
    }
    o.value = withRepeat(
      withSequence(withTiming(0.94, { duration: 1500 }), withTiming(1, { duration: 1500 })),
      -1,
      true,
    );
  }, [active, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function OwnerPromotionsScreen() {
  const { t } = useTranslation();
  const styles = usePromoScreenStyles();
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const swipeRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const [promotions, setPromotions] = useState<OwnerPromotion[]>(() => clonePromos(OWNER_PROMOTIONS));
  const [expandLive, setExpandLive] = useState(false);
  const [expandStarting, setExpandStarting] = useState(false);
  const [expandAttention, setExpandAttention] = useState(false);
  const [expandAll, setExpandAll] = useState(false);

  const [detail, setDetail] = useState<OwnerPromotion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [draft, setDraft] = useState<OwnerPromotion>(() => emptyPromo());
  const [deleteTarget, setDeleteTarget] = useState<OwnerPromotion | null>(null);

  const dashboard = useMemo(() => {
    const live = promotions.filter((p) => p.status === 'live');
    const revenueToday = live.reduce((s, p) => s + Math.floor(p.analytics.revenueGenerated * 0.07), 0);
    const lifts = promotions.filter((p) => p.estimatedLiftPct > 0).map((p) => p.estimatedLiftPct);
    const avgLift = lifts.length ? lifts.reduce((a, b) => a + b, 0) / lifts.length : 3;
    const trendPct = Math.min(12, Math.max(-4, avgLift * 0.35 + (live.length > 1 ? 1.2 : -0.5)));
    return {
      revenueToday,
      activeCount: live.length,
      trendPct,
      trendPositive: trendPct >= 0,
    };
  }, [promotions]);

  const revDisplay = useRollingInt(dashboard.revenueToday);

  const liveList = useMemo(() => promotions.filter((p) => p.status === 'live'), [promotions]);
  const startingSoon = useMemo(() => {
    const raw = promotions.filter(
      (p) =>
        p.status === 'scheduled' ||
        (p.status === 'draft' && p.startDate > TODAY) ||
        (p.startsTonight === true && p.status !== 'live'),
    );
    const seen = new Set<string>();
    return raw.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [promotions]);
  const attentionList = useMemo(() => {
    return promotions.filter((p) => {
      if (p.attentionReason) return true;
      if (p.needsAttention) return true;
      if (p.status === 'expired') return true;
      return false;
    });
  }, [promotions]);

  const sortedAll = useMemo(() => {
    const order: PromoStatus[] = ['live', 'scheduled', 'paused', 'draft', 'expired'];
    return [...promotions].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }, [promotions]);

  const openCreate = useCallback(() => {
    setFormMode('create');
    setDraft(emptyPromo());
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((p: OwnerPromotion) => {
    setFormMode('edit');
    setDraft(clonePromos([p])[0]);
    setFormOpen(true);
    setDetail(null);
  }, []);

  const saveForm = useCallback(() => {
    const name = draft.name.trim();
    if (!name) return;

    const derived = deriveStatusFromDates(draft);

    if (formMode === 'create') {
      const id = `p${Date.now()}`;
      const status = mergeStatusOnSave('draft', derived);
      const next: OwnerPromotion = {
        ...draft,
        id,
        name,
        status,
        targetAudience: draft.targetAudience.trim() || '—',
        whereApplies: draft.whereApplies.trim() || '—',
        description: draft.description.trim(),
      };
      setPromotions((prev) => [next, ...prev]);
    } else {
      setPromotions((prev) =>
        prev.map((row) => {
          if (row.id !== draft.id) return row;
          const status = mergeStatusOnSave(row.status, derived);
          return {
            ...draft,
            name,
            status,
            analytics: row.analytics,
            targetAudience: draft.targetAudience.trim() || row.targetAudience,
            whereApplies: draft.whereApplies.trim() || row.whereApplies,
            description: draft.description.trim(),
          };
        }),
      );
    }
    setFormOpen(false);
  }, [draft, formMode]);

  const duplicatePromo = useCallback(
    (p: OwnerPromotion) => {
      const copy: OwnerPromotion = {
        ...clonePromos([p])[0],
        id: `p${Date.now()}`,
        name: `${p.name}${t('owner.promoDuplicateSuffix')}`,
        status: 'draft',
        analytics: { redemptions: 0, guestsReached: 0, revenueGenerated: 0 },
        startsTonight: undefined,
        needsAttention: true,
        attentionReason: undefined,
      };
      setPromotions((prev) => [copy, ...prev]);
      setDetail(null);
      swipeRefs.current.get(p.id)?.close();
    },
    [t],
  );

  const pauseOrResume = useCallback((p: OwnerPromotion) => {
    setPromotions((prev) =>
      prev.map((row) => {
        if (row.id !== p.id) return row;
        if (row.status === 'paused') {
          return { ...row, status: resumeFromPaused(row) };
        }
        if (row.status === 'live' || row.status === 'scheduled') {
          return { ...row, status: 'paused' as PromoStatus };
        }
        return row;
      }),
    );
    swipeRefs.current.get(p.id)?.close();
    setDetail((d) => (d?.id === p.id ? { ...d, status: p.status === 'paused' ? resumeFromPaused(p) : 'paused' } : d));
  }, []);

  const togglePromo = useCallback((p: OwnerPromotion) => {
    if (!isToggleable(p)) return;
    pauseOrResume(p);
  }, [pauseOrResume]);

  const turnOff = useCallback((p: OwnerPromotion) => {
    setPromotions((prev) =>
      prev.map((row) =>
        row.id === p.id && (row.status === 'live' || row.status === 'scheduled')
          ? { ...row, status: 'paused' as PromoStatus }
          : row,
      ),
    );
    setDetail((d) =>
      d?.id === p.id && (d.status === 'live' || d.status === 'scheduled') ? { ...d, status: 'paused' } : d,
    );
  }, []);

  const deletePromo = useCallback((p: OwnerPromotion) => {
    setPromotions((prev) => prev.filter((row) => row.id !== p.id));
    setDetail((d) => (d?.id === p.id ? null : d));
    setDeleteTarget(null);
    swipeRefs.current.get(p.id)?.close();
  }, []);

  const renderStatusBadge = (p: OwnerPromotion) => {
    const st = statusBadgeStyle(p.status);
    const labelKey = badgeLabelKey(p.status);
    const showDot = p.status === 'live';
    return (
      <View style={styles.badgeRow}>
        {showDot ? <View style={styles.liveDot} /> : null}
        <View style={[styles.statusPill, { backgroundColor: st.bg, borderColor: st.border }]}>
          <Text style={[styles.statusPillText, { color: st.text }]}>{t(labelKey)}</Text>
        </View>
      </View>
    );
  };

  const renderSwipeLeft = (p: OwnerPromotion) => (
    <View style={styles.swipeRow}>
      <Pressable
        onPress={() => duplicatePromo(p)}
        style={({ pressed }) => [styles.swipeBtn, styles.swipeGold, pressed && styles.swipePressed]}
      >
        <Text style={styles.swipeBtnText}>{t('owner.promoSwipeDuplicate')}</Text>
      </Pressable>
    </View>
  );

  const renderSwipeRight = (p: OwnerPromotion) => (
    <View style={styles.swipeRow}>
      <Pressable
        onPress={() => {
          swipeRefs.current.get(p.id)?.close();
          if (p.status === 'paused' || p.status === 'live' || p.status === 'scheduled') {
            pauseOrResume(p);
          }
        }}
        style={({ pressed }) => [styles.swipeBtn, styles.swipeNeutral, pressed && styles.swipePressed]}
      >
        <Text style={styles.swipeBtnText}>
          {p.status === 'paused' ? t('owner.promoActionResume') : t('owner.promoSwipePause')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          swipeRefs.current.get(p.id)?.close();
          setDeleteTarget(p);
        }}
        style={({ pressed }) => [styles.swipeBtn, styles.swipeDelete, pressed && styles.swipePressed]}
      >
        <Text style={styles.swipeBtnText}>{t('owner.promoSwipeDelete')}</Text>
      </Pressable>
    </View>
  );

  const renderPromoCard = (p: OwnerPromotion, i: number, opts?: { showReason?: boolean; pulse?: boolean }) => {
    const reason = opts?.showReason ? attentionReasonLabel(p, t) : undefined;
    const expired = p.status === 'expired';
    const outer = (
      <Animated.View entering={FadeInDown.delay(i * 28)} style={[expired && styles.cardExpired]}>
        <Swipeable
          ref={(r) => {
            swipeRefs.current.set(p.id, r);
          }}
          friction={2}
          overshootLeft={false}
          overshootRight={false}
          renderLeftActions={() => renderSwipeLeft(p)}
          renderRightActions={() => renderSwipeRight(p)}
        >
          <View style={styles.cardShell}>
            <View style={[styles.edgeBar, { backgroundColor: edgeBarColor(p.status) }]} />
            <View style={styles.cardBody}>
              <Pressable onPress={() => setDetail(p)} style={({ pressed }) => [pressed && styles.cardPressed]}>
                <View style={styles.row1}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {renderStatusBadge(p)}
                </View>
                <Text style={styles.cardMetaLine} numberOfLines={1}>
                  {timeWindow(p)} · {formatWhereShort(p)}
                </Text>
                <View style={styles.row3}>
                  <Text style={styles.metricBig}>
                    <Text style={styles.metricPrefix}>{t('owner.promoMetricR')} </Text>
                    {p.analytics.redemptions}
                  </Text>
                  <Text style={styles.metricBig}>
                    <Text style={styles.metricPrefix}>{t('owner.promoMetricRev')} </Text>
                    {formatCurrency(p.analytics.revenueGenerated, 'cad')}
                  </Text>
                </View>
                {reason ? <Text style={styles.reasonLine}>{reason}</Text> : null}
                {p.status === 'live' ? (
                  <View style={styles.activeNowRow}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.activeNowText}>{t('owner.promoActiveLabel')}</Text>
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.row4}>
                <Pressable
                  onPress={() => togglePromo(p)}
                  disabled={!isToggleable(p)}
                  style={[
                    styles.toggleTrack,
                    isToggleOn(p) && styles.toggleTrackOn,
                    !isToggleable(p) && styles.toggleDisabled,
                  ]}
                >
                  <View style={[styles.toggleKnob, isToggleOn(p) && styles.toggleKnobOn]} />
                </Pressable>
                <View style={styles.row4Actions}>
                  <Pressable
                    onPress={() => pauseOrResume(p)}
                    disabled={!(p.status === 'live' || p.status === 'scheduled' || p.status === 'paused')}
                    style={({ pressed }) => [
                      styles.quickBtn,
                      pressed && styles.quickBtnPressed,
                      !(p.status === 'live' || p.status === 'scheduled' || p.status === 'paused') &&
                        styles.quickBtnDisabled,
                    ]}
                  >
                    <Text style={styles.quickBtnText}>
                      {p.status === 'paused' ? t('owner.promoActionResume') : t('owner.promoActionPause')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openEdit(p)}
                    style={({ pressed }) => [styles.quickBtnGold, pressed && styles.quickBtnPressed]}
                  >
                    <Text style={styles.quickBtnGoldText}>{t('owner.promoActionEdit')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Swipeable>
      </Animated.View>
    );

    if (opts?.pulse && p.status === 'live') {
      return <LivePulse active>{outer}</LivePulse>;
    }
    return outer;
  };

  const sliceSection = (list: OwnerPromotion[], expanded: boolean, limit: number) =>
    expanded ? list : list.slice(0, limit);

  const formFooter = (
    <View style={styles.sheetFooter}>
      <SheetPrimaryButton label={t('owner.promoSave')} onPress={saveForm} />
      <SheetSecondaryButton label={t('common.cancel')} onPress={() => setFormOpen(false)} />
    </View>
  );

  const detailPromo = detail;
  const fabBottom = OWNER_TAB_SCROLL_BOTTOM_PADDING + insets.bottom;

  const renderStatus = (s: PromoStatus) => {
    const st = statusBadgeStyle(s);
    return (
      <View style={[styles.statusPill, { backgroundColor: st.bg, borderColor: st.border }]}>
        <Text style={[styles.statusPillText, { color: st.text }]}>{t(statusLabelKey(s))}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: fabBottom + 72 },
        ]}
      >
        <SubpageHeader title={t('owner.promotionsTitle')} subtitle={t('owner.promotionsSubtitle')} fallbackTab="more" />

        <View style={styles.perfBar}>
          <View style={styles.perfCell}>
            <Text style={styles.perfVal}>{formatCurrency(revDisplay, 'cad')}</Text>
            <Text style={styles.perfLbl}>{t('owner.promoDashRevenueToday')}</Text>
          </View>
          <View style={styles.perfSep} />
          <View style={styles.perfCell}>
            <Text style={styles.perfVal}>{dashboard.activeCount}</Text>
            <Text style={styles.perfLbl}>{t('owner.promoDashActive')}</Text>
          </View>
          <View style={styles.perfTrend}>
            <Text
              style={[
                styles.trendTxt,
                dashboard.trendPositive ? styles.trendUp : styles.trendDown,
              ]}
            >
              {t('owner.promoDashTrend', {
                sign: dashboard.trendPositive ? '+' : '−',
                pct: Math.abs(Math.round(dashboard.trendPct * 10) / 10),
              })}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('owner.promoSectionLive')}</Text>
          {liveList.length > SECTION_PREVIEW ? (
            <Pressable onPress={() => setExpandLive((x) => !x)} hitSlop={8}>
              <Text style={styles.viewAll}>{expandLive ? t('owner.promoViewLess') : t('owner.promoViewAll')}</Text>
            </Pressable>
          ) : null}
        </View>
        {liveList.length === 0 ? (
          <Text style={styles.sectionEmpty}>{t('owner.promoEmpty')}</Text>
        ) : (
          sliceSection(liveList, expandLive, SECTION_PREVIEW).map((p, i) =>
            renderPromoCard(p, i, { pulse: true }),
          )
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('owner.promoSectionStarting')}</Text>
          {startingSoon.length > SECTION_PREVIEW ? (
            <Pressable onPress={() => setExpandStarting((x) => !x)} hitSlop={8}>
              <Text style={styles.viewAll}>{expandStarting ? t('owner.promoViewLess') : t('owner.promoViewAll')}</Text>
            </Pressable>
          ) : null}
        </View>
        {startingSoon.length === 0 ? (
          <Text style={styles.sectionEmpty}>{t('owner.promoEmpty')}</Text>
        ) : (
          sliceSection(startingSoon, expandStarting, SECTION_PREVIEW).map((p, i) => renderPromoCard(p, i))
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('owner.promoSectionAttention')}</Text>
          {attentionList.length > SECTION_PREVIEW ? (
            <Pressable onPress={() => setExpandAttention((x) => !x)} hitSlop={8}>
              <Text style={styles.viewAll}>{expandAttention ? t('owner.promoViewLess') : t('owner.promoViewAll')}</Text>
            </Pressable>
          ) : null}
        </View>
        {attentionList.length === 0 ? (
          <Text style={styles.sectionEmpty}>{t('owner.promoEmpty')}</Text>
        ) : (
          sliceSection(attentionList, expandAttention, SECTION_PREVIEW).map((p, i) =>
            renderPromoCard(p, i, { showReason: true }),
          )
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('owner.promoSectionAll')}</Text>
          {sortedAll.length > ALL_PREVIEW ? (
            <Pressable onPress={() => setExpandAll((x) => !x)} hitSlop={8}>
              <Text style={styles.viewAll}>{expandAll ? t('owner.promoViewLess') : t('owner.promoViewAll')}</Text>
            </Pressable>
          ) : null}
        </View>
        {sortedAll.length === 0 ? (
          <Text style={styles.sectionEmpty}>{t('owner.promoEmpty')}</Text>
        ) : (
          sliceSection(sortedAll, expandAll, ALL_PREVIEW).map((p, i) => renderPromoCard(p, i))
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      <Pressable
        onPress={openCreate}
        style={({ pressed }) => [styles.fab, { bottom: fabBottom }, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('owner.promoFabA11y')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>

      <ScheduleBottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === 'create' ? t('owner.promoCreateTitle') : t('owner.promoEditTitle')}
        footer={formFooter}
        maxHeightFraction={0.92}
      >
        <Text style={styles.fieldLabel}>{t('owner.promoName')}</Text>
        <TextInput
          value={draft.name}
          onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
          placeholder={t('owner.promoName')}
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>{t('owner.promoType')}</Text>
        <View style={styles.typeRow}>
          {PROMO_TYPES.map((pt) => {
            const on = draft.type === pt.value;
            return (
              <Pressable
                key={pt.value}
                onPress={() => setDraft((d) => ({ ...d, type: pt.value }))}
                style={[styles.typeChip, on && styles.typeChipOn]}
              >
                <Text style={[styles.typeChipText, on && styles.typeChipTextOn]} numberOfLines={1}>
                  {t(pt.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formRow2}>
          <View style={styles.row2Item}>
            <Text style={styles.fieldLabel}>{t('owner.promoStartDate')}</Text>
            <TextInput
              value={draft.startDate}
              onChangeText={(startDate) => setDraft((d) => ({ ...d, startDate }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.row2Item}>
            <Text style={styles.fieldLabel}>{t('owner.promoEndDate')}</Text>
            <TextInput
              value={draft.endDate}
              onChangeText={(endDate) => setDraft((d) => ({ ...d, endDate }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.formRow2}>
          <View style={styles.row2Item}>
            <Text style={styles.fieldLabel}>{t('owner.promoStartTime')}</Text>
            <TextInput
              value={draft.startTime}
              onChangeText={(startTime) => setDraft((d) => ({ ...d, startTime }))}
              style={styles.input}
            />
          </View>
          <View style={styles.row2Item}>
            <Text style={styles.fieldLabel}>{t('owner.promoEndTime')}</Text>
            <TextInput
              value={draft.endTime}
              onChangeText={(endTime) => setDraft((d) => ({ ...d, endTime }))}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>{t('owner.promoDays')}</Text>
        <View style={styles.dowRow}>
          {DOW_KEYS.map((key, idx) => {
            const on = draft.daysOfWeek.includes(idx);
            return (
              <Pressable
                key={key}
                onPress={() =>
                  setDraft((d) => {
                    const has = d.daysOfWeek.includes(idx);
                    const daysOfWeek = has
                      ? d.daysOfWeek.filter((x) => x !== idx)
                      : [...d.daysOfWeek, idx].sort((a, b) => a - b);
                    return { ...d, daysOfWeek };
                  })
                }
                style={[styles.dowChip, on && styles.dowChipOn]}
              >
                <Text style={[styles.dowChipText, on && styles.dowChipTextOn]}>{t(key)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>{t('owner.promoApplies')}</Text>
        {(
          [
            ['dineIn', 'owner.promoApplyDineIn'],
            ['takeout', 'owner.promoApplyTakeout'],
            ['bar', 'owner.promoApplyBar'],
            ['patio', 'owner.promoApplyPatio'],
            ['menuItems', 'owner.promoApplyMenu'],
            ['guestGroups', 'owner.promoApplyGuests'],
          ] as const
        ).map(([k, labelKey]) => (
          <View key={k} style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t(labelKey)}</Text>
            <Switch
              value={draft.appliesTo[k]}
              onValueChange={(v) => setDraft((d) => ({ ...d, appliesTo: { ...d.appliesTo, [k]: v } }))}
              trackColor={{ false: '#3f3f46', true: 'rgba(212, 175, 55, 0.45)' }}
              thumbColor={draft.appliesTo[k] ? palette.gold : palette.textMuted}
            />
          </View>
        ))}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('owner.promoAutoApply')}</Text>
          <Switch
            value={draft.autoApply}
            onValueChange={(autoApply) => setDraft((d) => ({ ...d, autoApply }))}
            trackColor={{ false: '#3f3f46', true: 'rgba(212, 175, 55, 0.45)' }}
            thumbColor={draft.autoApply ? palette.gold : palette.textMuted}
          />
        </View>

        <Text style={styles.fieldLabel}>{t('owner.promoTarget')}</Text>
        <TextInput
          value={draft.targetAudience}
          onChangeText={(targetAudience) => setDraft((d) => ({ ...d, targetAudience }))}
          placeholder={t('owner.promoTarget')}
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>{t('owner.promoWhere')}</Text>
        <TextInput
          value={draft.whereApplies}
          onChangeText={(whereApplies) => setDraft((d) => ({ ...d, whereApplies }))}
          placeholder={t('owner.promoWhere')}
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>{t('owner.promoNotes')}</Text>
        <TextInput
          value={draft.description}
          onChangeText={(description) => setDraft((d) => ({ ...d, description }))}
          placeholder={t('owner.promoNotes')}
          placeholderTextColor={palette.textMuted}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
      </ScheduleBottomSheet>

      <ScheduleBottomSheet
        visible={detailPromo !== null}
        onClose={() => setDetail(null)}
        title={detailPromo?.name ?? t('owner.promoDetailTitle')}
        subtitle={detailPromo ? t(statusLabelKey(detailPromo.status)) : undefined}
        maxHeightFraction={0.9}
        footer={
          detailPromo ? (
            <View style={styles.sheetFooter}>
              <SheetPrimaryButton label={t('owner.promoActionEdit')} onPress={() => openEdit(detailPromo)} />
              {detailPromo.status === 'live' || detailPromo.status === 'scheduled' ? (
                <SheetSecondaryButton label={t('owner.promoActionTurnOff')} onPress={() => turnOff(detailPromo)} />
              ) : detailPromo.status === 'paused' ? (
                <SheetSecondaryButton
                  label={t('owner.promoActionResume')}
                  onPress={() => pauseOrResume(detailPromo)}
                />
              ) : null}
              <SheetSecondaryButton label={t('owner.promoActionDuplicate')} onPress={() => duplicatePromo(detailPromo)} />
              <Pressable onPress={() => setDeleteTarget(detailPromo)} style={styles.destructiveBtn}>
                <Text style={styles.destructiveBtnText}>{t('owner.promoActionDelete')}</Text>
              </Pressable>
            </View>
          ) : null
        }
      >
        {detailPromo ? (
          <>
            <View style={styles.detailHero}>
              {renderStatus(detailPromo.status)}
              <Text style={styles.detailLift}>
                {t('owner.promoLift')}:{' '}
                {detailPromo.estimatedLiftPct > 0 ? `+${detailPromo.estimatedLiftPct}%` : '—'}
              </Text>
            </View>

            <Text style={styles.detailSection}>{t('owner.promoType')}</Text>
            <Text style={styles.detailBody}>
              {t(PROMO_TYPES.find((x) => x.value === detailPromo.type)?.labelKey ?? 'owner.promoTypePercent')}
            </Text>

            <Text style={styles.detailSection}>{t('owner.promoSchedule')}</Text>
            <Text style={styles.detailBody}>
              {detailPromo.startDate} → {detailPromo.endDate}
            </Text>
            <Text style={styles.detailBody}>
              {detailPromo.startTime} – {detailPromo.endTime}
            </Text>
            <Text style={styles.detailBody}>
              {detailPromo.daysOfWeek
                .map((d) => t(DOW_KEYS[d]))
                .join(' · ')}
            </Text>

            <Text style={styles.detailSection}>{t('owner.promoTarget')}</Text>
            <Text style={styles.detailBody}>{detailPromo.targetAudience}</Text>

            <Text style={styles.detailSection}>{t('owner.promoWhere')}</Text>
            <Text style={styles.detailBody}>{detailPromo.whereApplies}</Text>

            <Text style={styles.detailSection}>{t('owner.promoAnalytics')}</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCell}>
                <Text style={styles.analyticsVal}>{detailPromo.analytics.redemptions}</Text>
                <Text style={styles.analyticsLbl}>{t('owner.promoRedemptions')}</Text>
              </View>
              <View style={styles.analyticsCell}>
                <Text style={styles.analyticsVal}>{detailPromo.analytics.guestsReached}</Text>
                <Text style={styles.analyticsLbl}>{t('owner.promoGuestsReached')}</Text>
              </View>
              <View style={styles.analyticsCell}>
                <Text style={styles.analyticsVal}>{formatCurrency(detailPromo.analytics.revenueGenerated, 'cad')}</Text>
                <Text style={styles.analyticsLbl}>{t('owner.promoRevenue')}</Text>
              </View>
            </View>

            <Text style={styles.detailSection}>{t('owner.promoAutoApply')}</Text>
            <Text style={styles.detailBody}>
              {detailPromo.autoApply ? t('owner.promoAutoApplyOn') : t('owner.promoAutoApplyOff')}
            </Text>

            <Text style={styles.detailSection}>{t('owner.promoNotes')}</Text>
            <Text style={styles.detailBody}>{detailPromo.description || '—'}</Text>
          </>
        ) : null}
      </ScheduleBottomSheet>

      <ScheduleCenterModal
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('owner.promoConfirmDelete')}
        message={t('owner.promoConfirmDeleteBody')}
        actions={
          <>
            <Pressable
              onPress={() => deleteTarget && deletePromo(deleteTarget)}
              style={({ pressed }) => [styles.deleteConfirmBtn, pressed && styles.deleteConfirmBtnPressed]}
            >
              <Text style={styles.deleteConfirmBtnText}>{t('common.delete')}</Text>
            </Pressable>
            <SheetSecondaryButton label={t('common.cancel')} onPress={() => setDeleteTarget(null)} />
          </>
        }
      />
    </SafeAreaView>
  );
}

const usePromoScreenStyles = createStyles((c) => {
  const o = ownerColorsFromPalette(c);
  return {
  safe: {
    flex: 1,
    backgroundColor: o.bg,
  },
  scrollContent: {
    paddingHorizontal: ownerSpace.md,
    paddingTop: ownerSpace.xs,
  },
  perfBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: c.bgSurface,
    borderRadius: ownerRadii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: ownerSpace.md,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  perfCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  perfSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: o.border,
    marginVertical: 4,
  },
  perfVal: {
    fontSize: 20,
    fontWeight: '800',
    color: o.text,
    letterSpacing: -0.6,
  },
  perfLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: o.textMuted,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  perfTrend: {
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 2,
    maxWidth: 72,
  },
  trendTxt: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  trendUp: { color: '#86EFAC' },
  trendDown: { color: '#FCA5A5' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: o.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '800',
    color: o.gold,
  },
  sectionEmpty: {
    fontSize: 13,
    color: o.textMuted,
    marginBottom: ownerSpace.md,
    fontStyle: 'italic',
  },
  cardShell: {
    flexDirection: 'row',
    borderRadius: ownerRadii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
    backgroundColor: c.bgSurface,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardExpired: {
    opacity: 0.78,
  },
  edgeBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 10,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: o.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardMetaLine: {
    fontSize: 13,
    fontWeight: '600',
    color: o.textSecondary,
    marginBottom: 10,
  },
  row3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 6,
  },
  metricBig: {
    fontSize: 18,
    fontWeight: '800',
    color: o.text,
    letterSpacing: -0.3,
  },
  metricPrefix: {
    fontSize: 11,
    fontWeight: '800',
    color: o.textMuted,
  },
  reasonLine: {
    fontSize: 12,
    fontWeight: '600',
    color: o.gold,
    marginBottom: 8,
    opacity: 0.95,
  },
  activeNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  activeNowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86EFAC',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row4: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
    paddingTop: 2,
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.45)',
  },
  toggleDisabled: {
    opacity: 0.35,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#52525b',
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    backgroundColor: '#22C55E',
    alignSelf: 'flex-end',
  },
  row4Actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ownerRadii.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
  },
  quickBtnDisabled: {
    opacity: 0.4,
  },
  quickBtnPressed: { opacity: 0.85 },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: o.textSecondary,
  },
  quickBtnGold: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ownerRadii.sm,
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  quickBtnGoldText: {
    fontSize: 12,
    fontWeight: '800',
    color: o.gold,
  },
  cardPressed: { opacity: 0.92 },
  swipeRow: {
    flexDirection: 'row',
    marginBottom: ownerSpace.sm,
  },
  swipeBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
    paddingVertical: ownerSpace.md,
    marginLeft: 4,
    borderRadius: ownerRadii.sm,
    paddingHorizontal: 6,
  },
  swipeGold: {
    backgroundColor: 'rgba(212, 175, 55, 0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  swipeNeutral: {
    backgroundColor: o.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
  },
  swipeDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  swipePressed: { opacity: 0.88 },
  swipeBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: o.text,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: o.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: o.gold,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  fabPressed: { opacity: 0.9 },
  sheetFooter: {
    gap: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: o.textMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
    borderRadius: ownerRadii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: o.text,
    backgroundColor: o.bgGlass,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
    backgroundColor: o.bgGlass,
    maxWidth: '48%',
  },
  typeChipOn: {
    borderColor: 'rgba(212, 175, 55, 0.5)',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: o.textSecondary,
  },
  typeChipTextOn: {
    color: o.gold,
  },
  formRow2: {
    flexDirection: 'row',
    gap: 10,
  },
  row2Item: { flex: 1 },
  dowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dowChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: o.bgGlass,
  },
  dowChipOn: {
    borderColor: 'rgba(212, 175, 55, 0.5)',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  dowChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: o.textMuted,
  },
  dowChipTextOn: {
    color: o.gold,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: o.border,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: o.text,
    flex: 1,
    paddingRight: 12,
  },
  detailHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLift: {
    fontSize: 14,
    fontWeight: '800',
    color: o.gold,
  },
  detailSection: {
    fontSize: 11,
    fontWeight: '800',
    color: o.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  detailBody: {
    fontSize: 15,
    color: o.textSecondary,
    lineHeight: 22,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  analyticsCell: {
    flex: 1,
    padding: 12,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: o.border,
    backgroundColor: o.bgGlass,
    alignItems: 'center',
  },
  analyticsVal: {
    fontSize: 16,
    fontWeight: '800',
    color: o.text,
    marginBottom: 4,
  },
  analyticsLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: o.textMuted,
    textAlign: 'center',
  },
  destructiveBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  destructiveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(248, 113, 113, 0.95)',
  },
  deleteConfirmBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.16)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  deleteConfirmBtnPressed: { opacity: 0.88 },
  deleteConfirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(252, 165, 165, 0.98)',
  },
};
});
