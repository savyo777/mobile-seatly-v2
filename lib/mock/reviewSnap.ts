export type RestaurantVisitStatus = 'Currently here' | 'Visited today' | 'Past visit';

export interface ReviewRestaurantOption {
  id: string;
  name: string;
  area: string;
  imageUrl: string;
  status: RestaurantVisitStatus;
  lastVisitLabel: string;
}

export interface SnapFilterOption {
  id: string;
  name: string;
  overlayColor: string;
  overlayOpacity: number;
}

export const snapRewardPoints = {
  baseCompletion: 25,
} as const;

export const currentRestaurants: ReviewRestaurantOption[] = [
  {
    id: 'r5',
    name: 'Skyline 52',
    area: 'Entertainment District',
    imageUrl: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=1200',
    status: 'Currently here',
    lastVisitLabel: 'Checked in now',
  },
  {
    id: 'r2',
    name: 'Sakura Omakase',
    area: 'Downtown Core',
    imageUrl: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=1200',
    status: 'Visited today',
    lastVisitLabel: 'Booked for 8:00 PM',
  },
];

export const pastRestaurants: ReviewRestaurantOption[] = [
  {
    id: 'r10',
    name: 'Oak & Smoke',
    area: 'Downtown Core',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200',
    status: 'Past visit',
    lastVisitLabel: 'Visited 2 weeks ago',
  },
  {
    id: 'r1',
    name: 'Nova Ristorante',
    area: 'Financial District',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
    status: 'Past visit',
    lastVisitLabel: 'Visited last month',
  },
  {
    id: 'r12',
    name: 'Garden Room',
    area: 'Distillery District',
    imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200',
    status: 'Past visit',
    lastVisitLabel: 'Visited 3 months ago',
  },
];

export const snapFilters: SnapFilterOption[] = [
  { id: 'none', name: 'Natural', overlayColor: '#000000', overlayOpacity: 0 },
  { id: 'warm', name: 'Warm', overlayColor: '#D9A24F', overlayOpacity: 0.13 },
  { id: 'cool', name: 'Cool', overlayColor: '#4A7EA8', overlayOpacity: 0.1 },
  { id: 'vibrant', name: 'Vibrant', overlayColor: '#D88A3D', overlayOpacity: 0.11 },
  { id: 'night', name: 'Night', overlayColor: '#2B3554', overlayOpacity: 0.18 },
  { id: 'film', name: 'Film', overlayColor: '#8A6F55', overlayOpacity: 0.12 },
  { id: 'soft-glow', name: 'Soft Glow', overlayColor: '#F2C8BE', overlayOpacity: 0.1 },
  { id: 'contrast', name: 'High Contrast', overlayColor: '#6D7A8A', overlayOpacity: 0.14 },
  { id: 'golden-hour', name: 'Golden Hour', overlayColor: '#E3B458', overlayOpacity: 0.14 },
];
