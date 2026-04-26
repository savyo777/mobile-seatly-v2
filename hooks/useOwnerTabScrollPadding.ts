import { OWNER_TAB_SCROLL_BOTTOM_PADDING } from '@/lib/theme/ownerTheme';

/** Bottom padding for ScrollView/SectionList content on owner tab screens — clears the floating + FAB. */
export function useOwnerTabScrollPadding(): number {
  return OWNER_TAB_SCROLL_BOTTOM_PADDING;
}
