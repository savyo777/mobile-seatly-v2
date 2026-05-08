import {
  applyMenuDerivedPriceRangesToRestaurants,
  type MenuPriceRow,
} from '@/lib/supabase/fetchRestaurants';
import type { Restaurant } from '@/lib/mock/restaurants';

const baseRestaurant: Restaurant = {
  id: 'restaurant-1',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  cuisineType: 'Italian',
  description: '',
  address: '',
  city: 'Toronto',
  province: 'ON',
  area: 'Downtown',
  lat: 0,
  lng: 0,
  phone: '',
  coverPhotoUrl: '',
  logoUrl: '',
  avgRating: 4.5,
  totalReviews: 0,
  priceRange: 3,
  distanceKm: 0,
  availability: 'Popular',
  ambiance: '',
  tags: [],
  featuredIn: [],
  isActive: true,
  hoursJson: {},
  taxRate: 0.13,
  currency: 'CAD',
};

describe('applyMenuDerivedPriceRangesToRestaurants', () => {
  it('keeps the explicit DB price range authoritative like the web app', () => {
    const menuRows: MenuPriceRow[] = [
      { restaurant_id: 'restaurant-1', category: 'Mains', price: 18, is_active: true, is_available: true },
    ];

    const [restaurant] = applyMenuDerivedPriceRangesToRestaurants([baseRestaurant], menuRows);

    expect(restaurant?.priceRange).toBe(3);
  });

  it('falls back to median main entree price when the DB price range is missing', () => {
    const menuRows: MenuPriceRow[] = [
      { restaurant_id: 'restaurant-1', category: 'Starters', price: 8, is_active: true, is_available: true },
      { restaurant_id: 'restaurant-1', category: 'Mains', price: 18, is_active: true, is_available: true },
      { restaurant_id: 'restaurant-1', category: 'Entrees', price: 20, is_active: true, is_available: true },
      { restaurant_id: 'restaurant-1', category: 'Desserts', price: 100, is_active: true, is_available: true },
    ];

    const [restaurant] = applyMenuDerivedPriceRangesToRestaurants(
      [baseRestaurant],
      menuRows,
      new Map([['restaurant-1', null]]),
    );

    expect(restaurant?.priceRange).toBe(1);
  });

  it('keeps display fallback when neither DB nor qualifying menu items exist', () => {
    const menuRows: MenuPriceRow[] = [
      { restaurant_id: 'restaurant-1', category: 'Desserts', price: 12, is_active: true, is_available: true },
    ];

    const [restaurant] = applyMenuDerivedPriceRangesToRestaurants(
      [baseRestaurant],
      menuRows,
      new Map([['restaurant-1', null]]),
    );

    expect(restaurant?.priceRange).toBe(3);
  });
});
