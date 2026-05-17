import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Href, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, createStyles, spacing, typography } from '@/lib/theme';

type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /**
   * When false, skip the inner ScrollView wrapper. Use this when the
   * screen's children already provide their own scrolling (a FlatList,
   * SectionList, or other VirtualizedList). React Native warns when a
   * VirtualizedList is nested inside a same-orientation ScrollView
   * because windowing breaks. Default true preserves existing screens.
   */
  scrollable?: boolean;
};

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: c.textPrimary,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 44,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
    opacity: 0.95,
  },
}));

export function ProfileStackScreen({ title, subtitle, children, scrollable = true }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace('/(customer)/profile' as Href);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={handleBack}
          style={styles.backHit}
        >
          <Ionicons name="chevron-back" size={26} color={c.gold} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        >
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {subtitle ? <View style={styles.body}><Text style={styles.subtitle}>{subtitle}</Text></View> : null}
          {children}
        </View>
      )}
    </View>
  );
}
