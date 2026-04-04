import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { Card } from '@/components/ui';
import { mockFaqs, mockHelpTopics } from '@/lib/mock/profileScreens';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HelpScreen() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(mockFaqs[0]?.id ?? null);

  const filteredFaqs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mockFaqs;
    return mockFaqs.filter((f) => f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s));
  }, [q]);

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  return (
    <ProfileStackScreen title={t('profile.help')}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search help topics"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <ProfileSectionTitle>Popular topics</ProfileSectionTitle>
      <View style={styles.topicGrid}>
        {mockHelpTopics.map((topic) => (
          <Pressable key={topic.id} style={({ pressed }) => [styles.topicCard, pressed && styles.topicPressed]}>
            <View style={styles.topicIcon}>
              <Ionicons name={topic.icon} size={22} color={colors.gold} />
            </View>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            <Text style={styles.topicDesc} numberOfLines={2}>
              {topic.description}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.contactCard}>
        <View style={styles.contactRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.gold} />
          <View style={styles.flex}>
            <Text style={styles.contactTitle}>Live chat</Text>
            <Text style={styles.contactSub}>Avg. reply under 4 min · 9am–11pm ET</Text>
          </View>
          <ChevronGlyph color={colors.textMuted} size={18} />
        </View>
        <View style={styles.divider} />
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={22} color={colors.gold} />
          <View style={styles.flex}>
            <Text style={styles.contactTitle}>Contact support</Text>
            <Text style={styles.contactSub}>help@seatly.app</Text>
          </View>
          <ChevronGlyph color={colors.textMuted} size={18} />
        </View>
      </Card>

      <ProfileSectionTitle>FAQ</ProfileSectionTitle>
      {filteredFaqs.map((f) => {
        const open = openFaq === f.id;
        return (
          <Pressable key={f.id} onPress={() => toggleFaq(f.id)} style={styles.faqCard}>
            <View style={styles.faqHead}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.gold} />
            </View>
            {open ? <Text style={styles.faqA}>{f.a}</Text> : null}
          </Pressable>
        );
      })}
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  topicCard: {
    width: '48%',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  topicPressed: {
    opacity: 0.88,
    borderColor: 'rgba(201, 168, 76, 0.35)',
  },
  topicIcon: {
    marginBottom: spacing.sm,
  },
  topicTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  topicDesc: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  contactCard: {
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  contactTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  contactSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  faqCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  faqHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  faqQ: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  faqA: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 20,
  },
});
