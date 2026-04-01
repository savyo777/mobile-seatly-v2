import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
  Image,
  ListRenderItem,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { useRouter } from 'expo-router';
import { pickRestaurantsForQuery, type AiChatRestaurant } from '@/lib/mock/aiChat';
import { mockRestaurants } from '@/lib/mock/restaurants';

type ChatRole = 'user' | 'assistant';
type ChatMessageType = 'text' | 'restaurants' | 'typing';

type ChatMessage = {
  id: string;
  role: ChatRole;
  type: ChatMessageType;
  content?: string;
  data?: AiChatRestaurant[];
};

function getReplyIntro(t: (k: string) => string, query: string): string {
  const q = query.toLowerCase();
  if (q.includes('romantic') || q.includes('date')) return t('aiChat.replyIntroRomantic');
  if (q.includes('cheap') || q.includes('budget') || q.includes('$')) return t('aiChat.replyIntroBudget');
  if (q.includes('near me') || q.includes('nearby') || q.includes('close')) return t('aiChat.replyIntroNearby');
  return t('aiChat.replyIntroDefault');
}

export default function AiChatScreen() {
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
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
        const intro = getReplyIntro(t, userText);
        const data = pickRestaurantsForQuery(userText);
        const ts = Date.now();

        setMessages((prev) => {
          const withoutTyping = prev.filter((m) => m.id !== typingIdRef.current);
          typingIdRef.current = null;
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
                  onPress={() => router.push(`/booking/${r.id}/step1-date`)}
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
                      <Ionicons name="star" size={12} color={colors.gold} />
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

      return null;
    },
    [router, t],
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

  return (
    <ScreenWrapper scrollable={false} withKeyboardAvoiding padded>
      <View style={styles.flex}>
        <View style={styles.top}>
          <View style={styles.header}>
            <Ionicons name="sparkles" size={22} color={colors.gold} style={styles.headerIcon} />
            <Text style={styles.title}>{t('aiChat.title')}</Text>
          </View>
          {chips}
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          inverted={false}
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
            accessibilityLabel={t('common.confirm')}
          >
            <Ionicons name="send" size={22} color={colors.bgBase} />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

function coverUrlForRestaurantId(id: string): string {
  return mockRestaurants.find((r) => r.id === id)?.coverPhotoUrl ?? '';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  top: {
    flexShrink: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  row: {
    marginBottom: spacing.md,
    width: '100%',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
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
  bubbleText: {
    ...typography.body,
  },
  bubbleTextUser: {
    color: colors.bgBase,
  },
  bubbleTextAi: {
    color: colors.textPrimary,
  },
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
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...shadows.goldGlow,
  },
});
