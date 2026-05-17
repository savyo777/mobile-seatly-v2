/**
 * Discover home tab density flag.
 *
 * When true (the current default), the Discover home tab renders in the
 * compact DoorDash/UberEats-style layout:
 *   - Screen paddingHorizontal: 12 (spacing.md) instead of 16 (spacing.lg)
 *   - Horizontal-section card width: min(winW * 0.46, 170) instead of
 *     min(winW * 0.72, 280) — about 2 cards plus a peek per row
 *   - Gap between cards: 8 (spacing.sm) instead of 12 (spacing.md)
 *   - Card image height: 100 instead of 130
 *   - Card body padding: 8 instead of 12
 *   - Restaurant name font: 14 instead of 16, truncates to 1 line
 *   - Meta + availability lines: 1pt smaller, availability truncates to 1 line
 *
 * Set COMPACT_DISCOVER = false to revert the Discover tab to the prior
 * spacious layout exactly. No rebuild required; a JS reload picks up the
 * change. Other screens that import DiscoverEnhancedCard (post-review,
 * saved restaurants, map detail sheet, etc.) are unaffected either way —
 * only DiscoverHorizontalSection passes compact={true} to the card.
 */
const COMPACT_DISCOVER = true;

export function isCompactDiscoverEnabled(): boolean {
  return COMPACT_DISCOVER;
}
