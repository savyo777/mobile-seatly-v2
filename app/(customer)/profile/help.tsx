import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { Card } from '@/components/ui';
import { mockFaqs, mockHelpTopics } from '@/lib/mock/profileScreens';
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const useStyles = createStyles((c) => ({
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  topicCard: {
    width: '48%',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  topicDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
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
    color: c.textPrimary,
    fontWeight: '600',
  },
  contactSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: spacing.sm,
  },
  faqCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  faqA: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: spacing.md,
    lineHeight: 20,
  },
}));

const SUPPORT_EMAIL = 'help@cenaiva.app';

function openSupportEmail(subject: string, body: string) {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(mailto).catch(() => {
    Alert.alert('No email app', `Please email us at ${SUPPORT_EMAIL}`);
  });
}

const TOPIC_SUBJECTS: Record<string, { subject: string; body: string }> = {
  h1: {
    subject: 'Booking Issue',
    body: 'Hi Cenaiva Support,\n\nI need help with a booking issue.\n\nBooking reference (if applicable): \nDetails: \n',
  },
  h2: {
    subject: 'Payment Issue',
    body: 'Hi Cenaiva Support,\n\nI need help with a payment issue.\n\nBooking reference (if applicable): \nDetails: \n',
  },
  h3: {
    subject: 'Refund Request',
    body: 'Hi Cenaiva Support,\n\nI would like to request a refund.\n\nBooking reference: \nReason: \n',
  },
  h4: {
    subject: 'Restaurant Issue Report',
    body: 'Hi Cenaiva Support,\n\nI would like to report an issue with a restaurant.\n\nRestaurant name: \nDate of visit: \nDetails: \n',
  },
};

export default function HelpScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [openFaq, setOpenFaq] = useState<string | null>(mockFaqs[0]?.id ?? null);

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const handleTopicPress = useCallback((topicId: string) => {
    const info = TOPIC_SUBJECTS[topicId];
    if (info) openSupportEmail(info.subject, info.body);
  }, []);

  const handleContactEmail = useCallback(() => {
    openSupportEmail('Support Request', 'Hi Cenaiva Support,\n\n');
  }, []);

  return (
    <ProfileStackScreen title={t('profile.help')}>
      <ProfileSectionTitle>Popular topics</ProfileSectionTitle>
      <View style={styles.topicGrid}>
        {mockHelpTopics.map((topic) => (
          <Pressable key={topic.id} onPress={() => handleTopicPress(topic.id)} style={({ pressed }) => [styles.topicCard, pressed && styles.topicPressed]}>
            <View style={styles.topicIcon}>
              <Ionicons name={topic.icon} size={22} color={c.gold} />
            </View>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            <Text style={styles.topicDesc} numberOfLines={2}>
              {topic.description}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.contactCard}>
        <Pressable onPress={handleContactEmail} style={styles.contactRow}>
          <Ionicons name="mail-outline" size={22} color={c.gold} />
          <View style={styles.flex}>
            <Text style={styles.contactTitle}>Contact support</Text>
            <Text style={styles.contactSub}>help@cenaiva.app</Text>
          </View>
          <ChevronGlyph color={c.textMuted} size={18} />
        </Pressable>
      </Card>

      <ProfileSectionTitle>FAQ</ProfileSectionTitle>
      {mockFaqs.map((f) => {
        const open = openFaq === f.id;
        return (
          <Pressable key={f.id} onPress={() => toggleFaq(f.id)} style={styles.faqCard}>
            <View style={styles.faqHead}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.gold} />
            </View>
            {open ? <Text style={styles.faqA}>{f.a}</Text> : null}
          </Pressable>
        );
      })}
    </ProfileStackScreen>
  );
}
