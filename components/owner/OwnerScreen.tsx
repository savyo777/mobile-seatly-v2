import React from 'react';
import { View, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ownerColors } from '@/lib/theme/ownerTheme';

type Props = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function OwnerScreen({ children, scrollable = true, contentContainerStyle }: Props) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 };

  if (scrollable) {
    return (
      <View style={[styles.root, pad]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={[styles.root, pad, styles.flex]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ownerColors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
