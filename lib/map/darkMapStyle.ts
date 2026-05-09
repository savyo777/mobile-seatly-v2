import type { MapStyleElement } from 'react-native-maps';
import type { Palette } from '@/lib/theme/palettes';
import { darkColors, lightColors } from '@/lib/theme/palettes';

/**
 * Build a Google Maps JSON style derived from a palette. Used on Android
 * (iOS uses native `userInterfaceStyle="dark"` / muted map types). Pulling
 * from the palette keeps the map's geometry/label colors in step with the
 * rest of the UI when the brand surface tones move.
 */
export function buildGoogleMapStyle(palette: Palette): MapStyleElement[] {
  const isDark = palette.bgBase === darkColors.bgBase;
  const geometry = isDark ? '#1d1d1d' : '#F0EDE8';
  const labelFill = isDark ? '#9ca3af' : '#4A4740';
  const labelStroke = isDark ? '#0a0a0a' : '#FFFFFF';
  const adminGeometry = isDark ? '#2a2a2a' : '#D8D5CF';
  const parkGeometry = isDark ? '#1a2418' : '#DBE8D2';
  const roadFill = isDark ? '#2e2e2e' : '#FFFFFF';
  const roadLabelFill = isDark ? '#d1d5db' : '#4A4740';
  const highwayFill = isDark ? '#3a3a3a' : '#EDE7DA';
  const highwayStroke = isDark ? '#1f1f1f' : '#C5BCA9';
  const waterGeometry = isDark ? '#0f1720' : '#CFE3EC';

  return [
    { elementType: 'geometry', stylers: [{ color: geometry }] },
    { elementType: 'labels.text.fill', stylers: [{ color: labelFill }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: labelStroke }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: adminGeometry }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: labelFill }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: parkGeometry }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: roadFill }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: roadLabelFill }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: highwayFill }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: highwayStroke }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: waterGeometry }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: labelFill }] },
  ];
}

/**
 * Pre-computed dark style. Kept as an export to avoid breaking existing
 * `import { googleDarkMapStyle } from ...` call sites — internally it's
 * just `buildGoogleMapStyle(darkColors)`.
 */
export const googleDarkMapStyle: MapStyleElement[] = buildGoogleMapStyle(darkColors);

/** Pre-computed light style for completeness. */
export const googleLightMapStyle: MapStyleElement[] = buildGoogleMapStyle(lightColors);
