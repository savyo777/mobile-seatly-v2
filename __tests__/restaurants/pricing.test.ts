import {
  averageRestaurantMenuDishPrice,
  deriveRestaurantPriceRangeFromMenuItems,
  isRestaurantPriceMenuCategory,
  medianMainEntreePrice,
  normalizeExplicitRestaurantPriceRange,
  normalizeRestaurantPriceRange,
  restaurantPriceLabel,
  restaurantPriceRangeFromAverageDishPrice,
} from '@/lib/restaurants/pricing';

describe('restaurant pricing helpers', () => {
  it('normalizes Supabase price ranges into the mobile three-tier scale', () => {
    expect(normalizeRestaurantPriceRange(1)).toBe(1);
    expect(normalizeRestaurantPriceRange(2)).toBe(2);
    expect(normalizeRestaurantPriceRange(3)).toBe(3);
    expect(normalizeRestaurantPriceRange(4)).toBe(3);
  });

  it('accepts string tiers and dollar labels', () => {
    expect(normalizeRestaurantPriceRange('1')).toBe(1);
    expect(normalizeRestaurantPriceRange('2')).toBe(2);
    expect(normalizeRestaurantPriceRange('3')).toBe(3);
    expect(normalizeRestaurantPriceRange('$$$$')).toBe(3);
  });

  it('falls back to mid tier for missing or invalid values', () => {
    expect(normalizeExplicitRestaurantPriceRange(null)).toBeNull();
    expect(normalizeExplicitRestaurantPriceRange(undefined)).toBeNull();
    expect(normalizeRestaurantPriceRange(null)).toBe(2);
    expect(normalizeRestaurantPriceRange(undefined)).toBe(2);
    expect(normalizeRestaurantPriceRange('')).toBe(2);
    expect(normalizeRestaurantPriceRange('unknown')).toBe(2);
    expect(normalizeRestaurantPriceRange(0)).toBe(2);
  });

  it('formats the display label from normalized tiers', () => {
    expect(restaurantPriceLabel(1)).toBe('$');
    expect(restaurantPriceLabel(2)).toBe('$$');
    expect(restaurantPriceLabel(3)).toBe('$$$');
    expect(restaurantPriceLabel(4)).toBe('$$$');
    expect(restaurantPriceLabel(null)).toBe('$$');
  });

  it('matches the web app main-entree categories used for fallback computed tiers', () => {
    expect(isRestaurantPriceMenuCategory('Main')).toBe(true);
    expect(isRestaurantPriceMenuCategory('Mains')).toBe(true);
    expect(isRestaurantPriceMenuCategory('Entrée')).toBe(true);
    expect(isRestaurantPriceMenuCategory('Entrees')).toBe(true);
    expect(isRestaurantPriceMenuCategory('Starters')).toBe(false);
    expect(isRestaurantPriceMenuCategory('Appetizers')).toBe(false);
    expect(isRestaurantPriceMenuCategory('Mezze')).toBe(false);
    expect(isRestaurantPriceMenuCategory('Sashimi')).toBe(false);
    expect(isRestaurantPriceMenuCategory('Desserts')).toBe(false);
    expect(isRestaurantPriceMenuCategory('Cocktails')).toBe(false);
  });

  it('uses median active available main entree price like the web app', () => {
    const items = [
      { category: 'Starters', price: 10, is_active: true, is_available: true },
      { category: 'Mains', price: '28', is_active: true, is_available: true },
      { category: 'Entrees', price: 36, is_active: true, is_available: true },
      { category: 'Desserts', price: 100, is_active: true, is_available: true },
      { category: 'Mains', price: 100, is_active: false, is_available: true },
      { category: 'Mains', price: 100, is_active: true, is_available: false },
    ];

    expect(medianMainEntreePrice(items)).toBe(32);
    expect(averageRestaurantMenuDishPrice([
      { category: 'Mains', price: 19, is_active: true, is_available: true },
      { category: 'Mains', price: 41, is_active: true, is_available: true },
      { category: 'Mains', price: 65, is_active: true, is_available: true },
    ])).toBe(41);
  });

  it('splits computed main-entree medians into the web app price ranges', () => {
    expect(restaurantPriceRangeFromAverageDishPrice(21.99)).toBe(1);
    expect(restaurantPriceRangeFromAverageDishPrice(22)).toBe(2);
    expect(restaurantPriceRangeFromAverageDishPrice(54.99)).toBe(2);
    expect(restaurantPriceRangeFromAverageDishPrice(55)).toBe(3);
  });

  it('treats the explicit DB tier as authoritative over menu fallback', () => {
    expect(deriveRestaurantPriceRangeFromMenuItems([
      { category: 'Mains', price: 18, is_active: true, is_available: true },
    ], 3)).toBe(3);
  });

  it('uses menu fallback only when no explicit DB tier exists', () => {
    expect(deriveRestaurantPriceRangeFromMenuItems([
      { category: 'Mains', price: 18, is_active: true, is_available: true },
    ], null)).toBe(1);

    expect(deriveRestaurantPriceRangeFromMenuItems([
      { category: 'Desserts', price: 14, is_active: true, is_available: true },
    ], 3)).toBe(3);
  });
});
