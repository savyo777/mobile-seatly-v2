import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingSheet } from '@/components/cenaiva/BookingSheet';
import { RestaurantRail } from '@/components/cenaiva/RestaurantRail';
import { CenaivaVoiceOptionList } from '@/components/cenaiva/CenaivaVoiceOptionList';
import { VoiceOrb } from '@/components/cenaiva/VoiceOrb';
import { RestaurantDiscoveryMap } from '@/components/map/RestaurantDiscoveryMap';
import { Button } from '@/components/ui/Button';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { useCenaivaRestaurants, usePublicMenuCategories, usePublicMenuItems } from '@/lib/cenaiva/api/dataHooks';
import { filterCenaivaRestaurants } from '@/lib/cenaiva/filterRestaurants';
import { useAssistantStore } from '@/lib/cenaiva/state/assistantStore';
import { useCenaivaVoicePreference } from '@/lib/cenaiva/voice/CenaivaVoicePreferenceProvider';
import type { Restaurant } from '@/lib/mock/restaurants';
import { mockMapRestaurants } from '@/lib/mock/mapRestaurants';
import { applyMapFilter, DEFAULT_MAP_CENTER, withDistances } from '@/lib/map/mapFilters';
import { haversineMeters } from '@/lib/map/geo';
import type { CenaivaTtsVoice } from '@/lib/cenaiva/voice/voicePreference';
import { createStyles, borderRadius, spacing, typography } from '@/lib/theme';

const MANUAL_MENU_STATUSES = new Set([
  'offering_preorder',
  'browsing_menu',
  'reviewing_cart',
  'choosing_tip_timing',
  'choosing_tip_amount',
  'choosing_payment_split',
  'charging',
  'paid',
  'post_booking',
]);

const CONFIRMATION_OR_POST_BOOKING_STATUSES = new Set([
  'confirmed',
  'post_booking',
  'offering_preorder',
  'browsing_menu',
  'reviewing_cart',
  'choosing_tip_timing',
  'choosing_tip_amount',
  'choosing_payment_split',
  'charging',
  'paid',
]);

const CENAIVA_EAGLE_REGION_DELTA = {
  latitudeDelta: 0.16,
  longitudeDelta: 0.16,
};
const CENAIVA_LOCAL_COORDINATE_RADIUS_METERS = 75_000;
const CATALOG_ALL_TAB = '__all__';
const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

type HoursRange = { open: string; close: string };
type ParsedClockTime = {
  hour: number;
  minute: number;
  minutes: number;
  hasMeridiem: boolean;
};

function normalizeRestaurantKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isFiniteLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

const discoverMapRestaurantById = new Map(mockMapRestaurants.map((restaurant) => [restaurant.id, restaurant]));
const discoverMapRestaurantByName = new Map(
  mockMapRestaurants.map((restaurant) => [normalizeRestaurantKey(restaurant.name), restaurant]),
);

function withDiscoverMapCoordinates(
  restaurant: Restaurant,
  anchor: { lat: number; lng: number },
  index: number,
): Restaurant {
  const safeAnchor = isFiniteLatLng(anchor.lat, anchor.lng)
    ? anchor
    : { lat: DEFAULT_MAP_CENTER.latitude, lng: DEFAULT_MAP_CENTER.longitude };
  if (
    Number.isFinite(restaurant.lat) &&
    Number.isFinite(restaurant.lng) &&
    haversineMeters(safeAnchor.lat, safeAnchor.lng, restaurant.lat, restaurant.lng) <= CENAIVA_LOCAL_COORDINATE_RADIUS_METERS
  ) {
    return restaurant;
  }

  const discoverRestaurant =
    discoverMapRestaurantById.get(restaurant.id) ??
    discoverMapRestaurantByName.get(normalizeRestaurantKey(restaurant.name)) ??
    (mockMapRestaurants.length ? mockMapRestaurants[index % mockMapRestaurants.length] : null);
  if (!discoverRestaurant || !isFiniteLatLng(discoverRestaurant.lat, discoverRestaurant.lng)) {
    return {
      ...restaurant,
      lat: safeAnchor.lat,
      lng: safeAnchor.lng,
    };
  }
  const latOffset = discoverRestaurant.lat - DEFAULT_MAP_CENTER.latitude;
  const lngOffset = discoverRestaurant.lng - DEFAULT_MAP_CENTER.longitude;
  const lat = safeAnchor.lat + latOffset;
  const lng = safeAnchor.lng + lngOffset;
  return {
    ...restaurant,
    lat: isFiniteLatLng(lat, lng) ? lat : safeAnchor.lat,
    lng: isFiniteLatLng(lat, lng) ? lng : safeAnchor.lng,
  };
}

