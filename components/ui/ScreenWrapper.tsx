import React from 'react';
import { View, StatusBar, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useTheme } from '@/lib/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  withKeyboardAvoiding?: boolean;
  padded?: boolean;
  /**
   * When false, skip the safe-area bottom padding. Useful for tab-hosted
   * screens that want the content to extend to the top of the tab bar
   * (the tab bar already handles bottom safe-area inset on its own).
   */
  withSafeAreaBottom?: boolean;
}

export function ScreenWrapper({ children, scrollable = false, withKeyboardAvoiding = false, padded = true, withSafeAreaBottom = true }: ScreenWrapperProps) {
  const c = useColors();
  const { effective } = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top, paddingBottom: withSafeAreaBottom ? insets.bottom : 0, paddingHorizontal: padded ? 20 : 0 }}>
      <StatusBar barStyle={effective === 'light' ? 'dark-content' : 'light-content'} backgroundColor={c.bgBase} />
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );

  if (withKeyboardAvoiding) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}
