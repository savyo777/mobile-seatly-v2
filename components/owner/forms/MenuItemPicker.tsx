import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { fetchRestaurantMenu, type MenuItem } from '@/lib/menu/getRestaurantMenu';

const useStyles = createStyles((c) => ({
  field: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  fieldValue: { fontSize: 16, fontWeight: '600', color: c.textPrimary, paddingVertical: 4 },
  fieldEmpty: { color: c.textMuted },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: c.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rowPressed: { backgroundColor: c.bgElevated },
  rowTextCol: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  rowMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  checkBox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: c.gold, borderColor: c.gold },

  loadingWrap: { padding: spacing['2xl'], alignItems: 'center', gap: spacing.sm },
  emptyText: { padding: spacing.lg, textAlign: 'center', color: c.textMuted },

  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  doneText: { fontSize: 14, fontWeight: '800', color: c.bgBase },
}));

interface CommonProps {
  label: string;
  restaurantId: string;
  placeholder?: string;
}

export function MenuItemSinglePicker({
  label, restaurantId, value, onChange, placeholder = 'Pick an item',
}: CommonProps & {
  value: string | null;
  onChange: (item: { id: string; name: string } | null) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !restaurantId) return;
    let active = true;
    setLoading(true);
    fetchRestaurantMenu(restaurantId)
      .then(({ items: rows }) => {
        if (!active) return;
        setItems(rows.filter((r) => r.is_active));
      })
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, restaurantId]);

  const selectedName = useMemo(
    () => items.find((i) => i.id === value)?.name ?? null,
    [items, value],
  );

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldEmpty]}>
          {selectedName || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={16} color={c.textPrimary} />
              </Pressable>
            </View>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={c.gold} />
              </View>
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>No menu items.</Text>
            ) : (
              <ScrollView>
                <Pressable
                  onPress={() => { onChange(null); setOpen(false); }}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowTextCol}>
                    <Text style={styles.rowName}>None</Text>
                  </View>
                </Pressable>
                {items.map((item) => {
                  const isSelected = item.id === value;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => { onChange({ id: item.id, name: item.name }); setOpen(false); }}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={styles.rowTextCol}>
                        <Text style={styles.rowName}>{item.name}</Text>
                        {item.category ? <Text style={styles.rowMeta}>{item.category}</Text> : null}
                      </View>
                      <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={c.bgBase} />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function MenuItemMultiPicker({
  label, restaurantId, value, onChange, placeholder = 'Pick items',
}: CommonProps & {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);

  useEffect(() => {
    if (!open || !restaurantId) return;
    let active = true;
    setLoading(true);
    setDraft(value);
    fetchRestaurantMenu(restaurantId)
      .then(({ items: rows }) => {
        if (!active) return;
        setItems(rows.filter((r) => r.is_active));
      })
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, restaurantId]);

  const summary = value.length === 0
    ? null
    : value.length === 1
      ? items.find((i) => i.id === value[0])?.name ?? `${value.length} item`
      : `${value.length} items selected`;

  const toggle = (id: string) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !summary && styles.fieldEmpty]}>
          {summary || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={16} color={c.textPrimary} />
              </Pressable>
            </View>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={c.gold} />
              </View>
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>No menu items.</Text>
            ) : (
              <ScrollView>
                {items.map((item) => {
                  const isSelected = draft.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggle(item.id)}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={styles.rowTextCol}>
                        <Text style={styles.rowName}>{item.name}</Text>
                        {item.category ? <Text style={styles.rowMeta}>{item.category}</Text> : null}
                      </View>
                      <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={c.bgBase} />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.footer}>
              <Pressable
                onPress={() => { onChange(draft); setOpen(false); }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function MenuSinglePicker({
  label, restaurantId, value, onChange, placeholder = 'Pick a menu',
}: CommonProps & {
  value: string | null;
  onChange: (menuId: string | null) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [menus, setMenus] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !restaurantId) return;
    let active = true;
    setLoading(true);
    import('@/lib/supabase/client').then(({ getSupabase }) => {
      const supabase = getSupabase();
      if (!supabase) {
        active && setLoading(false);
        return;
      }
      supabase
        .from('menus')
        .select('id,name')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (!active) return;
          setMenus((data ?? []).map((m) => ({ id: String((m as { id: string }).id), name: String((m as { name: string }).name) })));
          setLoading(false);
        });
    }).catch(() => { active && setLoading(false); });
    return () => { active = false; };
  }, [open, restaurantId]);

  const selected = menus.find((m) => m.id === value)?.name ?? null;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldEmpty]}>
          {selected || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={16} color={c.textPrimary} />
              </Pressable>
            </View>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={c.gold} />
              </View>
            ) : menus.length === 0 ? (
              <Text style={styles.emptyText}>No menus saved yet.</Text>
            ) : (
              <ScrollView>
                <Pressable
                  onPress={() => { onChange(null); setOpen(false); }}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowTextCol}>
                    <Text style={styles.rowName}>None</Text>
                  </View>
                </Pressable>
                {menus.map((menu) => {
                  const isSelected = menu.id === value;
                  return (
                    <Pressable
                      key={menu.id}
                      onPress={() => { onChange(menu.id); setOpen(false); }}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={styles.rowTextCol}>
                        <Text style={styles.rowName}>{menu.name}</Text>
                      </View>
                      <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={c.bgBase} />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
