import type { MapStyleElement } from 'react-native-maps';

/**
 * Cenaiva-branded dark map theme. SINGLE SOURCE OF TRUTH for the Google Maps
 * JSON style used everywhere the customer-facing app renders a map
 * (DiscoverPage, Hey Cenaiva overlay, customer Map screen).
 *
 * Byte-for-byte mirror of the sister web app's `CENAIVA_MAP_STYLES` at
 * `apps/web/src/lib/google-maps.ts` lines 8-52. Don't drift from the web —
 * MOBILE_MAPS_GUIDE.md Section 3 explicitly requires byte parity. If the
 * web style changes, update both sides together.
 *
 * Dark-only by design: the spec has no light variant. Previously this file
 * exported a `buildGoogleMapStyle(palette)` factory and `googleLightMapStyle`,
 * both of which have been removed — Google's Styled Map spec is identical
 * across web/Android/iOS, so the literal web JSON is what ships everywhere.
 */
export const CENAIVA_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#AAAAAA' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0A' }, { weight: 4 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2E2E2E' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#F5E6C8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#F5E6C8' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#C9A84C' }] },

  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#242424' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#A8873A' }, { weight: 0.6 }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0F0F0F' }] },
  { featureType: 'landscape.natural.terrain', elementType: 'geometry', stylers: [{ color: '#121412' }] },

  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#888888' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0F1A12' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#A8873A' }] },
  { featureType: 'poi.business', elementType: 'labels.text.fill', stylers: [{ color: '#AAAAAA' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1A1A1A' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0A0A0A' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#888888' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0A' }, { weight: 3 }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#2E2E2E' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0A0A0A' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#C9A84C' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#242424' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#AAAAAA' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#1F1F1F' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1320' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5C7088' }] },
];

/**
 * @deprecated Use `CENAIVA_MAP_STYLE` directly. Kept as a temporary alias so
 * legacy callsites compile while the migration lands.
 */
export const googleDarkMapStyle = CENAIVA_MAP_STYLE;
