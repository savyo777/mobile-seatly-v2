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
  /** Solid color wash (use opacity 0 to skip). */
  overlayColor: string;
  overlayOpacity: number;
  /** Optional cinematic gradient on top of the solid wash. */
  gradientColors?: readonly string[];
  gradientLocations?: readonly number[];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  gradientOpacity?: number;
  /** Edge darkening strength 0–1. */
  vignetteStrength?: number;
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

/** Fifteen distinct looks: solid + gradient + vignette combos tuned for food portraits. */
export const snapFilters: SnapFilterOption[] = [
  { id: 'none', name: 'Natural', overlayColor: '#000000', overlayOpacity: 0 },
  {
    id: 'rose-glass',
    name: 'Rose Glass',
    overlayColor: '#F4B8C5',
    overlayOpacity: 0.08,
    gradientColors: ['rgba(255,182,193,0.45)', 'rgba(255,240,246,0.08)', 'rgba(120,60,90,0.18)'],
    gradientLocations: [0, 0.45, 1],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    gradientOpacity: 0.85,
    vignetteStrength: 0.22,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    overlayColor: '#E8A045',
    overlayOpacity: 0.06,
    gradientColors: ['rgba(255,214,140,0.5)', 'rgba(255,160,70,0.12)', 'rgba(80,40,20,0.25)'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    gradientOpacity: 0.9,
    vignetteStrength: 0.18,
  },
  {
    id: 'cool-luxe',
    name: 'Cool Luxe',
    overlayColor: '#5B7C9E',
    overlayOpacity: 0.07,
    gradientColors: ['rgba(180,210,255,0.35)', 'rgba(40,70,120,0.2)', 'rgba(20,35,55,0.35)'],
    gradientLocations: [0, 0.55, 1],
    gradientStart: { x: 0, y: 1 },
    gradientEnd: { x: 1, y: 0 },
    gradientOpacity: 0.88,
    vignetteStrength: 0.2,
  },
  {
    id: 'noir-bistro',
    name: 'Noir Bistro',
    overlayColor: '#1a1a2e',
    overlayOpacity: 0.12,
    gradientColors: ['rgba(0,0,0,0.55)', 'rgba(40,40,70,0.15)', 'rgba(0,0,0,0.5)'],
    gradientLocations: [0, 0.5, 1],
    vignetteStrength: 0.35,
  },
  {
    id: 'sakura-mist',
    name: 'Sakura Mist',
    overlayColor: '#FFD6E8',
    overlayOpacity: 0.06,
    gradientColors: ['rgba(255,220,240,0.55)', 'rgba(255,255,255,0.05)', 'rgba(200,140,180,0.2)'],
    gradientLocations: [0, 0.4, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    gradientOpacity: 0.82,
    vignetteStrength: 0.12,
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    overlayColor: '#2d1b69',
    overlayOpacity: 0.05,
    gradientColors: ['rgba(255,0,180,0.22)', 'rgba(0,255,220,0.12)', 'rgba(80,0,120,0.35)'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0, y: 0.5 },
    gradientEnd: { x: 1, y: 0.5 },
    gradientOpacity: 0.95,
    vignetteStrength: 0.25,
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte',
    overlayColor: '#6B8E23',
    overlayOpacity: 0.06,
    gradientColors: ['rgba(200,230,180,0.4)', 'rgba(60,100,50,0.18)', 'rgba(30,50,30,0.28)'],
    gradientLocations: [0, 0.48, 1],
    gradientOpacity: 0.88,
    vignetteStrength: 0.16,
  },
  {
    id: 'cabernet',
    name: 'Cabernet',
    overlayColor: '#4a0e16',
    overlayOpacity: 0.14,
    gradientColors: ['rgba(90,20,40,0.35)', 'rgba(40,10,20,0.25)', 'rgba(20,5,10,0.45)'],
    gradientLocations: [0, 0.5, 1],
    vignetteStrength: 0.28,
  },
  {
    id: 'salt-air',
    name: 'Salt Air',
    overlayColor: '#7EC8E3',
    overlayOpacity: 0.07,
    gradientColors: ['rgba(200,240,255,0.45)', 'rgba(100,160,200,0.15)', 'rgba(40,80,110,0.3)'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    gradientOpacity: 0.85,
    vignetteStrength: 0.14,
  },
  {
    id: 'candlelit',
    name: 'Candlelit',
    overlayColor: '#C97B35',
    overlayOpacity: 0.1,
    gradientColors: ['rgba(255,200,120,0.35)', 'rgba(180,90,40,0.2)', 'rgba(30,15,8,0.45)'],
    gradientLocations: [0, 0.55, 1],
    gradientStart: { x: 0.5, y: 1 },
    gradientEnd: { x: 0.5, y: 0 },
    gradientOpacity: 0.92,
    vignetteStrength: 0.3,
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    overlayColor: '#D8D8E0',
    overlayOpacity: 0.11,
    gradientColors: ['rgba(255,255,255,0.25)', 'rgba(200,200,210,0.15)', 'rgba(160,160,175,0.22)'],
    gradientLocations: [0, 0.5, 1],
    gradientOpacity: 0.75,
    vignetteStrength: 0.1,
  },
  {
    id: 'starlight',
    name: 'Starlight',
    overlayColor: '#1e3a5f',
    overlayOpacity: 0.08,
    gradientColors: ['rgba(100,140,220,0.3)', 'rgba(20,30,60,0.25)', 'rgba(10,15,40,0.4)'],
    gradientLocations: [0, 0.45, 1],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    gradientOpacity: 0.9,
    vignetteStrength: 0.26,
  },
  {
    id: 'papaya-punch',
    name: 'Papaya Punch',
    overlayColor: '#FF8C42',
    overlayOpacity: 0.07,
    gradientColors: ['rgba(255,180,100,0.45)', 'rgba(255,100,140,0.18)', 'rgba(180,60,80,0.22)'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    gradientOpacity: 0.88,
    vignetteStrength: 0.15,
  },
  {
    id: 'velvet-moss',
    name: 'Velvet Moss',
    overlayColor: '#1a3d2e',
    overlayOpacity: 0.1,
    gradientColors: ['rgba(60,120,80,0.35)', 'rgba(25,55,40,0.3)', 'rgba(10,25,18,0.42)'],
    gradientLocations: [0, 0.52, 1],
    gradientOpacity: 0.9,
    vignetteStrength: 0.24,
  },
];
