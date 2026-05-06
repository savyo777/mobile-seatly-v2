// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { getAvailability } from "../_shared/availability.ts";
import { localBookingParts } from "../_shared/hours.ts";
import { decodeJwtPayload } from "../_shared/jwt.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

type PublicBookingCartItem = {
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
};

type PublicBookingPayload = {
  restaurant_id?: unknown;
  shift_id?: unknown;
  date_time?: unknown;
  party_size?: unknown;
  guest_name?: unknown;
  guest_email?: unknown;
  guest_phone?: unknown;
  allergies?: unknown;
  seating_preference?: unknown;
  occasion?: unknown;
  cart_items?: unknown;
  subtotal?: unknown;
  tax_amount?: unknown;
  tip_amount?: unknown;
  total_amount?: unknown;
  discount_amount?: unknown;
  discount_reason?: unknown;
  promotion_id?: unknown;
  payment_method?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function money(value: unknown): number {
  return Math.round(asNumber(value, 0) * 100) / 100;
}

function parseCartItems(value: unknown): PublicBookingCartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const name = asString(item.name);
    const quantity = Math.max(1, Math.floor(asNumber(item.quantity, 0)));
    const unitPrice = money(item.unit_price);
    if (!name || quantity < 1 || unitPrice < 0) return [];
    return [{
      menu_item_id: asNullableString(item.menu_item_id),
      name,
      quantity,
      unit_price: unitPrice,
    }];
  });
}

function makeConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SEAT-";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getProfileIdFromAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const authUserId = typeof payload?.sub === "string" ? payload.sub : null;
  if (!authUserId) return null;
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return data?.id ?? null;
}

async function getRestaurant(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select("id,name,timezone,tax_rate,currency")
    .eq("id", restaurantId)
    .single();
  if (error || !data) throw new Error("Restaurant not found.");
  return data;
}

async function getShiftDuration(shiftId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("shifts")
    .select("turn_time_minutes")
    .eq("id", shiftId)
    .single();
  return Number(data?.turn_time_minutes) || 90;
}

async function findAvailableTableId(params: {
  restaurantId: string;
  partySize: number;
  dateTime: string;
  durationMinutes: number;
}): Promise<string | null> {
  const { data: tables, error: tableError } = await supabaseAdmin
    .from("tables")
    .select("id,capacity")
    .eq("restaurant_id", params.restaurantId)
    .eq("is_active", true)
    .gte("capacity", params.partySize)
    .order("capacity", { ascending: true });
  if (tableError || !tables?.length) return null;

  const start = new Date(params.dateTime);
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);
  const dayStart = new Date(start);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const { data: reservations } = await supabaseAdmin
    .from("reservations")
    .select("table_id,reserved_at")
    .eq("restaurant_id", params.restaurantId)
    .in("status", ["pending", "confirmed", "seated"])
    .not("table_id", "is", null)
    .gte("reserved_at", dayStart.toISOString())
    .lte("reserved_at", dayEnd.toISOString());

  const blocked = new Set<string>();
  for (const reservation of reservations ?? []) {
    if (!reservation.table_id || !reservation.reserved_at) continue;
    const reservationStart = new Date(reservation.reserved_at);
    const reservationEnd = new Date(reservationStart.getTime() + params.durationMinutes * 60_000);
    if (start < reservationEnd && end > reservationStart) {
      blocked.add(reservation.table_id);
    }
  }

  return tables.find((table) => !blocked.has(table.id))?.id ?? null;
}

async function hasActiveTables(restaurantId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);
  if (error) return false;
  return (count ?? 0) > 0;
}

async function verifySlot(params: {
  restaurantId: string;
  shiftId: string;
  dateOnly: string;
  dateTime: string;
  partySize: number;
}): Promise<boolean> {
  const availability = await getAvailability(params.restaurantId, params.dateOnly, params.partySize);
  const requestedMs = new Date(params.dateTime).getTime();
  return (availability.slots ?? []).some((slot) =>
    slot.shift_id === params.shiftId &&
    Math.abs(new Date(slot.date_time).getTime() - requestedMs) < 1000
  );
}

async function findOrCreateGuest(params: {
  restaurantId: string;
  userProfileId: string | null;
  name: string;
  email: string;
  phone: string | null;
  allergies: string | null;
  seatingPreference: string | null;
}): Promise<string> {
  let existingQuery = supabaseAdmin
    .from("guests")
    .select("id")
    .eq("restaurant_id", params.restaurantId);

  if (params.userProfileId) {
    existingQuery = existingQuery.eq("user_profile_id", params.userProfileId);
  } else {
    existingQuery = existingQuery.eq("email", params.email);
  }

  const { data: existing } = await existingQuery.maybeSingle();
  const guestFields = {
    full_name: params.name,
    email: params.email,
    phone: params.phone,
    user_profile_id: params.userProfileId,
    dietary_restrictions: params.allergies
      ? params.allergies.split(",").map((value) => value.trim()).filter(Boolean)
      : [],
    seating_preference: params.seatingPreference,
  };

  if (existing?.id) {
    await supabaseAdmin.from("guests").update(guestFields).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from("guests")
    .insert({ restaurant_id: params.restaurantId, ...guestFields })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`Guest creation failed: ${error?.message ?? "unknown_error"}`);
  return data.id;
}

