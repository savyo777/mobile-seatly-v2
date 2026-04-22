import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AiChatPanel } from '@/components/ai/AiChatPanel';
import { useColors, createStyles, borderRadius, spacing } from '@/lib/theme';

const FAB_SIZE = 58;

const useStyles = createStyles((c) => ({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 30,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgBase,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    height: '85%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
}));

type Props = {
  bottomOffset?: number;
  style?: ViewStyle;
};

export function AiChatFab({ bottomOffset = 100, style }: Props) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open AI assistant"
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottomOffset, right: spacing.lg },
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          style,
        ]}
        hitSlop={8}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color={c.bgBase} accessibilityElementsHidden />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + spacing.xl }]}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetBody}>
              <AiChatPanel
                onClose={() => setOpen(false)}
                visible={open}
                withKeyboardAvoiding
                hideTitle
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
