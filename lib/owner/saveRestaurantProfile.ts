import { getSupabase } from '@/lib/supabase/client';

export interface SaveRestaurantProfileArgs {
  restaurantId: string;
  name?: string | null;
  cuisine?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  instagram?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  turnTimeMinutes?: number | null;
}

function normalize(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Writes the editable owner-profile fields back to the restaurants row.
 *
 * Social handles live under settings_json.businessProfile.{websiteUrl,
 * instagramUrl} on the live web schema, so we merge those keys into the
 * existing settings_json instead of overwriting it. Top-level columns
 * (name, cuisine_type, description, phone, email, address, cover_image_url,
 * logo_url) are written directly.
 */
export async function saveRestaurantProfile(args: SaveRestaurantProfileArgs): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const updates: Record<string, unknown> = {};
  if (args.name !== undefined) updates.name = normalize(args.name);
  if (args.cuisine !== undefined) updates.cuisine_type = normalize(args.cuisine);
  if (args.description !== undefined) updates.description = normalize(args.description);
  if (args.phone !== undefined) updates.phone = normalize(args.phone);
  if (args.email !== undefined) updates.email = normalize(args.email);
  if (args.address !== undefined) updates.address = normalize(args.address);
  if (args.coverImageUrl !== undefined) {
    // Schema drift: `cover_image_url` is the column this writer historically
    // touched; `cover_photo_url` is what most readers (including the
    // customer-side Discover mapper) consume. Write both so the diner side
    // sees the update immediately and any future read of either column is
    // consistent. The mapper at lib/supabase/mapRestaurantRow.ts now reads
    // cover_image_url first as a defensive fallback.
    updates.cover_image_url = args.coverImageUrl;
    updates.cover_photo_url = args.coverImageUrl;
  }
  if (args.logoUrl !== undefined) updates.logo_url = args.logoUrl;

  // Merge website + instagram + turn time into settings_json without
  // clobbering other sub-keys like legalName, dietaryTags, theme, etc.
  if (
    args.website !== undefined ||
    args.instagram !== undefined ||
    args.turnTimeMinutes !== undefined
  ) {
    const { data: existing } = await supabase
      .from('restaurants')
      .select('settings_json')
      .eq('id', args.restaurantId)
      .maybeSingle();
    const settings = (existing?.settings_json && typeof existing.settings_json === 'object'
      ? { ...(existing.settings_json as Record<string, unknown>) }
      : {}) as Record<string, unknown>;
    if (args.website !== undefined || args.instagram !== undefined) {
      const bp = (settings.businessProfile && typeof settings.businessProfile === 'object'
        ? { ...(settings.businessProfile as Record<string, unknown>) }
        : {}) as Record<string, unknown>;
      if (args.website !== undefined) bp.websiteUrl = normalize(args.website);
      if (args.instagram !== undefined) bp.instagramUrl = normalize(args.instagram);
      settings.businessProfile = bp;
    }
    if (args.turnTimeMinutes !== undefined) {
      settings.turnTimeMinutes = args.turnTimeMinutes;
    }
    updates.settings_json = settings;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', args.restaurantId);
  if (error) throw error;
}
