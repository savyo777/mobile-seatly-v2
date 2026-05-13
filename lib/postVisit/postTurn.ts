import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { listSnapPostsByUser } from '@/lib/mock/snaps';
import { sendPostTurnPushNotification } from '@/lib/postVisit/push';
import type {
  CompletedVisit,
  PostTurnRequest,
  PostTurnRequestStatus,
  PostTurnRequestType,
} from '@/lib/postVisit/postTurnTypes';

export type {
  CompletedVisit,
  PostTurnRequest,
  PostTurnRequestStatus,
  PostTurnRequestType,
} from '@/lib/postVisit/postTurnTypes';

const STORAGE_PREFIX = '@cenaiva/post_turn_requests';
const REQUEST_TYPES: PostTurnRequestType[] = ['review', 'photo'];

type ProfileRow = { id: string } | null;
type GuestRow = { id: string };
type RelationOne<T> = T | T[] | null;
type RestaurantRelation = {
  id: string;
  name: string | null;
};
type ShiftRelation = {
  id: string;
  turn_time_minutes: number | string | null;
};
type ReservationRow = {
  id: string;
  restaurant_id: string | null;
  reserved_at: string | null;
  status: string | null;
  restaurant: RelationOne<RestaurantRelation>;
  shift: RelationOne<ShiftRelation>;
};
type RemoteRequestRow = {
  id?: string | null;
  booking_id: string;
  user_id: string;
  restaurant_id: string;
  request_type: PostTurnRequestType;
  requested_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  push_sent_at: string | null;
  in_app_read_at: string | null;
  status: PostTurnRequestStatus | null;
};

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function requestKey(userId: string, bookingId: string, type: PostTurnRequestType): string {
  return `${userId}:${bookingId}:${type}`;
}

function one<T>(value: RelationOne<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function validDateMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function canReceivePostTurn(user: User | null | undefined): user is User {
  return Boolean(user?.id);
}

function isBookablePastStatus(status: string | null): boolean {
  if (status === 'cancelled' || status === 'no_show') return false;
  return status === null || status === 'confirmed' || status === 'seated' || status === 'completed';
}

function parseTurnMinutes(value: unknown): number | null {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

async function loadLocalRequests(userId: string): Promise<PostTurnRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PostTurnRequest => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Partial<PostTurnRequest>;
      return Boolean(row.id && row.bookingId && row.userId && row.restaurantId && row.type && row.status);
    });
  } catch {
    return [];
  }
}

async function saveLocalRequests(userId: string, requests: PostTurnRequest[]): Promise<void> {
  const deduped = new Map<string, PostTurnRequest>();
  requests.forEach((request) => {
    deduped.set(requestKey(userId, request.bookingId, request.type), request);
  });
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify([...deduped.values()]));
}

async function fetchLiveCompletedVisits(user: User): Promise<CompletedVisit[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    const profileId = (profile as ProfileRow)?.id;
    if (!profileId) return [];

    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .eq('user_profile_id', profileId);
    if (guestError) return [];

    const guestIds = ((guests ?? []) as GuestRow[]).map((guest) => String(guest.id)).filter(Boolean);
    if (!guestIds.length) return [];

    const { data, error } = await supabase
      .from('reservations')
      .select('id,restaurant_id,reserved_at,status,restaurant:restaurants(id,name),shift:shifts(id,turn_time_minutes)')
      .in('guest_id', guestIds)
      .order('reserved_at', { ascending: false });
    if (error) return [];

    const now = Date.now();
    return ((data ?? []) as ReservationRow[]).flatMap((row) => {
      if (!row.id || !isBookablePastStatus(row.status)) return [];
      const startMs = validDateMs(row.reserved_at);
      if (startMs == null) return [];

      const shift = one(row.shift);
      const turnTimeMinutes = parseTurnMinutes(shift?.turn_time_minutes);
      if (turnTimeMinutes == null) return [];

      const turnCompletedMs = startMs + turnTimeMinutes * 60_000;
      if (turnCompletedMs > now) return [];

      const restaurant = one(row.restaurant);
      const restaurantId = row.restaurant_id ?? restaurant?.id ?? '';
      if (!restaurantId) return [];

      return [{
        bookingId: row.id,
        userId: user.id,
        restaurantId,
        restaurantName: restaurant?.name?.trim() || 'the restaurant',
        reservedAt: row.reserved_at ?? new Date(startMs).toISOString(),
        turnTimeMinutes,
        turnCompletedAt: new Date(turnCompletedMs).toISOString(),
      }];
    });
  } catch {
    return [];
  }
}