const useStyles = createStyles(() => ({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#0A0A0A',
  },
  mapHidden: {
    display: 'none',
  },
  closeButton: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 1000,
    elevation: 1000,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  selectedDistanceCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 45,
    minHeight: 44,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.38)',
    backgroundColor: 'rgba(8,8,8,0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedDistanceIcon: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: '#C8A951',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDistanceBody: {
    flex: 1,
    minWidth: 0,
  },
  selectedDistanceLabel: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.54)',
    fontWeight: '700',
    lineHeight: 14,
  },
  selectedDistanceText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 18,
  },
  spokenWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.lg,
    zIndex: 12,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  spokenBubble: {
    width: '85%',
    maxWidth: 384,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  spokenText: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  catalogPopup: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    zIndex: 40,
    maxHeight: '72%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.34)',
    backgroundColor: 'rgba(14,14,14,0.96)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 10,
  },
  catalogHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  catalogImage: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.md,
    backgroundColor: '#1E1E1E',
  },
  catalogImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogBody: {
    flex: 1,
    minWidth: 0,
  },
  catalogTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  catalogName: {
    ...typography.body,
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 20,
    minWidth: 0,
  },
  catalogClose: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  catalogMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  catalogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  catalogMetaText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.66)',
    fontWeight: '600',
  },
  catalogCuisine: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.48)',
    marginTop: 5,
  },
  catalogHours: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.72)',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  catalogScroll: {
    maxHeight: 190,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  catalogScrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  catalogTabs: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  catalogTab: {
    minHeight: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  catalogTabActive: {
    backgroundColor: '#C8A951',
    borderColor: '#C8A951',
  },
  catalogTabText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '700',
  },
  catalogTabTextActive: {
    color: '#000000',
  },
  catalogSectionTitle: {
    ...typography.bodySmall,
    color: '#C8A951',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: spacing.xs,
  },
  catalogMenuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  catalogMenuPhoto: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogMenuBody: {
    flex: 1,
    minWidth: 0,
  },
  catalogMenuName: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 17,
  },
  catalogMenuDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.46)',
    lineHeight: 16,
    marginTop: 2,
  },
  catalogMenuPrice: {
    ...typography.bodySmall,
    color: '#C8A951',
    fontWeight: '700',
    marginTop: 3,
  },
  catalogEmptyText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 18,
  },
  catalogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(14,14,14,0.98)',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  catalogBook: {
    flex: 1,
    minHeight: 42,
    borderRadius: borderRadius.full,
    backgroundColor: '#C8A951',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  catalogBookText: {
    ...typography.body,
    color: '#000000',
    fontWeight: '800',
  },
  bottomPanel: {
    marginTop: 'auto',
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bottomPanelManual: {
    flex: 1,
  },
  railEmpty: {
    color: 'rgba(255,255,255,0.20)',
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bookingWrap: {
    paddingHorizontal: spacing.lg,
  },
  bookingWrapManual: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 0,
  },
  permissionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.28)',
    backgroundColor: 'rgba(200,169,81,0.10)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionText: {
    ...typography.bodySmall,
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  permissionButton: {
    minHeight: 34,
    borderRadius: borderRadius.full,
    backgroundColor: '#C8A951',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  permissionButtonText: {
    ...typography.bodySmall,
    color: '#000000',
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statusText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.50)',
    flex: 1,
    fontWeight: '500',
  },
  textInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 96,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    ...typography.body,
  },
  sendButton: {
    minHeight: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8A951',
    paddingHorizontal: spacing.lg,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    ...typography.body,
    color: '#000000',
    fontWeight: '600',
  },
  keyboardButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardButtonActive: {
    backgroundColor: 'rgba(200,169,81,0.20)',
    borderColor: '#C8A951',
  },
  voiceOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  voiceCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#0F0F10',
    padding: spacing.lg,
  },
  voiceCardTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceCardBody: {
    ...typography.body,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  voiceCardHint: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  voiceConfirmButton: {
    marginTop: spacing.lg,
  },
  voiceLoadingRow: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  voiceLoadingText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
}));

