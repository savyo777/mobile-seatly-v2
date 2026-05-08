import {
  averageRestaurantMenuDishPrice,
  deriveRestaurantPriceRangeFromMenuItems,
  isRestaurantPriceMenuCategory,
  medianMainEntreePrice,
  normalizeRestaurantPriceRange,
  restaurantPriceRangeFromAverageDishPrice,
} from "./menu-price-tiers.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("menu price category matcher matches the web app main-entree categories", () => {
  assert(isRestaurantPriceMenuCategory("Main"), "main should match");
  assert(isRestaurantPriceMenuCategory("Mains"), "mains should match");
  assert(isRestaurantPriceMenuCategory("Entrée"), "accented entree should match");
  assert(isRestaurantPriceMenuCategory("Entrees"), "entrees should match");
  assert(!isRestaurantPriceMenuCategory("Starters"), "starters should not match");
  assert(!isRestaurantPriceMenuCategory("Mezze"), "mezze should not match");
  assert(!isRestaurantPriceMenuCategory("Sashimi"), "sashimi should not match");
  assert(!isRestaurantPriceMenuCategory("Desserts"), "desserts should not match");
  assert(!isRestaurantPriceMenuCategory("Cocktails"), "cocktails should not match");
});

Deno.test("fallback dish price uses median active available main entree prices", () => {
  const median = medianMainEntreePrice([
    { category: "Starters", price: 10, is_active: true, is_available: true },
    { category: "Mains", price: 28, is_active: true, is_available: true },
    { category: "Entrees", price: 36, is_active: true, is_available: true },
    { category: "Desserts", price: 100, is_active: true, is_available: true },
    { category: "Mains", price: 100, is_active: false, is_available: true },
    { category: "Mains", price: 100, is_active: true, is_available: false },
  ]);

  assert(median === 32, `expected median 32, got ${median}`);

  const legacyNameAlias = averageRestaurantMenuDishPrice([
    { category: "Mains", price: 19, is_active: true, is_available: true },
    { category: "Mains", price: 41, is_active: true, is_available: true },
    { category: "Mains", price: 65, is_active: true, is_available: true },
  ]);
  assert(legacyNameAlias === 41, `expected alias median 41, got ${legacyNameAlias}`);
});

Deno.test("median main price thresholds map to the web app price tiers", () => {
  assert(restaurantPriceRangeFromAverageDishPrice(21.99) === 1, "21.99 should be $");
  assert(restaurantPriceRangeFromAverageDishPrice(22) === 2, "22 should be $$");
  assert(restaurantPriceRangeFromAverageDishPrice(54.99) === 2, "54.99 should be $$");
  assert(restaurantPriceRangeFromAverageDishPrice(55) === 3, "55 should be $$$");
});

Deno.test("normalized fallback tiers collapse legacy values into the three mobile tiers", () => {
  assert(normalizeRestaurantPriceRange("$$$$") === 3, "$$$$ should collapse to $$$");
  assert(normalizeRestaurantPriceRange(4) === 3, "legacy numeric tier 4 should collapse to $$$");
});

Deno.test("derived price range treats explicit DB tier as authoritative", () => {
  const tier = deriveRestaurantPriceRangeFromMenuItems([
    { category: "Mains", price: 18, is_active: true, is_available: true },
  ], 3);

  assert(tier === 3, `expected explicit tier 3, got ${tier}`);
});

Deno.test("derived price range uses menu only when explicit DB tier is missing", () => {
  const menuTier = deriveRestaurantPriceRangeFromMenuItems([
    { category: "Mains", price: 18, is_active: true, is_available: true },
  ], null);
  assert(menuTier === 1, `expected menu tier 1, got ${menuTier}`);

  const fallbackTier = deriveRestaurantPriceRangeFromMenuItems([
    { category: "Desserts", price: 14, is_active: true, is_available: true },
  ], 3);

  assert(fallbackTier === 3, `expected fallback tier 3, got ${fallbackTier}`);
});
