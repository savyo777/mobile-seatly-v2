import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, createStyles, spacing, useColors } from '@/lib/theme';
import { useOwnerScope } from '@/hooks/useOwnerScope';

export type RestaurantPickerProps = {
  /** Show an "All restaurants" row that aggregates across every owned restaurant. */
  allowAll?: boolean;
  /** Chip sizing: compact for inline headers, full for prominent buttons. */
  size?: 'compact' | 'full';
  /** Optional outer container style. */
  style?: ViewStyle;
};

export function RestaurantPicker({
  allowAll = false,
  size = 'compact',
  style,
}: RestaurantPickerProps) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const {
    restaurants,
    isAll,
    selectedRestaurant,
    setSelectedRestaurantId,
    hasMultiple,
  } = useOwnerScope();

  // Single-restaurant owners have nothing to pick.
  if (!hasMultiple) return null;

  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (id: string | 'all') => {
      Haptics.selectionAsync().catch(() => {});
      setSelectedRestaurantId(id);
      setOpen(false);
    },
    [setSelectedRestaurantId],
  );

  const label = isAll
    ? 'All restaurants'
    : selectedRestaurant?.name ?? 'Pick a restaurant';

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.chip,
          size === 'full' && styles.chipFull,
          pressed && styles.chipPressed,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Restaurant: ${label}. Tap to switch.`}
      >
        <Ionicons
          name="storefront-outline"
          size={size === 'full' ? 16 : 13}
          color={c.gold}
        />
        <Text
          style={[styles.chipText, size === 'full' && styles.chipTextFull]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Ionicons
          name="chevron-down"
          size={size === 'full' ? 16 : 13}
          color={c.textMuted}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <View style={styles.overlayDim} />
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.sheet,
                  { paddingBottom: Math.max(insets.bottom, spacing.xl) },
                ]}
              >
                <View style={styles.sheetGrab} />
                <Text style={styles.sheetTitle}>Switch restaurant</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {allowAll ? (
                    <Pressable
                      onPress={() => handleSelect('all')}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && styles.rowPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="All restaurants"
                    >
                      <View style={styles.rowIcon}>
                        <Ionicons name="grid-outline" size={20} color={c.gold} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle}>All restaurants</Text>
                        <Text style={styles.rowSub}>
                          Aggregate across every location
                        </Text>
                      </View>
                      {isAll ? (
                        <Ionicons name="checkmark" size={20} color={c.gold} />
                      ) : null}
                    </Pressable>
                  ) : null}
                  {restaurants.map((restaurant, index) => {
                    const isSelected =
                      !isAll && selectedRestaurant?.id === restaurant.id;
                    const showDivider = allowAll || index > 0;
                    return (
                      <Pressable
                        key={restaurant.id}
                        onPress={() => handleSelect(restaurant.id)}
                        style={({ pressed }) => [
                          styles.row,
                          showDivider && styles.rowDivider,
                          pressed && styles.rowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={restaurant.name}
                      >
                        <View style={styles.rowIcon}>
                          <Ionicons
                            name="storefront-outline"
                            size={20}
                            color={c.gold}
                          />
                        </View>
                        <View style={styles.rowText}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {restaurant.name}
                          </Text>
                          {restaurant.address ? (
                            <Text style={styles.rowSub} numberOfLines={1}>
                              {restaurant.address}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark" size={20} color={c.gold} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Pressable
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const useStyles = createStyles((c) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignSelf: 'flex-start',
    maxWidth: 260,
  },
  chipFull: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    maxWidth: 360,
  },
  chipPressed: { opacity: 0.85 },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  chipTextFull: {
    fontSize: 14,
  },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    maxHeight: '75%',
  },
  sheetGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 68,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rowPressed: { opacity: 0.75 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexShrink: 0,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textMuted,
  },
}));
