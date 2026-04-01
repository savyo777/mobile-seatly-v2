import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';

export type AiChatRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  distance: string;
};

export function restaurantToChatCard(r: Restaurant): AiChatRestaurant {
  return {
    id: r.id,
    name: r.name,
    cuisine: r.cuisineType,
    rating: r.avgRating,
    distance: `${r.distanceKm.toFixed(1)} km`,
  };
}

/** Pick up to 3 restaurants from mock data based on user query keywords */
export function pickRestaurantsForQuery(query: string): AiChatRestaurant[] {
  const q = query.toLowerCase().trim();
  let pool = [...mockRestaurants];

  if (q.includes('gluten')) {
    pool = pool.filter(
      (r) =>
        r.description.toLowerCase().includes('gluten') ||
        r.tags.some((tag) => tag.toLowerCase().includes('gluten')),
    );
  } else if (q.includes('romantic') || q.includes('date night') || q.includes('date')) {
    pool = pool.filter(
      (r) =>
        r.featuredIn?.includes('date-night-picks') ||
        r.ambiance.toLowerCase().includes('romantic') ||
        r.tags.some((t) => t.toLowerCase().includes('date')),
    );
  } else if (q.includes('cheap') || q.includes('budget') || q.includes('$')) {
    pool = pool.filter((r) => r.priceRange <= 2);
  } else if (q.includes('near me') || q.includes('nearby') || q.includes('close')) {
    pool = [...pool].sort((a, b) => a.distanceKm - b.distanceKm);
  } else {
    pool = [...pool].sort((a, b) => b.avgRating - a.avgRating);
  }

  const seen = new Set<string>();
  const out: Restaurant[] = [];
  for (const r of pool) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
      if (out.length >= 3) break;
    }
  }

  if (out.length === 0) {
    return mockRestaurants.slice(0, 3).map(restaurantToChatCard);
  }

  return out.map(restaurantToChatCard);
}
