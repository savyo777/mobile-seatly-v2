import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  pickEventPlan,
  pickRestaurantsForQuery,
  type AiChatRestaurant,
  type EventPlan,
} from '@/lib/mock/aiChat';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';

type ChatRole = 'user' | 'assistant';
type ChatMessageType = 'text' | 'restaurants' | 'typing' | 'plan';

type ChatMessage = {
  id: string;
  role: ChatRole;
  type: ChatMessageType;
  content?: string;
  data?: AiChatRestaurant[];
  plan?: EventPlan;
};

function getReplyIntro(t: (k: string) => string, query: string): string {
  const q = query.toLowerCase();
  if (q.includes('romantic') || q.includes('date')) return t('aiChat.replyIntroRomantic');
  if (q.includes('cheap') || q.includes('budget') || q.includes('$')) return t('aiChat.replyIntroBudget');
  if (q.includes('near me') || q.includes('nearby') || q.includes('close')) return t('aiChat.replyIntroNearby');
  return t('aiChat.replyIntroDefault');
}

function coverUrlForRestaurantId(id: string): string {
  return mockRestaurants.find((r) => r.id === id)?.coverPhotoUrl ?? '';
}

export type AiChatPanelProps = {
  /** When provided, renders a header with title and close button. */
  onClose?: () => void;
  /** Whether the panel is currently visible (used to reset state when reopened). */
  visible?: boolean;
  /** If true, wraps content in KeyboardAvoidingView (use inside Modals). */
  withKeyboardAvoiding?: boolean;
  /** Hide the large title row. */
  hideTitle?: boolean;
};

