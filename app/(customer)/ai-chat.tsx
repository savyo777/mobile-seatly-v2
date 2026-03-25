import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ListRenderItem,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';

type Role = 'user' | 'ai';

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
}

export default function AiChatScreen() {
  const { t } = useTranslation();
  const suggestions = t('aiChat.suggestions', { returnObjects: true }) as string[];
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', text: t('aiChat.welcomeMessage') },
  ]);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    setInput('');
    Keyboard.dismiss();
    setMessages((prev) => [...prev, userMsg]);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'ai', text: t('aiChat.mockReply') },
      ]);
    }, 1000);
  }, [input, t]);

  const onChip = useCallback(
    (text: string) => {
      setInput(text);
    },
    [],
  );

  const renderItem: ListRenderItem<ChatMessage> = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>{item.text}</Text>
        </View>
      </View>
    );
  };

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
      <View style={styles.header}>
        <Ionicons name="sparkles" size={22} color={colors.gold} style={styles.headerIcon} />
        <Text style={styles.title}>{t('aiChat.title')}</Text>
      </View>
      {chips}
      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  row: {
    marginBottom: spacing.md,
    width: '100%',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAi: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
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
  bubbleText: {
    ...typography.body,
  },
  bubbleTextUser: {
    color: colors.bgBase,
  },
  bubbleTextAi: {
    color: colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
    ...shadows.goldGlow,
  },
});
