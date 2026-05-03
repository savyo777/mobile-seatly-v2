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
import { filterCenaivaRestaurants } from '@/lib/cenaiva/filterRestaurants';
import { useAssistantStore } from '@/lib/cenaiva/state/assistantStore';
import type { Restaurant } from '@/lib/mock/restaurants';
import { DEFAULT_MAP_CENTER, withDistances } from '@/lib/map/mapFilters';
import { createStyles, borderRadius, spacing, typography } from '@/lib/theme';

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

const CONFIRMATION_OR_POST_BOOKING_STATUSES = new Set([
  'confirmed',
  'post_booking',
  'offering_preorder',
  'browsing_menu',
  'reviewing_cart',
  'choosing_tip_timing',
  'choosing_tip_amount',
  'choosing_payment_split',
  'charging',
  'paid',
]);

const useStyles = createStyles(() => ({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#0A0A0A',
  },
  mapHidden: {
    display: 'none',
  },
  closeButton: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 50,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  spokenWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.lg,
    zIndex: 12,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  spokenBubble: {
    width: '85%',
    maxWidth: 384,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  spokenText: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomPanel: {
    marginTop: 'auto',
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bottomPanelManual: {
    flex: 1,
  },
  railEmpty: {
    color: 'rgba(255,255,255,0.20)',
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bookingWrap: {
    paddingHorizontal: spacing.lg,
  },
  bookingWrapManual: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 0,
  },
  permissionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.28)',
    backgroundColor: 'rgba(200,169,81,0.10)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionText: {
    ...typography.bodySmall,
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  permissionButton: {
    minHeight: 34,
    borderRadius: borderRadius.full,
    backgroundColor: '#C8A951',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  permissionButtonText: {
    ...typography.bodySmall,
    color: '#000000',
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statusText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.50)',
    flex: 1,
    fontWeight: '500',
  },
  textInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 96,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    ...typography.body,
  },
  sendButton: {
    minHeight: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8A951',
    paddingHorizontal: spacing.lg,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    ...typography.body,
    color: '#000000',
    fontWeight: '600',
  },
  keyboardButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardButtonActive: {
    backgroundColor: 'rgba(200,169,81,0.20)',
    borderColor: '#C8A951',
  },
}));

function statusCopy(status: string, inManualMenu: boolean, spokenText: string) {
  if (status === 'listening') return 'Listening...';
  if (status === 'processing') return 'Thinking...';
  if (status === 'speaking') return spokenText || 'Cenaiva is speaking.';
  if (status === 'error') return 'Voice input is not available. Type your request.';
  if (inManualMenu) return 'Tap the mic to ask about ingredients or allergens';
  return 'Tap the mic or say "Hey Cenaiva"';
}

function permissionCopy(status: string) {
  if (status === 'unavailable') {
    return 'Voice recognition is unavailable in this build. Type your request.';
  }
  return 'Microphone access is off. Enable it to use Hey Cenaiva.';
}

