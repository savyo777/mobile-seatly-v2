import { getSupabase } from '@/lib/supabase/client';

type EdgeResult<T> = { data: T | null; error: string | null };

async function invokeEdge<T>(slug: string, body: Record<string, unknown>): Promise<EdgeResult<T>> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'supabase_not_configured' };
  const { data, error } = await supabase.functions.invoke(slug, { body });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? null) as T | null, error: null };
}

async function callRpc<T>(name: string, args: Record<string, unknown>): Promise<EdgeResult<T>> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'supabase_not_configured' };
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { data: null, error: error.message };
  return { data: (data ?? null) as T | null, error: null };
}

// ─── Edge function wrappers ──────────────────────────────────────────────

export function checkInGuest(args: { reservationId: string; restaurantId?: string }) {
  return invokeEdge('check-in-guest', {
    reservation_id: args.reservationId,
    restaurant_id: args.restaurantId,
  });
}

export type StaffInviteArgs = {
  restaurantId: string;
  email?: string;
  phone?: string;
  role: string;
  fullName?: string;
};

export function inviteStaff(args: StaffInviteArgs) {
  return invokeEdge('invite-staff', {
    restaurant_id: args.restaurantId,
    email: args.email,
    phone: args.phone,
    role: args.role,
    full_name: args.fullName,
  });
}

export function acceptStaffInvite(token: string) {
  return invokeEdge('accept-staff-invite', { token });
}

export function getMyStaffInvites() {
  return invokeEdge<{ invites: Array<Record<string, unknown>> }>('get-my-staff-invites', {});
}

export function approveStaffAction(args: {
  approvalId: string;
  decision: 'approve' | 'deny';
  notes?: string;
}) {
  return invokeEdge('approve-staff-action', {
    approval_id: args.approvalId,
    decision: args.decision,
    notes: args.notes,
  });
}

// ─── RPC wrappers ─────────────────────────────────────────────────────────

export function seatStaffReservation(args: { reservationId: string; tableId: string }) {
  return callRpc('seat_staff_reservation', {
    p_reservation_id: args.reservationId,
    p_table_id: args.tableId,
  });
}

export function updateStaffReservationStatus(args: {
  reservationId: string;
  status: string;
  approvalToken?: string;
}) {
  return callRpc('update_staff_reservation_status', {
    p_reservation_id: args.reservationId,
    p_status: args.status,
    p_approval_token: args.approvalToken,
  });
}

export function createStaffReservation(args: {
  restaurantId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize: number;
  reservedAt: string;
  specialRequest?: string;
}) {
  return callRpc('create_staff_reservation', {
    p_restaurant_id: args.restaurantId,
    p_guest_name: args.guestName,
    p_guest_email: args.guestEmail,
    p_guest_phone: args.guestPhone,
    p_party_size: args.partySize,
    p_reserved_at: args.reservedAt,
    p_special_request: args.specialRequest,
  });
}

export function updateTableServiceStatus(args: {
  tableId: string;
  status: string;
  seatedCount?: number;
}) {
  return callRpc('update_table_service_status', {
    p_table_id: args.tableId,
    p_status: args.status,
    p_seated_count: args.seatedCount ?? 0,
  });
}

/**
 * @deprecated Mobile callers should use `fetchFloorCapacity` from
 * `@/lib/owner/floorCapacity`, which sums `tables.capacity` on-device. The
 * server-side RPC is still used by `supabase/functions/create-public-booking`,
 * so the wrapper remains exported for parity.
 */
export function fetchRestaurantFloorCapacity(restaurantId: string) {
  return callRpc<{ capacity: number }>('restaurant_floor_capacity', {
    p_restaurant_id: restaurantId,
  });
}

export function createManagerActionApproval(args: { restaurantId: string; action: string }) {
  return callRpc<{ token: string }>('create_manager_action_approval', {
    p_restaurant_id: args.restaurantId,
    p_action: args.action,
  });
}

export function consumeManagerApproval(args: {
  restaurantId: string;
  action: string;
  token: string;
}) {
  return callRpc('consume_manager_approval', {
    p_restaurant_id: args.restaurantId,
    p_action: args.action,
    p_token: args.token,
  });
}

export function fetchCrmGuestRows(restaurantId: string) {
  return callRpc<Array<Record<string, unknown>>>('crm_guest_rows', {
    p_restaurant_id: restaurantId,
  });
}