async function fetchRemoteRequests(userId: string): Promise<Map<string, RemoteRequestRow>> {
  const supabase = getSupabase();
  const map = new Map<string, RemoteRequestRow>();
  if (!supabase) return map;

  try {
    const { data, error } = await supabase
      .from('post_turn_visit_requests')
      .select('id,booking_id,user_id,restaurant_id,request_type,requested_at,completed_at,dismissed_at,push_sent_at,in_app_read_at,status')
      .eq('user_id', userId);
    if (error) return map;
    ((data ?? []) as RemoteRequestRow[]).forEach((row) => {
      if (row.booking_id && row.request_type) {
        map.set(requestKey(userId, row.booking_id, row.request_type), row);
      }
    });
  } catch {
    return map;
  }

  return map;
}

async function hasRemoteReview(userId: string, bookingId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('restaurant_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_id', bookingId)
      .limit(1);
    return !error && Boolean(data?.length);
  } catch {
    return false;
  }
}

async function hasRemotePhoto(userId: string, bookingId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('visit_photos')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_id', bookingId)
      .limit(1);
    return !error && Boolean(data?.length);
  } catch {
    return false;
  }
}

function hasLocalPhoto(userId: string, bookingId: string): boolean {
  return listSnapPostsByUser(userId).some((post) => post.booking_id === bookingId);
}

async function isRequestCompleted(
  request: PostTurnRequest | undefined,
  userId: string,
  bookingId: string,
  type: PostTurnRequestType,
): Promise<boolean> {
  if (request?.status === 'completed' || request?.completedAt) return true;
  if (type === 'photo' && hasLocalPhoto(userId, bookingId)) return true;
  if (type === 'photo') return hasRemotePhoto(userId, bookingId);
  return hasRemoteReview(userId, bookingId);
}

function fromRemote(
  row: RemoteRequestRow,
  visit: CompletedVisit,
): PostTurnRequest {
  const status: PostTurnRequestStatus =
    row.status === 'completed' || row.completed_at ? 'completed' : 'pending';
  return {
    id: row.id ?? requestKey(visit.userId, visit.bookingId, row.request_type),
    bookingId: visit.bookingId,
    userId: visit.userId,
    restaurantId: visit.restaurantId,
    restaurantName: visit.restaurantName,
    type: row.request_type,
    status,
    requestedAt: row.requested_at ?? new Date().toISOString(),
    turnCompletedAt: visit.turnCompletedAt,
    completedAt: row.completed_at ?? undefined,
    dismissedAt: row.dismissed_at ?? undefined,
    pushSentAt: row.push_sent_at ?? undefined,
    inAppReadAt: row.in_app_read_at ?? undefined,
  };
}

function mergeRequestState(
  local: PostTurnRequest | undefined,
  remote: PostTurnRequest | undefined,
): PostTurnRequest | undefined {
  if (!local) return remote;
  if (!remote) return local;

  const completedAt = local.completedAt ?? remote.completedAt;
  const status: PostTurnRequestStatus =
    local.status === 'completed' || remote.status === 'completed' || completedAt
      ? 'completed'
      : 'pending';

  return {
    ...remote,
    id: remote.id ?? local.id,
    requestedAt: local.requestedAt ?? remote.requestedAt,
    status,
    completedAt,
    dismissedAt: local.dismissedAt ?? remote.dismissedAt,
    pushSentAt: local.pushSentAt ?? remote.pushSentAt,
    inAppReadAt: local.inAppReadAt ?? remote.inAppReadAt,
  };
}

async function upsertRemoteRequests(requests: PostTurnRequest[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || requests.length === 0) return;

  try {
    await supabase.from('post_turn_visit_requests').upsert(
      requests.map((request) => ({
        booking_id: request.bookingId,
        user_id: request.userId,
        restaurant_id: request.restaurantId,
        request_type: request.type,
        requested_at: request.requestedAt,
        completed_at: request.completedAt ?? null,
        dismissed_at: request.dismissedAt ?? null,
        push_sent_at: request.pushSentAt ?? null,
        in_app_read_at: request.inAppReadAt ?? null,
        status: request.status,
      })),
      { onConflict: 'booking_id,user_id,request_type' },
    );
  } catch {
    // The app can still keep local request state if the migration has not run.
  }
}

