import React from 'react';
import { View, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ownerColors } from '@/lib/theme/ownerTheme';

/** Space below last scroll item so content clears the tab bar (bar + home indicator + scroll past). */
const TAB_BAR_SCROLL_PADDING = 110;

type Props = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function OwnerScreen({ children, scrollable = true, contentContainerStyle }: Props) {
  const insets = useSafeAreaInsets();
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
      <View style={[styles.flexFill, { paddingBottom: contentBottomPadding, paddingHorizontal: 20, paddingTop: 8 }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ownerColors.bg,
  },
  flexFill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
