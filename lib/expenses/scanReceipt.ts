import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';
import type {
  ExpenseDraft,
  ExpenseDraftFieldKey,
  ScanReceiptResult,
} from '@/lib/expenses/types';

const DEMO_DRAFT: ExpenseDraft = {
  vendor: 'Shell',
  expenseDate: new Date().toISOString().slice(0, 10),
  subtotalCents: 4218,
  taxCents: 254,
  tipCents: null,
  totalCents: 4472,
  currency: 'USD',
  category: 'fuel',
  paymentMethod: 'card',
  paymentMethodLast4: '4242',
};

const DEMO_EXTRACTED: ExpenseDraftFieldKey[] = [
  'vendor',
  'expenseDate',
  'subtotalCents',
  'taxCents',
  'totalCents',
  'currency',
  'category',
  'paymentMethod',
  'paymentMethodLast4',
];

const EMPTY_DRAFT: ExpenseDraft = {
  vendor: null,
  expenseDate: null,
  subtotalCents: null,
  taxCents: null,
  tipCents: null,
  totalCents: null,
  currency: null,
  category: null,
  paymentMethod: null,
  paymentMethodLast4: null,
};

export interface ScanReceiptArgs {
  imageBase64: string;
  imageMimeType?: string;
}

/**
 * Calls the scan-receipt edge function with a base64 image and returns a
 * draft Expense for the review screen. In demo mode (or when supabase isn't
 * configured) returns a baked-in draft so the flow still demos correctly.
 */
export async function scanReceipt({
  imageBase64,
  imageMimeType = 'image/jpeg',
}: ScanReceiptArgs): Promise<ScanReceiptResult> {
  if (isDemoModeEnabled()) {
    await new Promise((r) => setTimeout(r, 1100));
    return {
      draft: DEMO_DRAFT,
      extractedFields: DEMO_EXTRACTED,
      aiRaw: { demo: true },
    };
  }

  if (!isSupabaseConfigured()) {
    return { draft: EMPTY_DRAFT, extractedFields: [], aiRaw: null };
  }

  const supabase = getSupabase();
  const { data: sessionData } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const accessToken = sessionData?.session?.access_token ?? null;
  if (!accessToken) {
    return { draft: EMPTY_DRAFT, extractedFields: [], aiRaw: null };
  }

  const { url, anonKey } = getSupabaseEnv();
  const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/scan-receipt`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      image_mime_type: imageMimeType,
    }),
  });

  if (!response.ok) {
    return { draft: EMPTY_DRAFT, extractedFields: [], aiRaw: null };
  }

  const json = (await response.json()) as {
    draft?: Partial<ExpenseDraft>;
    extractedFields?: string[];
    aiRaw?: unknown;
  };

  const draft: ExpenseDraft = {
    ...EMPTY_DRAFT,
    ...(json.draft ?? {}),
  };
  const extractedFields = Array.isArray(json.extractedFields)
    ? (json.extractedFields.filter(
        (f): f is ExpenseDraftFieldKey => typeof f === 'string',
      ) as ExpenseDraftFieldKey[])
    : [];

  return { draft, extractedFields, aiRaw: json.aiRaw ?? null };
}
