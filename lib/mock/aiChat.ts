import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';

export type AiChatRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  distance: string;
};

export type EventPlan = {
  restaurant: AiChatRestaurant;
  occasion: string;
  partySize: number;
  suggestedTime: string;
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

function extractPartySize(query: string): number {
  const m = query.match(/\b(\d+)\s*(people|person|guests?|of\s+(\d+))\b/i)
    || query.match(/\bfor\s+(\d+)\b/i)
    || query.match(/\bparty\s+of\s+(\d+)\b/i);
  if (m) return Math.min(20, Math.max(1, parseInt(m[1] ?? m[3] ?? '2', 10)));
  return 2;
}

function extractOccasion(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes('birthday')) return 'Birthday';
  if (q.includes('anniversary')) return 'Anniversary';
  if (q.includes('bachelorette') || q.includes('bachelor')) return 'Bachelorette Party';
  if (q.includes('graduation')) return 'Graduation';
  if (q.includes('date night') || q.includes('romantic') || q.includes('date')) return 'Date Night';
  if (q.includes('work') || q.includes('business') || q.includes('corporate')) return 'Business Dinner';
  if (q.includes('group') || q.includes('party') || q.includes('celebration')) return 'Celebration';
  return null;
}

function suggestedTime(partySize: number): string {
  if (partySize >= 8) return '6:30 PM (large group, book early)';
  if (partySize >= 4) return '7:00 PM';
  return '7:30 PM';
}

/** Returns an event plan if the query is event-planning intent; otherwise null. */
export function pickEventPlan(query: string): EventPlan | null {
  const occasion = extractOccasion(query);
  if (!occasion) return null;

  const partySize = extractPartySize(query);
  let pool = [...mockRestaurants];

  if (occasion === 'Date Night') {
    pool = pool.filter((r) => r.featuredIn?.includes('date-night-picks') || r.ambiance.toLowerCase().includes('date'));
  } else if (occasion === 'Business Dinner') {
    pool = pool.filter((r) => r.tags.some((t) => t.toLowerCase().includes('business')));
  } else if (partySize >= 6) {
    pool = pool.filter((r) => r.priceRange >= 2);
  }

  pool = pool.sort((a, b) => b.avgRating - a.avgRating);
  const pick = pool[0] ?? mockRestaurants[0];

  return {
    restaurant: restaurantToChatCard(pick),
    occasion,
    partySize,
    suggestedTime: suggestedTime(partySize),
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
