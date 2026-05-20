// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import {
  STRIPE_MOBILE_SDK_VERSION,
  stripeGet,
  stripeRequest,
  stripeRequestWithVersion,
} from '../_shared/stripe.ts';
import {
  readJsonObject,
  validationResponse,
  asText as validatedText,
  normalizePhoneToE164 as validatedPhone,
} from '../_shared/input-validation.ts';
import { isValidOwnerReferralCode } from '../_shared/referral-policy.ts';
import { tryGrantReferralCredit } from '../_shared/grant-referral-credit.ts';

// Bug fix 2026-05-20: when a new restaurant is created, also seed the
// user_restaurant_roles row so every owner-only edge fn (stripe-setup-intent,
// save-subscription-payment-method, publish-restaurant, etc.) recognises the
// owner. Previously we only stamped restaurants.owner_user_id, which is in
// the auth.users id-space; the roles table uses user_profiles.id, so the
// two never lined up for fresh signups — Stripe onboarding 403'd as soon
// as the wizard moved to the card-entry step.
// Idempotent: skips if the (user, restaurant, owner) row already exists.
async function ensureOwnerRole(
  admin: any,
  authUserId: string,
  restaurantId: string,
): Promise<void> {
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  const profileId = (profile as { id?: string } | null)?.id;
  if (!profileId) {
    console.warn('register-restaurant-owner: no user_profiles row for owner', { authUserId, restaurantId });
    return;
  }
  const { data: existing } = await admin
    .from('user_restaurant_roles')
    .select('id')
    .eq('user_id', profileId)
    .eq('restaurant_id', restaurantId)
    .eq('role', 'owner')
    .maybeSingle();
  if (existing) return;
  const { error: roleErr } = await admin.from('user_restaurant_roles').insert({
    user_id: profileId,
    restaurant_id: restaurantId,
    role: 'owner',
    is_primary: true,
  });
  if (roleErr) {
    console.error('register-restaurant-owner: failed to insert owner role', {
      authUserId,
      profileId,
      restaurantId,
      error: roleErr,
    });
  }
}

type RegisterPayload = {
  action?: 'init_payment_sheet' | 'preview_payment_method' | 'finalize_registration' | 'register_no_billing';
  business_name: string;
  address: string;
  owner_phone: string;
  payment_method_id?: string;
  setup_intent_id?: string;
  referred_by_code?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // Random suffix avoids `slug UNIQUE` collisions when two owners pick
  // the same business name. Six base36 chars = ~2 billion variants.
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : `restaurant-${suffix}`;
}

