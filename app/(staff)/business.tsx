import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  STAFF_ROSTER,
  EXPENSE_LINES,
  EXPORT_OPTIONS,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  goldDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.gold },
  label: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },

  sectionPad: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // Staff
  staffCard: {
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  staffDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  staffInitials: { fontSize: 12, fontWeight: '800', color: c.gold },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  staffRole: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  staffShift: { fontSize: 12, color: c.textMuted },
  clockBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Expenses
  expenseCard: {
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.sm,
  },
  expenseDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  expenseInfo: { flex: 1 },
  expenseLabel: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  expensePeriod: { fontSize: 11, color: c.textMuted, marginTop: 1 },
  expenseAmount: { fontSize: 15, fontWeight: '800', color: c.textPrimary },

  // Export
  exportCard: {
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.sm,
  },
  exportDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  exportSub: { fontSize: 11, color: c.textMuted, marginTop: 1 },
}));

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function OwnerBusinessScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const totalExpenses = EXPENSE_LINES.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.titleRow}>
            <View style={styles.goldDot} />
            <Text style={styles.label}>OPERATIONS</Text>
          </View>
          <Text style={styles.title}>Business</Text>
        </View>

        {/* Staff on clock */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>
            Staff · {STAFF_ROSTER.filter((s) => s.onClock).length} on clock
          </Text>
          <View style={styles.staffCard}>
            {STAFF_ROSTER.map((member, i) => (
              <View key={member.id} style={[styles.staffRow, i > 0 && styles.staffDivider]}>
                <View style={styles.staffAvatar}>
                  <Text style={styles.staffInitials}>{initials(member.name)}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffRole}>{member.role}</Text>
                </View>
                <Text style={styles.staffShift}>{member.shift}</Text>
                <View
                  style={[
                    styles.clockBadge,
                    { backgroundColor: member.onClock ? '#22C55E' : c.border },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Expenses */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>
            Expenses · {formatCurrency(totalExpenses, 'cad')} tracked
          </Text>
          <View style={styles.expenseCard}>
            {EXPENSE_LINES.map((line, i) => (
              <View key={line.id} style={[styles.expenseRow, i > 0 && styles.expenseDivider]}>
                <Ionicons name="receipt-outline" size={18} color={c.textMuted} />
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseLabel}>{line.label}</Text>
                  <Text style={styles.expensePeriod}>{line.period}</Text>
                </View>
                <Text style={styles.expenseAmount}>{formatCurrency(line.amount, 'cad')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Export */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Export</Text>
          <View style={styles.exportCard}>
            {EXPORT_OPTIONS.map((opt, i) => (
              <Pressable
                key={opt.id}
                style={({ pressed }) => [styles.exportRow, i > 0 && styles.exportDivider, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="download-outline" size={18} color={c.gold} />
                <View style={styles.exportInfo}>
                  <Text style={styles.exportTitle}>{opt.title}</Text>
                  <Text style={styles.exportSub}>{opt.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
