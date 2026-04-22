import { mockRestaurants } from './restaurants';

export type EventType = 'event' | 'promotion' | 'happy_hour' | 'tasting_menu';

export interface DiningEvent {
  id: string;
  restaurantId: string;
  title: string;
  description: string;
  coverImage: string;
  type: EventType;
  // ISO date strings
  date: string;
  endsAt: string;
  price?: number; // undefined = free / included
  spotsLeft?: number; // undefined = unlimited
  tags: string[];
  savedBy: string[]; // user IDs
}

// Anchored to 2026-04-21 (today in-app)
const T = '2026-04-21';
const SAT = '2026-04-25';
const SUN = '2026-04-26';
const MON = '2026-04-27';
const FRI = '2026-04-24';

let diningEvents: DiningEvent[] = [
  {
    id: 'ev1',
    restaurantId: 'r1',
    title: 'Truffle & Barolo Tasting Night',
    description:
      'A six-course journey through Piedmont with black truffle throughout every dish, paired with aged Barolo. Chef Marco narrates the season.',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    type: 'tasting_menu',
    date: `${T}T19:00:00`,
    endsAt: `${T}T22:30:00`,
    price: 185,
    spotsLeft: 6,
    tags: ['truffle', 'wine pairing', 'italian'],
    savedBy: [],
  },
  {
    id: 'ev2',
    restaurantId: 'r3',
    title: 'Happy Hour: Craft Cocktails 2-for-1',
    description:
      'Every Tuesday and Tuesday-adjacent weekday from 4–7 PM. Bar team pours seasonal spritzes, negroni variations, and house mocktails.',
    coverImage: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
    type: 'happy_hour',
    date: `${T}T16:00:00`,
    endsAt: `${T}T19:00:00`,
    price: undefined,
    spotsLeft: undefined,
    tags: ['cocktails', 'happy hour', 'deals'],
    savedBy: [],
  },
  {
    id: 'ev3',
    restaurantId: 'r5',
    title: 'Omakase Spring Edition',
    description:
      'Chef Kenji presents 12 courses of seasonal Japanese cuisine sourced from local farms and Japanese imports. Sake pairing available.',
    coverImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
    type: 'tasting_menu',
    date: `${T}T18:30:00`,
    endsAt: `${T}T21:30:00`,
    price: 220,
    spotsLeft: 4,
    tags: ['omakase', 'japanese', 'seasonal'],
    savedBy: [],
  },
  {
    id: 'ev4',
    restaurantId: 'r7',
    title: 'Live Jazz & Tapas Evening',
    description:
      'Thursday residency: the Miguel Santos quartet plays from 8 PM while the kitchen serves a rotating tapas menu. Walk-ins welcome at the bar.',
    coverImage: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80',
    type: 'event',
    date: `${T}T20:00:00`,
    endsAt: `${T}T23:30:00`,
    price: 35,
    spotsLeft: 20,
    tags: ['jazz', 'tapas', 'live music'],
    savedBy: [],
  },
  {
    id: 'ev5',
    restaurantId: 'r2',
    title: '20% Off All Mains — This Week Only',
    description:
      'Spring refresh promotion. Present in-app at the host stand to redeem. Valid dine-in only, not combinable with other offers.',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    type: 'promotion',
    date: `${T}T11:00:00`,
    endsAt: `${MON}T22:00:00`,
    price: undefined,
    spotsLeft: undefined,
    tags: ['promotion', 'discount', 'dine-in'],
    savedBy: [],
  },
  {
    id: 'ev6',
    restaurantId: 'r9',
    title: 'Winemaker Dinner: Okanagan Valley',
    description:
      'Winemaker Sophie Leclair joins for a five-course pairing featuring her latest single-vineyard releases alongside our spring menu.',
    coverImage: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
    type: 'event',
    date: `${FRI}T19:00:00`,
    endsAt: `${FRI}T22:00:00`,
    price: 155,
    spotsLeft: 12,
    tags: ['wine', 'pairing', 'winemaker'],
    savedBy: [],
  },
  {
    id: 'ev7',
    restaurantId: 'r4',
    title: 'Sunday Brunch: Bottomless Mimosas',
    description:
      'Two hours of unlimited mimosas and Bellinis with any brunch entrée. Rotating house DJ from noon. Reservations strongly recommended.',
    coverImage: 'https://images.unsplash.com/photo-1533920379810-6bedac961555?w=800&q=80',
    type: 'promotion',
    date: `${SUN}T10:30:00`,
    endsAt: `${SUN}T14:00:00`,
    price: 65,
    spotsLeft: 30,
    tags: ['brunch', 'mimosas', 'sunday'],
    savedBy: [],
  },
  {
    id: 'ev8',
    restaurantId: 'r11',
    title: 'Patisserie Workshop: Croissant Masterclass',
    description:
      'Head pastry chef Amélie teaches the lamination technique behind our famous croissants. Hands-on, groups of 8, take your creations home.',
    coverImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
    type: 'event',
    date: `${SAT}T10:00:00`,
    endsAt: `${SAT}T13:00:00`,
    price: 95,
    spotsLeft: 3,
    tags: ['pastry', 'workshop', 'breakfast'],
    savedBy: [],
  },
  {
    id: 'ev9',
    restaurantId: 'r6',
    title: 'Dusk Happy Hour on the Terrace',
    description:
      'Golden hour on our rooftop terrace. Half-price signature cocktails and bar bites from 5–7 PM every Friday and Saturday.',
    coverImage: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
    type: 'happy_hour',
    date: `${FRI}T17:00:00`,
    endsAt: `${FRI}T19:00:00`,
    price: undefined,
    spotsLeft: undefined,
    tags: ['rooftop', 'cocktails', 'happy hour'],
    savedBy: [],
  },
  {
    id: 'ev10',
    restaurantId: 'r13',
    title: 'Chef\'s Table: Farm-to-Fork Dinner',
    description:
      'Eight guests join Chef Rivera at the kitchen counter for an unscripted menu built around that morning\'s market haul. Pure, seasonal, personal.',
    coverImage: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80',
    type: 'tasting_menu',
    date: `${SAT}T19:30:00`,
    endsAt: `${SAT}T23:00:00`,
    price: 210,
    spotsLeft: 5,
    tags: ['farm-to-fork', 'chef\'s table', 'seasonal'],
    savedBy: [],
  },
  {
    id: 'ev11',
    restaurantId: 'r8',
    title: 'Ramen Night: Limited 50 Bowls',
    description:
      'Tonkotsu broth simmered 18 hours. Only 50 bowls served each night — first come, first served. Doors open at 6 PM.',
    coverImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
    type: 'promotion',
    date: `${T}T18:00:00`,
    endsAt: `${T}T21:00:00`,
    price: 22,
    spotsLeft: 18,
    tags: ['ramen', 'japanese', 'limited'],
    savedBy: [],
  },
  {
    id: 'ev12',
    restaurantId: 'r15',
    title: 'Negroni Week Cocktail Menu',
    description:
      'Seven days, seven negroni variations. A portion of every cocktail sold goes to the Chef\'s Table charity kitchen.',
    coverImage: 'https://images.unsplash.com/photo-1527761939622-933c972e5d9a?w=800&q=80',
    type: 'promotion',
    date: `${T}T17:00:00`,
    endsAt: `${MON}T23:00:00`,
    price: undefined,
    spotsLeft: undefined,
    tags: ['cocktails', 'negroni', 'charity'],
    savedBy: [],
  },
];

