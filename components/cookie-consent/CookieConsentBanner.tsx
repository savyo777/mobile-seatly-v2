import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
  loadCookieConsent,
  saveCookieConsent,
  type CookieConsent,
} from '@/lib/services/cookieConsent';
import { borderRadius, createStyles, spacing, typography } from '@/lib/theme';
import { darkColors } from '@/lib/theme/palettes';

const SWITCH_TRACK_OFF = 'rgba(255,255,255,0.12)';

const TITLE_TEXT =
  "Cenaiva uses cookies to provide a smooth, secure experience. You're in control of what you allow.";
const FOOTER_TEXT =
  'By continuing to use Cenaiva, you agree to the use of essential cookies. You can manage your preferences at any time in Settings → Privacy.';

const ESSENTIAL_DESC =
  'Always active. Required to keep you logged in and ensure the app functions properly.';
const ANALYTICS_DESC =
  'Optional. Help us understand how Cenaiva is used so we can improve performance and features. No personal data is sold.';
const MARKETING_DESC =
  'Optional. Allow us to show relevant offers and promotions based on your activity. You can opt in or out at any time.';

/** Premium sheet uses dark palette so it reads consistently on any app theme. */
const D = darkColors;

const useStyles = createStyles(() => ({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  blurFill: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: D.bgSurface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,162,74,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: { elevation: 28 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: spacing.lg,
  },
  scroll: {
    paddingBottom: spacing.sm,
  },
  scrollInner: {
    maxHeight: 300,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  rowTextBlock: {
    flex: 1,
    paddingRight: spacing.md,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  rowDesc: {
    ...typography.bodySmall,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(161,161,170,0.95)',
  },
  alwaysOnPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,162,74,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,162,74,0.28)',
  },
  alwaysOnPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: D.gold,
    letterSpacing: 0.2,
  },
  footer: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(113,113,122,0.95)',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    letterSpacing: 0.1,
  },
  actions: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  rejectPress: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rejectText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(161,161,170,0.95)',
    letterSpacing: -0.1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnOutlined: {
    flex: 1,
    minHeight: 50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  btnOutlinedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  btnGold: {
    flex: 1,
    minHeight: 50,
    borderRadius: borderRadius.md,
    backgroundColor: D.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: D.goldDark,
  },
  btnGoldText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F0E0C',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
}));

export function CookieConsentBanner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCookieConsent()
      .then((existing: CookieConsent | null) => {
        if (cancelled) return;
        setVisible(existing === null);
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setVisible(true);
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (next: { analytics: boolean; marketing: boolean }) => {
    try {
      await saveCookieConsent(next);
    } finally {
      setVisible(false);
    }
  };

  const onAcceptAll = () => {
    setAnalytics(true);
    setMarketing(true);
    void persist({ analytics: true, marketing: true });
  };

  const onSavePreferences = () => {
    void persist({ analytics, marketing });
  };

  const onRejectOptional = () => {
    setAnalytics(false);
    setMarketing(false);
    void persist({ analytics: false, marketing: false });
  };

  if (!hydrated || !visible) return null;

  return (
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Platform.OS === 'ios' ? (
          <BlurView intensity={28} tint="dark" style={styles.blurFill} />
        ) : null}
        <View style={styles.backdropTint} />
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.handle} />

        <Text style={styles.title}>{TITLE_TEXT}</Text>

        <ScrollView
          style={styles.scrollInner}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.rowCard}>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>Essential cookies</Text>
              <Text style={styles.rowDesc}>{ESSENTIAL_DESC}</Text>
            </View>
            <View style={styles.alwaysOnPill}>
              <Text style={styles.alwaysOnPillText}>Always on</Text>
            </View>
          </View>

          <View style={styles.rowCard}>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>Analytics cookies</Text>
              <Text style={styles.rowDesc}>{ANALYTICS_DESC}</Text>
            </View>
            <Switch
              value={analytics}
              onValueChange={setAnalytics}
              trackColor={{ true: D.gold, false: SWITCH_TRACK_OFF }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={SWITCH_TRACK_OFF}
              accessibilityLabel="Analytics cookies"
            />
          </View>

          <View style={styles.rowCard}>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>Marketing cookies</Text>
              <Text style={styles.rowDesc}>{MARKETING_DESC}</Text>
            </View>
            <Switch
              value={marketing}
              onValueChange={setMarketing}
              trackColor={{ true: D.gold, false: SWITCH_TRACK_OFF }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={SWITCH_TRACK_OFF}
              accessibilityLabel="Marketing cookies"
            />
          </View>

          <Text style={styles.footer}>{FOOTER_TEXT}</Text>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            onPress={onRejectOptional}
            style={({ pressed }) => [styles.rejectPress, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Reject optional cookies"
          >
            <Text style={styles.rejectText}>Reject optional</Text>
          </Pressable>

          <View style={styles.btnRow}>
            <Pressable
              onPress={onSavePreferences}
              style={({ pressed }) => [styles.btnOutlined, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Save cookie preferences"
            >
              <Text style={styles.btnOutlinedText}>Save preferences</Text>
            </Pressable>
            <Pressable
              onPress={onAcceptAll}
              style={({ pressed }) => [styles.btnGold, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Accept all cookies"
            >
              <Text style={styles.btnGoldText}>Accept all</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default CookieConsentBanner;
