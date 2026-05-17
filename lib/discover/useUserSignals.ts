/**
 * Composes every personalization signal the app captures into a single
 * UserSignals object consumed by the Discover section specs.
 *
 * Failure-tolerant: any source can fail or return empty and the hook still
 * returns a usable signals object. `isLoading` reflects the AND of the
 * underlying fetches, but callers treat loading as "use empty signals" —
 * the Discover screen never blocks on personalization data.
 *
 * Demo-mode-safe: when EXPO_PUBLIC_CENAIVA_DEMO_MODE=true, returns a seeded
 * synthetic signals object so the personalization layer is demonstrable
 * from a fresh simulator without real user data.
 */

import { useEffect, useMemo, useState } from 'react';
import { useCurrentUserId } from '@/lib/auth/currentUserId';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { fetchMyBookingItems, type MyBookingItem } from '@/lib/booking/myReservations';
import { listMyReviews, type MyReviewRow } from '@/lib/reviews/listMyReviews';
import { useLocation } from '@/lib/location/useLocation';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

export type UserSignals = {
  preferredCuisines: string[];
  diningVibes: string[];
  dietaryRestrictions: string[];
  recentBookings: { restaurantId: string; whenIso: string; status: string }[];
  recentReviews: { restaurantId: string; createdAt: string; rating: number | null }[];
  userLocation: { lat: number; lng: number } | null;
  isLoading: boolean;
};

const EMPTY_SIGNALS: UserSignals = {
  preferredCuisines: [],
  diningVibes: [],
  dietaryRestrictions: [],
  recentBookings: [],
  recentReviews: [],
  userLocation: null,
  isLoading: false,
};

const BOOKING_RECENCY_WINDOW_MS = 90 * 86_400_000; // 90 days
const REVIEW_RECENCY_WINDOW_MS = 180 * 86_400_000; // 180 days

const DEMO_SIGNALS: UserSignals = {
  preferredCuisines: ['Italian', 'Japanese'],
  diningVibes: ['Date night', 'Patio'],
  dietaryRestrictions: [],
  recentBookings: [],
  recentReviews: [],
  userLocation: null,
  isLoading: false,
};

function isRecent(iso: string | null | undefined, windowMs: number, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && now - t <= windowMs && t <= now;
}

export function useUserSignals(): UserSignals {
  const userId = useCurrentUserId();
  const location = useLocation();
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [diningVibes, setDiningVibes] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [bookings, setBookings] = useState<MyBookingItem[]>([]);
  const [reviews, setReviews] = useState<MyReviewRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isDemoModeEnabled()) {
      setLoading(false);
      return;
    }
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [profile, bookingItems, reviewItems] = await Promise.all([
          fetchCurrentUserProfile().catch(() => null),
          fetchMyBookingItems().catch(() => []),
          listMyReviews(userId).catch(() => []),
        ]);
        if (cancelled) return;
        if (profile) {
          setPreferredCuisines(profile.preferredCuisines ?? []);
          setDiningVibes(profile.diningVibes ?? []);
          setDietaryRestrictions(profile.dietaryRestrictions ?? []);
        }
        setBookings(bookingItems ?? []);
        setReviews(reviewItems ?? []);
      } catch {
        // Never throw; cold-start defaults already in state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return useMemo<UserSignals>(() => {
    if (isDemoModeEnabled()) return DEMO_SIGNALS;
    const now = Date.now();
    const recentBookings = bookings
      .filter((b) => b.status !== 'no_show' && b.status !== 'cancelled')
      .filter((b) => isRecent(b.whenIso, BOOKING_RECENCY_WINDOW_MS, now))
      .map((b) => ({ restaurantId: b.restaurantId, whenIso: b.whenIso, status: b.status }));
    const recentReviews = reviews
      .filter((r) => isRecent(r.createdAt, REVIEW_RECENCY_WINDOW_MS, now))
      .map((r) => ({
        restaurantId: r.restaurantId,
        createdAt: r.createdAt ?? '',
        rating: r.rating ?? null,
      }));
    const userLocation = location.locationReady && location.source === 'live'
      ? { lat: location.lat, lng: location.lng }
      : null;
    return {
      ...EMPTY_SIGNALS,
      preferredCuisines,
      diningVibes,
      dietaryRestrictions,
      recentBookings,
      recentReviews,
      userLocation,
      isLoading: loading,
    };
  }, [preferredCuisines, diningVibes, dietaryRestrictions, bookings, reviews, location, loading]);
}