function addCalendarMonths(base: Date, months: number): Date {
  const result = new Date(base.getTime());
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  try {
    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const accessToken = authHeader.replace('Bearer ', '').trim();
    if (!accessToken) return json(401, { error: 'Missing auth token.' });

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user?.id) return json(401, { error: 'Unauthorized.' });

    const rawPayload = await readJsonObject(req);
    const actionRaw = validatedText(rawPayload.action, 'action', { maxLength: 32 }) ?? 'finalize_registration';
    const action = (
      ['init_payment_sheet', 'preview_payment_method', 'finalize_registration', 'register_no_billing'].includes(actionRaw)
        ? actionRaw
        : 'finalize_registration'
    ) as RegisterPayload['action'];
    const referredByCodeRaw = validatedText(rawPayload.referred_by_code, 'referred_by_code', { maxLength: 32 });
    const referredByCode = isValidOwnerReferralCode(referredByCodeRaw) ? referredByCodeRaw : undefined;

    const payload: RegisterPayload = {
      action,
      business_name: validatedText(rawPayload.business_name, 'business_name', { maxLength: 120 }) ?? '',
      address: validatedText(rawPayload.address, 'address', { maxLength: 240 }) ?? '',
      owner_phone: rawPayload.owner_phone == null ? '' : validatedPhone(rawPayload.owner_phone, 'owner_phone') ?? '',
      payment_method_id: validatedText(rawPayload.payment_method_id, 'payment_method_id', { maxLength: 120 }) ?? undefined,
      setup_intent_id: validatedText(rawPayload.setup_intent_id, 'setup_intent_id', { maxLength: 120 }) ?? undefined,
      referred_by_code: referredByCode,
    };

    if (action === 'preview_payment_method') {
      if (!payload.setup_intent_id) return json(400, { error: 'Missing setup intent id.' });
      const setupIntent = await stripeGet(`setup_intents/${payload.setup_intent_id}?expand[]=payment_method`);
      const paymentMethod = typeof setupIntent.payment_method === 'string' ? null : setupIntent.payment_method;
      if (!paymentMethod?.card?.last4) return json(400, { error: 'No saved card found on setup intent.' });
      return json(200, {
        brand: (paymentMethod.card.brand ?? 'card').toString().toUpperCase(),
        last4: paymentMethod.card.last4,
      });
    }

    if (!payload.business_name || !payload.address || !payload.owner_phone) {
      return json(400, { error: 'Missing required fields.' });
    }

    // Stripe-free registration path used during development / trial setup.
    // Inserts the restaurant row and updates user role without any billing.
    if (action === 'register_no_billing') {
      // Idempotency: dedupe by (owner_user_id, name) instead of
      // owner_user_id alone. The previous "return first restaurant"
      // shortcut blocked multi-restaurant signups — an existing owner
      // re-running the wizard with a different name was silently handed
      // back their first restaurant's id. Matching on the name preserves
      // accidental-double-submit safety while letting owners add a
      // second / third / Nth venue.
      const { data: existingRow } = await adminClient
        .from('restaurants')
        .select('id, trial_ends_at')
        .eq('owner_user_id', user.id)
        .eq('name', payload.business_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let restaurantId: string;
      let trialEndsAt: string;

      if (existingRow?.id) {
        restaurantId = existingRow.id;
        trialEndsAt = existingRow.trial_ends_at ?? addCalendarMonths(new Date(), 3).toISOString();
      } else {
        trialEndsAt = addCalendarMonths(new Date(), 3).toISOString();
        const { data: inserted, error: insertError } = await adminClient
          .from('restaurants')
          .insert({
            owner_user_id: user.id,
            name: payload.business_name,
            slug: slugify(payload.business_name),
            address: payload.address,
            phone: payload.owner_phone,
            has_bar: false,
            is_active: true,
            trial_ends_at: trialEndsAt,
            ...(payload.referred_by_code ? { referred_by_code: payload.referred_by_code } : {}),
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        restaurantId = inserted.id;

        // Referral credit grant — best-effort, never blocks signup.
        if (payload.referred_by_code) {
          const result = await tryGrantReferralCredit(adminClient, {
            referredRestaurantId: restaurantId,
            referredByCode: payload.referred_by_code,
          });
          if (!result.granted) {
            console.warn('register-restaurant-owner: referral grant skipped', {
              reason: result.reason,
              restaurantId,
              code: payload.referred_by_code,
            });
          }
        }
      }

      await adminClient.from('user_profiles').upsert(
        {
          auth_user_id: user.id,
          email: user.email?.toLowerCase() ?? '',
          full_name:
            (user.user_metadata?.full_name as string | undefined) ||
            (user.user_metadata?.name as string | undefined) ||
            'User',
          role: 'diner_and_owner',
        },
        { onConflict: 'auth_user_id' },
      );

      // Seed the owner role row so every owner-only edge fn finds the user.
      await ensureOwnerRole(adminClient, user.id, restaurantId);

      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          role: 'diner_and_owner',
        },
      });

      return json(200, { restaurantId, trialEndsAt });
    }

    const existingRestaurant = await adminClient
      .from('restaurants')
      .select('stripe_customer_id')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId = existingRestaurant.data?.stripe_customer_id ?? '';
    if (!customerId) {
      const customer = await stripeRequest('customers', {
        email: user.email ?? '',
        name: payload.business_name,
        phone: payload.owner_phone,
        'metadata[supabase_user_id]': user.id,
      });
      customerId = customer.id;
    }

    if (action === 'init_payment_sheet') {
      // Ephemeral keys MUST be created with the API version the mobile
      // SDK was built against. @stripe/stripe-react-native@0.63 expects
      // STRIPE_MOBILE_SDK_VERSION (2024-06-20). Sending the orchestrator's
      // newer `2025-02-24.acacia` here causes the SDK to reject the key
      // and Stripe to return a 4xx that bubbles up as the user-facing
      // "Payment setup failed / non-2xx status code" alert.
      const ephemeralKey = await stripeRequestWithVersion(
        'ephemeral_keys',
        { customer: customerId },
        STRIPE_MOBILE_SDK_VERSION,
      );

      const setupIntent = await stripeRequest('setup_intents', {
        customer: customerId,
        usage: 'off_session',
        'payment_method_types[]': 'card',
      });

      return json(200, {
        customerId,
        customerEphemeralKeySecret: ephemeralKey.secret,
        setupIntentClientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      });
    }

    if (!payload.setup_intent_id) return json(400, { error: 'Missing setup intent id.' });
    const setupIntent = await stripeGet(`setup_intents/${payload.setup_intent_id}?expand[]=payment_method`);

    // Ownership check (security audit 2026-05-17). The SetupIntent was
    // created above for `customerId`; reject if a client somehow passes
    // a setup_intent_id belonging to a different customer. Defense in
    // depth against IDOR — Stripe already binds SetupIntent →
    // Customer, but we double-check before promoting the payment
    // method to billing default.
    if (setupIntent.customer && setupIntent.customer !== customerId) {
      return json(403, { error: 'Setup intent does not belong to this customer.' });
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;
    const paymentMethod =
      typeof setupIntent.payment_method === 'string'
        ? null
        : setupIntent.payment_method;
    if (!paymentMethodId) {
      return json(400, { error: 'No payment method available from setup intent.' });
    }

    // Belt + suspenders: re-fetch the PM and confirm it's attached to
    // this customer. If somehow the PM is attached to a different
    // customer (or detached), we refuse to set it as default here.
    const verifiedPm = await stripeGet(`payment_methods/${paymentMethodId}`);
    if (verifiedPm.customer && verifiedPm.customer !== customerId) {
      return json(403, { error: 'Payment method does not belong to this customer.' });
    }

    await stripeRequest(`customers/${customerId}`, {
      'invoice_settings[default_payment_method]': paymentMethodId,
    });

    const trialEnd = Math.floor(addCalendarMonths(new Date(), 3).getTime() / 1000);

    const subscription = await stripeRequest('subscriptions', {
      customer: customerId,
      'items[0][price]': Deno.env.get('STRIPE_OWNER_PLAN_PRICE_ID') ?? '',
      trial_end: String(trialEnd),
    });

    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : new Date(trialEnd * 1000).toISOString();

    // Map the registration payload onto the production `restaurants` table
    // schema (shared with the web app): the table uses `name`/`phone` rather
    // than `business_name`/`owner_phone`, requires a unique `slug`, and has
    // a NOT NULL `has_bar` flag. The Stripe billing fields + owner_user_id +
    // trial_ends_at were added via the add_owner_registration_columns
    // migration.
    const { data: inserted, error: insertError } = await adminClient
      .from('restaurants')
      .insert({
        owner_user_id: user.id,
        name: payload.business_name,
        slug: slugify(payload.business_name),
        address: payload.address,
        phone: payload.owner_phone,
        has_bar: false,
        is_active: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_payment_method_id: paymentMethodId,
        billing_card_brand: paymentMethod?.card?.brand ?? null,
        billing_card_last4: paymentMethod?.card?.last4 ?? null,
        billing_card_exp_month: paymentMethod?.card?.exp_month ?? null,
        billing_card_exp_year: paymentMethod?.card?.exp_year ?? null,
        trial_ends_at: trialEndsAt,
        ...(payload.referred_by_code ? { referred_by_code: payload.referred_by_code } : {}),
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    // Referral credit grant — best-effort, never blocks registration.
    if (payload.referred_by_code) {
      const result = await tryGrantReferralCredit(adminClient, {
        referredRestaurantId: inserted.id,
        referredByCode: payload.referred_by_code,
      });
      if (!result.granted) {
        console.warn('register-restaurant-owner: referral grant skipped', {
          reason: result.reason,
          restaurantId: inserted.id,
          code: payload.referred_by_code,
        });
      }
    }

    await adminClient.from('user_profiles').upsert(
      {
        auth_user_id: user.id,
        email: user.email?.toLowerCase() ?? '',
        full_name:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          'User',
        role: 'diner_and_owner',
      },
      { onConflict: 'auth_user_id' },
    );

    // Seed the owner role row so every owner-only edge fn finds the user.
    await ensureOwnerRole(adminClient, user.id, inserted.id);

    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        role: 'diner_and_owner',
      },
    });

    return json(200, {
      restaurantId: inserted.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      trialEndsAt,
    });
  } catch (error) {
    const validation = validationResponse(error, corsHeaders);
    if (validation) return validation;
    const message = error instanceof Error ? error.message : 'Unexpected registration error.';
    // Surface in function logs so future failures don't have to be diagnosed
    // by re-reading the source. The mobile client only sees `error.message`
    // from the supabase-js wrapper, so this is the easiest backchannel.
    console.error('register-restaurant-owner failure:', message, error);
    return json(500, { error: message });
  }
});
