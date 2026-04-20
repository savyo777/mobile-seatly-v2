import { snapUsers } from './snaps';
import { mockCustomer } from './users';

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  timestamp: string;
};

const commentPool: { user_id: string; text: string }[] = [
  { user_id: 'u3', text: 'this looks incredible 🤤' },
  { user_id: 'u4', text: 'taking my partner here next week!!' },
  { user_id: 'u5', text: 'is the wait as bad as everyone says?' },
  { user_id: 'u6', text: 'the lighting in this pic is unreal' },
  { user_id: 'u7', text: 'need this in my life rn' },
  { user_id: 'u8', text: 'how was the service?' },
  { user_id: 'u9', text: 'saving this for later 🔖' },
  { user_id: 'u10', text: 'okay this is my sign to go back' },
  { user_id: 'u11', text: 'what did you order? looks amazing' },
  { user_id: mockCustomer.id, text: 'literally added to my list' },
];

const store = new Map<string, Comment[]>();
let commentIdCounter = 1;

function seedFor(postId: string): Comment[] {
  if (store.has(postId)) return store.get(postId)!;
  const hashCode = postId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const count = (hashCode % 4) + 1; // 1-4 seed comments
  const seeded: Comment[] = [];
  for (let i = 0; i < count; i++) {
    const pick = commentPool[(hashCode + i * 2) % commentPool.length];
    seeded.push({
      id: `c-seed-${postId}-${i}`,
      post_id: postId,
      user_id: pick.user_id,
      text: pick.text,
      timestamp: new Date(Date.now() - (i + 1) * 37 * 60 * 1000).toISOString(),
    });
  }
  store.set(postId, seeded);
  return seeded;
}

export function listCommentsForPost(postId: string): Comment[] {
  return [...seedFor(postId)].sort(
    (a, b) => +new Date(a.timestamp) - +new Date(b.timestamp),
  );
}

export function addComment(postId: string, userId: string, text: string): Comment {
  const list = seedFor(postId);
  const comment: Comment = {
    id: `c-${commentIdCounter++}`,
    post_id: postId,
    user_id: userId,
    text,
    timestamp: new Date().toISOString(),
  };
  list.push(comment);
  return comment;
}

export function getCommentCountForPost(postId: string): number {
  return seedFor(postId).length;
}

export function getCommentAuthor(userId: string) {
  return snapUsers.find((u) => u.id === userId);
}
