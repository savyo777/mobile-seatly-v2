import {
  snapUsers,
  listSnapPostsByUser,
  listSnapPosts,
  getSnapPostById,
  getRestaurantForPost,
  type SnapPost,
  type SnapUser,
} from './snaps';
import { mockCustomer } from './users';

// Follow graph: followerId -> Set of userIds they follow
const followGraph = new Map<string, Set<string>>([
  [mockCustomer.id, new Set(['u3', 'u4', 'u5'])],
  ['u3', new Set([mockCustomer.id, 'u4', 'u6'])],
  ['u4', new Set([mockCustomer.id, 'u3'])],
  ['u5', new Set([mockCustomer.id, 'u3', 'u6'])],
  ['u6', new Set([mockCustomer.id])],
  ['u7', new Set([mockCustomer.id, 'u3', 'u5'])],
  ['u8', new Set(['u3', 'u4'])],
  ['u9', new Set([mockCustomer.id, 'u5'])],
  ['u10', new Set(['u3'])],
  ['u11', new Set([mockCustomer.id, 'u4', 'u6'])],
]);

// Liked posts: userId -> Set of postIds
const likedPosts = new Map<string, Set<string>>([
  [mockCustomer.id, new Set(['snap-2', 'snap-5', 'snap-8', 'snap-12', 'snap-17'])],
]);

// Saved posts: userId -> Set of postIds
const savedPosts = new Map<string, Set<string>>([
  [mockCustomer.id, new Set(['snap-3', 'snap-7', 'snap-15'])],
]);

function getOrCreate<V>(map: Map<string, V>, key: string, factory: () => V): V {
  if (!map.has(key)) map.set(key, factory());
  return map.get(key)!;
}

export function isFollowing(followerId: string, targetId: string): boolean {
  return getOrCreate(followGraph, followerId, () => new Set()).has(targetId);
}

export function follow(followerId: string, targetId: string): void {
  getOrCreate(followGraph, followerId, () => new Set()).add(targetId);
}

export function unfollow(followerId: string, targetId: string): void {
  getOrCreate(followGraph, followerId, () => new Set()).delete(targetId);
}

export function getFollowingIds(userId: string): string[] {
  return [...getOrCreate(followGraph, userId, () => new Set())];
}

export function getFollowerIds(userId: string): string[] {
  return [...followGraph.entries()]
    .filter(([, set]) => set.has(userId))
    .map(([id]) => id);
}

export function getFollowingCount(userId: string): number {
  return getFollowingIds(userId).length;
}

export function getFollowerCount(userId: string): number {
  return getFollowerIds(userId).length;
}

export function toggleLike(userId: string, postId: string): boolean {
  const set = getOrCreate(likedPosts, userId, () => new Set());
  if (set.has(postId)) { set.delete(postId); return false; }
  set.add(postId);
  return true;
}

export function isLiked(userId: string, postId: string): boolean {
  return getOrCreate(likedPosts, userId, () => new Set()).has(postId);
}

export function toggleSave(userId: string, postId: string): boolean {
  const set = getOrCreate(savedPosts, userId, () => new Set());
  if (set.has(postId)) { set.delete(postId); return false; }
  set.add(postId);
  return true;
}

export function isSaved(userId: string, postId: string): boolean {
  return getOrCreate(savedPosts, userId, () => new Set()).has(postId);
}

export function getLikedPosts(userId: string) {
  return [...getOrCreate(likedPosts, userId, () => new Set())]
    .map((id) => getSnapPostById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getSnapPostById>>[];
}

export function getSavedPosts(userId: string) {
  return [...getOrCreate(savedPosts, userId, () => new Set())]
    .map((id) => getSnapPostById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getSnapPostById>>[];
}

export function listFollowingPosts(userId: string) {
  const ids = getFollowingIds(userId);
  return ids
    .flatMap((id) => listSnapPostsByUser(id))
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

export function searchUsers(query: string): SnapUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return snapUsers;
  return snapUsers.filter((u) => u.username.toLowerCase().includes(q));
}

export function getAllUsers(): SnapUser[] {
  return snapUsers;
}

function postsWithinDays(days: number): SnapPost[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return listSnapPosts().filter((p) => +new Date(p.timestamp) >= cutoff);
}

function engagementScore(post: SnapPost): number {
  return post.likes + post.saves * 2;
}

export function listTrendingPosts(limitDays: number = 7): SnapPost[] {
  const within = postsWithinDays(limitDays);
  const source = within.length >= 6 ? within : listSnapPosts();
  return [...source].sort((a, b) => engagementScore(b) - engagementScore(a));
}

export type TrendingRestaurant = {
  restaurantId: string;
  postCount: number;
  totalEngagement: number;
  samplePost: SnapPost;
};

export function listTrendingRestaurants(limitDays: number = 7): TrendingRestaurant[] {
  const within = postsWithinDays(limitDays);
  const source = within.length >= 6 ? within : listSnapPosts();
  const byRestaurant = new Map<string, { posts: SnapPost[]; engagement: number }>();
  source.forEach((post) => {
    const entry = byRestaurant.get(post.restaurant_id) ?? { posts: [], engagement: 0 };
    entry.posts.push(post);
    entry.engagement += engagementScore(post);
    byRestaurant.set(post.restaurant_id, entry);
  });
  return [...byRestaurant.entries()]
    .map(([restaurantId, { posts, engagement }]) => ({
      restaurantId,
      postCount: posts.length,
      totalEngagement: engagement,
      samplePost: posts.sort((a, b) => engagementScore(b) - engagementScore(a))[0],
    }))
    .filter((r) => getRestaurantForPost(r.restaurantId) != null)
    .sort((a, b) => b.totalEngagement - a.totalEngagement);
}

export type TrendingDish = {
  dish: string;
  postCount: number;
  totalEngagement: number;
  samplePost: SnapPost;
};

export function listTrendingDishes(limitDays: number = 7): TrendingDish[] {
  const within = postsWithinDays(limitDays);
  const source = within.length >= 6 ? within : listSnapPosts();
  const byDish = new Map<string, { posts: SnapPost[]; engagement: number }>();
  source.forEach((post) => {
    if (!post.dish) return;
    const key = post.dish;
    const entry = byDish.get(key) ?? { posts: [], engagement: 0 };
    entry.posts.push(post);
    entry.engagement += engagementScore(post);
    byDish.set(key, entry);
  });
  return [...byDish.entries()]
    .map(([dish, { posts, engagement }]) => ({
      dish,
      postCount: posts.length,
      totalEngagement: engagement,
      samplePost: posts.sort((a, b) => engagementScore(b) - engagementScore(a))[0],
    }))
    .sort((a, b) => b.totalEngagement - a.totalEngagement);
}

function normalizeTag(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function listPostsByTag(tag: string): SnapPost[] {
  const normalized = normalizeTag(tag);
  return listSnapPosts().filter((p) => p.tags.some((t) => t.toLowerCase() === normalized));
}

export function listTopTags(limit: number = 10): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  listSnapPosts().forEach((p) => {
    p.tags.forEach((t) => {
      const key = normalizeTag(t);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
