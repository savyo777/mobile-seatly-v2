import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingSheet } from '@/components/cenaiva/BookingSheet';
import { RestaurantRail } from '@/components/cenaiva/RestaurantRail';
import { VoiceOrb } from '@/components/cenaiva/VoiceOrb';
import { RestaurantDiscoveryMap } from '@/components/map/RestaurantDiscoveryMap';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { useCenaivaRestaurants } from '@/lib/cenaiva/api/dataHooks';
import { useAssistantStore } from '@/lib/cenaiva/state/assistantStore';
import type { Restaurant } from '@/lib/mock/restaurants';
import { DEFAULT_MAP_CENTER, withDistances } from '@/lib/map/mapFilters';
import { createStyles, borderRadius, spacing, typography, useColors } from '@/lib/theme';

const MANUAL_MENU_STATUSES = new Set([
  'offering_preorder',
  'browsing_menu',
  'reviewing_cart',
  'choosing_tip_timing',
  'choosing_tip_amount',
  'choosing_payment_split',
  'charging',
  'paid',
  'post_booking',
]);

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    backgroundColor: c.bgBase,
  },
  mapHidden: {
    display: 'none',
  },
  header: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: spacing.sm,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: c.bgBase,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  title: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  spokenWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    zIndex: 12,
    alignItems: 'center',
  },
  spokenBubble: {
    maxWidth: '100%',
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  spokenText: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  bottomPanel: {
    backgroundColor: 'rgba(0,0,0,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  statusText: {
    ...typography.body,
    color: c.textSecondary,
    flex: 1,
    fontWeight: '700',
    lineHeight: 20,
  },
  transcriptCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  transcriptLabel: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 0,
  },
  transcriptText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '700',
  },
  diagnosticsToggle: {
    alignSelf: 'flex-start',
    minHeight: 30,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  diagnosticsToggleText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '800',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 102,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    color: c.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.gold,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.28)',
    backgroundColor: 'rgba(201,162,74,0.10)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionText: {
    ...typography.bodySmall,
    flex: 1,
    color: c.textPrimary,
    fontWeight: '700',
  },
  permissionButton: {
    minHeight: 34,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  permissionButtonText: {
    ...typography.bodySmall,
    color: c.bgBase,
    fontWeight: '900',
  },
  debugCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  debugText: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
}));

function filterRestaurants(restaurants: Restaurant[], ids: string[]) {
  if (!ids.length) return restaurants.slice(0, 8);
  const idSet = new Set(ids);
  return restaurants.filter((restaurant) => idSet.has(restaurant.id));
}

function statusCopy(status: string, inManualMenu: boolean, activity: string) {
  if (status === 'listening' && activity === 'requesting_permission') return 'Checking microphone access...';
  if (status === 'listening' && activity === 'transcribing') return 'Reading your request...';
  if (status === 'listening') return 'Listening. Speak naturally.';
  if (status === 'processing') return 'Finding the best answer...';
  if (status === 'speaking') return 'Cenaiva is speaking.';
  if (status === 'error') return 'Voice input is not available. Type your request.';
  if (inManualMenu) return 'Menu questions';
  return 'Ready';
}

function transcriptCopy(transcript: string, activity: string, status: string) {
  if (transcript.trim()) return transcript.trim();
  if (status === 'listening' && activity === 'requesting_permission') return 'Waiting for microphone permission.';
  if (status === 'listening' && activity === 'recording') return 'Listening for your request.';
  if (status === 'listening' && activity === 'transcribing') return 'Converting your voice to text.';
  return '';
}

function permissionCopy(status: string) {
  if (status === 'unavailable') {
    return 'Voice recognition is unavailable in this build. Type your request.';
  }
  return 'Microphone access is off. Enable it to use Hey Cenaiva.';
}

