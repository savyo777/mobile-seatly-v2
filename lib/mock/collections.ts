import { mockCustomer } from './users';
import { getSnapPostById } from './snaps';

export type Collection = {
  id: string;
  ownerId: string;
  name: string;
  coverPostId?: string;
  postIds: string[];
  createdAt: string;
};

const OWNER = mockCustomer.id;

const seedCollections: Collection[] = [
  {
    id: 'col-want-to-try',
    ownerId: OWNER,
    name: 'Want to try',
    coverPostId: 'snap-3',
    postIds: ['snap-3', 'snap-7', 'snap-15'],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'col-date-night',
    ownerId: OWNER,
    name: 'Date night ideas',
    coverPostId: 'snap-5',
    postIds: ['snap-5', 'snap-12'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const collectionsByOwner = new Map<string, Collection[]>([[OWNER, seedCollections]]);
let collectionIdCounter = 1;

function getOrInit(ownerId: string): Collection[] {
  if (!collectionsByOwner.has(ownerId)) collectionsByOwner.set(ownerId, []);
  return collectionsByOwner.get(ownerId)!;
}

export function listCollections(ownerId: string): Collection[] {
  return [...getOrInit(ownerId)].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getCollectionById(ownerId: string, collectionId: string): Collection | undefined {
  return getOrInit(ownerId).find((c) => c.id === collectionId);
}

export function createCollection(ownerId: string, name: string): Collection {
  const created: Collection = {
    id: `col-${collectionIdCounter++}-${Date.now()}`,
    ownerId,
    name: name.trim() || 'Untitled',
    postIds: [],
    createdAt: new Date().toISOString(),
  };
  getOrInit(ownerId).unshift(created);
  return created;
}

export function addPostToCollection(ownerId: string, collectionId: string, postId: string): void {
  const list = getOrInit(ownerId);
  const col = list.find((c) => c.id === collectionId);
  if (!col) return;
  if (!col.postIds.includes(postId)) {
    col.postIds.unshift(postId);
    if (!col.coverPostId) col.coverPostId = postId;
  }
}

export function removePostFromCollection(ownerId: string, collectionId: string, postId: string): void {
  const col = getOrInit(ownerId).find((c) => c.id === collectionId);
  if (!col) return;
  col.postIds = col.postIds.filter((id) => id !== postId);
  if (col.coverPostId === postId) {
    col.coverPostId = col.postIds[0];
  }
}

export function isPostInAnyCollection(ownerId: string, postId: string): boolean {
  return getOrInit(ownerId).some((c) => c.postIds.includes(postId));
}

export function getCollectionsContainingPost(ownerId: string, postId: string): Collection[] {
  return getOrInit(ownerId).filter((c) => c.postIds.includes(postId));
}

export function getCollectionPosts(ownerId: string, collectionId: string) {
  const col = getCollectionById(ownerId, collectionId);
  if (!col) return [];
  return col.postIds
    .map((id) => getSnapPostById(id))
    .filter((p): p is NonNullable<ReturnType<typeof getSnapPostById>> => !!p);
}
