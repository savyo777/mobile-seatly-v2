import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, type Href } from 'expo-router';
import { borderRadius, createStyles, spacing, useColors } from '@/lib/theme';
import { useCurrentUserId } from '@/lib/auth/currentUserId';
import {
  createAvailabilityAlert,
  type CreateAvailabilityAlertInput,
} from '@/lib/alerts/createAvailabilityAlert';
import { to24h } from '@/lib/alerts/timeNormalize';
import { friendlyError } from '@/lib/errors/friendlyError';

type CommonProps = {
  defaultPartySize?: number;
  showLookForDay?: boolean;
  triggerLabel?: string;
  triggerVariant?: 'solid' | 'subtle';
};

type RestaurantProps = CommonProps & {
  variant: 'restaurant';
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  defaultDate?: string;       // YYYY-MM-DD
  defaultTime?: string;       // 12h or 24h; normalised before send
};

type EventProps = CommonProps & {
  variant: 'event';
  eventId: string;
  eventName?: string;
  restaurantSlug?: never;
  restaurantName?: never;
  defaultDate?: never;
  defaultTime?: never;
};

export type NotifyMeButtonProps = RestaurantProps | EventProps;

function formatDateLabel(dateKey: string | undefined): string {
  if (!dateKey) return '—';
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (![y, m, d].every((n) => Number.isFinite(n))) return dateKey;
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeLabel(time24h: string | null): string {
  if (!time24h) return '—';
  const [hStr, mStr] = time24h.split(':');
  const h = parseInt(hStr ?? '', 10);
  const m = parseInt(mStr ?? '', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time24h;
  const meridiem = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12}${meridiem}` : `${hour12}:${String(m).padStart(2, '0')}${meridiem}`;
}

const useStyles = createStyles((c) => ({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.gold,
  },
  triggerSolid: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.2,
  },
  triggerTextSolid: {
    color: c.bgBase,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },
  summary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: c.bgElevated,
    gap: 4,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: c.gold,
    textTransform: 'uppercase',
  },
  summaryLine: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  summarySub: {
    fontSize: 12,
    color: c.textMuted,
  },
  banner: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.3)',
    gap: spacing.sm,
  },
  bannerText: {
    fontSize: 13,
    color: c.danger,
    fontWeight: '600',
  },
  bannerCta: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  bannerCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.bgBase,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.border,
  },
  btnPrimary: {
    backgroundColor: c.gold,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextOutline: {
    color: c.textPrimary,
  },
  btnTextPrimary: {
    color: c.bgBase,
  },
}));

export function NotifyMeButton(props: NotifyMeButtonProps) {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const userId = useCurrentUserId();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ message: string; suggestedDate: string | null } | null>(
    null,
  );

  const isRestaurant = props.variant === 'restaurant';
  const partySize = Math.max(1, Math.min(40, props.defaultPartySize ?? 2));
  const initialTime24 = isRestaurant ? to24h(props.defaultTime) : null;
  const dateKey = isRestaurant ? props.defaultDate : undefined;

  const summaryEyebrow = isRestaurant ? "WE'LL WATCH" : "WE'LL WATCH";
  const summaryTitle = isRestaurant
    ? `${formatDateLabel(dateKey)} · ${formatTimeLabel(initialTime24)} · ${partySize} ${partySize === 1 ? 'guest' : 'guests'}`
    : `${partySize} ${partySize === 1 ? 'seat' : 'seats'}`;
  const summarySub = isRestaurant ? '± 2 hr window' : 'We ping you the moment a seat opens.';
  const targetName = isRestaurant ? props.restaurantName : props.eventName;

  const canLookForDay =
    isRestaurant &&
    props.showLookForDay !== false &&
    Boolean(props.restaurantId);

  const submit = useCallback(
    async (overrideDate?: string) => {
      if (submitting) return;
      if (!userId) {
        // Auth gate — route to welcome, caller can retap after signing in.
        setOpen(false);
        router.push(
          `/(auth)/welcome?notifyMe=1&returnTo=${encodeURIComponent(pathname ?? '')}` as Href,
        );
        return;
      }

      const input: CreateAvailabilityAlertInput = isRestaurant
        ? {
            variant: 'restaurant',
            restaurantId: props.restaurantId,
            date: overrideDate ?? dateKey ?? '',
            partySize,
            preferredTime: initialTime24 ?? '',
            windowMinutes: 120,
          }
        : {
            variant: 'event',
            eventId: props.eventId,
            partySize,
          };

      if (input.variant === 'restaurant' && (!input.date || !input.preferredTime)) {
        Alert.alert('Pick a date and time first.');
        return;
      }

      setSubmitting(true);
      setBanner(null);
      try {
        const result = await createAvailabilityAlert(input);
        if (result.ok) {
          setOpen(false);
          Alert.alert("Got it. We'll ping you when a spot opens.");
          return;
        }
        const err = result.error;
        if (err === 'duplicate') {
          setOpen(false);
          Alert.alert("You're already watching this.");
          return;
        }
        if (
          err === 'closed_on_this_date' ||
          err === 'past_last_seating' ||
          err === 'beyond_booking_window'
        ) {
          setBanner({
            message: result.message ?? 'Pick another date.',
            suggestedDate: result.suggested_next_date ?? null,
          });
          return;
        }
        if (err === 'not_authenticated') {
          setOpen(false);
          router.push(
            `/(auth)/welcome?notifyMe=1&returnTo=${encodeURIComponent(pathname ?? '')}` as Href,
          );
          return;
        }
        Alert.alert('Something went wrong', friendlyError(undefined, err ?? 'Please try again.'));
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      userId,
      isRestaurant,
      props,
      dateKey,
      partySize,
      initialTime24,
      router,
      pathname,
    ],
  );

  const handleLookForDay = useCallback(() => {
    if (!isRestaurant) return;
    setOpen(false);
    const qs: string[] = [];
    if (dateKey) qs.push(`date=${encodeURIComponent(dateKey)}`);
    if (initialTime24) qs.push(`time=${encodeURIComponent(initialTime24)}`);
    qs.push(`party=${partySize}`);
    router.push(
      `/(customer)/discover/${encodeURIComponent(props.restaurantId)}?${qs.join('&')}` as Href,
    );
  }, [isRestaurant, dateKey, initialTime24, partySize, props, router]);

  const triggerStyles = useMemo(
    () => [styles.trigger, props.triggerVariant === 'solid' && styles.triggerSolid],
    [styles, props.triggerVariant],
  );
  const triggerTextStyles = useMemo(
    () => [styles.triggerText, props.triggerVariant === 'solid' && styles.triggerTextSolid],
    [styles, props.triggerVariant],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [triggerStyles, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Notify me when a spot opens"
      >
        <Ionicons
          name="notifications-outline"
          size={15}
          color={props.triggerVariant === 'solid' ? c.bgBase : c.gold}
        />
        <Text style={triggerTextStyles}>{props.triggerLabel ?? 'Notify me'}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>Notify me when a spot opens</Text>
            <Text style={styles.subtitle}>
              We&apos;ll ping you the moment a {isRestaurant ? 'table' : 'seat'} opens
              {targetName ? ` at ${targetName}` : ''}.
            </Text>

            <View style={styles.summary}>
              <Text style={styles.summaryEyebrow}>{summaryEyebrow}</Text>
              <Text style={styles.summaryLine}>{summaryTitle}</Text>
              <Text style={styles.summarySub}>{summarySub}</Text>
            </View>

            {banner ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{banner.message}</Text>
                {banner.suggestedDate ? (
                  <Pressable
                    onPress={() => submit(banner.suggestedDate ?? undefined)}
                    style={({ pressed }) => [styles.bannerCta, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.bannerCtaText}>
                      Use {formatDateLabel(banner.suggestedDate)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actions}>
              {canLookForDay ? (
                <Pressable
                  onPress={handleLookForDay}
                  style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.btnText, styles.btnTextOutline]}>Look for available day</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => submit()}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  (pressed || submitting) && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.btnText, styles.btnTextPrimary]}>
                  {submitting ? 'Saving…' : 'Notify me'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