export function listEvents(): DiningEvent[] {
  return diningEvents;
}

export function getEventById(id: string): DiningEvent | undefined {
  return diningEvents.find((e) => e.id === id);
}

export function isEventSaved(userId: string, eventId: string): boolean {
  const ev = diningEvents.find((e) => e.id === eventId);
  return ev ? ev.savedBy.includes(userId) : false;
}

export function toggleSaveEvent(userId: string, eventId: string): void {
  diningEvents = diningEvents.map((e) => {
    if (e.id !== eventId) return e;
    const already = e.savedBy.includes(userId);
    return {
      ...e,
      savedBy: already ? e.savedBy.filter((id) => id !== userId) : [...e.savedBy, userId],
    };
  });
}

export function getRestaurantForEvent(restaurantId: string) {
  return mockRestaurants.find((r) => r.id === restaurantId);
}

export type DateFilter = 'tonight' | 'this_weekend' | 'this_week' | 'all';

export function filterEvents(
  events: DiningEvent[],
  dateFilter: DateFilter,
  typeFilter: EventType | 'all',
): DiningEvent[] {
  const now = new Date('2026-04-21T00:00:00');
  return events.filter((ev) => {
    const evDate = new Date(ev.date);

    if (typeFilter !== 'all' && ev.type !== typeFilter) return false;

    if (dateFilter === 'tonight') {
      return evDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'this_weekend') {
      // Sat Apr 25 – Sun Apr 26
      const sat = new Date('2026-04-25');
      const sun = new Date('2026-04-27'); // exclusive
      return evDate >= sat && evDate < sun;
    }
    if (dateFilter === 'this_week') {
      const weekEnd = new Date('2026-04-28');
      return evDate >= now && evDate < weekEnd;
    }
    return true;
  });
}
