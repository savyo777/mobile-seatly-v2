/**
 * Owner-side auto-tracked income from Stripe-settled charges.
 *
 * Mirrors web's `apps/web/src/hooks/useAutoIncome.ts` (per
 * CLAUDE_SKILLS.md (Stripe section) §12). Reads two sources:
 *   1. `reservation_deposit_payments` where status='charged' AND
 *      paid_at IS NOT NULL — diner-paid deposits via
 *      `create-public-payment-intent` + `confirm-deposit-paid`
 *   2. `orders` where paid_at IS NOT NULL — pre-order-at-booking
 *      charges settled via `mark-order-paid`
 *
 * The hook returns a unified `AutoIncomeRow[]` (sorted desc by paid_at)
 * plus a total in CAD cents. Wires the owner's Expenses page so
 * Stripe charges show up automatically in the dashboard — no manual
 * entry required, matching the web owner UX.
 *
 * Scoped to the active restaurant via `useOwnerRestaurantContext`.
 * When `selectedRestaurantId === 'all'`, the hook queries across every
 * restaurant the owner has access to.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useOwnerRestaurantContext } from '@/lib/owner/OwnerRestaurantContext';

export type AutoIncomeSource = 'deposit' | 'order';

export interface AutoIncomeRow {
  id: string;
  source: AutoIncomeSource;
  restaurantId: string;
  /** ISO timestamp the charge actually settled. */
  paidAt: string;
  /** What the diner was charged in cents (deposits = the base; orders = the bill). */
  amountCents: number;
  /** Stripe PI id when present (helpful for owner debugging + reconciliation). */
  stripePaymentIntentId: string | null;
  /** Reservation linkage when applicable. */
  reservationId: string | null;
  /** Order id when source='order'. */
  orderId: string | null;
}

export interface UseAutoIncomeResult {
  rows: AutoIncomeRow[];
  totalCents: number;
  loading: boolean;
  /** Error message ready to render in a banner. null when healthy. */
  error: string | null;
  refetch: () => void;
}

const DEFAULT_LOOKBACK_DAYS = 30;

interface DepositRow {
  id: string;
  reservation_id: string | null;
  paid_at: string | null;
  amount_cents: number | null;
  stripe_payment_intent_id: string | null;
}

interface OrderRow {
  id: string;
  reservation_id: string | null;
  restaurant_id: string;
  paid_at: string | null;
  total_amount: number | null;
  stripe_payment_intent_id: string | null;
}

export function useAutoIncome(lookbackDays: number = DEFAULT_LOOKBACK_DAYS): UseAutoIncomeResult {
  const { selectedRestaurantId, restaurants } = useOwnerRestaurantContext();
  const [rows, setRows] = useState<AutoIncomeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const restaurantIdFilter = useMemo<string[] | null>(() => {
    if (!selectedRestaurantId) return null;
    if (selectedRestaurantId === 'all') {
      return restaurants.map((r) => r.id);
    }
    return [selectedRestaurantId];
  }, [selectedRestaurantId, restaurants]);

  const sinceIso = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    return since.toISOString();
  }, [lookbackDays]);

  useEffect(() => {
    if (!restaurantIdFilter || restaurantIdFilter.length === 0) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      // Supabase not configured (likely demo mode without backend). Don't
      // throw — just show an empty Auto Income section.
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        // reservation_deposit_payments has NO restaurant_id column —
        // restaurant is on the parent reservation. Two-step query is
        // simpler than fighting PostgREST embedded-filter syntax:
        //   step 1: get reservation IDs for the owner's restaurants
        //   step 2: fetch deposit payments for those reservations
        // We still fetch orders in parallel since orders DO carry
        // restaurant_id directly.
        const [reservationIdResp, orderResp] = await Promise.all([
          supabase
            .from('reservations')
            .select('id, restaurant_id')
            .in('restaurant_id', restaurantIdFilter),
          supabase
            .from('orders')
            .select('id, reservation_id, restaurant_id, paid_at, total_amount, stripe_payment_intent_id')
            .not('paid_at', 'is', null)
            .gte('paid_at', sinceIso)
            .in('restaurant_id', restaurantIdFilter)
            .order('paid_at', { ascending: false }),
        ]);
        if (reservationIdResp.error) throw reservationIdResp.error;
        if (orderResp.error) throw orderResp.error;
        const ridByReservation = new Map<string, string>();
        for (const row of (reservationIdResp.data as Array<{ id: string; restaurant_id: string }> | null ?? [])) {
          ridByReservation.set(row.id, row.restaurant_id);
        }
        const reservationIds = Array.from(ridByReservation.keys());
        const depResp = reservationIds.length === 0
          ? { data: [], error: null as null | Error }
          : await supabase
              .from('reservation_deposit_payments')
              .select('id, reservation_id, paid_at, amount_cents, stripe_payment_intent_id')
              .eq('status', 'charged')
              .not('paid_at', 'is', null)
              .gte('paid_at', sinceIso)
              .in('reservation_id', reservationIds)
              .order('paid_at', { ascending: false });
        if (!active) return;
        if (depResp.error) throw depResp.error;
        const depositRows: AutoIncomeRow[] = (depResp.data as DepositRow[] | null ?? [])
          .filter(
            (r) =>
              r.paid_at &&
              typeof r.amount_cents === 'number' &&
              r.amount_cents > 0 &&
              r.reservation_id !== null &&
              ridByReservation.has(r.reservation_id as string),
          )
          .map((r) => ({
            id: `dep:${r.id}`,
            source: 'deposit' as const,
            restaurantId: ridByReservation.get(r.reservation_id as string) as string,
            paidAt: r.paid_at as string,
            amountCents: r.amount_cents as number,
            stripePaymentIntentId: r.stripe_payment_intent_id ?? null,
            reservationId: r.reservation_id,
            orderId: null,
          }));
        const orderRows: AutoIncomeRow[] = (orderResp.data as OrderRow[] | null ?? [])
          .filter((r) => r.paid_at && typeof r.total_amount === 'number' && r.total_amount > 0)
          .map((r) => ({
            id: `ord:${r.id}`,
            source: 'order' as const,
            restaurantId: r.restaurant_id,
            paidAt: r.paid_at as string,
            // orders.total_amount is `numeric` in the DB. Per the web
            // hook + the seed data (a $43.77 order shows as
            // total_amount=4377), it stores CENTS as an integer cast
            // to numeric. Treat as cents directly.
            amountCents: Math.round(Number(r.total_amount)),
            stripePaymentIntentId: r.stripe_payment_intent_id ?? null,
            reservationId: r.reservation_id,
            orderId: r.id,
          }));
        const merged = [...depositRows, ...orderRows].sort((a, b) =>
          a.paidAt < b.paidAt ? 1 : -1,
        );
        setRows(merged);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : 'Could not load auto-tracked income.';
        if (__DEV__) console.warn('[useAutoIncome] fetch failed', err);
        setError(message);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [restaurantIdFilter, sinceIso, refreshTick]);

  const totalCents = useMemo(
    () => rows.reduce((sum, r) => sum + r.amountCents, 0),
    [rows],
  );

  const refetch = useCallback(() => setRefreshTick((n) => n + 1), []);

  return { rows, totalCents, loading, error, refetch };
}
