import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OWNER_TAB_SCROLL_BOTTOM_PADDING } from '@/lib/theme/ownerTheme';

/** Bottom padding for ScrollView/SectionList content on owner tab screens (tab bar + center +). */
export function useOwnerTabScrollPadding(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + OWNER_TAB_SCROLL_BOTTOM_PADDING;
}
