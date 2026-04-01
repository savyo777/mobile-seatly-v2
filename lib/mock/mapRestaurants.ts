import type { Restaurant } from '@/lib/mock/restaurants';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { haversineMeters } from '@/lib/map/geo';

const MILTON_HOME = {
  lat: 43.51025,
  lng: -79.86635,
};

const MILTON_AREAS = [
  'Old Milton',
  'Dempsey',
  'Beaty',
  'Clarke',
  'Timberlea',
  'Ford',
  'Cobban',
  'Bronte Meadows',
  'Scott',
  'Willmott',
  'Harrison',
  'Campbellville',
  'Milton Heights',
  'Downtown Milton',
  'Nassagaweya',
];

const MILTON_ADDRESSES = [
  '9700 Regional Road 25',
  '801 Main Street East',
  '1050 Kennedy Circle',
  '420 Laurier Avenue',
  '1280 Steeles Avenue East',
  '1100 Bronte Street South',
  '820 Louis St Laurent Avenue',
  '575 Ontario Street South',
  '670 Scott Boulevard',
  '830 Farmstead Drive',
  '1100 Savoline Boulevard',
  '1620 Guelph Line',
  '498 Martin Street',
  '295 Main Street East',
  '7255 Bell School Line',
];

const OFFSETS = [
  { lat: 0.0042, lng: 0.0015 },
  { lat: 0.0034, lng: -0.0028 },
  { lat: 0.0068, lng: 0.0052 },
  { lat: -0.0015, lng: -0.0048 },
  { lat: 0.0011, lng: 0.0074 },
  { lat: -0.0046, lng: 0.0039 },
  { lat: -0.0065, lng: 0.0006 },
  { lat: 0.0022, lng: -0.0064 },
  { lat: 0.0081, lng: -0.0019 },
  { lat: -0.0078, lng: -0.0033 },
  { lat: -0.0096, lng: 0.0045 },
  { lat: 0.0135, lng: 0.0102 },
  { lat: -0.0112, lng: -0.0074 },
  { lat: -0.0028, lng: 0.0096 },
  { lat: 0.0104, lng: -0.0092 },
];

export const mockMapRestaurants: Restaurant[] = mockRestaurants.map((restaurant, index) => {
  const offset = OFFSETS[index % OFFSETS.length];
  const lat = MILTON_HOME.lat + offset.lat;
  const lng = MILTON_HOME.lng + offset.lng;

  return {
    ...restaurant,
    // Keep original address/city/area copy exactly as described on cards.
    // Only map coordinates are localized around Milton for discovery UX.
    lat,
    lng,
    distanceKm: Number((haversineMeters(MILTON_HOME.lat, MILTON_HOME.lng, lat, lng) / 1000).toFixed(1)),
  };
});