export function CenaivaVoiceShell({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const assistant = useCenaivaAssistant();
  const { state } = useAssistantStore();
  const { restaurants } = useCenaivaRestaurants();
  const [input, setInput] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(state.map.highlighted_restaurant_id);

  const inManualMenu = MANUAL_MENU_STATUSES.has(state.booking.status);
  const visibleRestaurants = useMemo(
    () => filterRestaurants(restaurants, state.map.marker_restaurant_ids),
    [restaurants, state.map.marker_restaurant_ids],
  );
  const mappedRestaurants = useMemo(
    () => withDistances(visibleRestaurants, DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude),
    [visibleRestaurants],
  );
  const highlightedId = state.map.highlighted_restaurant_id ?? selectedId;
  const showMap = !inManualMenu;
  const showVoiceDebug = process.env.NODE_ENV !== 'production';
  const transcriptText = transcriptCopy(
    assistant.voiceTranscript,
    assistant.voiceActivity,
    state.voiceStatus,
  );
  const showTranscriptCard =
    !textMode &&
    (Boolean(transcriptText) ||
      state.voiceStatus === 'listening' ||
      assistant.voiceActivity === 'transcribing');
  const showPermissionRecovery =
    !textMode &&
    (assistant.voicePermissionStatus === 'denied' ||
      assistant.voicePermissionStatus === 'blocked' ||
      assistant.voicePermissionStatus === 'unavailable');

  useEffect(() => {
    assistant.setTextMode(textMode);
  }, [assistant, textMode]);

  useEffect(() => {
    assistant.setSpeechHints(visibleRestaurants.map((restaurant) => restaurant.name));
  }, [assistant, visibleRestaurants]);

  useEffect(() => {
    setSelectedId(state.map.highlighted_restaurant_id);
  }, [state.map.highlighted_restaurant_id]);

  useEffect(() => {
    if (inManualMenu) {
      setTextMode(false);
      assistant.setTextMode(false);
    }
  }, [assistant, inManualMenu]);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    Keyboard.dismiss();
    await assistant.sendTranscript(text);
  }, [assistant, input]);

  const onPressRestaurant = useCallback(
    (restaurant: Restaurant) => {
      setSelectedId(restaurant.id);
      assistant.open(restaurant.id, restaurant.name, { autoListen: false });
      void assistant.sendTranscript(`book ${restaurant.name}`, {
        restaurantId: restaurant.id,
        force: true,
      });
    },
    [assistant],
  );

  const onSelectRestaurant = useCallback(
    (id: string) => {
      setSelectedId(id);
      const restaurant = visibleRestaurants.find((item) => item.id === id);
      if (restaurant) onPressRestaurant(restaurant);
    },
    [onPressRestaurant, visibleRestaurants],
  );

  const close = useCallback(() => {
    assistant.close();
    onClose?.();
  }, [assistant, onClose]);

  const toggleTextMode = useCallback(() => {
    setTextMode((active) => !active);
  }, []);

  const onMicPress = useCallback(() => {
    if (state.voiceStatus === 'listening') {
      assistant.stopListening();
      return;
    }
    void assistant.startListening();
  }, [assistant, state.voiceStatus]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.mapArea, !showMap && styles.mapHidden]}>
        <RestaurantDiscoveryMap
          filteredRestaurants={mappedRestaurants}
          selectedId={highlightedId}
          onSelectRestaurant={onSelectRestaurant}
          onMapPress={() => setSelectedId(null)}
          userLocation={null}
          showUserLocation={false}
          locationReady
          contentBottomInset={180}
        />

        <View style={[styles.header, { top: Math.max(insets.top, spacing.sm) + spacing.xs }]}>
          <View style={styles.brandPill}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>C</Text>
            </View>
            <Text style={styles.title}>Hey Cenaiva</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={textMode ? 'Use voice' : 'Use text'}
              style={styles.iconButton}
              onPress={toggleTextMode}
            >
              <Ionicons name={textMode ? 'mic-outline' : 'chatbubble-outline'} size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" style={styles.iconButton} onPress={close}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {state.lastSpokenText ? (
          <View style={styles.spokenWrap} pointerEvents="none">
            <View style={styles.spokenBubble}>
              <Text style={styles.spokenText} numberOfLines={3}>{state.lastSpokenText}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.bottomPanel,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {!inManualMenu ? (
          <RestaurantRail
            restaurants={mappedRestaurants}
            highlightedId={highlightedId}
            onPressRestaurant={onPressRestaurant}
          />
        ) : null}

        <BookingSheet />

        {showTranscriptCard ? (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>
              {assistant.voiceTranscript ? 'Heard' : 'Voice'}
            </Text>
            <Text style={styles.transcriptText}>{transcriptText || 'Listening for your request.'}</Text>
          </View>
        ) : null}

        {showVoiceDebug ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle voice diagnostics"
              style={({ pressed }) => [styles.diagnosticsToggle, pressed && { opacity: 0.82 }]}
              onPress={() => setShowDiagnostics((value) => !value)}
            >
              <Text style={styles.diagnosticsToggleText}>
                {showDiagnostics ? 'Hide diagnostics' : 'Voice diagnostics'}
              </Text>
            </Pressable>
            {showDiagnostics ? (
              <View style={styles.debugCard}>
                <Text style={styles.debugText}>
                  Wake: {assistant.wakeWordTranscript || '-'}
                </Text>
                {assistant.wakeWordTranscriptLog.length ? (
                  <Text style={styles.debugText}>
                    Wake recent: {assistant.wakeWordTranscriptLog.join(' | ')}
                  </Text>
                ) : null}
                <Text style={styles.debugText}>
                  Mic: {assistant.voiceTranscript || '-'} | activity:{' '}
                  {assistant.voiceActivity}
                </Text>
                <Text style={styles.debugText}>
                  Voice error: {assistant.voiceLastError || assistant.wakeWordLastError || '-'} | no-speech:{' '}
                  {assistant.wakeWordNoSpeechCount}
                </Text>
                <Text style={styles.debugText}>
                  Wake audio: {assistant.wakeWordLastAudioEvent} | volume:{' '}
                  {typeof assistant.wakeWordAudioLevel === 'number' ? assistant.wakeWordAudioLevel.toFixed(1) : '-'}
                </Text>
                <Text style={styles.debugText}>
                  Wake state: {assistant.wakeWordRecognitionState} | available:{' '}
                  {assistant.wakeWordRecognitionAvailable}
                </Text>
                <Text style={styles.debugText}>
                  Wake permission: {assistant.wakeWordPermissionDebug}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {showPermissionRecovery ? (
          <View style={styles.permissionCard}>
            <Ionicons
              name={assistant.voicePermissionStatus === 'unavailable' ? 'alert-circle-outline' : 'mic-off-outline'}
              size={20}
              color={c.gold}
            />
            <Text style={styles.permissionText}>{permissionCopy(assistant.voicePermissionStatus)}</Text>
            {assistant.voicePermissionStatus !== 'unavailable' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  assistant.canAskVoicePermission ? 'Allow microphone' : 'Open microphone settings'
                }
                style={({ pressed }) => [styles.permissionButton, pressed && { opacity: 0.82 }]}
                onPress={async () => {
                  if (assistant.canAskVoicePermission) {
                    const granted = await assistant.requestVoicePermission();
                    if (granted) void assistant.startListening();
                    return;
                  }
                  await assistant.openVoicePermissionSettings();
                }}
              >
                <Text style={styles.permissionButtonText}>
                  {assistant.canAskVoicePermission ? 'Allow microphone' : 'Open Settings'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.controls}>
          {!textMode ? (
            <>
              <VoiceOrb status={state.voiceStatus} onPress={onMicPress} />
              <Text style={styles.statusText}>
                {statusCopy(state.voiceStatus, inManualMenu, assistant.voiceActivity)}
              </Text>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Ask Hey Cenaiva"
                placeholderTextColor={c.textMuted}
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={submit}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                style={styles.sendButton}
                onPress={submit}
              >
                <Ionicons name="arrow-up" size={20} color={c.bgBase} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
