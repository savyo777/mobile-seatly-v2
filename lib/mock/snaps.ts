import { mockCustomer } from '@/lib/mock/users';
import { mockRestaurants } from '@/lib/mock/restaurants';
import type { StoryFilterId } from '@/lib/storyFilters/types';

export type SnapUser = {
  id: string;
  username: string;
  avatarUrl: string;
  displayName?: string;
  bio?: string;
};

export type SnapPost = {
  id: string;
  user_id: string;
  restaurant_id: string;
  image: string;
  caption: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  timestamp: string;
  likes: number;
  saves: number;
  tags: string[];
  dish?: string;
  storyFilterId?: StoryFilterId;
  storyFilterCapturedAt?: number;
};

export const TAG_POOL = [
  '#ramen',
  '#brunch',
  '#sushi',
  '#datenight',
  '#cocktails',
  '#patio',
  '#cheapeats',
  '#vegan',
  '#pasta',
  '#dessert',
] as const;

const dishPool = [
  'Tonkotsu ramen',
  'Avocado toast',
  'Spicy tuna roll',
  'Carbonara',
  'Negroni',
  'Espresso martini',
  'Truffle fries',
  'Burrata',
  'Lamb tagine',
  'Tiramisu',
];

export const snapUsers: SnapUser[] = [
  { id: mockCustomer.id, username: 'alexj',       displayName: 'Alex Johnson',   avatarUrl: mockCustomer.avatarUrl ?? '',                                                              bio: 'Chasing great meals across the city.' },
  { id: 'u3',           username: 'maria.eats',   displayName: 'Maria Rossi',    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',  bio: 'Food photographer. Pasta enthusiast. Always hungry.' },
  { id: 'u4',           username: 'jayonthego',   displayName: 'Jay Park',       avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',  bio: 'Street food to fine dining — I eat it all.' },
  { id: 'u5',           username: 'nina.city',    displayName: 'Nina Laurent',   avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300',  bio: 'Finding the best hidden spots in every city.' },
  { id: 'u6',           username: 'foodwithleo',  displayName: 'Leo Santos',     avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',  bio: 'Chef by trade, eater by passion.' },
  { id: 'u7',           username: 'samplates',    displayName: 'Sam Okafor',     avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',  bio: 'Date nights and late-night bites.' },
  { id: 'u8',           username: 'goldenforks',  displayName: 'Priya Mehta',    avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300',  bio: 'Sushi, ramen, repeat.' },
  { id: 'u9',           username: 'liadines',     displayName: 'Lia Chen',       avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',     bio: 'Wine pairings and long dinners.' },
  { id: 'u10',          username: 'derekbites',   displayName: 'Derek Williams', avatarUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=300',  bio: 'BBQ on weekends, everything else Monday–Friday.' },
  { id: 'u11',          username: 'sofiastories', displayName: 'Sofia Moreau',   avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300',  bio: 'Documenting every meal worth remembering.' },
];

const snapRestaurantIds = ['r1', 'r2', 'r3', 'r5', 'r10'] as const;
export const snapRestaurants = mockRestaurants.filter((restaurant) =>
  snapRestaurantIds.includes(restaurant.id as (typeof snapRestaurantIds)[number]),
);

const foodImages = [
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200',
];

const captionPool = [
  'this pasta was insane 🔥',
  'date night vibes',
  'lowkey best spot in the city',
  'worth the wait every time',
  'that sauce was unreal',
  'new favorite dinner place',
  'came for drinks, stayed for dessert',
  'perfect spot for a late night bite',
];

const hourOffsets = [
  1, 2, 3, 5, 7, 9, 12, 16, 20, 24, 28, 33, 40, 48, 55, 63, 72, 80, 96, 110, 128, 140, 156, 180,
  210, 240, 280, 320,
];

function pickTags(index: number): string[] {
  const count = (index % 3) + 2; // 2-4 tags
  const tags = new Set<string>();
  for (let i = 0; i < count; i++) {
    tags.add(TAG_POOL[(index + i * 3) % TAG_POOL.length]);
  }
  return [...tags];
}

const initialMockPosts: SnapPost[] = hourOffsets.map((offset, index) => {
  const user = snapUsers[index % snapUsers.length];
  const restaurant = snapRestaurants[index % snapRestaurants.length];
  const image = foodImages[index % foodImages.length];
  const caption = captionPool[index % captionPool.length];
  const timestamp = new Date(Date.now() - offset * 60 * 60 * 1000).toISOString();
  return {
    id: `snap-${index + 1}`,
    user_id: user.id,
    restaurant_id: restaurant.id,
    image,
    caption,
    rating: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
    timestamp,
    likes: Math.floor(Math.random() * 80) + 2,
    saves: Math.floor(Math.random() * 20),
    tags: pickTags(index),
    dish: dishPool[index % dishPool.length],
  };
});

let snapPosts: SnapPost[] = [...initialMockPosts];
let snapIdCounter = initialMockPosts.length + 1;

export function listSnapPosts(): SnapPost[] {
  return [...snapPosts].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

export function listSnapPostsByUser(userId: string): SnapPost[] {
  return listSnapPosts().filter((post) => post.user_id === userId);
}

export function listSnapPostsByRestaurant(restaurantId: string): SnapPost[] {
  return listSnapPosts().filter((post) => post.restaurant_id === restaurantId);
}

export function createSnapPost(
  input: Omit<SnapPost, 'id' | 'timestamp' | 'likes' | 'saves' | 'tags'> & { tags?: string[] },
): SnapPost {
  const created: SnapPost = {
    likes: 0,
    saves: 0,
    ...input,
    id: `snap-${snapIdCounter++}`,
    tags: input.tags ?? [],
    timestamp: new Date().toISOString(),
  };
  snapPosts = [created, ...snapPosts];
  return created;
}

/** Returns posts sorted by freshness, optionally filtered to restaurants within radiusKm of (lat, lng). */
export function listFeedPosts(
  userLat?: number,
  userLng?: number,
  radiusKm: number = 150,
): SnapPost[] {
  const { haversineMeters } = require('@/lib/map/geo') as typeof import('@/lib/map/geo');
  const all = [...snapPosts].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  if (userLat == null || userLng == null) return all;

  const { mockRestaurants } = require('@/lib/mock/restaurants') as typeof import('@/lib/mock/restaurants');
  const restaurantById = new Map(mockRestaurants.map((r: { id: string; lat: number; lng: number }) => [r.id, r]));

  const inRadius = all.filter((post) => {
    const r = restaurantById.get(post.restaurant_id);
    if (!r) return false;
    const distM = haversineMeters(userLat, userLng, r.lat, r.lng);
    return distM <= radiusKm * 1000;
  });

  return inRadius.length >= 8 ? inRadius : all;
}

export function getRestaurantForPost(restaurantId: string) {
  const { mockRestaurants } = require('@/lib/mock/restaurants') as typeof import('@/lib/mock/restaurants');
  return mockRestaurants.find((r: { id: string }) => r.id === restaurantId) ?? null;
}

export function getSnapUser(userId: string): SnapUser | undefined {
  return snapUsers.find((user) => user.id === userId);
}

export function getSnapRestaurantName(restaurantId: string): string {
  return snapRestaurants.find((restaurant) => restaurant.id === restaurantId)?.name ?? 'Restaurant';
}

export function getSnapPostById(snapId: string): SnapPost | undefined {
  return snapPosts.find((post) => post.id === snapId);
}

export function deleteSnapPost(postId: string, userId: string): boolean {
  const idx = snapPosts.findIndex((p) => p.id === postId && p.user_id === userId);
  if (idx === -1) return false;
  snapPosts = [...snapPosts.slice(0, idx), ...snapPosts.slice(idx + 1)];
  return true;
}

export function timeAgoLabel(timestamp: string): string {
  const diffMs = Date.now() - +new Date(timestamp);
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'yesterday';
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
