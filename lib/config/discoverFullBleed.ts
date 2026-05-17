/**
 * Discover home tab full-bleed (edge-to-edge) flag.
 *
 * Set FULL_BLEED_DISCOVER to false to restore the prior 12px gutter on
 * the Discover home tab (the look immediately before the 2026-05-16
 * full-bleed change). When true, the Discover tab uses:
 *   - 0 horizontal padding on the outer content container
 *   - 0 bottom padding (last section touches the tab bar)
 *   - 0 top spacer on the sticky header (header background touches the
 *     very top of the phone, with logo/toggle/bell still sitting below
 *     the iOS status bar so system icons don't overlap them)
 *   - 12px internal indent on the headerBlock (chips + greeting) and on
 *     each section header (title + "See all"), so text content keeps a
 *     small gutter while horizontally-scrolling cards extend fully to
 *     the screen edges
 *
 * Independent of the compact-density flag in discoverDensity.ts — flip
 * one without affecting the other.
 */
const FULL_BLEED_DISCOVER = true;

export function isDiscoverFullBleedEnabled(): boolean {
  return FULL_BLEED_DISCOVER;
}
