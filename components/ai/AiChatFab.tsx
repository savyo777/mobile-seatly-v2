import React from 'react';
import {
  Modal,
  Pressable,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CenaivaVoiceShell } from '@/components/cenaiva/CenaivaVoiceShell';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { useAssistantStore } from '@/lib/cenaiva/state/assistantStore';
import { useColors, createStyles, spacing } from '@/lib/theme';

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
  fullScreen: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
}));

type Props = {
  bottomOffset?: number;
  style?: ViewStyle;
};

export function AiChatFab({ bottomOffset = 100, style }: Props) {
  const c = useColors();
  const styles = useStyles();
  const assistant = useCenaivaAssistant();
  const { state } = useAssistantStore();
  const open = state.isOpen;

  return (
    <>
      <Pressable
        onPress={() => assistant.open()}
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
        animationType="fade"
        transparent={false}
        onRequestClose={assistant.close}
        statusBarTranslucent
        presentationStyle="fullScreen"
      >
        <View style={styles.fullScreen}>
          <CenaivaVoiceShell onClose={assistant.close} />
        </View>
      </Modal>
    </>
  );
}
