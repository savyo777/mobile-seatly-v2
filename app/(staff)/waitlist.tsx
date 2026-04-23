import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import {
  WALKIN_QUEUE,
  WAITLIST_ENTRIES,
  type WalkInQueueItem,
  type WaitlistEntry,
  type WaitlistEntryStatus,
} from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

type DetailTarget =
  | { kind: 'walkin'; item: WalkInQueueItem }
  | { kind: 'waitlist'; item: WaitlistEntry };

function WaitlistBackdrop({ onPress }: { onPress: () => void }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFillObject, styles.modalDim]} />
      ) : (
        <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFillObject} />
      )}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} accessibilityRole="button" />
    </View>
  );
}

function statusLabelKey(s: WaitlistEntryStatus): string {
  if (s === 'late') return 'owner.waitlistStatusLate';
  if (s === 'arriving') return 'owner.waitlistStatusArriving';
  return 'owner.waitlistStatusWaiting';
}

function statusBadgeStyle(s: WaitlistEntryStatus) {
  if (s === 'late') return styles.badgeLate;
  if (s === 'arriving') return styles.badgeArriving;
  return styles.badgeWaiting;
}

function statusTextStyle(s: WaitlistEntryStatus) {
  if (s === 'late') return styles.statusTxtLate;
  if (s === 'arriving') return styles.statusTxtArriving;
  return styles.statusTxtWaiting;
}

