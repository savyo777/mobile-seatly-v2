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

const BG = '#111111';
const BORDER = 'rgba(255,255,255,0.08)';
const GOLD = '#C6A85B';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#A1A1AA';

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
  const insets = useSafeAreaInsets();
  const maxH = Math.min(screenH * maxHeightFraction, screenH - insets.top - 16);
  const padBottom = Math.max(insets.bottom, 16);

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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnGold, pressed && styles.btnPressed, style]}>
      <Text style={styles.btnGoldText}>{label}</Text>
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnGray, pressed && styles.btnPressed, style]}>
      <Text style={styles.btnGrayText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_MUTED,
    marginBottom: 12,
    lineHeight: 20,
  },
  scroll: { flexGrow: 0 },
  scrollInner: { paddingBottom: 8 },
  nonScroll: { paddingBottom: 8 },
  centerRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerCard: {
    backgroundColor: BG,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 8,
  },
  centerMsg: {
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
    marginBottom: 16,
  },
  centerActions: {
    gap: 10,
    marginTop: 8,
  },
  btnGold: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnGoldText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  btnGray: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  btnGrayText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
  },
  btnPressed: { opacity: 0.88 },
});
