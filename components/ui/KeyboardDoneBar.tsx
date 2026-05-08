import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type KeyboardEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';

type KeyboardState = {
  visible: boolean;
  height: number;
};

const useStyles = createStyles((c) => ({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
    // Subtle hairline at the top only — separates from app content but blends
    // into the keyboard below.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.18)',
  },
  androidFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.bgElevated,
  },
  doneButton: {
    height: 28,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    ...typography.bodySmall,
    fontWeight: '600',
    fontSize: 15,
    color: c.gold,
  },
}));

function keyboardHeightFromEvent(event: KeyboardEvent) {
  const windowHeight = Dimensions.get('window').height;
  const screenY = event.endCoordinates?.screenY ?? windowHeight;
  return Math.max(0, windowHeight - screenY);
}

export function KeyboardDoneBar() {
  const styles = useStyles();
  const c = useColors();
  const { t } = useTranslation();
  const [keyboard, setKeyboard] = useState<KeyboardState>({ visible: false, height: 0 });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboard({ visible: true, height: keyboardHeightFromEvent(event) });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboard({ visible: false, height: 0 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!keyboard.visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.bar, { bottom: keyboard.height }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            tint={c.bgBase === '#0A0A0A' || c.bgBase.startsWith('#0') ? 'dark' : 'light'}
            intensity={92}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.androidFill} />
        )}
        <Pressable
          onPress={Keyboard.dismiss}
          hitSlop={12}
          style={({ pressed }) => [styles.doneButton, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
        >
          <Text style={styles.doneText}>{t('common.done')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
