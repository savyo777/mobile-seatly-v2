import React from 'react';
import { View, StatusBar, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useTheme } from '@/lib/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  withKeyboardAvoiding?: boolean;
  padded?: boolean;
}

export function ScreenWrapper({ children, scrollable = false, withKeyboardAvoiding = false, padded = true }: ScreenWrapperProps) {
  const c = useColors();
  const { effective } = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: padded ? 20 : 0 }}>
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
