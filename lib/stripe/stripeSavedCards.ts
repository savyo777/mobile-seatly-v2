import { callEdgeFn } from '@/lib/stripe/edgeFnClient';
import { getSupabase } from '@/lib/supabase/client';
import { getCurrentUserProfileId } from '@/lib/services/userProfile';

/**
 * Stripe-backed saved-cards data source — replaces the old AsyncStorage
 * mirror in `lib/storage/customerPaymentMethods.ts` for the diner
 * profile screen.
 *
 * The list comes from `stripe-list-methods` (GET, JWT-auth'd) so the
 * brand / last4 / expiry always reflect Stripe's source of truth — the
 * `saved_cards` table is just a lookup for which row is the diner's
 * default. Detach hits `stripe-detach-method` to release the Stripe-side
 * attachment, then we clean up the local row.
 *
 * Per MOBILE_STRIPE_TRANSFER.md §23.11–§23.13.
 */

export interface SavedCard {
  /**
   * In live mode this is the Stripe PaymentMethod id (`pm_...`). In test mode
   * (no STRIPE_SECRET_KEY on the server) it's the `saved_cards.id` row UUID.
   * Either way it's the value to pass to {@link detachSavedCard} and
   * {@link setDefaultSavedCard} — they accept both shapes.
   */
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

type ListMethodsResponse = {
  methods: Array<{
    id: string;
    brand: string;
    last4: string;
    exp_month?: number | null;
    exp_year?: number | null;
    is_default?: boolean;
  }>;
  mode: 'test' | 'live';
};

export async function listSavedCards(): Promise<SavedCard[]> {
  const res = await callEdgeFn<ListMethodsResponse>({
    fn: 'stripe-list-methods',
    method: 'GET',
    auth: 'required',
  });
  return (res.methods ?? []).map((m) => ({
    id: m.id,
    brand: normalizeBrand(m.brand),
    last4: m.last4 || '••••',
    expMonth: typeof m.exp_month === 'number' ? m.exp_month : null,
    expYear: typeof m.exp_year === 'number' ? m.exp_year : null,
    isDefault: m.is_default === true,
  }));
}

/**
 * Detaches the PaymentMethod on Stripe AND deletes the matching `saved_cards`
 * row. Idempotent — already-detached PMs return success.
 */
export async function detachSavedCard(id: string): Promise<void> {
  await callEdgeFn<{ ok: true; already_detached?: boolean }>({
    fn: 'stripe-detach-method',
    body: { payment_method_id: id },
    auth: 'required',
  });
  const supabase = getSupabase();
  if (!supabase) return;
  const profileId = await getCurrentUserProfileId();
  if (!profileId) return;
  // The edge fn doesn't delete the local row — do it client-side via RLS.
  // Match either by stripe_payment_method_id (live) or by row id (test).
  await supabase
    .from('saved_cards')
    .delete()
    .eq('user_profile_id', profileId)
    .or(`stripe_payment_method_id.eq.${id},id.eq.${id}`);
}

/**
 * Marks one card as the diner's default. RLS lets the diner update their
 * own `saved_cards` rows; we clear is_default on the rest in a small
 * transaction-like sequence (acceptable because saved_cards lists are
 * O(few) rows per user).
 */
export async function setDefaultSavedCard(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sign in to manage saved cards.');
  const profileId = await getCurrentUserProfileId();
  if (!profileId) throw new Error('Sign in to manage saved cards.');

  await supabase
    .from('saved_cards')
    .update({ is_default: false })
    .eq('user_profile_id', profileId);

  // Same dual-id match as detach — in live mode id is pm_xxx, in test it's a uuid.
  const { error } = await supabase
    .from('saved_cards')
    .update({ is_default: true })
    .eq('user_profile_id', profileId)
    .or(`stripe_payment_method_id.eq.${id},id.eq.${id}`);
  if (error) throw error;
}

/**
 * Mints a SetupIntent on the diner's Stripe customer. The mobile screen
 * presents this via `initPaymentSheet({ setupIntentClientSecret })`. On
 * confirm, Stripe attaches the new PM to the customer and the next
 * {@link listSavedCards} call will show it.
 */
export async function createDinerSetupIntent(): Promise<{ clientSecret: string }> {
  const res = await callEdgeFn<{ client_secret: string | null; mode: 'test' | 'live' }>({
    fn: 'stripe-setup-intent',
    body: {},
    auth: 'required',
  });
  if (!res.client_secret) {
    throw new Error('Card setup is unavailable right now. Please try again later.');
  }
  return { clientSecret: res.client_secret };
}

function normalizeBrand(brand: string): string {
  const v = (brand || '').trim().toLowerCase();
  if (v === 'visa') return 'visa';
  if (v === 'mastercard' || v === 'master_card') return 'mastercard';
  if (v === 'amex' || v === 'american_express' || v === 'american express') return 'amex';
  if (v === 'discover') return 'discover';
  if (v === 'jcb') return 'jcb';
  if (v === 'diners' || v === 'diners_club') return 'diners';
  if (v === 'unionpay' || v === 'union_pay') return 'unionpay';
  return 'card';
}
