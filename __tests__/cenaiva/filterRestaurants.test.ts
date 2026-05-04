import { filterCenaivaRestaurants } from '@/lib/cenaiva/filterRestaurants';
import type { Restaurant } from '@/lib/mock/restaurants';

const baseRestaurant: Restaurant = {
  id: 'base',
  name: 'Base',
  slug: 'base',
  cuisineType: 'Modern Canadian',
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
  priceRange: 2,
  distanceKm: 0,
  availability: 'Available Tonight',
  ambiance: '',
  tags: [],
  featuredIn: [],
  isActive: true,
  hoursJson: {},
  taxRate: 0.13,
  currency: 'CAD',
};

function restaurant(patch: Partial<Restaurant>): Restaurant {
  return { ...baseRestaurant, ...patch };
}

describe('filterCenaivaRestaurants', () => {
  const restaurants = [
    restaurant({ id: 'italian-1', name: 'La Piazza', cuisineType: 'Italian Fine Dining' }),
    restaurant({ id: 'thai-1', name: 'Pai', cuisineType: 'Thai', tags: ['spicy noodles'] }),
    restaurant({ id: 'french-1', name: 'La Maison', cuisineType: 'French Bistro', city: 'Montreal' }),
    restaurant({ id: 'greek-1', name: 'Agora', cuisineType: 'Greek Mediterranean' }),
  ];

  it('filters the assistant rail by cuisine even when marker ids are omitted', () => {
    const next = filterCenaivaRestaurants(restaurants, [], { cuisine: ['Italian'] });
    expect(next.map((item) => item.id)).toEqual(['italian-1']);
  });

  it('applies cuisine filters inside the current marker set', () => {
    const next = filterCenaivaRestaurants(restaurants, ['italian-1', 'thai-1'], { cuisine: ['Thai'] });
    expect(next.map((item) => item.id)).toEqual(['thai-1']);
  });

  it('preserves the assistant suggestion order when marker ids are present', () => {
    const next = filterCenaivaRestaurants(restaurants, ['french-1', 'italian-1'], {});
    expect(next.map((item) => item.id)).toEqual(['french-1', 'italian-1']);
  });

  it('filters by query and city for assistant discovery refinements', () => {
    const next = filterCenaivaRestaurants(restaurants, [], { city: 'montreal', query: 'bistro' });
    expect(next.map((item) => item.id)).toEqual(['french-1']);
  });

  it('expands European cuisine to related cuisines while preserving assistant order', () => {
    const next = filterCenaivaRestaurants(
      restaurants,
      ['thai-1', 'greek-1', 'french-1', 'italian-1'],
      { cuisine: ['European'] },
    );
    expect(next.map((item) => item.id)).toEqual(['greek-1', 'french-1', 'italian-1']);
  });
});
