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
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { AI_ALERTS, AI_OPPORTUNITIES, AI_SUGGESTIONS } from '@/lib/mock/ownerApp';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, useOwnerColors } from '@/lib/theme/ownerTheme';

export default function OwnerAiScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [micActive, setMicActive] = useState(false);
  const ownerColors = useOwnerColors();
  const styles = useStyles();

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
      {/* ── Sticky header ── */}
      <View style={styles.stickyHeader}>
        <SubpageHeader title={t('owner.aiTitle')} subtitle={t('owner.aiSub')} fallbackTab="more" />
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

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
            placeholderTextColor={micActive ? ownerColors.gold : ownerColors.textMuted}
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
              color={ownerColors.gold}
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

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  root: {
    flex: 1,
    backgroundColor: ownerColors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stickyHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: ownerColors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ownerColors.border,
  },

  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.3,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    padding: 16,
    marginBottom: 10,
  },
  alertCard: {
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: ownerColors.textSecondary,
  },
  alertText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: ownerColors.danger,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    backgroundColor: ownerColors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  listeningHint: {
    fontSize: 13,
    fontWeight: '600',
    color: ownerColors.textMuted,
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
    backgroundColor: ownerColors.bgElevated,
    borderRadius: ownerRadii.md,
    paddingHorizontal: 14,
    color: ownerColors.text,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },

  micButton: {
    width: 46,          // explicit fixed width — never collapses
    height: 46,
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,      // prevent row from squashing it
  },
  micButtonActive: {
    backgroundColor: ownerColors.goldSubtle,
    borderColor: ownerColors.gold,
  },

  sendButton: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendButtonDim: {
    backgroundColor: 'rgba(201,162,74,0.35)',
  },
  sendText: {
    fontSize: 15,
    fontWeight: '800',
    color: ownerColors.bg,
  },
  };
});
