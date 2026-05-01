import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantMapOverlay } from '@/components/cenaiva/AssistantMapOverlay';
import { BookingSheet } from '@/components/cenaiva/BookingSheet';
import { RestaurantRail } from '@/components/cenaiva/RestaurantRail';
import { VoiceOrb } from '@/components/cenaiva/VoiceOrb';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { useCenaivaRestaurants } from '@/lib/cenaiva/api/dataHooks';
import { useAssistantStore } from '@/lib/cenaiva/state/assistantStore';
import type { Restaurant } from '@/lib/mock/restaurants';
import { DEFAULT_MAP_CENTER, withDistances } from '@/lib/map/mapFilters';
import { createStyles, borderRadius, spacing, typography, useColors } from '@/lib/theme';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
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
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  bubbleRow: {
    width: '100%',
  },
  bubbleRowUser: {
    alignItems: 'flex-end',
  },
  bubbleRowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: {
    backgroundColor: c.gold,
  },
  bubbleAssistant: {
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
  },
  bubbleText: {
    ...typography.body,
  },
  bubbleTextUser: {
    color: c.bgBase,
    fontWeight: '700',
  },
  bubbleTextAssistant: {
    color: c.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 108,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    color: c.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    ...typography.body,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.gold,
  },
  liveTranscript: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    minHeight: 20,
  },
}));

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

function filterRestaurants(restaurants: Restaurant[], ids: string[]) {
  if (!ids.length) return restaurants.slice(0, 6);
  const idSet = new Set(ids);
  return restaurants.filter((restaurant) => idSet.has(restaurant.id));
}

export function CenaivaVoiceShell({ onClose }: { onClose?: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const assistant = useCenaivaAssistant();
  const { state } = useAssistantStore();
  const { restaurants } = useCenaivaRestaurants();
  const listRef = useRef<FlatList<Message>>(null);
  const lastAssistantTextRef = useRef('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: "Hey, I'm Cenaiva." },
  ]);
  const [input, setInput] = useState('');
  const [textMode, setTextMode] = useState(true);
  const inManualMenu = MANUAL_MENU_STATUSES.has(state.booking.status);

  const visibleRestaurants = useMemo(
    () => filterRestaurants(restaurants, state.map.marker_restaurant_ids),
    [restaurants, state.map.marker_restaurant_ids],
  );
  const railRestaurants = useMemo(
    () => withDistances(visibleRestaurants, DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude),
    [visibleRestaurants],
  );

  useEffect(() => {
    assistant.setTextMode(textMode);
  }, [assistant, textMode]);

  useEffect(() => {
    assistant.setSpeechHints(visibleRestaurants.map((restaurant) => restaurant.name));
  }, [assistant, visibleRestaurants]);

  useEffect(() => {
    if (inManualMenu) {
      setTextMode(true);
      assistant.setTextMode(true);
    }
  }, [assistant, inManualMenu]);

  useEffect(() => {
    const text = state.lastSpokenText.trim();
    if (!text || text === lastAssistantTextRef.current) return;
    lastAssistantTextRef.current = text;
    setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text }]);
  }, [state.lastSpokenText]);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages, state.booking.status, state.map.marker_restaurant_ids]);

  const submit = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setInput('');
      Keyboard.dismiss();
      setTextMode(true);
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
      await assistant.sendTranscript(text);
    },
    [assistant],
  );

  const onPressRestaurant = useCallback(
    (restaurant: Restaurant) => {
      assistant.open(restaurant.id, restaurant.name, { autoListen: false });
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: `Book ${restaurant.name}` }]);
      void assistant.sendTranscript(`book ${restaurant.name}`, {
        restaurantId: restaurant.id,
        force: true,
      });
    },
    [assistant],
  );

  const close = useCallback(() => {
    assistant.close();
    onClose?.();
  }, [assistant, onClose]);

  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => {
      const user = item.role === 'user';
      return (
        <View style={[styles.bubbleRow, user ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
          <View style={[styles.bubble, user ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={[styles.bubbleText, user ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
              {item.text}
            </Text>
          </View>
        </View>
      );
    },
    [styles],
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
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
            onPress={() => setTextMode((active) => !active)}
          >
            <Ionicons name={textMode ? 'mic-outline' : 'chatbubble-outline'} size={19} color={c.textPrimary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={styles.iconButton} onPress={close}>
            <Ionicons name="close" size={21} color={c.textPrimary} />
          </Pressable>
        </View>
      </View>

      {!textMode ? (
        <View style={styles.center}>
          <VoiceOrb status={state.voiceStatus} onPress={() => assistant.startListening()} />
          <Text style={styles.liveTranscript} numberOfLines={1}>
            {state.voiceStatus === 'error' ? state.lastSpokenText : ''}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <>
            {state.map.visible && !inManualMenu ? (
              <AssistantMapOverlay
                restaurants={visibleRestaurants}
                highlightedId={state.map.highlighted_restaurant_id}
                onSelectRestaurant={onPressRestaurant}
              />
            ) : null}
            {!inManualMenu ? (
              <RestaurantRail
                restaurants={railRestaurants}
                highlightedId={state.map.highlighted_restaurant_id}
                onPressRestaurant={onPressRestaurant}
              />
            ) : null}
            <BookingSheet />
          </>
        }
      />

      {textMode ? (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask Hey Cenaiva"
            placeholderTextColor={c.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => submit(input)}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" style={styles.sendButton} onPress={() => submit(input)}>
            <Ionicons name="arrow-up" size={20} color={c.bgBase} />
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
