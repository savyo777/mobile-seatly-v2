import type { RestaurantRow } from '@cenaiva/types';
import { mapRestaurantRowToRestaurant } from '@/lib/supabase/mapRestaurantRow';

const baseRow: RestaurantRow = {
  id: 'restaurant-1',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  logo_url: null,
  cover_photo_url: null,
  cuisine_type: 'Italian',
  description: null,
  address: '123 Main St',
  city: 'Toronto',
  province: 'ON',
  country: 'CA',
  lat: 43.65,
  lng: -79.38,
  price_range: 2,
  avg_rating: 4.6,
  hero_image_url: null,
  phone: null,
  email: null,
  hours_json: null,
  settings_json: null,
  is_active: true,
  timezone: 'America/Toronto',
  currency: 'CAD',
  tax_rate: 0.13,
};

describe('mapRestaurantRowToRestaurant pricing', () => {
  it('uses Supabase price_range as the restaurant price tier', () => {
    const restaurant = mapRestaurantRowToRestaurant({
      ...baseRow,
      price_range: 1,
    });

    expect(restaurant.priceRange).toBe(1);
  });

  it('collapses Supabase tier 4 into the mobile $$$ category', () => {
    const restaurant = mapRestaurantRowToRestaurant({
      ...baseRow,
      price_range: 4,
    });

    expect(restaurant.priceRange).toBe(3);
  });

  it('falls back to settings_json price_range when the row value is missing', () => {
    const restaurant = mapRestaurantRowToRestaurant({
      ...baseRow,
      price_range: null,
      settings_json: { price_range: '$' },
    });

    expect(restaurant.priceRange).toBe(1);
  });

  it('defaults missing pricing to $$', () => {
    const restaurant = mapRestaurantRowToRestaurant({
      ...baseRow,
      price_range: null,
      settings_json: null,
    });

    expect(restaurant.priceRange).toBe(2);
  });
});
