export type RestaurantVisitStatus = 'Currently here' | 'Visited today' | 'Past visit';

export interface ReviewRestaurantOption {
  id: string;
  name: string;
  area: string;
  imageUrl: string;
  status: RestaurantVisitStatus;
  lastVisitLabel: string;
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
