import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

// Mirrors the structure of lib/expenses/scanReceipt.ts. The mobile shape
// is intentionally close so the menu-scan-review screen can mirror the
// expense-review pattern (shimmer loader + populated draft on success
// + clean fallback on failure).

export interface MenuScanItemDraft {
  name: string;
  description: string | null;
  /** Major-currency units (dollars). Server returns price_cents and the
   * scan-menu function converts back to dollars before responding. */
  price: number | null;
  category: string | null;
  allergens: string[];
}

export interface MenuScanDraft {
  items: MenuScanItemDraft[];
  suggested_categories: string[];
}

export interface ScanMenuResult {
  draft: MenuScanDraft;
  aiRaw: unknown;
  /** Stable error code from the server when the model returned no items,
   * or when auth/rate-limit blocked the call. Null on success. */
  errorCode: string | null;
}

export interface ScanMenuArgs {
  imageBase64: string;
  imageMimeType?: string;
}

const EMPTY_DRAFT: MenuScanDraft = { items: [], suggested_categories: [] };

const DEMO_DRAFT: MenuScanDraft = {
  items: [
    { name: 'Burrata', description: 'Heirloom tomatoes, basil oil, sea salt.', price: 18, category: 'Starters', allergens: ['vegetarian'] },
    { name: 'Beef Carpaccio', description: 'Shaved tenderloin, arugula, parmesan, lemon.', price: 22, category: 'Starters', allergens: [] },
    { name: 'Cacio e Pepe', description: 'Spaghetti, black pepper, pecorino.', price: 24, category: 'Pasta', allergens: ['vegetarian'] },
    { name: 'Lobster Ravioli', description: 'Brown butter, sage, parmesan.', price: 32, category: 'Pasta', allergens: ['shellfish'] },
    { name: 'Bone-In Ribeye', description: '14 oz, smoked salt, herb butter.', price: 64, category: 'Mains', allergens: [] },
    { name: 'Branzino', description: 'Whole roasted, lemon, capers, rosemary potatoes.', price: 42, category: 'Mains', allergens: [] },
    { name: 'Tiramisu', description: 'Espresso, mascarpone, cocoa.', price: 12, category: 'Desserts', allergens: ['vegetarian'] },
  ],
  suggested_categories: ['Starters', 'Pasta', 'Mains', 'Desserts'],
};

const SCAN_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`scanMenu timed out after ${ms}ms`));
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
 * Calls the scan-menu edge function with a base64 image and returns a
 * draft list of MenuItem rows for the review screen. In demo mode (or
 * when supabase isn't configured) returns a baked-in sample menu so
 * the flow still demos correctly.
 *
 * Unlike scanReceipt (which fails open with an empty draft), this
 * helper preserves the server's error code so the review screen can
 * show a meaningful empty-state message: rate-limit copy, "no menu
 * items detected" copy, or the generic failure copy.
 */
export async function scanMenu({
  imageBase64,
  imageMimeType = 'image/jpeg',
}: ScanMenuArgs): Promise<ScanMenuResult> {
  if (isDemoModeEnabled()) {
    await new Promise((r) => setTimeout(r, 1400));
    return { draft: DEMO_DRAFT, aiRaw: { demo: true }, errorCode: null };
  }

  if (!isSupabaseConfigured()) {
    return { draft: EMPTY_DRAFT, aiRaw: null, errorCode: 'not_configured' };
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
      return { draft: EMPTY_DRAFT, aiRaw: null, errorCode: 'not_authenticated' };
    }

    const { url, anonKey } = getSupabaseEnv();
    const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/scan-menu`;

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
      let serverCode: string | null = null;
      try {
        const errBody = (await response.json()) as { error?: unknown };
        if (typeof errBody?.error === 'string') serverCode = errBody.error;
      } catch {
        // ignore body-parse errors — fall through with HTTP status code
      }
      return {
        draft: EMPTY_DRAFT,
        aiRaw: null,
        errorCode: serverCode ?? `http_${response.status}`,
      };
    }

    const json = (await response.json()) as {
      draft?: Partial<MenuScanDraft>;
      aiRaw?: unknown;
    };

    const items = Array.isArray(json.draft?.items)
      ? (json.draft!.items as MenuScanItemDraft[]).filter((it) => typeof it?.name === 'string' && it.name.trim().length > 0)
      : [];
    const suggested = Array.isArray(json.draft?.suggested_categories)
      ? (json.draft!.suggested_categories as string[]).filter((c) => typeof c === 'string' && c.trim().length > 0)
      : [];

    return {
      draft: { items, suggested_categories: suggested },
      aiRaw: json.aiRaw ?? null,
      errorCode: items.length === 0 ? 'no_menu_items_detected' : null,
    };
  } catch (err) {
    if (__DEV__) console.warn('scanMenu: vision call failed', err);
    return { draft: EMPTY_DRAFT, aiRaw: null, errorCode: 'vision_failed' };
  }
}