export function CenaivaVoiceShell({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const assistant = useCenaivaAssistant();
  const { state, dispatch } = useAssistantStore();
  const { restaurants } = useCenaivaRestaurants();
  const [input, setInput] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(state.map.highlighted_restaurant_id);

  const inManualMenu = MANUAL_MENU_STATUSES.has(state.booking.status);
  const showConfirmationOrPostBooking = CONFIRMATION_OR_POST_BOOKING_STATUSES.has(state.booking.status);
  const hasSelectedRestaurant = Boolean(state.booking.restaurant_id);
  const visibleRestaurants = useMemo(
    () => filterCenaivaRestaurants(restaurants, state.map.marker_restaurant_ids, state.filters),
    [restaurants, state.filters, state.map.marker_restaurant_ids],
  );
  const mappedRestaurants = useMemo(
    () => withDistances(visibleRestaurants, DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude),
    [visibleRestaurants],
  );
  const highlightedId = state.map.highlighted_restaurant_id ?? state.booking.restaurant_id ?? selectedId;
  const showMap = !inManualMenu;
  const showRail = !showConfirmationOrPostBooking && !inManualMenu && !hasSelectedRestaurant;
  const showPermissionRecovery =
    !textMode &&
    (assistant.voicePermissionStatus === 'denied' ||
      assistant.voicePermissionStatus === 'blocked' ||
      assistant.voicePermissionStatus === 'unavailable');

  useEffect(() => {
    assistant.setSpeechHints(visibleRestaurants.map((restaurant) => restaurant.name));
  }, [assistant, visibleRestaurants]);

  useEffect(() => {
    setSelectedId(state.map.highlighted_restaurant_id);
  }, [state.map.highlighted_restaurant_id]);

  useEffect(() => {
    if (inManualMenu && state.voiceStatus === 'listening') {
      assistant.stopListening();
    }
    if (inManualMenu && textMode) {
      setTextMode(false);
      assistant.setTextMode(false);
    }
  }, [assistant, inManualMenu, state.voiceStatus, textMode]);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || state.voiceStatus === 'processing') return;
    setInput('');
    Keyboard.dismiss();
    await assistant.sendTranscript(text);
  }, [assistant, input, state.voiceStatus]);

  const onPressRestaurant = useCallback(
    (restaurant: Restaurant) => {
      if (state.voiceStatus === 'processing') return;
      setSelectedId(restaurant.id);
      dispatch({
        type: 'PRESELECT_RESTAURANT',
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
      });
      dispatch({ type: 'highlight_restaurant', restaurant_id: restaurant.id });
      void assistant.sendTranscript(`I want to book at ${restaurant.name}`, {
        restaurantId: restaurant.id,
      });
    },
    [assistant, dispatch, state.voiceStatus],
  );

  const onSelectRestaurant = useCallback(
    (id: string) => {
      setSelectedId(id);
      dispatch({ type: 'highlight_restaurant', restaurant_id: id });
    },
    [dispatch],
  );

  const close = useCallback(() => {
    assistant.close();
    onClose?.();
  }, [assistant, onClose]);

  const toggleTextMode = useCallback(() => {
    setTextMode((active) => {
      const entering = !active;
      if (entering) {
        assistant.setTextMode(true);
      } else {
        setInput('');
        assistant.setTextMode(false);
      }
      return entering;
    });
  }, [assistant]);

  const onMicPress = useCallback(() => {
    if (state.voiceStatus === 'processing') return;
    if (state.voiceStatus === 'listening') {
      assistant.stopListening();
      return;
    }
    if (state.voiceStatus === 'speaking') {
      assistant.stopSpeaking();
      return;
    }
    void assistant.startListening();
  }, [assistant, state.voiceStatus]);

  const sendDisabled = !input.trim() || state.voiceStatus === 'processing';

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
          onMapPress={() => undefined}
          userLocation={null}
          showUserLocation={false}
          locationReady
          markerVariant="cenaiva"
        />

        {!showConfirmationOrPostBooking ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close assistant"
            style={({ pressed }) => [
              styles.closeButton,
              { top: Math.max(insets.top, spacing.lg) },
              pressed && { backgroundColor: 'rgba(255,255,255,0.20)' },
            ]}
            onPress={close}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        ) : null}

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
          inManualMenu && styles.bottomPanelManual,
        ]}
      >
        {showRail ? (
          mappedRestaurants.length ? (
            <RestaurantRail
              restaurants={mappedRestaurants}
              highlightedId={state.booking.restaurant_id}
              onPressRestaurant={onPressRestaurant}
            />
          ) : (
            <Text style={styles.railEmpty}>Speak to discover restaurants near you</Text>
          )
        ) : null}

        <View style={[styles.bookingWrap, inManualMenu && styles.bookingWrapManual]}>
          <BookingSheet fullScreen={inManualMenu} />
        </View>

        {showPermissionRecovery ? (
          <View style={styles.permissionCard}>
            <Ionicons
              name={assistant.voicePermissionStatus === 'unavailable' ? 'alert-circle-outline' : 'mic-off-outline'}
              size={20}
              color="#C8A951"
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

        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <VoiceOrb status={state.voiceStatus} onPress={onMicPress} />

          {textMode ? (
            <View style={styles.textInputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.30)"
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={submit}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                disabled={sendDisabled}
                style={({ pressed }) => [
                  styles.sendButton,
                  sendDisabled && styles.sendButtonDisabled,
                  pressed && !sendDisabled && { opacity: 0.86 },
                ]}
                onPress={submit}
              >
                <Text style={styles.sendButtonText}>
                  {state.voiceStatus === 'processing' ? '...' : 'Send'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.statusText} numberOfLines={3}>
              {statusCopy(state.voiceStatus, inManualMenu, state.lastSpokenText)}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle text input"
            style={({ pressed }) => [
              styles.keyboardButton,
              textMode && styles.keyboardButtonActive,
              pressed && { opacity: 0.82 },
            ]}
            onPress={toggleTextMode}
          >
            <Ionicons
              name="keypad-outline"
              size={18}
              color={textMode ? '#C8A951' : 'rgba(255,255,255,0.40)'}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
