import { getSupabase } from '@/lib/supabase/client';

/**
 * Kitchen Display System ticket shape rendered by the (staff)/ordersKds screen.
 *
 * Mirrors the legacy `KdsTicket` shape from `lib/mock/ownerApp.ts` so the UI
 * can swap between mock data and live reads without diverging. The optional
 * `restaurantId` lets the all-restaurants view show a small per-row pill.
 */
export interface KdsTicket {
  id: string;
  station: 'Kitchen' | 'Bar' | 'Dessert';
  table: string;
  items: string;
  status: 'fired' | 'in_progress' | 'ready';
  /** Minutes on station / ticket age. */
  mins: number;
  /** Explicit SLA breach (UI may also infer from `mins`). */
  delayed?: boolean;
  /** Source restaurant — only needed when rendering across the owner's full set. */
  restaurantId?: string;
}

/** What kind of reservation transition produced this feed event. */
export type LiveFeedKind = 'seated' | 'order' | 'arrived' | 'alert';

/** A single row in the live-feed sidebar on the KDS screen. */
export interface LiveFeedEvent {
  id: string;
  kind: LiveFeedKind;
  message: string;
  timeLabel: string;
  /** Source restaurant — only needed when rendering across the owner's full set. */
  restaurantId?: string;
}

const ACTIVE_ORDER_STATUSES = ['open', 'in_progress', 'fired', 'preparing', 'ready'];
const DEFAULT_FEED_LIMIT = 20;

function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

function orderStatusToKds(s: string | null | undefined): KdsTicket['status'] {
  switch ((s ?? '').toLowerCase()) {
    case 'ready':
    case 'served':
      return 'ready';
    case 'in_progress':
    case 'preparing':
    case 'cooking':
      return 'in_progress';
    default:
      return 'fired';
  }
}

type OrderRowSubset = {
  id: string;
  restaurant_id: string | null;
  table_id: string | null;
  status: string | null;
  created_at: string | null;
  notes?: string | null;
};

/**
 * Read open KDS tickets across the supplied restaurants. Returns `[]` on
 * error so the UI keeps rendering a stable shape.
 */
export async function fetchKdsTickets(restaurantIds: string[]): Promise<KdsTicket[]> {
  const supabase = getSupabase();
  if (!supabase || restaurantIds.length === 0) return [];

  try {
    const { data: orderRows, error } = await supabase
      .from('orders')
      .select('id,restaurant_id,table_id,status,created_at,notes')
      .in('restaurant_id', restaurantIds)
      .in('status', ACTIVE_ORDER_STATUSES)
      .order('created_at', { ascending: true });
    if (error || !orderRows) {
      if (error) console.log('[kdsFeed] orders query failed', error.message);
      return [];
    }
    const orders = orderRows as OrderRowSubset[];
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return [];

    const { data: itemRows, error: itemErr } = await supabase
      .from('order_items')
      .select('id,order_id,name,quantity,course,status')
      .in('order_id', orderIds);
    if (itemErr) console.log('[kdsFeed] order_items query failed', itemErr.message);

    const itemIds = (itemRows ?? [])
      .map((r) => String((r as Record<string, unknown>).id ?? ''))
      .filter(Boolean);
    const modifierByItem = new Map<string, string[]>();
    if (itemIds.length) {
      const { data: modRows, error: modErr } = await supabase
        .from('order_item_modifiers')
        .select('order_item_id,modifier_option_id,quantity')
        .in('order_item_id', itemIds);
      if (modErr) console.log('[kdsFeed] order_item_modifiers query failed', modErr.message);
      (modRows ?? []).forEach((row) => {
        const r = row as Record<string, unknown>;
        const itemId = String(r.order_item_id ?? '');
        if (!itemId) return;
        const list = modifierByItem.get(itemId) ?? [];
        list.push(String(r.modifier_option_id ?? ''));
        modifierByItem.set(itemId, list);
      });
    }

    const tableLabelById = new Map<string, string>();
    const tableIds = Array.from(
      new Set(orders.map((o) => o.table_id).filter((v): v is string => !!v)),
    );
    if (tableIds.length) {
      const { data: tableRows, error: tableErr } = await supabase
        .from('tables')
        .select('id,label,table_number')
        .in('id', tableIds);
      if (tableErr) console.log('[kdsFeed] tables query failed', tableErr.message);
      (tableRows ?? []).forEach((row) => {
        const r = row as Record<string, unknown>;
        const id = String(r.id ?? '');
        const label =
          (typeof r.label === 'string' && r.label) ||
          (typeof r.table_number === 'string' && r.table_number) ||
          id.slice(0, 4);
        if (id) tableLabelById.set(id, String(label));
      });
    }

    const itemsByOrder = new Map<string, Array<Record<string, unknown>>>();
    (itemRows ?? []).forEach((row) => {
      const r = row as Record<string, unknown>;
      const orderId = String(r.order_id ?? '');
      if (!orderId) return;
      const list = itemsByOrder.get(orderId) ?? [];
      list.push(r);
      itemsByOrder.set(orderId, list);
    });

    return orders.map<KdsTicket>((order) => {
      const items = itemsByOrder.get(order.id) ?? [];
      const itemsText =
        items
          .map((it) => {
            const qty = typeof it.quantity === 'number' ? it.quantity : Number(it.quantity ?? 1);
            const name = typeof it.name === 'string' ? it.name : 'Item';
            const mods = modifierByItem.get(String(it.id ?? '')) ?? [];
            const modSuffix = mods.length ? ` (+${mods.length})` : '';
            return `${qty}× ${name}${modSuffix}`;
          })
          .join(' · ') || 'No items';
      const courses = new Set(
        items
          .map((it) => (typeof it.course === 'string' ? it.course.toLowerCase() : ''))
          .filter(Boolean),
      );
      let station: KdsTicket['station'] = 'Kitchen';
      if (courses.has('drinks') || courses.has('bar')) station = 'Bar';
      else if (courses.has('dessert')) station = 'Dessert';
      return {
        id: order.id,
        station,
        table: order.table_id
          ? tableLabelById.get(order.table_id) ?? order.table_id.slice(0, 4)
          : '—',
        items: itemsText,
        status: orderStatusToKds(order.status),
        mins: minutesSince(order.created_at),
        restaurantId: order.restaurant_id ?? undefined,
      };
    });
  } catch (err) {
    console.log('[kdsFeed] fetchKdsTickets failed', (err as Error)?.message ?? err);
    return [];
  }
}

