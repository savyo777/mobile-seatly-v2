import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
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
        <Text style={styles.detail}>{booking.restaurant_name ?? 'Restaurant'} - {formatDate(booking.date)} - {booking.time ?? booking.slot_iso}</Text>
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
          <Text style={styles.detail}>{booking.time ?? booking.slot_iso ?? 'Time pending'}</Text>
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
        <Text style={styles.title}>You're booked</Text>
        {booking.confirmation_code ? <Text style={styles.code}>{booking.confirmation_code}</Text> : null}
        <Text style={styles.detail}>{booking.restaurant_name ?? 'Restaurant'} - {formatDate(booking.date)} - {booking.time ?? booking.slot_iso}</Text>
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
        <Text style={styles.title}>Pre-order menu</Text>
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
      </View>
    );
  }

  if (booking.status === 'browsing_menu' && menuStep === 'review') {
    return (
      <View style={shellStyle}>
        <Text style={styles.title}>Review your order</Text>
        {booking.cart.map((item) => (
          <View key={item.menu_item_id} style={styles.line}>
            <Text style={styles.lineName}>{item.qty}x {item.name}</Text>
            <Text style={styles.linePrice}>{money(item.qty * item.unit_price)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{money(booking.cart_subtotal)}</Text>
        </View>
        <Button title="Edit items" variant="outlined" onPress={() => setMenuStep('browsing')} />
        <Text style={styles.prompt}>Would you like to prepay now?</Text>
        <Text style={styles.muted}>Optional. You can also pay at the table.</Text>
        {prepayError ? <Text style={styles.error}>{prepayError}</Text> : null}
        <View style={styles.actions}>
          <View style={styles.half}>
            <Button
              title="No, pay at table"
              variant="outlined"
              disabled={prepayBusy}
              onPress={assistant.close}
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