export function AiChatPanel({
  onClose,
  visible = true,
  withKeyboardAvoiding = false,
  hideTitle = false,
}: AiChatPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const suggestions = t('aiChat.suggestions', { returnObjects: true }) as string[];

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'welcome', role: 'assistant', type: 'text', content: t('aiChat.welcomeMessage') },
  ]);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingIdRef = useRef<string | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (visible) scrollToBottom();
  }, [messages, scrollToBottom, visible]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const dispatchAssistantReply = useCallback(
    (userText: string) => {
      const delay = Math.round(800 + Math.random() * 400);
      const typingId = `typing-${Date.now()}`;
      typingIdRef.current = typingId;

      setMessages((prev) => [...prev, { id: typingId, role: 'assistant', type: 'typing' }]);

      replyTimerRef.current = setTimeout(() => {
        replyTimerRef.current = null;
        const ts = Date.now();
        const eventPlan = pickEventPlan(userText);

        setMessages((prev) => {
          const withoutTyping = prev.filter((m) => m.id !== typingIdRef.current);
          typingIdRef.current = null;
          if (eventPlan) {
            return [
              ...withoutTyping,
              { id: `a-${ts}-intro`, role: 'assistant', type: 'text', content: t('aiChat.replyIntroEvent') },
              { id: `a-${ts}-plan`, role: 'assistant', type: 'plan', plan: eventPlan },
            ];
          }
          const intro = getReplyIntro(t, userText);
          const data = pickRestaurantsForQuery(userText);
          return [
            ...withoutTyping,
            { id: `a-${ts}-intro`, role: 'assistant', type: 'text', content: intro },
            { id: `a-${ts}-cards`, role: 'assistant', type: 'restaurants', data },
          ];
        });
      }, delay);
    },
    [t],
  );

  const sendText = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      if (replyTimerRef.current) {
        clearTimeout(replyTimerRef.current);
        replyTimerRef.current = null;
      }
      typingIdRef.current = null;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        type: 'text',
        content: trimmed,
      };

      setInput('');
      Keyboard.dismiss();
      setMessages((prev) => [...prev.filter((m) => m.type !== 'typing'), userMsg]);
      dispatchAssistantReply(trimmed);
    },
    [dispatchAssistantReply],
  );

  const send = useCallback(() => {
    sendText(input);
  }, [input, sendText]);

  const onChip = useCallback(
    (text: string) => {
      sendText(text);
    },
    [sendText],
  );

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => {
      if (item.type === 'typing') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
              <Text style={styles.typingText}>{t('aiChat.typing')}</Text>
            </View>
          </View>
        );
      }

      if (item.role === 'user' && item.type === 'text') {
        return (
          <View style={[styles.row, styles.rowUser]}>
            <View style={[styles.bubble, styles.bubbleUser]}>
              <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{item.content}</Text>
            </View>
          </View>
        );
      }

      if (item.role === 'assistant' && item.type === 'text') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.bubbleAi]}>
              <Text style={[styles.bubbleText, styles.bubbleTextAi]}>{item.content}</Text>
            </View>
          </View>
        );
      }

      if (item.role === 'assistant' && item.type === 'restaurants' && item.data?.length) {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={styles.cardsColumn}>
              {item.data.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    onClose?.();
                    router.push(`/booking/${r.id}/step1-date`);
                  }}
                  style={styles.card}
                >
                  <Image source={{ uri: coverUrlForRestaurantId(r.id) }} style={styles.cardImg} />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.cardCuisine} numberOfLines={1}>
                      {r.cuisine}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardStar} accessible={false}>
                        ★
                      </Text>
                      <Text style={styles.cardRating}>{r.rating.toFixed(1)}</Text>
                      <Text style={styles.cardDistance}>· {r.distance}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      }

      if (item.role === 'assistant' && item.type === 'plan' && item.plan) {
        const { restaurant, occasion, partySize, suggestedTime } = item.plan;
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={styles.planCard}>
              <Image source={{ uri: coverUrlForRestaurantId(restaurant.id) }} style={styles.planImg} />
              <View style={styles.planBody}>
                <Text style={styles.planLabel}>{t('aiChat.eventPlanLabel')}</Text>
                <Text style={styles.planName} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text style={styles.planDetail}>
                  {occasion} · {t('aiChat.eventPlanPartyOf', { count: partySize })}
                </Text>
                <Text style={styles.planDetail}>
                  {t('aiChat.eventPlanSuggestedTime', { time: suggestedTime })}
                </Text>
                <Pressable
                  onPress={() => {
                    onClose?.();
                    router.push(`/booking/${restaurant.id}/step1-date`);
                  }}
                  style={styles.planBookBtn}
                >
                  <Text style={styles.planBookLabel}>{t('aiChat.eventPlanBook')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      }

      return null;
    },
    [router, t, onClose],
  );

  const chips = (
    <View style={styles.chipsWrap}>
      {suggestions.slice(0, 3).map((s) => (
        <TouchableOpacity key={s} style={styles.chip} onPress={() => onChip(s)} activeOpacity={0.85}>
          <Text style={styles.chipText} numberOfLines={2}>
            {s}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const body = (
    <View style={styles.flex}>
      <View style={styles.top}>
        {!hideTitle ? (
          <View style={styles.header}>
            <Text style={styles.title}>{t('aiChat.title')}</Text>
            {onClose ? (
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            ) : null}
          </View>
        ) : onClose ? (
          <View style={styles.compactHeader}>
            <View style={styles.compactHeaderInner}>
              <View style={styles.compactAvatar}>
                <Text style={styles.compactAvatarMark} accessibilityElementsHidden>
                  S
                </Text>
              </View>
              <Text style={styles.compactTitle}>{t('aiChat.title')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        ) : null}
        {chips}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToBottom}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t('aiChat.placeholder')}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          onPress={send}
          style={styles.sendBtn}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('aiChat.send')}
        >
          <Ionicons name="arrow-up" size={20} color={colors.bgBase} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (withKeyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
      </KeyboardAvoidingView>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexShrink: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  compactHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarMark: {
    fontSize: 15,
    fontWeight: '800',
    fontStyle: 'italic',
    color: colors.bgBase,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  compactTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    maxWidth: '100%',
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  list: { flex: 1 },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  row: {
    marginBottom: spacing.md,
    width: '100%',
  },
  rowUser: { alignItems: 'flex-end' },
  rowAssistant: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  bubbleUser: {
    backgroundColor: colors.gold,
    ...shadows.goldGlow,
  },
  bubbleAi: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typingBubble: {
    paddingVertical: spacing.sm,
    opacity: 0.85,
  },
  typingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  bubbleText: { ...typography.body },
  bubbleTextUser: { color: colors.bgBase },
  bubbleTextAi: { color: colors.textPrimary },
  cardsColumn: {
    width: '100%',
    maxWidth: '100%',
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  cardImg: {
    width: 54,
    height: 54,
    backgroundColor: colors.bgSurface,
  },
  cardBody: {
    flex: 1,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  cardName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
    maxWidth: 220,
  },
  cardCuisine: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardStar: {
    fontSize: 12,
    lineHeight: 14,
    color: colors.gold,
    fontWeight: '700',
  },
  cardRating: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  cardDistance: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  inputBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.textPrimary,
    ...typography.body,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...shadows.goldGlow,
  },
  planCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  planImg: {
    width: '100%',
    height: 140,
    backgroundColor: colors.bgSurface,
  },
  planBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  planLabel: {
    ...typography.label,
    color: colors.gold,
  },
  planName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  planBookBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.gold,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    ...shadows.goldGlow,
  },
  planBookLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.bgBase,
  },
});
