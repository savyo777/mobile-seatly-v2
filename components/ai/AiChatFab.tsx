import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
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
  wakeDebug: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 29,
    maxHeight: 180,
  },
  wakeDebugCompact: {
    right: FAB_SIZE + spacing['2xl'],
    left: spacing.lg,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wakeDebugTitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  wakeDebugText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    flex: 1,
  },
  wakeDebugMuted: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  wakeDebugButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    borderRadius: 999,
    backgroundColor: c.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  wakeDebugButtonText: {
    color: c.bgBase,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
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
  const [showWakeDetails, setShowWakeDetails] = useState(false);
  const open = state.isOpen;
  const showWakeDebug = process.env.NODE_ENV !== 'production' && !open;
  const wakeTranscript = showWakeDetails && assistant.wakeWordTranscript
    ? assistant.wakeWordTranscript
    : assistant.wakeWordLastError === 'no-speech'
      ? 'No transcript captured yet. The wake recognizer is timing out with no-speech.'
      : 'Listening for wake word...';
  const volume =
    typeof assistant.wakeWordAudioLevel === 'number'
      ? assistant.wakeWordAudioLevel.toFixed(1)
      : '-';

  return (
    <>
      {showWakeDebug ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showWakeDetails ? 'Hide wake diagnostics' : 'Show wake diagnostics'}
          style={[
            styles.wakeDebug,
            !showWakeDetails && styles.wakeDebugCompact,
            { bottom: bottomOffset + FAB_SIZE + spacing.sm },
            style,
          ]}
          onPress={() => setShowWakeDetails((value) => !value)}
        >
          <Text style={styles.wakeDebugTitle}>
            {showWakeDetails ? 'Wake transcript temporary debug' : 'Wake'}
          </Text>
          <Text style={styles.wakeDebugText} numberOfLines={showWakeDetails ? 4 : 1}>
            {wakeTranscript}
          </Text>
          {showWakeDetails ? (
            <>
              {assistant.wakeWordTranscriptLog.length ? (
                <Text style={styles.wakeDebugMuted} numberOfLines={2}>
                  Recent: {assistant.wakeWordTranscriptLog.join(' | ')}
                </Text>
              ) : null}
              <Text style={styles.wakeDebugMuted}>
                Last status: {assistant.wakeWordLastError || '-'} | no-speech count: {assistant.wakeWordNoSpeechCount}
              </Text>
              <Text style={styles.wakeDebugMuted}>
                Audio: {assistant.wakeWordLastAudioEvent} | volume: {volume}
              </Text>
              <Text style={styles.wakeDebugMuted}>
                State: {assistant.wakeWordRecognitionState} | available: {assistant.wakeWordRecognitionAvailable}
              </Text>
              <Text style={styles.wakeDebugMuted}>
                Permission: {assistant.wakeWordPermissionDebug}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Test wake listener"
                style={({ pressed }) => [styles.wakeDebugButton, pressed && { opacity: 0.82 }]}
                onPress={(event) => {
                  event.stopPropagation();
                  void assistant.testWakeListener();
                }}
              >
                <Text style={styles.wakeDebugButtonText}>Test wake listener</Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      ) : null}

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
