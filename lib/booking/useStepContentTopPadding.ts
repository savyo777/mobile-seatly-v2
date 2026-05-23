import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOptionalReservationHoldContext } from '@/lib/booking/ReservationHoldProvider';

/**
 * Top padding the booking-step content area should apply.
 *
 * When the HoldTimerBanner is visible it already extends into the
 * notch / Dynamic Island area via its own `paddingTop: insets.top + 10`
 * (see components/booking/HoldTimerBanner.tsx). If the step screen
 * underneath ALSO adds `paddingTop: insets.top` the safe-area padding
 * stacks — on iPhone 16 Pro Max that's ~50pt of unwanted black space
 * between the banner and the step header. User-reported 2026-05-23.
 *
 * Returns:
 *   - 0 when the banner is visible (hold status === 'active')
 *   - insets.top otherwise (notch coverage for step1/step2 etc. where
 *     no banner renders)
 */
export function useStepContentTopPadding(): number {
  const insets = useSafeAreaInsets();
  const hold = useOptionalReservationHoldContext();
  const bannerVisible = hold?.state.status === 'active';
  return bannerVisible ? 0 : insets.top;
}
