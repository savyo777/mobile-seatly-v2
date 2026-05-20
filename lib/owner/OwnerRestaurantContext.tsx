import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  fetchOwnerRestaurants,
  type OwnerRestaurant,
} from '@/lib/services/ownerRestaurant';
import { key } from '@/lib/storage/keys';
import { useAuthSession } from '@/lib/auth/AuthContext';

/**
 * Multi-restaurant scope context for the business-side app.
 *
 * - On mount: load every restaurant owned by the current user.
 * - Persist the picked selection (or the literal `'all'`) in AsyncStorage.
 * - Owners with a single restaurant always resolve to that one — the stored
 *   `'all'` is treated as unset.
 */
export type OwnerRestaurantSelection = string | 'all';

export type OwnerRestaurantContextValue = {
  restaurants: OwnerRestaurant[];
  selectedRestaurantId: OwnerRestaurantSelection | null;
  isAll: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setSelectedRestaurantId: (id: OwnerRestaurantSelection) => void;
};

const STORAGE_KEY = key('owner:selectedRestaurant');

/**
 * Default no-op context used when the consumer is mounted outside the owner
 * shell (e.g. a shared provider that also runs on the customer side). All
 * fields are empty so callers fall back to the "no restaurant available"
 * branch they already handle for new owners.
 */
const NULL_CONTEXT: OwnerRestaurantContextValue = {
  restaurants: [],
  selectedRestaurantId: null,
  isAll: false,
  isLoading: false,
  error: null,
  refresh: async () => {},
  setSelectedRestaurantId: () => {},
};

const OwnerRestaurantContext = createContext<OwnerRestaurantContextValue>(NULL_CONTEXT);

function pickInitial(
  restaurants: OwnerRestaurant[],
  stored: string | null,
): OwnerRestaurantSelection | null {
  if (restaurants.length === 0) return null;
  if (restaurants.length === 1) return restaurants[0].id;
  if (stored === 'all') return 'all';
  if (stored && restaurants.some((r) => r.id === stored)) return stored;
  return restaurants[0].id;
}

export function OwnerRestaurantProvider({ children }: { children: React.ReactNode }) {
  // Live auth user — provider is mounted once at the app root and never
  // unmounts, so we have to react to user.id changes ourselves to keep
  // one owner's data from leaking into the next session.
  const { user, loading: authLoading } = useAuthSession();
  const [restaurants, setRestaurants] = useState<OwnerRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantIdState] =
    useState<OwnerRestaurantSelection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track the latest stored value so refresh() can re-apply the right selection
  // when the owner's restaurant list changes.
  const storedRef = useRef<string | null>(null);
  // Avoid clobbering an in-flight setSelectedRestaurantId from before the
  // initial load resolves.
  const userPickedRef = useRef<boolean>(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stored = storedRef.current ?? (await AsyncStorage.getItem(STORAGE_KEY));
      storedRef.current = stored;
      const list = await fetchOwnerRestaurants();
      setRestaurants(list);
      if (!userPickedRef.current) {
        setSelectedRestaurantIdState(pickInitial(list, stored));
      } else if (selectedRestaurantId && selectedRestaurantId !== 'all') {
        // Re-validate the current selection against the refreshed list.
        if (!list.some((r) => r.id === selectedRestaurantId)) {
          setSelectedRestaurantIdState(pickInitial(list, stored));
        }
      } else if (selectedRestaurantId === 'all' && list.length <= 1) {
        setSelectedRestaurantIdState(pickInitial(list, stored));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err))); // allow-raw-error-message — error state is exposed as Error object; consumers must wrap before render
      setRestaurants([]);
      setSelectedRestaurantIdState(null);
    } finally {
      setIsLoading(false);
    }
    // selectedRestaurantId intentionally omitted — load only runs on mount /
    // explicit refresh, and we read the latest selection via state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auth still hydrating on cold start — don't touch state yet, wait
    // for AuthContext's INITIAL_SESSION / SIGNED_IN verdict so we don't
    // wipe a valid persisted session.
    if (authLoading) return;

    // Signed out (or never signed in this run). Wipe everything
    // owner-scoped — React state AND the AsyncStorage key — so the next
    // user can't see this user's restaurant.
    if (!user?.id) {
      setRestaurants([]);
      setSelectedRestaurantIdState(null);
      setError(null);
      setIsLoading(false);
      storedRef.current = null;
      userPickedRef.current = false;
      void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      return;
    }

    // Signed in OR account switched. Clear stale selection BEFORE the
    // fetch resolves so a render window between effect-fire and
    // load()-resolve can't briefly show the previous user's restaurant.
    setRestaurants([]);
    setSelectedRestaurantIdState(null);
    setError(null);
    storedRef.current = null;
    userPickedRef.current = false;
    void load();
  }, [user?.id, authLoading, load]);

  const setSelectedRestaurantId = useCallback(
    (id: OwnerRestaurantSelection) => {
      userPickedRef.current = true;
      // Owners with a single restaurant ignore 'all'.
      let next: OwnerRestaurantSelection = id;
      if (id === 'all' && restaurants.length <= 1) {
        next = restaurants[0]?.id ?? id;
      } else if (id !== 'all' && !restaurants.some((r) => r.id === id)) {
        // Unknown id — fall back to the first restaurant.
        next = restaurants[0]?.id ?? id;
      }
      setSelectedRestaurantIdState(next);
      storedRef.current = next;
      void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    },
    [restaurants],
  );

  const isAll = selectedRestaurantId === 'all';

  const value = useMemo<OwnerRestaurantContextValue>(
    () => ({
      restaurants,
      selectedRestaurantId,
      isAll,
      isLoading,
      error,
      refresh: load,
      setSelectedRestaurantId,
    }),
    [restaurants, selectedRestaurantId, isAll, isLoading, error, load, setSelectedRestaurantId],
  );

  return (
    <OwnerRestaurantContext.Provider value={value}>{children}</OwnerRestaurantContext.Provider>
  );
}

export function useOwnerRestaurantContext(): OwnerRestaurantContextValue {
  return useContext(OwnerRestaurantContext);
}