export async function syncPostTurnRequests(user: User | null | undefined): Promise<PostTurnRequest[]> {
  if (!canReceivePostTurn(user)) return [];

  const userId = user.id;
  const [visits, localRequests, remoteRequests] = await Promise.all([
    fetchLiveCompletedVisits(user),
    loadLocalRequests(userId),
    fetchRemoteRequests(userId),
  ]);

  const byKey = new Map<string, PostTurnRequest>();
  localRequests.forEach((request) => {
    byKey.set(requestKey(userId, request.bookingId, request.type), request);
  });

  const nowIso = new Date().toISOString();
  for (const visit of visits) {
    for (const type of REQUEST_TYPES) {
      const key = requestKey(userId, visit.bookingId, type);
      const local = byKey.get(key);
      const remote = remoteRequests.get(key);
      const current = mergeRequestState(local, remote ? fromRemote(remote, visit) : undefined);
      const completed = await isRequestCompleted(current, userId, visit.bookingId, type);
      const next: PostTurnRequest = {
        id: current?.id ?? key,
        bookingId: visit.bookingId,
        userId,
        restaurantId: visit.restaurantId,
        restaurantName: visit.restaurantName,
        type,
        status: completed ? 'completed' : 'pending',
        requestedAt: current?.requestedAt ?? nowIso,
        turnCompletedAt: visit.turnCompletedAt,
        completedAt: completed ? current?.completedAt ?? nowIso : undefined,
        dismissedAt: completed ? undefined : current?.dismissedAt,
        pushSentAt: current?.pushSentAt,
        inAppReadAt: current?.inAppReadAt,
      };

      if (!completed && !next.pushSentAt) {
        const sent = await sendPostTurnPushNotification(next);
        if (sent) next.pushSentAt = new Date().toISOString();
      }

      byKey.set(key, next);
    }
  }

  const requests = [...byKey.values()].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
  await saveLocalRequests(userId, requests);
  void upsertRemoteRequests(requests);
  return requests.filter((request) => request.status === 'pending');
}

export async function getPostTurnNotifications(user: User | null | undefined): Promise<PostTurnRequest[]> {
  return syncPostTurnRequests(user);
}

export async function dismissPostTurnRequest(userId: string, requestId: string): Promise<void> {
  const requests = await loadLocalRequests(userId);
  const next = requests.map((request) =>
    request.id === requestId
      ? { ...request, dismissedAt: request.dismissedAt ?? new Date().toISOString() }
      : request,
  );
  await saveLocalRequests(userId, next);
  void upsertRemoteRequests(next.filter((request) => request.id === requestId));
}

export async function submitPostTurnReview(params: {
  userId: string;
  bookingId: string;
  restaurantId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body?: string;
}): Promise<void> {
  const completedAt = new Date().toISOString();
  const requests = await loadLocalRequests(params.userId);
  const next = requests.map((request) =>
    request.bookingId === params.bookingId && request.type === 'review'
      ? {
          ...request,
          status: 'completed' as const,
          completedAt,
          dismissedAt: undefined,
        }
      : request,
  );
  await saveLocalRequests(params.userId, next);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('restaurant_reviews').upsert(
        {
          booking_id: params.bookingId,
          user_id: params.userId,
          restaurant_id: params.restaurantId,
          rating: params.rating,
          body: params.body?.trim() || null,
          created_at: completedAt,
        },
        { onConflict: 'booking_id,user_id' },
      );
    } catch {
      // Local completion still prevents duplicate prompts on this device.
    }
  }

  void upsertRemoteRequests(next.filter((request) => request.bookingId === params.bookingId && request.type === 'review'));
}

export async function completePostTurnPhoto(params: {
  userId: string;
  bookingId?: string | null;
  restaurantId: string;
  imageUrl: string;
  caption?: string;
}): Promise<void> {
  const completedAt = new Date().toISOString();

  if (params.bookingId) {
    const requests = await loadLocalRequests(params.userId);
    const next = requests.map((request) =>
      request.bookingId === params.bookingId && request.type === 'photo'
        ? {
            ...request,
            status: 'completed' as const,
            completedAt,
            dismissedAt: undefined,
          }
        : request,
    );
    await saveLocalRequests(params.userId, next);
    void upsertRemoteRequests(next.filter((request) => request.bookingId === params.bookingId && request.type === 'photo'));
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('visit_photos').insert({
        booking_id: params.bookingId ?? null,
        user_id: params.userId,
        restaurant_id: params.restaurantId,
        image_url: params.imageUrl,
        caption: params.caption?.trim() || null,
        created_at: completedAt,
      });
    } catch {
      // Local completion still prevents duplicate prompts on this device.
    }
  }
}

export async function getLatestCompletedVisitForRestaurant(
  user: User | null | undefined,
  restaurantId: string,
): Promise<CompletedVisit | null> {
  if (!canReceivePostTurn(user) || !restaurantId) return null;
  const visits = await fetchLiveCompletedVisits(user);
  return visits.find((visit) => visit.restaurantId === restaurantId) ?? null;
}

export async function hasCompletedVisitForRestaurant(
  user: User | null | undefined,
  restaurantId: string,
): Promise<boolean> {
  const visit = await getLatestCompletedVisitForRestaurant(user, restaurantId);
  return Boolean(visit);
}
