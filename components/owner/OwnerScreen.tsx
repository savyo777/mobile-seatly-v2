import React from 'react';
import { View, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles, spacing } from '@/lib/theme';

/** Space below last scroll item so content clears the tab bar (bar + home indicator + scroll past). */
const TAB_BAR_SCROLL_PADDING = 110;

type Props = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function OwnerScreen({ children, scrollable = true, contentContainerStyle }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const contentBottomPadding = TAB_BAR_SCROLL_PADDING + insets.bottom;

  if (scrollable) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: contentBottomPadding },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View
        style={[
          styles.flexFill,
          { paddingBottom: contentBottomPadding, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const useStyles = createStyles((c) => ({
  safe: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  flexFill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
}));