async function findDuplicateReservation(params: {
  restaurantId: string;
  guestId: string;
  dateTime: string;
}) {
  const { data } = await supabaseAdmin
    .from("reservations")
    .select("id,confirmation_code,table_id")
    .eq("restaurant_id", params.restaurantId)
    .eq("guest_id", params.guestId)
    .eq("reserved_at", params.dateTime)
    .in("status", ["pending", "confirmed", "seated"])
    .maybeSingle();
  return data ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json() as PublicBookingPayload;
    const restaurantId = asString(body.restaurant_id);
    const shiftId = asString(body.shift_id);
    const dateTime = asString(body.date_time);
    const guestName = asString(body.guest_name);
    const guestEmail = asString(body.guest_email);
    const partySize = Math.max(1, Math.floor(asNumber(body.party_size, 0)));

    if (!restaurantId || !shiftId || !dateTime || !guestName || !guestEmail) {
      return jsonRes({ error: "restaurant_id, shift_id, date_time, guest_name, and guest_email are required" }, 400);
    }
    if (!Number.isFinite(new Date(dateTime).getTime())) {
      return jsonRes({ error: "date_time must be a valid ISO timestamp" }, 400);
    }
    if (partySize < 1) {
      return jsonRes({ error: "party_size must be at least 1" }, 400);
    }

    const restaurant = await getRestaurant(restaurantId);
    const localParts = localBookingParts(dateTime, restaurant.timezone || "UTC");
    if (!localParts) return jsonRes({ error: "date_time is not valid for the restaurant timezone" }, 400);

    const durationMinutes = await getShiftDuration(shiftId);
    const userProfileId = await getProfileIdFromAuth(req);
    const guestId = await findOrCreateGuest({
      restaurantId,
      userProfileId,
      name: guestName,
      email: guestEmail,
      phone: asNullableString(body.guest_phone),
      allergies: asNullableString(body.allergies),
      seatingPreference: asNullableString(body.seating_preference),
    });

    const duplicate = await findDuplicateReservation({ restaurantId, guestId, dateTime });
    if (duplicate?.id) {
      return jsonRes({
        reservation_id: duplicate.id,
        order_id: null,
        confirmation_code: duplicate.confirmation_code ?? "",
        table_ids: duplicate.table_id ? [duplicate.table_id] : [],
        duration_minutes: durationMinutes,
        confirmation_delivery: "skipped",
        confirmation_delivery_channel: null,
        reused: true,
      });
    }

    const slotStillAvailable = await verifySlot({
      restaurantId,
      shiftId,
      dateOnly: localParts.dateOnly,
      dateTime,
      partySize,
    });
    if (!slotStillAvailable) {
      return jsonRes({ error: "That time is no longer available. Please choose another slot." }, 409);
    }

    const tableId = await findAvailableTableId({
      restaurantId,
      partySize,
      dateTime,
      durationMinutes,
    });
    const restaurantHasTables = tableId ? true : await hasActiveTables(restaurantId);
    if (!tableId && restaurantHasTables) {
      return jsonRes({ error: "That time is no longer available. Please choose another slot." }, 409);
    }

    const confirmationCode = makeConfirmationCode();
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from("reservations")
      .insert({
        restaurant_id: restaurantId,
        guest_id: guestId,
        table_id: tableId ?? null,
        shift_id: shiftId,
        party_size: partySize,
        reserved_at: dateTime,
        status: "confirmed",
        source: "app",
        special_request: asNullableString(body.allergies),
        occasion: asNullableString(body.occasion),
        confirmation_code: confirmationCode,
        confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (reservationError || !reservation?.id) {
      throw new Error(`Reservation failed: ${reservationError?.message ?? "unknown_error"}`);
    }

    const cartItems = parseCartItems(body.cart_items);
    let orderId: string | null = null;
    if (cartItems.length > 0) {
      const subtotal = money(body.subtotal);
      const taxAmount = money(body.tax_amount);
      const tipAmount = money(body.tip_amount);
      const totalAmount = money(body.total_amount);
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          reservation_id: reservation.id,
          guest_id: guestId,
          is_preorder: true,
          order_type: "dine_in",
          status: "pending",
          subtotal,
          tax_amount: taxAmount,
          tip_amount: tipAmount,
          total_amount: totalAmount,
          discount_amount: body.discount_amount == null ? null : money(body.discount_amount),
          discount_reason: asNullableString(body.discount_reason),
          promotion_id: asNullableString(body.promotion_id),
          payment_method: body.payment_method === "split" ? "split" : "card",
          confirmation_code: confirmationCode,
        })
        .select("id")
        .single();
      if (orderError || !order?.id) {
        throw new Error(`Order creation failed: ${orderError?.message ?? "unknown_error"}`);
      }
      orderId = order.id;

      const { error: itemError } = await supabaseAdmin.from("order_items").insert(
        cartItems.map((item) => ({
          order_id: orderId,
          menu_item_id: item.menu_item_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: money(item.unit_price * item.quantity),
          status: "pending",
        })),
      );
      if (itemError) {
        throw new Error(`Order items failed: ${itemError.message}`);
      }

      const promotionId = asNullableString(body.promotion_id);
      if (promotionId) {
        const { data: promo } = await supabaseAdmin
          .from("promotions")
          .select("current_uses")
          .eq("id", promotionId)
          .single();
        if (promo) {
          await supabaseAdmin
            .from("promotions")
            .update({ current_uses: (Number(promo.current_uses) || 0) + 1 })
            .eq("id", promotionId);
        }
      }
    }

    return jsonRes({
      reservation_id: reservation.id,
      order_id: orderId,
      confirmation_code: confirmationCode,
      table_ids: tableId ? [tableId] : [],
      duration_minutes: durationMinutes,
      confirmation_delivery: "skipped",
      confirmation_delivery_channel: null,
      reused: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("create-public-booking error:", message);
    return jsonRes({ error: message || "booking_failed" }, 500);
  }
});
