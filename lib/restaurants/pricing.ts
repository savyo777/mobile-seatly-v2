export type RestaurantPriceTier = 1 | 2 | 3;

const DEFAULT_PRICE_TIER: RestaurantPriceTier = 2;

// Price-tier thresholds, env-overridable. Defaults are CAD-tuned for the
// launch market. The long-term answer is per-restaurant currency thresholds
// in DB (Phase L item), but env overrides cover near-term market expansion.
function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const LOW_PRICE_MAX = envNumber('EXPO_PUBLIC_PRICE_TIER_LOW_MAX', 22);
const HIGH_PRICE_MIN = envNumber('EXPO_PUBLIC_PRICE_TIER_HIGH_MIN', 55);

// Menu-category names that count as "main course" for median-price math.
// Includes English and French (Quebec) variants so that pricing inference
// works on bilingual menus without a backend `is_main_category` flag.
const PRICE_LEVEL_CATEGORY_NAMES = new Set([
  'main',
  'mains',
  'entree',
  'entrees',
  'plat',
  'plats',
  'plat principal',
  'plats principaux',
]);

export type RestaurantMenuPriceItem = {
  price: unknown;
  category?: string | null;
  is_active?: boolean | null;
  is_available?: boolean | null;
};

function parsePriceTier(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\$+$/.test(trimmed)) return trimmed.length;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizeExplicitRestaurantPriceRange(value: unknown): RestaurantPriceTier | null {
  const parsed = parsePriceTier(value);
  if (parsed == null || parsed < 1) return null;

  const rounded = Math.round(parsed);
  if (rounded >= 3) return 3;
  if (rounded >= 2) return 2;
  return 1;
}

export function normalizeRestaurantPriceRange(
  value: unknown,
  fallback: RestaurantPriceTier = DEFAULT_PRICE_TIER,
): RestaurantPriceTier {
  return normalizeExplicitRestaurantPriceRange(value) ?? fallback;
}

export function restaurantPriceLabel(
  value: unknown,
  fallback: RestaurantPriceTier = DEFAULT_PRICE_TIER,
): string {
  return '$'.repeat(normalizeRestaurantPriceRange(value, fallback));
}

function parseMenuPrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase();
}

export function isRestaurantPriceMenuCategory(category: string | null | undefined): boolean {
  return PRICE_LEVEL_CATEGORY_NAMES.has(normalizeText(category));
}

export function restaurantPriceRangeFromAverageDishPrice(averagePrice: number): RestaurantPriceTier {
  if (!Number.isFinite(averagePrice)) return DEFAULT_PRICE_TIER;
  if (averagePrice < LOW_PRICE_MAX) return 1;
  if (averagePrice < HIGH_PRICE_MIN) return 2;
  return 3;
}

export function medianMainEntreePrice(items: RestaurantMenuPriceItem[]): number | null {
  const prices = items.flatMap((item) => {
    if (item.is_active === false || item.is_available === false) return [];
    if (!isRestaurantPriceMenuCategory(item.category)) return [];
    const price = parseMenuPrice(item.price);
    return price == null || price <= 0 ? [] : [price];
  }).sort((a, b) => a - b);

  if (!prices.length) return null;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0
    ? (prices[mid - 1] + prices[mid]) / 2
    : prices[mid];
}

export function averageRestaurantMenuDishPrice(items: RestaurantMenuPriceItem[]): number | null {
  return medianMainEntreePrice(items);
}

export function deriveRestaurantPriceRangeFromMenuItems(
  items: RestaurantMenuPriceItem[],
  fallbackRange?: unknown,
  defaultTier: RestaurantPriceTier = DEFAULT_PRICE_TIER,
): RestaurantPriceTier {
  const explicit = normalizeExplicitRestaurantPriceRange(fallbackRange);
  if (explicit != null) return explicit;
  const median = medianMainEntreePrice(items);
  return median == null ? defaultTier : restaurantPriceRangeFromAverageDishPrice(median);
}

export function deriveRestaurantPriceRangeFromMenuOnly(
  items: RestaurantMenuPriceItem[],
): RestaurantPriceTier | null {
  const median = medianMainEntreePrice(items);
  return median == null ? null : restaurantPriceRangeFromAverageDishPrice(median);
}