export default function OwnerWaitlistScreen() {
  const { t } = useTranslation();
  const [walkins, setWalkins] = useState<WalkInQueueItem[]>(() => [...WALKIN_QUEUE]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => [...WAITLIST_ENTRIES]);
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  const totalWaiting = walkins.length + waitlist.length;
  const walkInCount = walkins.length;
  const avgWaitMins = useMemo(() => {
    if (walkins.length === 0) return null;
    return Math.round(walkins.reduce((s, w) => s + w.waitMins, 0) / walkins.length);
  }, [walkins]);

  const openMenu = useCallback(() => {
    Alert.alert(
      t('owner.waitlistScreenTitle'),
      undefined,
      [
        {
          text: t('owner.waitlistMenuQueueSettings'),
          onPress: () => Alert.alert(t('owner.waitlistMenuQueueSettings'), t('owner.waitlistComingSoon')),
        },
        {
          text: t('owner.waitlistMenuRefresh'),
          onPress: () => {
            setWalkins([...WALKIN_QUEUE]);
            setWaitlist([...WAITLIST_ENTRIES]);
          },
        },
        { text: t('owner.menuCancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [t]);

  const addWalkIn = useCallback(() => {
    const next: WalkInQueueItem = {
      id: `wq-${Date.now()}`,
      name: t('owner.quickWalkIn'),
      party: 2,
      waitMins: 15,
    };
    setWalkins((prev) => [...prev, next]);
  }, [t]);

  const removeWalkin = useCallback((id: string) => {
    setWalkins((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const removeWaitlist = useCallback((id: string) => {
    setWaitlist((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const onSeat = useCallback(() => {
    setDetail(null);
    Alert.alert(t('owner.waitlistDetailSeat'), t('owner.waitlistComingSoon'));
  }, [t]);

  const onEditTime = useCallback(() => {
    setDetail(null);
    Alert.alert(t('owner.waitlistDetailEditTime'), t('owner.waitlistComingSoon'));
  }, [t]);

  const onRemoveDetail = useCallback(() => {
    if (!detail) return;
    if (detail.kind === 'walkin') removeWalkin(detail.item.id);
    else removeWaitlist(detail.item.id);
    setDetail(null);
  }, [detail, removeWalkin, removeWaitlist]);

  const headerRight = (
    <Pressable
      onPress={openMenu}
      style={({ pressed }) => [styles.headerMoreBtn, pressed && styles.headerMorePressed]}
      accessibilityRole="button"
      accessibilityLabel={t('owner.waitlistOverflowMenu')}
    >
      <Ionicons name="ellipsis-horizontal" size={20} color={ownerColors.gold} />
    </Pressable>
  );

  return (
    <OwnerScreen>
      <SubpageHeader
        title={t('owner.waitlistScreenTitle')}
        subtitle={t('owner.waitlistScreenSubtitle')}
        fallbackTab="reservations"
        rightAction={headerRight}
      />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{t('owner.waitlistSummaryWaiting', { count: totalWaiting })}</Text>
        <Text style={styles.summarySep}>·</Text>
        <Text style={styles.summaryText}>
          {avgWaitMins != null ? t('owner.waitlistSummaryAvg', { mins: avgWaitMins }) : t('owner.waitlistSummaryAvgPlaceholder')}
        </Text>
        <Text style={styles.summarySep}>·</Text>
        <Text style={styles.summaryText}>{t('owner.waitlistSummaryWalkIns', { count: walkInCount })}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('owner.walkInQueue')}</Text>
      {walkins.length === 0 ? (
        <Text style={styles.sectionEmpty}>{t('common.noResults')}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walkInScroll}
        >
          {walkins.map((q, i) => (
            <Animated.View key={q.id} entering={FadeInDown.delay(i * 45).springify()}>
              <Pressable
                onPress={() => setDetail({ kind: 'walkin', item: q })}
                style={({ pressed }) => [styles.walkInCard, pressed && styles.cardPressed]}
              >
                <View style={styles.walkInAccent} />
                <View style={styles.walkInBody}>
                  <View style={styles.walkInTop}>
                    <Text style={styles.walkInName} numberOfLines={1}>
                      {q.name}
                    </Text>
                    <View style={styles.tagWalkIn}>
                      <Text style={styles.tagWalkInText}>{t('owner.waitlistWalkInTag')}</Text>
                    </View>
                  </View>
                  <Text style={styles.walkInParty}>{t('owner.queueParty', { n: q.party })}</Text>
                  <Text style={styles.walkInWait}>{t('owner.queueWait', { mins: q.waitMins })}</Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.sectionLabel, styles.sectionSpacer]}>{t('owner.waitlist')}</Text>
      {waitlist.length === 0 ? (
        <Text style={styles.sectionEmpty}>{t('common.noResults')}</Text>
      ) : (
        waitlist.map((w, i) => (
          <Animated.View key={w.id} entering={FadeInDown.delay(80 + i * 40).springify()}>
            <Pressable
              onPress={() => setDetail({ kind: 'waitlist', item: w })}
              style={({ pressed }) => [styles.waitCard, pressed && styles.cardPressed]}
            >
              <View style={styles.waitAccent} />
              <View style={styles.waitBody}>
                <View style={styles.waitTop}>
                  <Text style={styles.waitName}>{w.name}</Text>
                    <View style={[styles.statusPill, statusBadgeStyle(w.status)]}>
                    <Text style={[styles.statusPillText, statusTextStyle(w.status)]}>
                      {t(statusLabelKey(w.status))}
                    </Text>
                  </View>
                </View>
                <Text style={styles.waitMeta}>
                  {t('owner.waitParty', { n: w.party })} · {t('owner.waitQuoted', { time: w.quoted })}
                </Text>
                {w.risk ? (
                  <View style={styles.riskRow}>
                    <Ionicons name="warning-outline" size={14} color={ownerColors.danger} />
                    <Text style={styles.riskText}>{t('owner.waitlistRisk')}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        ))
      )}

      <View style={styles.footer}>
        <Text style={styles.footerHint}>{t('owner.waitlistNoMore')}</Text>
        <Pressable
          onPress={addWalkIn}
          style={({ pressed }) => [styles.addWalkInBtn, pressed && styles.addWalkInPressed]}
          accessibilityRole="button"
        >
          <Ionicons name="add-outline" size={20} color={ownerColors.gold} />
          <Text style={styles.addWalkInText}>{t('owner.waitlistAddWalkIn')}</Text>
        </Pressable>
      </View>

      <Modal visible={detail != null} animationType="fade" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.modalRoot}>
          <WaitlistBackdrop onPress={() => setDetail(null)} />
          <Animated.View entering={FadeInDown.duration(280).springify()} style={styles.modalCard}>
            {detail?.kind === 'walkin' ? (
              <>
                <Text style={styles.modalTitle}>{detail.item.name}</Text>
                <Text style={styles.modalMeta}>
                  {t('owner.queueParty', { n: detail.item.party })} · {t('owner.queueWait', { mins: detail.item.waitMins })}
                </Text>
              </>
            ) : detail?.kind === 'waitlist' ? (
              <>
                <Text style={styles.modalTitle}>{detail.item.name}</Text>
                <Text style={styles.modalMeta}>
                  {t('owner.waitParty', { n: detail.item.party })} · {t('owner.waitQuoted', { time: detail.item.quoted })}
                </Text>
                <View style={[styles.modalBadge, statusBadgeStyle(detail.item.status)]}>
                  <Text style={[styles.statusPillText, statusTextStyle(detail.item.status)]}>
                    {t(statusLabelKey(detail.item.status))}
                  </Text>
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable onPress={onSeat} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
                <Ionicons name="restaurant-outline" size={20} color={ownerColors.gold} />
                <Text style={styles.actionBtnText}>{t('owner.waitlistDetailSeat')}</Text>
              </Pressable>
              <Pressable
                onPress={onEditTime}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              >
                <Ionicons name="time-outline" size={20} color={ownerColors.gold} />
                <Text style={styles.actionBtnText}>{t('owner.waitlistDetailEditTime')}</Text>
              </Pressable>
              <Pressable
                onPress={onRemoveDetail}
                style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && styles.actionBtnPressed]}
              >
                <Ionicons name="trash-outline" size={20} color={ownerColors.danger} />
                <Text style={[styles.actionBtnText, styles.actionBtnDangerText]}>{t('owner.waitlistDetailRemove')}</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setDetail(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>{t('owner.menuCancel')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: ownerSpace.md,
    gap: 6,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
    letterSpacing: 0.2,
  },
  summarySep: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.goldMuted,
    opacity: 0.85,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.3,
    marginBottom: ownerSpace.sm,
  },
  sectionSpacer: {
    marginTop: ownerSpace.lg,
  },
  sectionEmpty: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginBottom: ownerSpace.sm,
    fontStyle: 'italic',
  },
  walkInScroll: {
    gap: ownerSpace.sm,
    paddingBottom: ownerSpace.xs,
  },
  walkInCard: {
    width: 228,
    minHeight: 118,
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  walkInAccent: {
    width: 4,
    backgroundColor: ownerColors.gold,
    opacity: 0.95,
  },
  walkInBody: {
    flex: 1,
    padding: ownerSpace.md,
    paddingLeft: ownerSpace.sm,
  },
  walkInTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ownerSpace.xs,
    marginBottom: 6,
  },
  walkInName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.3,
  },
  tagWalkIn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
    backgroundColor: ownerColors.goldSubtle,
  },
  tagWalkInText: {
    fontSize: 11,
    fontWeight: '700',
    color: ownerColors.gold,
    letterSpacing: 0.1,
  },
  walkInParty: {
    fontSize: 13,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    marginBottom: 4,
  },
  walkInWait: {
    fontSize: 15,
    fontWeight: '800',
    color: ownerColors.gold,
    letterSpacing: 0.2,
  },
  waitCard: {
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    marginBottom: ownerSpace.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  waitAccent: {
    width: 4,
    backgroundColor: ownerColors.gold,
    opacity: 0.75,
  },
  waitBody: {
    flex: 1,
    padding: ownerSpace.md,
    paddingLeft: ownerSpace.sm,
  },
  waitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ownerSpace.sm,
    marginBottom: 6,
  },
  waitName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
  },
  waitMeta: {
    fontSize: 14,
    fontWeight: '500',
    color: ownerColors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  statusTxtWaiting: {
    color: ownerColors.gold,
  },
  statusTxtLate: {
    color: ownerColors.danger,
  },
  statusTxtArriving: {
    color: ownerColors.success,
  },
  badgeWaiting: {
    borderColor: ownerColors.goldMuted,
    backgroundColor: ownerColors.goldSubtle,
  },
  badgeLate: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  badgeArriving: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: ownerSpace.sm,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.danger,
  },
  cardPressed: {
    opacity: 0.92,
  },
  footer: {
    marginTop: ownerSpace.lg,
    paddingVertical: ownerSpace.md,
    alignItems: 'center',
    gap: ownerSpace.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  footerHint: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
    opacity: 0.85,
  },
  addWalkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: ownerSpace.lg,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
    backgroundColor: 'transparent',
  },
  addWalkInPressed: {
    opacity: 0.88,
    backgroundColor: ownerColors.goldSubtle,
  },
  addWalkInText: {
    fontSize: 15,
    fontWeight: '700',
    color: ownerColors.gold,
    letterSpacing: 0.2,
  },
  headerMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMorePressed: {
    opacity: 0.88,
    backgroundColor: ownerColors.bgGlass,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ownerSpace.md,
  },
  modalDim: {
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    zIndex: 2,
    backgroundColor: ownerColors.bgSurface,
    borderRadius: ownerRadii.xl,
    padding: ownerSpace.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  modalMeta: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: ownerSpace.sm,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: ownerSpace.md,
  },
  modalActions: {
    gap: ownerSpace.sm,
    marginTop: ownerSpace.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ownerSpace.sm,
    paddingVertical: 12,
    paddingHorizontal: ownerSpace.md,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
  },
  actionBtnDanger: {
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  actionBtnPressed: {
    opacity: 0.9,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
  },
  actionBtnDangerText: {
    color: ownerColors.danger,
  },
  modalClose: {
    marginTop: ownerSpace.md,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
});