type ReservationFeedRow = {
  id: string;
  restaurant_id: string | null;
  status: string | null;
  party_size: number | null;
  guest_full_name: string | null;
  confirmation_code: string | null;
  table_id: string | null;
  reserved_at: string | null;
  updated_at: string | null;
  seated_at: string | null;
  checked_in_at: string | null;
  cancelled_at: string | null;
};

function todayStartIso(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return start.toISOString();
}

function tomorrowStartIso(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return start.toISOString();
}

function formatTimeLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const diffMin = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (diffMin <= 0) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ms).toLocaleDateString();
}

function partyLabel(row: ReservationFeedRow): string {
  if (row.guest_full_name) return row.guest_full_name;
  if (row.confirmation_code) return row.confirmation_code;
  return 'Party';
}

function kindFor(row: ReservationFeedRow): { kind: LiveFeedKind; message: string } | null {
  const status = (row.status ?? '').toLowerCase();
  const party = partyLabel(row);
  const size = row.party_size ? ` · Party of ${row.party_size}` : '';
  if (status === 'seated') {
    return { kind: 'seated', message: `${party} seated${size}` };
  }
  if (status === 'checked_in' || status === 'arrived') {
    return { kind: 'arrived', message: `${party} arrived${size}` };
  }
  if (status === 'no_show') {
    return { kind: 'alert', message: `${party} marked no-show` };
  }
  if (status === 'cancelled' || status === 'canceled') {
    return { kind: 'alert', message: `${party} cancelled` };
  }
  return null;
}

/**
 * Recent reservation-status transitions for today across the supplied
 * restaurants. Used to populate the live-feed sidebar on the KDS screen.
 * Returns `[]` on error.
 */
export async function fetchRecentLiveFeed(
  restaurantIds: string[],
  limit: number = DEFAULT_FEED_LIMIT,
): Promise<LiveFeedEvent[]> {
  const supabase = getSupabase();
  if (!supabase || restaurantIds.length === 0) return [];

  try {
    const fromIso = todayStartIso();
    const toIso = tomorrowStartIso();
    const { data, error } = await supabase
      .from('reservations')
      .select(
        'id,restaurant_id,status,party_size,guest_full_name,confirmation_code,table_id,reserved_at,updated_at,seated_at,checked_in_at,cancelled_at',
      )
      .in('restaurant_id', restaurantIds)
      .gte('reserved_at', fromIso)
      .lt('reserved_at', toIso)
      .in('status', ['seated', 'checked_in', 'arrived', 'no_show', 'cancelled'])
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) {
      if (error) console.log('[kdsFeed] reservations query failed', error.message);
      return [];
    }

    const rows = data as ReservationFeedRow[];
    const events: LiveFeedEvent[] = [];
    for (const row of rows) {
      const k = kindFor(row);
      if (!k) continue;
      const sortIso =
        row.updated_at ?? row.seated_at ?? row.checked_in_at ?? row.cancelled_at ?? row.reserved_at ?? null;
      events.push({
        id: `${row.id}:${row.status ?? 'event'}`,
        kind: k.kind,
        message: k.message,
        timeLabel: formatTimeLabel(sortIso),
        restaurantId: row.restaurant_id ?? undefined,
      });
    }
    return events.slice(0, limit);
  } catch (err) {
    console.log('[kdsFeed] fetchRecentLiveFeed failed', (err as Error)?.message ?? err);
    return [];
  }
}
