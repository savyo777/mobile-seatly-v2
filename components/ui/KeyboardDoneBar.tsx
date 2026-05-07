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
import { useTranslation } from 'react-i18next';
import { createStyles, spacing, typography } from '@/lib/theme';

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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: c.bgSurface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  doneButton: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  doneText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },
}));

function keyboardHeightFromEvent(event: KeyboardEvent) {
  const windowHeight = Dimensions.get('window').height;
  const screenY = event.endCoordinates?.screenY ?? windowHeight;
  return Math.max(0, windowHeight - screenY);
}

export function KeyboardDoneBar() {
  const styles = useStyles();
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
        <Pressable
          onPress={Keyboard.dismiss}
          hitSlop={12}
          style={styles.doneButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
        >
          <Text style={styles.doneText}>{t('common.done')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
