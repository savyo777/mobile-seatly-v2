import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  type ViewStyle,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, createStyles, spacing, useColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Max height fraction of screen (default 0.9) */
  maxHeightFraction?: number;
  scrollable?: boolean;
  footer?: React.ReactNode;
};

const screenH = Dimensions.get('window').height;

export function ScheduleBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeightFraction = 0.9,
  scrollable = true,
  footer,
}: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const maxH = Math.min(screenH * maxHeightFraction, screenH - insets.top - 16);
  const padBottom = Math.max(insets.bottom, spacing.lg);

  const body = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollInner}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.nonScroll}>{children}</View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { maxHeight: maxH, paddingBottom: padBottom }]}>
          <View style={styles.grab} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {body}
          {footer}
        </View>
      </View>
    </Modal>
  );
}

/** Centered card modal (fade) for confirm dialogs */
type CenterModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  actions: React.ReactNode;
};

export function ScheduleCenterModal({ visible, onClose, title, message, children, actions }: CenterModalProps) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centerRoot}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={styles.centerCard}>
          <Text style={styles.centerTitle}>{title}</Text>
          {message ? <Text style={styles.centerMsg}>{message}</Text> : null}
          {children}
          <View style={styles.centerActions}>{actions}</View>
        </View>
      </View>
    </Modal>
  );
}

export function SheetPrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnGold, pressed && styles.btnPressed, style]}>
      <Text style={[styles.btnGoldText, { color: c.bgBase }]}>{label}</Text>
    </Pressable>
  );
}

export function SheetSecondaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnGray, pressed && styles.btnPressed, style]}>
      <Text style={styles.btnGrayText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  scroll: { flexGrow: 0 },
  scrollInner: { paddingBottom: 8 },
  nonScroll: { paddingBottom: 8 },
  centerRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  centerCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  centerMsg: {
    fontSize: 15,
    color: c.textMuted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  centerActions: {
    gap: 10,
    marginTop: 8,
  },
  btnGold: {
    backgroundColor: c.gold,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.gold,
  },
  btnGoldText: {
    fontSize: 16,
    fontWeight: '800',
  },
  btnGray: {
    backgroundColor: c.bgElevated,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  btnGrayText: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  btnPressed: { opacity: 0.88 },
}));
