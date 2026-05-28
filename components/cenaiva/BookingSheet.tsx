import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { useAssistantStore } from '@/lib/cenaiva/state/assistantStore';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { createPreorderCheckoutFromBooking } from '@/lib/cenaiva/api/createPreorderCheckout';
import { usePublicMenuCategories, usePublicMenuItems, type MenuItem } from '@/lib/cenaiva/api/dataHooks';
import { createStyles, borderRadius, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  shell: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    gap: spacing.md,
  },
  shellFullScreen: {
    flex: 1,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#0D0D0D',
  },
  title: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '800',
  },
  bookedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detail: {
    ...typography.body,
    color: c.textSecondary,
    flex: 1,
  },
  code: {
    ...typography.h3,
    color: c.gold,
    fontWeight: '900',
    letterSpacing: 1,
  },
  prompt: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  flowHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  flowTitle: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
  },
  flowSubtitle: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
  },
  headerTextBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '800',
  },
  reviewBody: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  reviewCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  reviewLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  reviewLineDivider: {
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  reviewLineQty: {
    ...typography.label,
    color: c.gold,
    fontWeight: '900',
    marginRight: spacing.sm,
    minWidth: 28,
  },
  reviewLineName: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  reviewLinePrice: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  reviewSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  reviewSubtotalLabel: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reviewSubtotalValue: {
    ...typography.h2,
    color: c.textPrimary,
    fontWeight: '900',
  },
  reviewPrompt: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  reviewPromptSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  menuList: {
    maxHeight: 320,
  },
  menuListFullScreen: {
    flex: 1,
    maxHeight: '100%',
  },
  category: {
    ...typography.label,
    color: c.gold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingVertical: spacing.sm,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  itemDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '700',
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  qty: {
    width: 24,
    textAlign: 'center',
    color: c.textPrimary,
    fontWeight: '800',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: spacing.md,
  },
  totalLabel: {
    ...typography.body,
    color: c.textSecondary,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '900',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: spacing.sm,
  },
  lineName: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
    fontWeight: '700',
  },
  linePrice: {
    ...typography.body,
    color: c.textSecondary,
    fontWeight: '700',
  },
  muted: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  error: {
    ...typography.bodySmall,
    color: c.danger,
  },
}));

function formatDate(value: string | null) {
  if (!value) return 'Date pending';
  try {
    return format(new Date(`${value}T12:00:00`), 'EEE, MMM d');
  } catch {
    return value;
  }
}

