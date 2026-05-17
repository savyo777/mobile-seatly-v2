// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforceRateLimit, rateLimitIdentifier, RateLimitError } from "../_shared/rate-limit.ts";
import { sendSmsOrEmail, logCommunication, sanitizeForSmsField } from "../_shared/sms.ts";
import {
  closureUnavailableMessage,
  findClosedSpecialDayForDate,
  localDateForDateTime,
} from "../_shared/closures.ts";
import {
  readJsonObject,
  validationResponse,
  asText as validatedText,
  asEmail as validatedEmail,
  asUuid as validatedUuid,
  normalizePhoneToE164 as validatedPhone,
} from "../_shared/input-validation.ts";

// CORS is enforced via the shared allowlist (set ALLOWED_ORIGINS env on
// the function). Mobile callers don't send Origin so they're unaffected;
// only browser callers get the allowlist restriction. The previous local
// wildcard ("Access-Control-Allow-Origin: *") was a P0 finding in the
// 2026-05-17 security audit — replaced here.
import { corsHeaders, buildCorsHeaders } from "../_shared/cors.ts";

type CartItemInput = {
  menu_item_id?: unknown;
  name?: unknown;
  quantity?: unknown;
  unit_price?: unknown;
};

type BookingPayload = {
  restaurant_id?: unknown;
  date_time?: unknown;
  shift_id?: unknown;
  party_size?: unknown;
  guest_name?: unknown;
  guest_email?: unknown;
  guest_phone?: unknown;
  allergies?: unknown;
  seating_preference?: unknown;
  occasion?: unknown;
  confirmation_code?: unknown;
  cart_items?: CartItemInput[];
  subtotal?: unknown;
  tax_amount?: unknown;
  tip_amount?: unknown;
  total_amount?: unknown;
  discount_amount?: unknown;
  discount_reason?: unknown;
  promotion_id?: unknown;
  applied_promo_code?: unknown;
  payment_method?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asText(value: unknown): string | null {
  return validatedText(value, "text", { maxLength: 1000, multiline: true });
}

function normalizeEmail(value: string | null): string | null {
  return value ? validatedEmail(value, "email") : null;
}

function asUuid(value: unknown): string | null {
  return validatedUuid(value, "id");
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value: unknown): number {
  return Math.round(asNumber(value) * 100) / 100;
}

type NormalizedCartItem = {
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

/**
 * Server-side amount validation. Reload each cart item's canonical
 * unit_price from menu_items + the restaurant's tax_rate, recompute
 * the totals, and reject the request if the caller's claimed amounts
 * deviate from server-computed by more than a cent.
 *
 * Added 2026-05-17 in response to the security audit P0 finding:
 * mobile clients sent subtotal/tax/tip/total fields that the server
 * stored verbatim, so a tampered client could pay $0.10 for a $100
 * order. The server is now authoritative for prices.
 *
 * Cart items without a menu_item_id (ad-hoc add-ons) keep their
 * claimed unit_price — but we cap tip + discount at 100% of subtotal
 * so even those can't be used to gain net value.
 */
async function validateAndRecomputeAmounts(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  cartItems: NormalizedCartItem[],
  claimed: {
    subtotal: number;
    tax_amount: number;
    tip_amount: number;
    total_amount: number;
    discount_amount: number;
  },
): Promise<
  | { ok: true; recomputed: typeof claimed; cartItems: NormalizedCartItem[] }
  | { ok: false; error: string; detail: Record<string, unknown> }
> {
  const TOLERANCE_CENTS = 1;
  const TOLERANCE = TOLERANCE_CENTS / 100;

  // 1. Restaurant tax rate.
  const { data: restRow, error: restErr } = await supabase
    .from("restaurants")
    .select("tax_rate")
    .eq("id", restaurantId)
    .maybeSingle();
  if (restErr) {
    return {
      ok: false,
      error: "tax_rate_lookup_failed",
      detail: { message: restErr.message },
    };
  }
  const taxRate = Number(restRow?.tax_rate ?? 0);
  const safeTaxRate = Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 0;

  // 2. Canonical menu prices.
  const menuItemIds = cartItems
    .map((c) => c.menu_item_id)
    .filter((id): id is string => !!id);
  const priceById = new Map<string, number>();
  if (menuItemIds.length > 0) {
    const { data: menuRows, error: menuErr } = await supabase
      .from("menu_items")
      .select("id, price")
      .in("id", menuItemIds);
    if (menuErr) {
      return {
        ok: false,
        error: "menu_price_lookup_failed",
        detail: { message: menuErr.message },
      };
    }
    for (const row of menuRows ?? []) {
      const p = Number((row as { price?: unknown }).price ?? NaN);
      if (Number.isFinite(p) && p >= 0) {
        priceById.set((row as { id: string }).id, p);
      }
    }
  }

  // 3. Recompute each item with canonical price; sum subtotal.
  const recomputedItems: NormalizedCartItem[] = cartItems.map((c) => {
    const canonical = c.menu_item_id ? priceById.get(c.menu_item_id) : undefined;
    const unitPrice = canonical !== undefined ? canonical : c.unit_price;
    return {
      menu_item_id: c.menu_item_id,
      name: c.name,
      quantity: c.quantity,
      unit_price: roundMoney(unitPrice),
      line_total: roundMoney(unitPrice * c.quantity),
    };
  });
  const computedSubtotal = roundMoney(
    recomputedItems.reduce((sum, item) => sum + item.line_total, 0),
  );

  // 4. Tax derives from subtotal × restaurant tax_rate.
  const computedTax = roundMoney(computedSubtotal * safeTaxRate);

  // 5. Tip + discount are user-controlled but capped at 100% of
  //    (subtotal + tax) so they can't be used to manipulate net value.
  const cap = computedSubtotal + computedTax;
  const computedTip = roundMoney(
    Math.max(0, Math.min(claimed.tip_amount, cap)),
  );
  const computedDiscount = roundMoney(
    Math.max(0, Math.min(claimed.discount_amount, cap)),
  );

  // 6. Total = subtotal + tax + tip - discount.
  const computedTotal = roundMoney(
    computedSubtotal + computedTax + computedTip - computedDiscount,
  );

  // 7. Compare claimed vs computed total. Subtotal/tax/tip/discount
  //    are each derived above; the user-facing reject reason is on
  //    total.
  if (Math.abs(claimed.total_amount - computedTotal) > TOLERANCE) {
    return {
      ok: false,
      error: "payment_amount_mismatch",
      detail: {
        claimed_total: claimed.total_amount,
        computed_total: computedTotal,
        computed_subtotal: computedSubtotal,
        computed_tax: computedTax,
        computed_tip: computedTip,
        computed_discount: computedDiscount,
      },
    };
  }

  return {
    ok: true,
    recomputed: {
      subtotal: computedSubtotal,
      tax_amount: computedTax,
      tip_amount: computedTip,
      total_amount: computedTotal,
      discount_amount: computedDiscount,
    },
    cartItems: recomputedItems,
  };
}

function normalizeCartItems(value: unknown): Array<{
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as CartItemInput;
    const name = asText(row.name);
    const quantity = Math.max(1, Math.floor(asNumber(row.quantity, 1)));
    const unitPrice = roundMoney(row.unit_price);
    if (!name || unitPrice < 0) return [];
    return [{
      menu_item_id: asUuid(row.menu_item_id),
      name,
      quantity,
      unit_price: unitPrice,
      line_total: roundMoney(unitPrice * quantity),
    }];
  });
}

function formatReservationDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(date);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  try {
    const payload = (await readJsonObject(req)) as BookingPayload;
    const restaurantId = asUuid(payload.restaurant_id);
    const shiftId = asUuid(payload.shift_id);
    const dateTime = asText(payload.date_time);
    const guestName = asText(payload.guest_name);
    const guestEmail = normalizeEmail(asText(payload.guest_email));
    const guestPhone = validatedPhone(payload.guest_phone, "guest_phone") ?? asText(payload.guest_phone);
    const allergies = asText(payload.allergies);
    const seatingPreference = asText(payload.seating_preference);
    const occasion = asText(payload.occasion);
    const promotionId = asUuid(payload.promotion_id);
    const appliedPromoCode = asText(payload.applied_promo_code);
    const confirmationCode =
      asText(payload.confirmation_code) ?? `SEAT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const partySize = Math.max(1, Math.floor(asNumber(payload.party_size, 1)));

    if (!restaurantId || !shiftId || !dateTime || !guestName || !guestEmail) {
      return jsonResponse({ error: "restaurant_id, shift_id, date_time, guest_name, and guest_email are required." }, 400);
    }

    const reservedAt = new Date(dateTime);
    if (Number.isNaN(reservedAt.getTime())) {
      return jsonResponse({ error: "date_time must be a valid ISO timestamp." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    let userProfileId: string | null = null;
    const authorization = req.headers.get("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
    if (token) {
      const { data: authData } = await supabase.auth.getUser(token);
      const authUserId = authData.user?.id ?? null;
      if (authUserId) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("auth_user_id", authUserId)
          .maybeSingle();
        userProfileId = profile?.id ?? null;
      }
    }

    try {
      await enforceRateLimit(supabase, "book", rateLimitIdentifier(req, userProfileId), {
        limit: 20,
        windowSeconds: 60,
      });
    } catch (e) {
      if (e instanceof RateLimitError) {
        return jsonResponse({ error: e.message, unavailable_reason: "rate_limited" }, 429);
      }
      throw e;
    }

    const { data: turnMinutesData, error: turnError } = await supabase.rpc("restaurant_turn_time_minutes", {
      p_restaurant_id: restaurantId,
      p_shift_id: shiftId,
    });
    if (turnError) return jsonResponse({ error: turnError.message }, 400);
    const turnMinutes = Number.isFinite(Number(turnMinutesData)) ? Number(turnMinutesData) : 90;

    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, restaurant_id, min_party_size, max_party_size, max_covers")
      .eq("id", shiftId)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .single();
    if (shiftError || !shift) {
      return jsonResponse({ error: "Shift not found for this restaurant." }, 400);
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name, slug, timezone, hours_json")
      .eq("id", restaurantId)
      .maybeSingle();
    const restaurantName = typeof restaurant?.name === "string" && restaurant.name.trim()
      ? restaurant.name.trim()
      : "the restaurant";
    const restaurantSlug = typeof restaurant?.slug === "string" && restaurant.slug.trim()
      ? restaurant.slug.trim()
      : null;
    const localBookingDate = localDateForDateTime(reservedAt, restaurant?.timezone || "UTC");
    const closure = localBookingDate
      ? findClosedSpecialDayForDate(restaurant?.hours_json, localBookingDate)
      : null;
    if (closure) {
      return jsonResponse(
        { error: closureUnavailableMessage(closure), unavailable_reason: "closed" },
        409,
      );
    }

    const { data: floorCapacityData, error: floorCapacityError } = await supabase.rpc("restaurant_floor_capacity", {
      p_restaurant_id: restaurantId,
    });
    if (floorCapacityError) return jsonResponse({ error: floorCapacityError.message }, 400);
    const floorCapacity = Number.isFinite(Number(floorCapacityData)) ? Number(floorCapacityData) : 0;
    if (partySize > floorCapacity) {
      return jsonResponse(
        {
          error: floorCapacity > 0
            ? `This restaurant can take parties up to ${floorCapacity}.`
            : "This restaurant does not have a saved floor plan yet.",
          floor_capacity: floorCapacity,
        },
        409,
      );
    }

    const existingByEmail = guestEmail
      ? await supabase
        .from("reservations")
        .select("id, confirmation_code, duration_minutes")
        .eq("restaurant_id", restaurantId)
        .eq("reserved_at", reservedAt.toISOString())
        .eq("party_size", partySize)
        .eq("guest_email", guestEmail)
        .in("status", ["pending", "confirmed", "seated"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
      : { data: null };
    const existingByPhone = !existingByEmail.data && guestPhone
      ? await supabase
        .from("reservations")
        .select("id, confirmation_code, duration_minutes")
        .eq("restaurant_id", restaurantId)
        .eq("reserved_at", reservedAt.toISOString())
        .eq("party_size", partySize)
        .eq("guest_phone", guestPhone)
        .in("status", ["pending", "confirmed", "seated"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
      : { data: null };
    const existingContactReservation = existingByEmail.data ?? existingByPhone.data;
    if (existingContactReservation?.id) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("reservation_id", existingContactReservation.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return jsonResponse({
        reservation_id: existingContactReservation.id,
        order_id: existingOrder?.id ?? null,
        confirmation_code:
          typeof existingContactReservation.confirmation_code === "string" && existingContactReservation.confirmation_code.trim()
            ? existingContactReservation.confirmation_code
            : confirmationCode,
        table_ids: [],
        duration_minutes: Number(existingContactReservation.duration_minutes ?? turnMinutes),
        reused: true,
      });
    }

    const { data: canonicalGuestId, error: canonicalGuestError } = await supabase.rpc("canonical_guest_id", {
      p_restaurant_id: restaurantId,
      p_user_profile_id: userProfileId,
      p_email: guestEmail,
      p_phone: guestPhone,
    });
    if (canonicalGuestError) return jsonResponse({ error: `Guest lookup: ${canonicalGuestError.message}` }, 400);

    let guestId: string | null = typeof canonicalGuestId === "string" ? canonicalGuestId : null;

    const guestFields = {
      restaurant_id: restaurantId,
      user_profile_id: userProfileId,
      full_name: guestName,
      email: guestEmail,
      phone: guestPhone,
      dietary_restrictions: allergies ? allergies.split(",").map((value) => value.trim()).filter(Boolean) : [],
      seating_preference: seatingPreference,
    };
    if (!guestId) {
      const { data: newGuest, error: guestError } = await supabase
        .from("guests")
        .insert(guestFields)
        .select("id")
        .single();
      if (guestError) return jsonResponse({ error: `Guest: ${guestError.message}` }, 400);
      guestId = newGuest.id;
    } else {
      await supabase.from("guests").update(guestFields).eq("id", guestId);
    }

    const { data: existingReservation } = await supabase
      .from("reservations")
      .select("id, confirmation_code, duration_minutes")
      .eq("restaurant_id", restaurantId)
      .eq("guest_id", guestId)
      .eq("reserved_at", reservedAt.toISOString())
      .eq("party_size", partySize)
      .in("status", ["pending", "confirmed", "seated"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingReservation?.id) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("reservation_id", existingReservation.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return jsonResponse({
        reservation_id: existingReservation.id,
        order_id: existingOrder?.id ?? null,
        confirmation_code:
          typeof existingReservation.confirmation_code === "string" && existingReservation.confirmation_code.trim()
            ? existingReservation.confirmation_code
            : confirmationCode,
        table_ids: [],
        duration_minutes: Number(existingReservation.duration_minutes ?? turnMinutes),
        reused: true,
      });
    }

    // Diner double-book guard. Blocks a diner from holding two overlapping
    // reservations whether they're at the same restaurant or different ones.
    //
    // Signed-in: only matches by user_profile_id. We trust the authenticated
    // identity over the phone/email — if a user has multiple profiles sharing
    // a phone (e.g. test accounts, family members on the same household
    // number), each profile gets its own booking calendar. The DB's
    // `reservations_user_no_overlap` exclusion constraint enforces the same
    // rule at the row level.
    //
    // Guest checkout: matches by phone OR email since there's no user_profile
    // to scope to. Mirrors the `reservations_guest_email_no_overlap` and
    // `reservations_guest_phone_no_overlap` exclusion constraints.
    //
    // The exact-match idempotency check above already returns the existing
    // reservation when this is a re-submit of the same slot/party, so
    // reaching this guard means the new request is a genuinely different
    // booking that overlaps an existing one.
    {
      const idClauses: string[] = [];
      if (userProfileId) {
        idClauses.push(`user_profile_id.eq.${userProfileId}`);
      } else {
        if (guestEmail) idClauses.push(`guest_email.eq.${guestEmail}`);
        if (guestPhone) idClauses.push(`guest_phone.eq.${guestPhone}`);
      }
      if (idClauses.length > 0) {
        const slotStart = reservedAt;
        const slotEnd = new Date(slotStart.getTime() + turnMinutes * 60_000);
        // Pad ±24h to capture timezone edges; we'll do exact overlap math below.
        const windowStart = new Date(slotStart.getTime() - 24 * 60 * 60_000).toISOString();
        const windowEnd = new Date(slotStart.getTime() + 24 * 60 * 60_000).toISOString();
        const { data: otherBookings } = await supabase
          .from("reservations")
          .select("id, restaurant_id, reserved_at, duration_minutes")
          .in("status", ["pending", "confirmed", "seated"])
          .gte("reserved_at", windowStart)
          .lte("reserved_at", windowEnd)
          .or(idClauses.join(","));
        const overlap = (otherBookings ?? []).find((row) => {
          const otherStart = new Date(row.reserved_at);
          const minutes = typeof row.duration_minutes === "number" && row.duration_minutes > 0
            ? row.duration_minutes
            : 90;
          const otherEnd = new Date(otherStart.getTime() + minutes * 60_000);
          return slotStart < otherEnd && otherStart < slotEnd;
        });
        if (overlap) {
          const sameRestaurant = overlap.restaurant_id === restaurantId;
          return jsonResponse(
            {
              error: sameRestaurant
                ? "You already have a reservation at this restaurant during that window. Please cancel or modify the existing one first."
                : "You already have a reservation at this time at another restaurant. Please cancel or modify that booking first.",
              unavailable_reason: "diner_double_book",
            },
            409,
          );
        }
      }
    }

    // Atomic booking: cover-cap re-check, table selection, reservation insert,
    // and reservation_tables insert all happen under a single advisory lock
    // keyed on (restaurant_id, reserved_at). Two concurrent callers for the
    // same slot serialize cleanly here. The exclusion constraint on
    // reservation_tables is the unbreakable backstop if the lock is somehow
    // bypassed (e.g. direct DB write).
    const { data: bookingRows, error: bookingError } = await supabase.rpc("book_reservation", {
      p_restaurant_id: restaurantId,
      p_shift_id: shiftId,
      p_reserved_at: reservedAt.toISOString(),
      p_party_size: partySize,
      p_turn_minutes: turnMinutes,
      p_guest_id: guestId,
      p_user_profile_id: userProfileId,
      p_confirmation_code: confirmationCode,
      p_source: "web",
      p_special_request: allergies,
      p_dietary_notes: allergies,
      p_occasion: occasion,
      p_is_guest_checkout: !userProfileId,
      p_guest_full_name: guestName,
      p_guest_email: guestEmail,
      p_guest_phone: guestPhone,
      p_event_id: null,
      p_promotion_id: promotionId,
      p_applied_promo_code: appliedPromoCode,
    });

    if (bookingError) {
      const code = (bookingError as { code?: string }).code;
      if (code === "P0001") {
        return jsonResponse(
          { error: "This time was just taken. Please pick another slot.", unavailable_reason: "slot_taken" },
          409,
        );
      }
      if (code === "P0002") {
        return jsonResponse({ error: "This time no longer has enough cover capacity.", unavailable_reason: "over_cover_cap" }, 409);
      }
      if (code === "P0003") {
        return jsonResponse({ error: "Shift not found for this restaurant." }, 400);
      }
      // P0006 raised by book_reservation when the same diner already has an
      // overlapping active reservation. 23P01 is the partial-exclusion
      // constraint backstop covering the same condition; map both to the
      // same diner_double_book response.
      if (code === "P0006" || code === "23P01") {
        return jsonResponse(
          {
            error: "You already have a reservation at this time. Cancel or modify the existing one before booking again.",
            unavailable_reason: "diner_double_book",
          },
          409,
        );
      }
      if (code === "P0007") {
        return jsonResponse(
          {
            error: "Please provide a name and email or phone to complete your booking.",
            unavailable_reason: "missing_identifier",
          },
          400,
        );
      }
      if (code === "P0008") {
        return jsonResponse(
          {
            error: "This time is past the shift's close. Pick an earlier slot.",
            unavailable_reason: "past_shift_close",
          },
          409,
        );
      }
      return jsonResponse({ error: `Reservation: ${bookingError.message}` }, 400);
    }

    const bookingRow = Array.isArray(bookingRows) ? bookingRows[0] : bookingRows;
    if (!bookingRow?.reservation_id) {
      return jsonResponse({ error: "Booking failed: no reservation returned." }, 500);
    }
    const reservationId = bookingRow.reservation_id as string;
    const savedConfirmationCode =
      typeof bookingRow.confirmation_code === "string" && bookingRow.confirmation_code.trim()
        ? bookingRow.confirmation_code
        : confirmationCode;
    const assignedTableIds = Array.isArray(bookingRow.table_ids)
      ? (bookingRow.table_ids as unknown[]).filter((id): id is string => typeof id === "string")
      : [];

    // Deposit policy: if the party crosses any tier, mark the reservation as
    // 'pending' until the customer settles the deposit. The trigger on
    // reservation_deposit_payments flips it to 'confirmed' once every payment
    // row is 'charged'. STRIPE STUB — replace with real charge once Stripe is wired.
    let depositAmountCents = 0;
    {
      const { data: depositCents, error: depositError } = await supabase.rpc(
        "compute_deposit_for_party",
        { p_restaurant_id: restaurantId, p_party_size: partySize },
      );
      if (depositError) {
        console.error("compute_deposit_for_party failed", depositError);
      } else if (typeof depositCents === "number" && depositCents > 0) {
        depositAmountCents = depositCents;
        await supabase
          .from("reservations")
          .update({ deposit_amount_cents: depositCents, deposit_status: "pending" })
          .eq("id", reservationId);
      }
    }

    let orderId: string | null = null;
    let cartItems = normalizeCartItems(payload.cart_items);
    if (cartItems.length > 0) {
      // Server-side amount validation (security audit P0). Reject the
      // request if the caller's claimed totals deviate from what the
      // server computes from canonical menu prices + restaurant tax.
      const amountCheck = await validateAndRecomputeAmounts(
        supabase,
        restaurantId,
        cartItems,
        {
          subtotal: roundMoney(payload.subtotal),
          tax_amount: roundMoney(payload.tax_amount),
          tip_amount: roundMoney(payload.tip_amount),
          total_amount: roundMoney(payload.total_amount),
          discount_amount: roundMoney(payload.discount_amount),
        },
      );
      if (!amountCheck.ok) {
        return jsonResponse(
          { error: amountCheck.error, detail: amountCheck.detail },
          400,
        );
      }
      cartItems = amountCheck.cartItems;
      const verified = amountCheck.recomputed;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          reservation_id: reservationId,
          guest_id: guestId,
          is_preorder: true,
          order_type: "dine_in",
          status: "pending",
          subtotal: verified.subtotal,
          tax_amount: verified.tax_amount,
          tip_amount: verified.tip_amount,
          total_amount: verified.total_amount,
          discount_amount: verified.discount_amount > 0 ? verified.discount_amount : null,
          discount_reason: asText(payload.discount_reason),
          promotion_id: promotionId,
          payment_method: asText(payload.payment_method) ?? "card",
          confirmation_code: savedConfirmationCode,
          source: "web",
        })
        .select("id")
        .single();
      if (orderError) return jsonResponse({ error: `Order: ${orderError.message}` }, 400);
      orderId = order.id as string;

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(cartItems.map((item) => ({ ...item, order_id: orderId, status: "pending" })));
      if (itemsError) {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);
        return jsonResponse({ error: `Order items: ${itemsError.message}` }, 400);
      }
    }

    if (promotionId) {
      const { data: promo } = await supabase
        .from("promotions")
        .select("current_uses")
        .eq("id", promotionId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (promo) {
        await supabase
          .from("promotions")
          .update({ current_uses: Number(promo.current_uses ?? 0) + 1 })
          .eq("id", promotionId);
      }
    }

    const reservationDateLabel = formatReservationDate(reservedAt);
    // Sanitize user-controlled name fields before interpolating into
    // SMS / email bodies — strips control chars + non-cenaiva URLs so
    // a maliciously chosen guest_name can't smuggle a phishing payload
    // into the restaurant's outbound notifications. Restaurant_name
    // is owner-controlled (less hostile) but we still sanitize as
    // defense-in-depth.
    const safeGuestName = sanitizeForSmsField(guestName);
    const safeRestaurantName = sanitizeForSmsField(restaurantName);
    const confirmationSubject = `Your reservation at ${safeRestaurantName}`;
    const manageLink = restaurantSlug && savedConfirmationCode
      ? `https://cenaiva.com/${restaurantSlug}?confirmation=${encodeURIComponent(savedConfirmationCode)}`
      : null;
    const confirmationBody =
      `Hi ${safeGuestName}, your table at ${safeRestaurantName} is booked for ${partySize} ` +
      `${partySize === 1 ? "guest" : "guests"} on ${reservationDateLabel}. ` +
      `Confirmation code: ${savedConfirmationCode}.` +
      (manageLink ? ` Manage: ${manageLink}` : "");
    const confirmationResult = await sendSmsOrEmail({
      phone: guestPhone,
      email: guestEmail,
      smsBody: confirmationBody,
      emailSubject: confirmationSubject,
      emailBody: confirmationBody,
    });
    const confirmationChannel = confirmationResult.channel;
    const confirmationStatus = confirmationResult.status;

    if (confirmationChannel) {
      await logCommunication({
        supabase,
        guest_id: guestId,
        restaurant_id: restaurantId,
        channel: confirmationChannel,
        type: "reservation_confirmation",
        subject: confirmationSubject,
        body: confirmationBody,
        status: confirmationStatus,
        campaign_id: reservationId,
      });
    }

    return jsonResponse({
      reservation_id: reservationId,
      order_id: orderId,
      confirmation_code: savedConfirmationCode,
      table_ids: assignedTableIds,
      duration_minutes: turnMinutes,
      confirmation_delivery: confirmationStatus,
      confirmation_delivery_channel: confirmationChannel,
      deposit_amount_cents: depositAmountCents,
      deposit_required: depositAmountCents > 0,
    });
  } catch (err) {
    const validation = validationResponse(err, corsHeaders);
    if (validation) return validation;
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
