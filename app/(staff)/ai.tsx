import React, { useCallback, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { GlassCard } from '@/components/owner/GlassCard';
import { AI_ALERTS, AI_OPPORTUNITIES, AI_SUGGESTIONS } from '@/lib/mock/ownerApp';
import { ownerColors } from '@/lib/theme/ownerTheme';

const BG = '#080B16';
const CARD_BG = '#0F1320';
const INPUT_BG = '#141926';
const GOLD = '#D4AF37';
const BORDER = 'rgba(255,255,255,0.07)';

export default function OwnerAiScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [micActive, setMicActive] = useState(false);

  const handleMicPress = useCallback(() => {
    setMicActive((prev) => {
      if (!prev) {
        setInput('');
        setTimeout(() => setMicActive(false), 3000); // mock: stop after 3s
      }
      return !prev;
    });
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    Alert.alert('AI Assistant', `Command received: "${text}"`);
    setInput('');
  }, [input]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.title}>{t('owner.aiTitle')}</Text>
          <Text style={styles.sub}>{t('owner.aiSub')}</Text>
        </Animated.View>

        <Text style={styles.sectionLabel}>{t('owner.aiOpportunities')}</Text>
        {AI_OPPORTUNITIES.map((line, i) => (
          <GlassCard key={i} style={styles.card}>
            <Text style={styles.cardText}>{line}</Text>
          </GlassCard>
        ))}

        <Text style={styles.sectionLabel}>{t('owner.aiAlerts')}</Text>
        {AI_ALERTS.map((line, i) => (
          <GlassCard key={i} style={[styles.card, styles.alertCard]}>
            <Text style={styles.alertText}>{line}</Text>
          </GlassCard>
        ))}

        <Text style={styles.sectionLabel}>{t('owner.aiSuggestions')}</Text>
        {AI_SUGGESTIONS.map((line, i) => (
          <GlassCard key={i} style={styles.card}>
            <Text style={styles.cardText}>{line}</Text>
          </GlassCard>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Pinned bottom bar — NEVER inside ScrollView ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        {micActive ? (
          <Text style={styles.listeningHint}>Listening…</Text>
        ) : null}

        <View style={styles.inputRow}>
          {/* 1. Text input */}
          <TextInput
            style={styles.textInput}
            placeholder={micActive ? 'Listening…' : 'Ask me anything about dining…'}
            placeholderTextColor={micActive ? GOLD : '#6B7280'}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!micActive}
          />

          {/* 2. Microphone button */}
          <TouchableOpacity
            style={[styles.micButton, micActive && styles.micButtonActive]}
            onPress={handleMicPress}
            activeOpacity={0.75}
          >
            <Ionicons
              name={micActive ? 'mic' : 'mic-outline'}
              size={20}
              color={GOLD}
            />
          </TouchableOpacity>

          {/* 3. Send button */}
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDim]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  sub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    padding: 16,
    marginBottom: 10,
    backgroundColor: CARD_BG,
  },
  alertCard: {
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  alertText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: ownerColors.danger,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  listeningHint: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },

  /* ── Three-element row ── */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  textInput: {
    flex: 1,           // takes remaining space
    minWidth: 0,       // allows flex shrink past content
    height: 46,
    backgroundColor: INPUT_BG,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },

  micButton: {
    width: 46,          // explicit fixed width — never collapses
    height: 46,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: `rgba(212,175,55,0.40)`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,      // prevent row from squashing it
  },
  micButtonActive: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: GOLD,
  },

  sendButton: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendButtonDim: {
    backgroundColor: 'rgba(212,175,55,0.30)',
  },
  sendText: {
    fontSize: 15,
    fontWeight: '800',
    color: BG,
  },
});
