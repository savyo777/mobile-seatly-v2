import { getSupabase } from '@/lib/supabase/client';
import { normalizePhoneToE164 } from '@/lib/validation/phone';

export type RestaurantRegistrationInput = {
  businessName: string;
  address: string;
  ownerPhone: string;
};

export type RestaurantRegistrationResult = {
  restaurantId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  trialEndsAt: string;
};

export type RestaurantPaymentSheetInitResult = {
  customerId: string;
  customerEphemeralKeySecret: string;
  setupIntentClientSecret: string;
  setupIntentId: string;
};

export type RestaurantPaymentMethodPreview = {
  brand: string;
  last4: string;
};

export function addCalendarMonths(base: Date, months: number): Date {
  const result = new Date(base.getTime());
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

/**
 * Owner registration phone normalization. Wraps the canonical strict
 * E.164 normalizer from `lib/validation/phone.ts` and adapts the result
 * type — owner forms expect `''` (empty) on rejection rather than `null`.
 */
export function normalizePhoneWithCountryCode(value: string): string {
  return normalizePhoneToE164(value) ?? '';
}

function sanitizeRegistrationInput(input: RestaurantRegistrationInput) {
  return {
    business_name: input.businessName.trim(),
    address: input.address.trim(),
    owner_phone: normalizePhoneWithCountryCode(input.ownerPhone),
  };
}

export async function registerRestaurantOwner(
  input: RestaurantRegistrationInput,
  paymentMethodId: string,
): Promise<RestaurantRegistrationResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');

  const cleaned = {
    ...sanitizeRegistrationInput(input),
    payment_method_id: paymentMethodId,
  };

  if (!cleaned.business_name) throw new Error('Business name is required.');
  if (!cleaned.address) throw new Error('Business address is required.');
  if (!cleaned.owner_phone) throw new Error('Owner phone must be a valid phone number with at least 10 digits.');
  if (!cleaned.payment_method_id) throw new Error('Payment method is required.');

  const { data, error } = await supabase.functions.invoke('register-restaurant-owner', {
    method: 'POST',
    body: cleaned,
  });

  if (error) {
    throw new Error(error.message || 'Failed to register restaurant owner.');
  }
  if (!data?.restaurantId || !data?.stripeCustomerId || !data?.stripeSubscriptionId || !data?.trialEndsAt) {
    throw new Error('Registration did not return required billing identifiers.');
  }

  return data as RestaurantRegistrationResult;
}

export async function initRestaurantRegistrationPaymentSheet(
  input: RestaurantRegistrationInput,
): Promise<RestaurantPaymentSheetInitResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const cleaned = sanitizeRegistrationInput(input);

  const { data, error } = await supabase.functions.invoke('register-restaurant-owner', {
    method: 'POST',
    body: {
      action: 'init_payment_sheet',
      ...cleaned,
    },
  });
  if (error) throw new Error(error.message || 'Unable to initialize payment sheet.');
  if (!data?.customerId || !data?.customerEphemeralKeySecret || !data?.setupIntentClientSecret || !data?.setupIntentId) {
    throw new Error('Payment sheet initialization failed.');
  }
  return data as RestaurantPaymentSheetInitResult;
}

export async function getRestaurantPaymentMethodPreview(
  setupIntentId: string,
): Promise<RestaurantPaymentMethodPreview> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('register-restaurant-owner', {
    method: 'POST',
    body: {
      action: 'preview_payment_method',
      setup_intent_id: setupIntentId,
    },
  });
  if (error) throw new Error(error.message || 'Unable to read payment method.');
  if (!data?.brand || !data?.last4) throw new Error('Payment method preview is unavailable.');
  return data as RestaurantPaymentMethodPreview;
}

export async function registerRestaurantNoBilling(
  input: RestaurantRegistrationInput,
): Promise<{ restaurantId: string; trialEndsAt: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const cleaned = sanitizeRegistrationInput(input);
  if (!cleaned.business_name) throw new Error('Business name is required.');
  if (!cleaned.address) throw new Error('Business address is required.');
  if (!cleaned.owner_phone) throw new Error('Owner phone must be a valid phone number.');

  const { data, error } = await supabase.functions.invoke('register-restaurant-owner', {
    method: 'POST',
    body: { action: 'register_no_billing', ...cleaned },
  });
  if (error) throw new Error(error.message || 'Failed to register restaurant.');
  if (!data?.restaurantId) throw new Error('Registration did not return a restaurant ID.');
  return {
    restaurantId: String(data.restaurantId),
    trialEndsAt: String(data.trialEndsAt ?? ''),
  };
}

export async function finalizeRestaurantRegistration(
  input: RestaurantRegistrationInput,
  setupIntentId: string,
): Promise<RestaurantRegistrationResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const cleaned = sanitizeRegistrationInput(input);

  const { data, error } = await supabase.functions.invoke('register-restaurant-owner', {
    method: 'POST',
    body: {
      action: 'finalize_registration',
      setup_intent_id: setupIntentId,
      ...cleaned,
    },
  });
  if (error) throw new Error(error.message || 'Failed to finalize registration.');
  if (!data?.restaurantId || !data?.stripeCustomerId || !data?.stripeSubscriptionId || !data?.trialEndsAt) {
    throw new Error('Registration did not return required billing identifiers.');
  }
  return data as RestaurantRegistrationResult;
}
