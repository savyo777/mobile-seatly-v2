import { supabaseAdmin } from "./supabase.ts";

export type OwnerProfileRow = {
  id: string;
  restaurant_id: string | null;
  role: string | null;
};

export type OwnedRestaurantScope = {
  profileIds: string[];
  ownedRestaurantIds: string[];
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isOwnerRole(value: unknown): boolean {
  return typeof value === "string" && value.toLowerCase().trim() === "owner";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function getUserProfileRows(authUserId: string): Promise<OwnerProfileRow[]> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, restaurant_id, role")
    .eq("auth_user_id", authUserId);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: stringOrNull(row.id) ?? "",
      restaurant_id: stringOrNull(row.restaurant_id),
      role: stringOrNull(row.role),
    }))
    .filter((row) => Boolean(row.id));
}

async function filterRemovedRestaurantIds(ids: string[], includeRemoved: boolean): Promise<string[]> {
  const uniqueIds = unique(ids);
  if (includeRemoved || uniqueIds.length === 0) return uniqueIds;

  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, removed_at")
    .in("id", uniqueIds);
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>)
    .filter((row) => !row.removed_at)
    .map((row) => stringOrNull(row.id))
    .filter((id): id is string => Boolean(id));
}

export async function resolveOwnedRestaurantScope(
  authUserId: string,
  options: { includeRemoved?: boolean } = {},
): Promise<OwnedRestaurantScope> {
  const profiles = await getUserProfileRows(authUserId);
  const profileIds = profiles.map((profile) => profile.id);
  const restaurantIds: string[] = [];

  for (const profile of profiles) {
    if (profile.restaurant_id && isOwnerRole(profile.role)) {
      restaurantIds.push(profile.restaurant_id);
    }
  }

  if (profileIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("user_restaurant_roles")
      .select("restaurant_id, role")
      .in("user_id", profileIds);
    if (error) throw error;
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const restaurantId = stringOrNull(row.restaurant_id);
      if (restaurantId && isOwnerRole(row.role)) {
        restaurantIds.push(restaurantId);
      }
    }
  }

  const { data: ownerRows, error: ownerError } = await supabaseAdmin
    .from("restaurants")
    .select("id, removed_at")
    .eq("owner_user_id", authUserId);
  if (ownerError) throw ownerError;
  for (const row of (ownerRows ?? []) as Array<Record<string, unknown>>) {
    const restaurantId = stringOrNull(row.id);
    if (restaurantId && (options.includeRemoved || !row.removed_at)) {
      restaurantIds.push(restaurantId);
    }
  }

  return {
    profileIds,
    ownedRestaurantIds: await filterRemovedRestaurantIds(restaurantIds, Boolean(options.includeRemoved)),
  };
}
