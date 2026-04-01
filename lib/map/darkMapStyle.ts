import type { MapStyleElement } from 'react-native-maps';

/**
 * Google Maps JSON style — dark, minimal POI noise for Android.
 * iOS uses native `userInterfaceStyle="dark"` / muted map types where available.
 */
export const googleDarkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2418' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2e2e2e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f1f1f' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1720' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
];
