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
  amount: 42.18,
  taxAmount: 2.54,
  totalAmount: 44.72,
  currency: 'cad',
  category: 'delivery',
};

const DEMO_EXTRACTED: ExpenseDraftFieldKey[] = [
  'vendor',
  'expenseDate',
  'amount',
  'taxAmount',
  'totalAmount',
  'currency',
  'category',
];

const EMPTY_DRAFT: ExpenseDraft = {
  vendor: null,
  expenseDate: null,
  amount: null,
  taxAmount: null,
  totalAmount: null,
  currency: null,
  category: null,
};

export interface ScanReceiptArgs {
  imageBase64: string;
  imageMimeType?: string;
}

// Hard ceiling on the edge-function call so the review screen can never
// be stuck on the shimmer if the function isn't deployed, the network
// stalls, or the model takes too long. gpt-4o-mini on a single receipt
// is normally 2–4s, so 30s is generous.
const SCAN_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`scanReceipt timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Calls the scan-receipt edge function with a base64 image and returns a
 * draft Expense for the review screen. In demo mode (or when supabase isn't
 * configured) returns a baked-in draft so the flow still demos correctly.
 *
 * NEVER throws on a network or API failure — the review screen relies on
 * this to either return a populated draft or an empty one. Surfacing
 * exceptions here would leave the loading shimmer up forever.
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

  try {
    const supabase = getSupabase();
    let accessToken: string | null = null;
    try {
      const sessionResponse = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      accessToken = sessionResponse.data?.session?.access_token ?? null;
    } catch {
      accessToken = null;
    }
    if (!accessToken) {
      return { draft: EMPTY_DRAFT, extractedFields: [], aiRaw: null };
    }

    const { url, anonKey } = getSupabaseEnv();
    const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/scan-receipt`;

    const controller = new AbortController();
    const response = await withTimeout(
      fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          image_mime_type: imageMimeType,
        }),
      }),
      SCAN_TIMEOUT_MS,
      controller,
    );

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
  } catch (err) {
    if (__DEV__) console.warn('scanReceipt: failing open with empty draft', err);
    return { draft: EMPTY_DRAFT, extractedFields: [], aiRaw: null };
  }
}