function statusCopy(status: string, inManualMenu: boolean, spokenText: string, voiceUnavailable = false) {
  if (voiceUnavailable) return 'Voice recognition is unavailable in this build. Type your request.';
  if (status === 'listening') return 'Listening...';
  if (status === 'processing') return 'Thinking...';
  if (status === 'speaking') return spokenText || 'Cenaiva is speaking.';
  if (status === 'error') return 'Voice input is not available. Type your request.';
  if (inManualMenu) return 'Tap the mic to ask about ingredients or allergens';
  return 'Tap the mic or say "Hey Cenaiva"';
}

function permissionCopy(status: string) {
  if (status === 'unavailable') {
    return 'Voice recognition is unavailable in this build. Type your request.';
  }
  return 'Microphone access is off. Enable it to use Hey Cenaiva.';
}

function priceText(priceRange: number | null | undefined) {
  const clamped = Math.max(1, Math.min(4, Math.round(priceRange ?? 2)));
  return '$'.repeat(clamped);
}

function distanceText(distanceMeters: number | null | undefined) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) return null;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function moneyText(value: number) {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function parseClockTime(value: string | null | undefined): ParsedClockTime | null {
  const cleaned = String(value ?? '').trim().toLowerCase().replace(/\./g, '');
  const match = cleaned.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?\s*(am|pm)?$/);
  if (!match) return null;

  const rawHour = Number(match[1]);
  const minute = match[2] == null ? 0 : Number(match[2]);
  const meridiem = match[3] as 'am' | 'pm' | undefined;
  if (!Number.isFinite(rawHour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (!meridiem && (rawHour < 0 || rawHour > 23)) return null;
  if (meridiem && (rawHour < 1 || rawHour > 12)) return null;

  let hour = rawHour;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return {
    hour,
    minute,
    minutes: hour * 60 + minute,
    hasMeridiem: Boolean(meridiem),
  };
}

function formatClockMinutes(totalMinutes: number): string {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function normalizeHoursRange(hours: HoursRange | null | undefined): { open: number; close: number } | null {
  if (!hours) return null;
  const open = parseClockTime(hours.open);
  const close = parseClockTime(hours.close);
  if (!open || !close) return null;

  let closeMinutes = close.minutes;
  if (!close.hasMeridiem && closeMinutes <= open.minutes) {
    closeMinutes += open.minutes < 12 * 60 && close.hour <= 12 ? 12 * 60 : 24 * 60;
    if (closeMinutes <= open.minutes) closeMinutes += 12 * 60;
  } else if (closeMinutes <= open.minutes) {
    closeMinutes += 24 * 60;
  }

  return { open: open.minutes, close: closeMinutes };
}

function formatHoursRange(hours: HoursRange | null | undefined): string {
  const range = normalizeHoursRange(hours);
  if (!range) return 'Closed today';
  return `${formatClockMinutes(range.open)} - ${formatClockMinutes(range.close)}`;
}

function todayHoursText(hoursJson: Restaurant['hoursJson'] | null | undefined): string {
  if (!hoursJson) return 'Hours unavailable';
  const todayKey = WEEKDAY_KEYS[new Date().getDay()];
  return formatHoursRange(hoursJson[todayKey]);
}

export function CenaivaVoiceShell({ onClose }: { onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const assistant = useCenaivaAssistant();
  const { state, dispatch } = useAssistantStore();
  const {
    voicePreference,
    isLoading: voicePreferenceLoading,
    isSaving: voicePreferenceSaving,
    needsSelection: voiceSelectionRequired,
    setVoicePreference,
  } = useCenaivaVoicePreference();
  const {
    restaurants,
    loading: restaurantsLoading,
    hasLoaded: restaurantsHaveLoaded,
  } = useCenaivaRestaurants();
  const [input, setInput] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(state.map.highlighted_restaurant_id);
  const [pendingVoice, setPendingVoice] = useState<CenaivaTtsVoice | null>(voicePreference);
  const [selectedCatalogTab, setSelectedCatalogTab] = useState(CATALOG_ALL_TAB);
  const [mapFocusResetKey, setMapFocusResetKey] = useState(0);
  const coordinateCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const wasOpenRef = useRef(false);
  const showVoiceSelectionOverlay =
    voicePreferenceLoading || voicePreferenceSaving || voiceSelectionRequired;

  const inManualMenu = MANUAL_MENU_STATUSES.has(state.booking.status);
  const showConfirmationOrPostBooking = CONFIRMATION_OR_POST_BOOKING_STATUSES.has(state.booking.status);
  const hasSelectedRestaurant = Boolean(state.booking.restaurant_id);
  const visibleRestaurants = useMemo(
    () => filterCenaivaRestaurants(restaurants, state.map.marker_restaurant_ids, state.filters),
    [restaurants, state.filters, state.map.marker_restaurant_ids],
  );
  const mapAnchor = useMemo(
    () => {
      const center = state.map.center;
      if (isFiniteLatLng(center?.lat, center?.lng)) {
        return { lat: center!.lat, lng: center!.lng };
      }
      return { lat: DEFAULT_MAP_CENTER.latitude, lng: DEFAULT_MAP_CENTER.longitude };
    },
    [state.map.center?.lat, state.map.center?.lng],
  );
  const mapCoordinateRestaurants = useMemo(
    () => {
      const coordinateCache = coordinateCacheRef.current;
      return visibleRestaurants.map((restaurant, index) => {
        const cached = coordinateCache.get(restaurant.id);
        if (cached) {
          return {
            ...restaurant,
            lat: cached.lat,
            lng: cached.lng,
          };
        }

        const positioned = withDiscoverMapCoordinates(restaurant, mapAnchor, index);
        coordinateCache.set(restaurant.id, { lat: positioned.lat, lng: positioned.lng });
        return positioned;
      });
    },
    [mapAnchor, visibleRestaurants],
  );
  const mappedRestaurants = useMemo(
    () => {
      const withDistance = withDistances(
        mapCoordinateRestaurants,
        mapAnchor.lat,
        mapAnchor.lng,
      );
      return state.map.marker_restaurant_ids.length
        ? withDistance
        : applyMapFilter(withDistance, 'nearby');
    },
    [mapAnchor.lat, mapAnchor.lng, mapCoordinateRestaurants, state.map.marker_restaurant_ids.length],
  );
  const chosenRestaurant = useMemo(
    () => {
      if (!state.booking.restaurant_id) return null;
      const mapped = mappedRestaurants.find((restaurant) => restaurant.id === state.booking.restaurant_id);
      if (mapped) return mapped;

      const source = restaurants.find((restaurant) => restaurant.id === state.booking.restaurant_id);
      if (!source) return null;
      const cached = coordinateCacheRef.current.get(source.id);
      const positioned = cached
        ? { ...source, lat: cached.lat, lng: cached.lng }
        : withDiscoverMapCoordinates(source, mapAnchor, 0);
      coordinateCacheRef.current.set(source.id, { lat: positioned.lat, lng: positioned.lng });
      return withDistances([positioned], mapAnchor.lat, mapAnchor.lng)[0] ?? null;
    },
    [mapAnchor, mappedRestaurants, restaurants, state.booking.restaurant_id],
  );
  const mapDisplayRestaurants = useMemo(
    () => (chosenRestaurant ? [chosenRestaurant] : mappedRestaurants),
    [chosenRestaurant, mappedRestaurants],
  );
  const selectedRestaurant = useMemo(
    () => (selectedId ? mappedRestaurants.find((restaurant) => restaurant.id === selectedId) ?? null : null),
    [mappedRestaurants, selectedId],
  );
  const {
    items: selectedMenuItems,
    loading: selectedMenuLoading,
  } = usePublicMenuItems(selectedRestaurant?.id);
  const {
    categories: selectedMenuCategories,
    loading: selectedMenuCategoriesLoading,
  } = usePublicMenuCategories(selectedRestaurant?.id);
  const selectedCategoryNameById = useMemo(
    () => new Map(selectedMenuCategories.map((category) => [category.id, category.name])),
    [selectedMenuCategories],
  );
  const catalogMenuItems = useMemo(
    () =>
      selectedMenuItems
        .filter((item) => item.is_available !== false)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category_id
            ? selectedCategoryNameById.get(item.category_id) ?? item.category ?? 'Menu'
            : item.category ?? 'Menu',
          photoUrl: item.photo_url,
          sortOrder: item.sort_order ?? 0,
        }))
        .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [selectedCategoryNameById, selectedMenuItems],
  );
  const catalogMenuTabs = useMemo(
    () => Array.from(new Set(catalogMenuItems.map((item) => item.category))),
    [catalogMenuItems],
  );
  const visibleCatalogMenuItems = useMemo(
    () =>
      selectedCatalogTab === CATALOG_ALL_TAB
        ? catalogMenuItems
        : catalogMenuItems.filter((item) => item.category === selectedCatalogTab),
    [catalogMenuItems, selectedCatalogTab],
  );
  const fallbackMenuSignals = useMemo(
    () =>
      [
        selectedRestaurant?.cuisineType,
        ...(selectedRestaurant?.tags ?? []),
      ]
        .filter((item): item is string => Boolean(item?.trim()))
        .slice(0, 3),
    [selectedRestaurant],
  );
  const userLocation = state.map.center
    ? { latitude: state.map.center.lat, longitude: state.map.center.lng }
    : null;
  const highlightedId = state.booking.restaurant_id ?? selectedId ?? null;
  const showMap = !inManualMenu;
  const showRail = !showConfirmationOrPostBooking && !inManualMenu && !hasSelectedRestaurant;
  const showPinCatalog = Boolean(selectedRestaurant && showMap && showRail);
  const selectedDistance = chosenRestaurant ? distanceText(chosenRestaurant.distanceMeters) : null;
  const showSelectedDistance = Boolean(showMap && state.booking.restaurant_id && chosenRestaurant && selectedDistance);
  const canShowRailEmpty = restaurantsHaveLoaded && !restaurantsLoading;
  const showPermissionRecovery =
    !textMode &&
    (assistant.voicePermissionStatus === 'denied' ||
      assistant.voicePermissionStatus === 'blocked' ||
      assistant.voicePermissionStatus === 'unavailable');
  const voiceUnavailable = assistant.voicePermissionStatus === 'unavailable';

  useEffect(() => {
    assistant.setSpeechHints(visibleRestaurants.map((restaurant) => restaurant.name));
  }, [assistant, visibleRestaurants]);

  useEffect(() => {
    if (state.isOpen && !wasOpenRef.current) {
      coordinateCacheRef.current.clear();
      setSelectedId(state.map.highlighted_restaurant_id);
      setSelectedCatalogTab(CATALOG_ALL_TAB);
      setMapFocusResetKey((key) => key + 1);
    }
    wasOpenRef.current = state.isOpen;
  }, [state.isOpen, state.map.highlighted_restaurant_id]);

  useEffect(() => {
    setSelectedId(state.map.highlighted_restaurant_id);
  }, [state.map.highlighted_restaurant_id]);

  useEffect(() => {
    setSelectedCatalogTab(CATALOG_ALL_TAB);
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    if (selectedCatalogTab !== CATALOG_ALL_TAB && !catalogMenuTabs.includes(selectedCatalogTab)) {
      setSelectedCatalogTab(CATALOG_ALL_TAB);
    }
  }, [catalogMenuTabs, selectedCatalogTab]);

  useEffect(() => {
    setPendingVoice(voicePreference);
  }, [voicePreference]);

  useEffect(() => {
    if (inManualMenu && state.voiceStatus === 'listening') {
      assistant.stopListening();
    }
    if (inManualMenu && textMode) {
      setTextMode(false);
      assistant.setTextMode(false);
    }
  }, [assistant, inManualMenu, state.voiceStatus, textMode]);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || state.voiceStatus === 'processing') return;
    setInput('');
    Keyboard.dismiss();
    await assistant.sendTranscript(text);
  }, [assistant, input, state.voiceStatus]);

  const onPressRestaurant = useCallback(
    (restaurant: Restaurant) => {
      if (state.voiceStatus === 'processing') return;
      setSelectedId(restaurant.id);
      dispatch({
        type: 'PRESELECT_RESTAURANT',
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
      });
      dispatch({ type: 'highlight_restaurant', restaurant_id: restaurant.id });
      void assistant.sendTranscript(`I want to book at ${restaurant.name}`, {
        restaurantId: restaurant.id,
      });
    },
    [assistant, dispatch, state.voiceStatus],
  );

  const dismissRestaurantCatalog = useCallback(() => {
    if (!selectedId) return;
    setSelectedId(null);
    setSelectedCatalogTab(CATALOG_ALL_TAB);
    Keyboard.dismiss();
  }, [selectedId]);

  const onSelectRestaurant = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSelectedCatalogTab(CATALOG_ALL_TAB);
    },
    [],
  );

  const close = useCallback(() => {
    if (onClose) {
      assistant.close();
      onClose();
      return;
    }
    assistant.close();
  }, [assistant, onClose]);

  const toggleTextMode = useCallback(() => {
    setTextMode((active) => {
      const entering = !active;
      if (entering) {
        assistant.setTextMode(true);
      } else {
        setInput('');
        assistant.setTextMode(false);
      }
      return entering;
    });
  }, [assistant]);

  const onMicPress = useCallback(() => {
    if (showPermissionRecovery) return;
    if (state.voiceStatus === 'processing') return;
    if (state.voiceStatus === 'listening') {
      assistant.stopListening();
      return;
    }
    if (state.voiceStatus === 'speaking') {
      assistant.stopSpeaking();
      return;
    }
    void assistant.startListening();
  }, [assistant, showPermissionRecovery, state.voiceStatus]);

  const sendDisabled = !input.trim() || state.voiceStatus === 'processing';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.mapArea, !showMap && styles.mapHidden]}>
        <RestaurantDiscoveryMap
          filteredRestaurants={mapDisplayRestaurants}
          selectedId={highlightedId}
          onSelectRestaurant={onSelectRestaurant}
          onMapPress={dismissRestaurantCatalog}
          userLocation={userLocation}
          showUserLocation={Boolean(userLocation)}
          locationReady={restaurantsHaveLoaded || mapDisplayRestaurants.length > 0}
          markerVariant="cenaiva"
          autoFocusUserLocation
          autoFocusRestaurants
          autoFocusMaxRestaurants={8}
          autoFocusRegionDelta={CENAIVA_EAGLE_REGION_DELTA}
          autoFocusResetKey={mapFocusResetKey}
          focusSelectedWithUser={Boolean(state.booking.restaurant_id)}
        />

        {showSelectedDistance && chosenRestaurant && selectedDistance ? (
          <View
            pointerEvents="none"
            style={[
              styles.selectedDistanceCard,
              { top: Math.max(insets.top, spacing.lg) + 44 },
            ]}
          >
            <View style={styles.selectedDistanceIcon}>
              <Ionicons name="navigate" size={14} color="#000000" />
            </View>
            <View style={styles.selectedDistanceBody}>
              <Text style={styles.selectedDistanceLabel} numberOfLines={1}>
                Distance from you
              </Text>
              <Text style={styles.selectedDistanceText} numberOfLines={1}>
                {chosenRestaurant.name} is {selectedDistance} away
              </Text>
            </View>
          </View>
        ) : null}

        {selectedRestaurant && showPinCatalog ? (
          <View style={styles.catalogPopup}>
            <View style={styles.catalogHeader}>
              {selectedRestaurant.coverPhotoUrl?.trim() ? (
                <Image
                  source={{ uri: selectedRestaurant.coverPhotoUrl }}
                  style={styles.catalogImage}
                />
              ) : (
                <View style={[styles.catalogImage, styles.catalogImageFallback]}>
                  <Ionicons name="restaurant-outline" size={28} color="rgba(255,255,255,0.42)" />
                </View>
              )}
              <View style={styles.catalogBody}>
                <View style={styles.catalogTitleRow}>
                  <Text style={styles.catalogName} numberOfLines={2}>
                    {selectedRestaurant.name}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close restaurant catalog"
                    style={({ pressed }) => [
                      styles.catalogClose,
                      pressed && { opacity: 0.78 },
                    ]}
                    onPress={dismissRestaurantCatalog}
                  >
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.70)" />
                  </Pressable>
                </View>
                <View style={styles.catalogMetaRow}>
                  <View style={styles.catalogMeta}>
                    <Ionicons name="star" size={13} color="#C8A951" />
                    <Text style={styles.catalogMetaText}>{selectedRestaurant.avgRating.toFixed(1)}</Text>
                  </View>
                  <View style={styles.catalogMeta}>
                    <Ionicons name="cash-outline" size={13} color="rgba(255,255,255,0.58)" />
                    <Text style={styles.catalogMetaText}>{priceText(selectedRestaurant.priceRange)}</Text>
                  </View>
                  {distanceText(selectedRestaurant.distanceMeters) ? (
                    <View style={styles.catalogMeta}>
                      <Ionicons name="navigate-outline" size={13} color="rgba(255,255,255,0.58)" />
                      <Text style={styles.catalogMetaText}>
                        {distanceText(selectedRestaurant.distanceMeters)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {selectedRestaurant.cuisineType || selectedRestaurant.area || selectedRestaurant.city ? (
                  <Text style={styles.catalogCuisine} numberOfLines={2}>
                    {[selectedRestaurant.cuisineType, selectedRestaurant.area || selectedRestaurant.city]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.catalogHours} numberOfLines={1}>
                  Today: {todayHoursText(selectedRestaurant.hoursJson)}
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.catalogScroll}
              contentContainerStyle={styles.catalogScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.catalogSectionTitle}>Menu</Text>
              {catalogMenuTabs.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catalogTabs}
                >
                  {[
                    { key: CATALOG_ALL_TAB, label: 'All' },
                    ...catalogMenuTabs.map((category) => ({ key: category, label: category })),
                  ].map((tab) => {
                    const selected = selectedCatalogTab === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        accessibilityRole="button"
                        accessibilityLabel={`Show ${tab.label} menu items`}
                        style={({ pressed }) => [
                          styles.catalogTab,
                          selected && styles.catalogTabActive,
                          pressed && { opacity: 0.84 },
                        ]}
                        onPress={() => setSelectedCatalogTab(tab.key)}
                      >
                        <Text style={[styles.catalogTabText, selected && styles.catalogTabTextActive]}>
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}

              {selectedMenuLoading || selectedMenuCategoriesLoading ? (
                <View style={styles.catalogMenuItem}>
                  <ActivityIndicator color="#C8A951" />
                  <Text style={styles.catalogEmptyText}>Loading menu...</Text>
                </View>
              ) : visibleCatalogMenuItems.length ? (
                visibleCatalogMenuItems.map((item) => (
                  <View key={item.id} style={styles.catalogMenuItem}>
                    {item.photoUrl?.trim() ? (
                      <Image source={{ uri: item.photoUrl }} style={styles.catalogMenuPhoto} resizeMode="cover" />
                    ) : (
                      <View style={styles.catalogMenuPhoto}>
                        <Ionicons name="restaurant-outline" size={20} color="rgba(255,255,255,0.36)" />
                      </View>
                    )}
                    <View style={styles.catalogMenuBody}>
                      <Text style={styles.catalogMenuName} numberOfLines={2}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.catalogMenuDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                      <Text style={styles.catalogMenuPrice}>{moneyText(item.price)}</Text>
                    </View>
                  </View>
                ))
              ) : fallbackMenuSignals.length ? (
                <Text style={styles.catalogEmptyText}>
                  {fallbackMenuSignals.join(' · ')}
                </Text>
              ) : (
                <Text style={styles.catalogEmptyText}>This restaurant has not published a menu yet.</Text>
              )}
            </ScrollView>

            <View style={styles.catalogActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Book dine-in at ${selectedRestaurant.name}`}
                disabled={state.voiceStatus === 'processing'}
                style={({ pressed }) => [
                  styles.catalogBook,
                  state.voiceStatus === 'processing' && { opacity: 0.45 },
                  pressed && state.voiceStatus !== 'processing' && { opacity: 0.86 },
                ]}
                onPress={() => onPressRestaurant(selectedRestaurant)}
              >
                <Ionicons name="calendar-outline" size={17} color="#000000" />
                <Text style={styles.catalogBookText}>Book dine-in</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {state.lastSpokenText ? (
          <View style={styles.spokenWrap} pointerEvents="none">
            <View style={styles.spokenBubble}>
              <Text style={styles.spokenText} numberOfLines={3}>{state.lastSpokenText}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {!showConfirmationOrPostBooking ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close assistant"
          hitSlop={16}
          style={({ pressed }) => [
            styles.closeButton,
            { top: Math.max(insets.top, spacing.lg) },
            pressed && { backgroundColor: 'rgba(255,255,255,0.20)' },
          ]}
          onPress={close}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <View
        style={[
          styles.bottomPanel,
          inManualMenu && styles.bottomPanelManual,
        ]}
        onTouchStart={showPinCatalog ? dismissRestaurantCatalog : undefined}
      >
        {showRail ? (
          mappedRestaurants.length ? (
            <RestaurantRail
              restaurants={mappedRestaurants}
              highlightedId={state.booking.restaurant_id}
              onPressRestaurant={onPressRestaurant}
            />
          ) : canShowRailEmpty ? (
            <Text style={styles.railEmpty}>Speak to discover restaurants near you</Text>
          ) : null
        ) : null}

        <View style={[styles.bookingWrap, inManualMenu && styles.bookingWrapManual]}>
          <BookingSheet fullScreen={inManualMenu} />
        </View>

        {showPermissionRecovery ? (
          <View style={styles.permissionCard}>
            <Ionicons
              name={assistant.voicePermissionStatus === 'unavailable' ? 'alert-circle-outline' : 'mic-off-outline'}
              size={20}
              color="#C8A951"
            />
            <Text style={styles.permissionText}>{permissionCopy(assistant.voicePermissionStatus)}</Text>
            {assistant.voicePermissionStatus !== 'unavailable' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  assistant.canAskVoicePermission ? 'Allow microphone' : 'Open microphone settings'
                }
                style={({ pressed }) => [styles.permissionButton, pressed && { opacity: 0.82 }]}
                onPress={async () => {
                  if (assistant.canAskVoicePermission) {
                    const granted = await assistant.requestVoicePermission();
                    if (granted) void assistant.startListening();
                    return;
                  }
                  await assistant.openVoicePermissionSettings();
                }}
              >
                <Text style={styles.permissionButtonText}>
                  {assistant.canAskVoicePermission ? 'Allow microphone' : 'Open Settings'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <VoiceOrb status={state.voiceStatus} onPress={onMicPress} disabled={showPermissionRecovery} />

          {textMode ? (
            <View style={styles.textInputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.30)"
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={submit}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                disabled={sendDisabled}
                style={({ pressed }) => [
                  styles.sendButton,
                  sendDisabled && styles.sendButtonDisabled,
                  pressed && !sendDisabled && { opacity: 0.86 },
                ]}
                onPress={submit}
              >
                <Text style={styles.sendButtonText}>
                  {state.voiceStatus === 'processing' ? '...' : 'Send'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.statusText} numberOfLines={3}>
              {statusCopy(state.voiceStatus, inManualMenu, state.lastSpokenText, voiceUnavailable)}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle text input"
            style={({ pressed }) => [
              styles.keyboardButton,
              textMode && styles.keyboardButtonActive,
              pressed && { opacity: 0.82 },
            ]}
            onPress={toggleTextMode}
          >
            <Ionicons
              name="keypad-outline"
              size={18}
              color={textMode ? '#C8A951' : 'rgba(255,255,255,0.40)'}
            />
          </Pressable>
        </View>
      </View>
      {showVoiceSelectionOverlay ? (
        <View style={styles.voiceOverlay}>
          <View style={styles.voiceCard}>
            {voicePreferenceLoading ? (
              <View style={styles.voiceLoadingRow}>
                <ActivityIndicator color="#C8A951" />
                <Text style={styles.voiceLoadingText}>Loading Hey Cenaiva voice settings...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.voiceCardTitle}>Choose Hey Cenaiva&apos;s voice</Text>
                <Text style={styles.voiceCardBody}>
                  Pick the voice Hey Cenaiva should use when speaking with you.
                </Text>
                <CenaivaVoiceOptionList
                  selectedVoice={pendingVoice}
                  disabled={voicePreferenceSaving}
                  onSelect={setPendingVoice}
                />
                <Button
                  title="Confirm voice"
                  onPress={() => {
                    if (!pendingVoice) return;
                    void setVoicePreference(pendingVoice);
                  }}
                  loading={voicePreferenceSaving}
                  disabled={!pendingVoice}
                  style={styles.voiceConfirmButton}
                />
                <Text style={styles.voiceCardHint}>
                  You can change this later in Profile Settings.
                </Text>
              </>
            )}
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
