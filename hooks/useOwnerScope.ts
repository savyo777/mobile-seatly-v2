import { useMemo } from 'react';
import {
  useOwnerRestaurantContext,
  type OwnerRestaurantSelection,
} from '@/lib/owner/OwnerRestaurantContext';
import type { OwnerRestaurant } from '@/lib/services/ownerRestaurant';

/**
 * Multi-restaurant scope sugar hook.
 *
 * Returns the set of restaurant ids that the current screen should query
 * against. In single-restaurant or single-pick mode `restaurantIds` has
 * length 1; in all-mode it is the full list of restaurants the owner has.
 *
 * Screens that don't support 'all' can branch on `isAll` and render a
 * "Pick a restaurant" CTA instead.
 */
export type OwnerScope = {
  /** Always length 1 unless `isAll` is true, in which case it lists every restaurant. */
  restaurantIds: string[];
  /** True when the owner has multiple restaurants and chose "All restaurants". */
  isAll: boolean;
  /** True while the underlying restaurant list is loading. */
  isLoading: boolean;
  /** True if the owner has more than one restaurant. */
  hasMultiple: boolean;
  /**
   * The picked restaurant id, or `null` when the owner has no restaurants or
   * when `isAll` is true. Use `restaurantIds` for queries.
   */
  selectedRestaurantId: string | null;
  /** The picked OwnerRestaurant row, or null in all-mode / no-data states. */
  selectedRestaurant: OwnerRestaurant | null;
  /** Every restaurant owned by the current user (already loaded). */
  restaurants: OwnerRestaurant[];
  /** Update the selection. Use `'all'` for cross-restaurant aggregation. */
  setSelectedRestaurantId: (id: OwnerRestaurantSelection) => void;
};

export function useOwnerScope(): OwnerScope {
  const {
    restaurants,
    selectedRestaurantId,
    isAll,
    isLoading,
    setSelectedRestaurantId,
  } = useOwnerRestaurantContext();

  return useMemo<OwnerScope>(() => {
    const hasMultiple = restaurants.length > 1;
    let restaurantIds: string[] = [];
    let resolvedSelectedId: string | null = null;
    let selectedRestaurant: OwnerRestaurant | null = null;

    if (isAll) {
      restaurantIds = restaurants.map((r) => r.id).filter(Boolean);
      resolvedSelectedId = null;
      selectedRestaurant = null;
    } else if (typeof selectedRestaurantId === 'string') {
      resolvedSelectedId = selectedRestaurantId;
      selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) ?? null;
      restaurantIds = resolvedSelectedId ? [resolvedSelectedId] : [];
    }

    return {
      restaurantIds,
      isAll,
      isLoading,
      hasMultiple,
      selectedRestaurantId: resolvedSelectedId,
      selectedRestaurant,
      restaurants,
      setSelectedRestaurantId,
    };
  }, [restaurants, selectedRestaurantId, isAll, isLoading, setSelectedRestaurantId]);
}
