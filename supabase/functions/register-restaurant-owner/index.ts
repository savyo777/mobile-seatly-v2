// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RegisterPayload = {
  action?: 'init_payment_sheet' | 'preview_payment_method' | 'finalize_registration';
  hst_number: string;
  business_name: string;
  address: string;
  owner_phone: string;
  payment_method_id: string;
  setup_intent_id?: string;
};

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function stripeRequest(path: string, body: Record<string, string>) {
  if (!stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY.');
  const form = new URLSearchParams(body);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Stripe request failed.');
  }
  return data;
}

async function stripeGet(path: string) {
  if (!stripeSecretKey) throw new Error('Missing STRIPE_SECRET_KEY.');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Stripe request failed.');
  }
  return data;
}

Deno.serve(async (req) => {
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

    const payload = (await req.json()) as RegisterPayload;
    const action = payload.action ?? 'finalize_registration';

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

    if (!payload.business_name || !payload.hst_number || !payload.address || !payload.owner_phone) {
      return json(400, { error: 'Missing required fields.' });
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
        'metadata[hst_number]': payload.hst_number,
      });
      customerId = customer.id;
    }

    if (action === 'init_payment_sheet') {
      const ephemeralKey = await fetch('https://api.stripe.com/v1/ephemeral_keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Stripe-Version': '2024-06-20',
        },
        body: new URLSearchParams({ customer: customerId }).toString(),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error?.message ?? 'Failed to create ephemeral key.');
        return data;
      });

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
    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;
    if (!paymentMethodId) {
      return json(400, { error: 'No payment method available from setup intent.' });
    }

    await stripeRequest(`customers/${customerId}`, {
      'invoice_settings[default_payment_method]': paymentMethodId,
    });

    const subscription = await stripeRequest('subscriptions', {
      customer: customerId,
      'items[0][price]': Deno.env.get('STRIPE_OWNER_PLAN_PRICE_ID') ?? '',
      trial_period_days: '90',
    });

    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertError } = await adminClient
      .from('restaurants')
      .insert({
        owner_user_id: user.id,
        business_name: payload.business_name,
        hst_number: payload.hst_number,
        address: payload.address,
        owner_phone: payload.owner_phone,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        trial_ends_at: trialEndsAt,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

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
    return json(500, {
      error: error instanceof Error ? error.message : 'Unexpected registration error.',
    });
  }
});