// Convert a 24-hour "HH:MM" stamp (the orchestrator's canonical
// time field) into a 12-hour "h:MM AM/PM" display string. Falls
// back to whatever the caller passed if it doesn't look like
// HH:MM (e.g. an already-formatted "8:30 PM" or a slot_iso).
// User-reported 2026-05-28: the Confirm sheet showed "20:30"
// instead of "8:30 PM" — every other timestamp surface in the app
// uses 12-hour, the BookingSheet was the outlier.
function formatTime12h(value: string | null) {
  if (!value) return 'Time pending';
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const hh = parseInt(match[1], 10);
  const mm = match[2];
  if (Number.isNaN(hh) || hh < 0 || hh > 23) return value;
  const period = hh >= 12 ? 'PM' : 'AM';
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display}:${mm} ${period}`;
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function groupMenuItems(items: MenuItem[], categories: Array<{ id: string; name: string }>) {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  return items.reduce<Record<string, MenuItem[]>>((groups, item) => {
    const key = item.category_id ? categoryName.get(item.category_id) ?? item.category ?? 'Menu' : item.category ?? 'Menu';
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});
}

export function BookingSheet({ fullScreen = false }: { fullScreen?: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const assistant = useCenaivaAssistant();
  const { state, dispatch } = useAssistantStore();
  const { booking } = state;
  const insets = useSafeAreaInsets();
  const shellStyle = [styles.shell, fullScreen && styles.shellFullScreen];
  const [menuStep, setMenuStep] = useState<'browsing' | 'review'>('browsing');
  const [prepayBusy, setPrepayBusy] = useState(false);
  const [prepayError, setPrepayError] = useState<string | null>(null);
  const { categories } = usePublicMenuCategories(booking.restaurant_id);
  const { preorderableItems, loading } = usePublicMenuItems(
    booking.status === 'offering_preorder' || booking.status === 'browsing_menu'
      ? booking.restaurant_id
      : null,
  );

  const grouped = useMemo(
    () => groupMenuItems(preorderableItems, categories),
    [categories, preorderableItems],
  );
  const cartQty = useMemo(
    () => new Map(booking.cart.map((item) => [item.menu_item_id, item.qty])),
    [booking.cart],
  );

  useEffect(() => {
    if (booking.status !== 'browsing_menu') {
      setMenuStep('browsing');
      setPrepayBusy(false);
      setPrepayError(null);
    }
  }, [booking.status]);

  useEffect(() => {
    if (menuStep === 'review' && booking.cart.length === 0) {
      setMenuStep('browsing');
    }
  }, [booking.cart.length, menuStep]);

  const createCheckout = async () => {
    if (prepayBusy) return;
    setPrepayBusy(true);
    setPrepayError(null);
    try {
      const result = await createPreorderCheckoutFromBooking(booking);
      assistant.close();
      router.push(`/(customer)/checkout/${result.orderId}` as never);
    } catch (err) {
      setPrepayError((err as Error)?.message ?? 'Could not open checkout. Try again.');
      setPrepayBusy(false);
    }
  };

  const exitPreorderFlow = () => {
    setMenuStep('browsing');
    setPrepayBusy(false);
    setPrepayError(null);
    dispatch({ type: 'clear_cart' });
    assistant.close();
  };

  if (booking.status === 'idle' || booking.status === 'collecting_minimum_fields') return null;

  if (booking.status === 'loading_availability') {
    return (
      <View style={shellStyle}>
        <View style={styles.row}>
          <ActivityIndicator color={c.gold} />
          <Text style={styles.detail}>Checking availability</Text>
        </View>
      </View>
    );
  }

  if (booking.status === 'awaiting_time_selection') {
    return (
      <View style={shellStyle}>
        <Text style={styles.title}>Time selected</Text>
        <Text style={styles.detail}>{booking.restaurant_name ?? 'Restaurant'} - {formatDate(booking.date)} - {formatTime12h(booking.time ?? booking.slot_iso)}</Text>
      </View>
    );
  }

  if (booking.status === 'confirming') {
    return (
      <View style={shellStyle}>
        <Text style={styles.title}>Confirm booking</Text>
        <View style={styles.row}>
          <Ionicons name="restaurant-outline" size={18} color={c.gold} />
          <Text style={styles.detail}>{booking.restaurant_name ?? 'Selected restaurant'}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="people-outline" size={18} color={c.gold} />
          <Text style={styles.detail}>{booking.party_size ? `${booking.party_size} guests` : 'Guests pending'}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={18} color={c.gold} />
          <Text style={styles.detail}>{formatDate(booking.date)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={18} color={c.gold} />
          <Text style={styles.detail}>{formatTime12h(booking.time ?? booking.slot_iso)}</Text>
        </View>
        <View style={styles.actions}>
          <View style={styles.half}>
            <Button
              title="Change details"
              variant="outlined"
              onPress={() => assistant.sendTranscript('change the guest count, date, or time', { force: true })}
            />
          </View>
          <View style={styles.half}>
            <Button
              title="Confirm booking"
              onPress={() => assistant.sendTranscript('yes, confirm booking', { force: true })}
            />
          </View>
        </View>
      </View>
    );
  }

  if (booking.status === 'offering_preorder') {
    return (
      <View style={shellStyle}>
        {/* Title gets a check icon + uses a typographic apostrophe in
            a static string. The previous "You're booked" at fontWeight
            800 rendered with a glitched apostrophe on iOS — replacing
            the leading-text+apostrophe with an icon + cleaner phrasing
            sidesteps the font rasterizer issue entirely. */}
        <View style={styles.bookedHeader}>
          <Ionicons name="checkmark-circle" size={22} color={c.gold} />
          <Text style={styles.title}>Booked!</Text>
        </View>
        {booking.confirmation_code ? <Text style={styles.code}>{booking.confirmation_code}</Text> : null}
        <Text style={styles.detail}>{booking.restaurant_name ?? 'Restaurant'} - {formatDate(booking.date)} - {formatTime12h(booking.time ?? booking.slot_iso)}</Text>
        <Text style={styles.prompt}>Would you like to pre-order from the menu?</Text>
        <View style={styles.actions}>
          <View style={styles.half}>
            <Button title="Not now" variant="outlined" onPress={assistant.close} />
          </View>
          <View style={styles.half}>
            <Button
              title="View menu"
              onPress={() => {
                if (booking.restaurant_id) {
                  setMenuStep('browsing');
                  dispatch({ type: 'show_menu', restaurant_id: booking.restaurant_id });
                }
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  if (booking.status === 'browsing_menu' && menuStep === 'browsing') {
    return (
      <View style={shellStyle}>
        <View style={styles.flowHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to preorder choice"
            hitSlop={8}
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.78 }]}
            onPress={() => dispatch({ type: 'offer_preorder' })}
          >
            <Ionicons name="chevron-back" size={22} color={c.gold} />
          </Pressable>
          <Text style={styles.flowTitle}>Pre-order menu</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nevermind, skip preorder"
            hitSlop={8}
            style={({ pressed }) => [styles.headerTextBtn, pressed && { opacity: 0.72 }]}
            onPress={exitPreorderFlow}
          >
            <Text style={styles.headerText}>Nevermind</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.row}>
            <ActivityIndicator color={c.gold} />
            <Text style={styles.detail}>Loading menu</Text>
          </View>
        ) : (
          <ScrollView style={[styles.menuList, fullScreen && styles.menuListFullScreen]} nestedScrollEnabled>
            {Object.entries(grouped).map(([category, items]) => (
              <View key={category}>
                <Text style={styles.category}>{category}</Text>
                {items.map((item) => {
                  const qty = cartQty.get(item.id) ?? 0;
                  return (
                    <View key={item.id} style={styles.menuItem}>
                      <View style={styles.itemBody}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        {item.description ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
                        <Text style={styles.itemPrice}>{money(item.price)}</Text>
                      </View>
                      <View style={styles.stepper}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.name}`}
                          style={styles.iconBtn}
                          onPress={() => dispatch({ type: 'remove_menu_item', menu_item_id: item.id })}
                        >
                          <Ionicons name="remove" size={18} color={c.textPrimary} />
                        </Pressable>
                        <Text style={styles.qty}>{qty}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${item.name}`}
                          style={styles.iconBtn}
                          onPress={() =>
                            dispatch({
                              type: 'add_menu_item',
                              menu_item_id: item.id,
                              name: item.name,
                              unit_price: item.price,
                            })
                          }
                        >
                          <Ionicons name="add" size={18} color={c.gold} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{money(booking.cart_subtotal)}</Text>
        </View>
        <Button
          title="Review order"
          disabled={booking.cart.length === 0}
          onPress={() => setMenuStep('review')}
        />
        <Button
          title="Nevermind"
          variant="outlined"
          onPress={exitPreorderFlow}
        />
      </View>
    );
  }

  if (booking.status === 'browsing_menu' && menuStep === 'review') {
    const itemCount = booking.cart.reduce((sum, item) => sum + item.qty, 0);
    return (
      <View style={shellStyle}>
        {/* Header — clears the status bar via safe-area inset so the
            title doesn't render under the time/wifi icons. Bottom
            border separates it from the order body. Subtitle gives
            the item count at a glance. */}
        <View style={[styles.flowHeader, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to menu"
            hitSlop={8}
            disabled={prepayBusy}
            style={({ pressed }) => [
              styles.headerIconBtn,
              prepayBusy && { opacity: 0.5 },
              pressed && !prepayBusy && { opacity: 0.78 },
            ]}
            onPress={() => setMenuStep('browsing')}
          >
            <Ionicons name="chevron-back" size={22} color={c.gold} />
          </Pressable>
          <View style={styles.flowHeaderCenter}>
            <Text style={styles.flowTitle}>Review your order</Text>
            <Text style={styles.flowSubtitle}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · {booking.restaurant_name ?? 'Pre-order'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nevermind, skip prepay"
            hitSlop={8}
            disabled={prepayBusy}
            style={({ pressed }) => [
              styles.headerTextBtn,
              prepayBusy && { opacity: 0.5 },
              pressed && !prepayBusy && { opacity: 0.72 },
            ]}
            onPress={exitPreorderFlow}
          >
            <Text style={styles.headerText}>Nevermind</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.reviewBody} showsVerticalScrollIndicator={false}>
          {/* Items card — each row separated by an inset divider for
              clear scannability. Quantity is highlighted gold so the
              user can verify counts at a glance. */}
          <View style={styles.reviewCard}>
            {booking.cart.map((item, idx) => (
              <View
                key={item.menu_item_id}
                style={[styles.reviewLine, idx > 0 && styles.reviewLineDivider]}
              >
                <Text style={styles.reviewLineQty}>{item.qty}×</Text>
                <Text style={styles.reviewLineName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.reviewLinePrice}>{money(item.qty * item.unit_price)}</Text>
              </View>
            ))}
            {/* Subtotal lives inside the card with a tinted background
                so it reads as a single grouped element. */}
            <View style={styles.reviewSubtotalRow}>
              <Text style={styles.reviewSubtotalLabel}>Subtotal</Text>
              <Text style={styles.reviewSubtotalValue}>{money(booking.cart_subtotal)}</Text>
            </View>
          </View>

          <Button title="Edit items" variant="outlined" onPress={() => setMenuStep('browsing')} />

          <Text style={styles.reviewPrompt}>Would you like to prepay now?</Text>
          <Text style={styles.reviewPromptSub}>Optional. You can also pay at the table.</Text>
          {prepayError ? <Text style={styles.error}>{prepayError}</Text> : null}

          <View style={styles.reviewActions}>
            <View style={styles.half}>
              <Button
                title="No, pay at table"
                variant="outlined"
                disabled={prepayBusy}
                onPress={exitPreorderFlow}
              />
            </View>
            <View style={styles.half}>
              <Button
                title={prepayBusy ? 'Opening checkout...' : 'Yes, prepay'}
                loading={prepayBusy}
                onPress={() => {
                  void createCheckout();
                }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (booking.status === 'paid') {
    return (
      <View style={shellStyle}>
        <Text style={styles.title}>Payment complete</Text>
        <Text style={styles.detail}>Your reservation and preorder are set.</Text>
      </View>
    );
  }

  return null;
}
