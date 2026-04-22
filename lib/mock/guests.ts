// Owner CRM mock — mirrors the Seatly `guests` + related tables' shape,
// but is UI-only mock data. No Supabase wiring.

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface GuestLoyaltyTx {
  id: string;
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  description: string;
  createdAt: string;
}

export interface GuestNote {
  id: string;
  note: string;
  category: string;
  staffName: string;
  createdAt: string;
  isPinned?: boolean;
}

export interface GuestSurvey {
  id: string;
  overall: number;
  food: number;
  service: number;
  ambience: number;
  wouldRecommend: boolean;
  createdAt: string;
}

export interface GuestAllergyIncident {
  id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  actionTaken: string;
  dishName?: string;
  createdAt: string;
}

export interface GuestCommLog {
  id: string;
  channel: 'sms' | 'email' | 'push';
  type: string;
  subject: string;
  status: 'sent' | 'delivered' | 'opened' | 'replied' | 'failed';
  sentAt: string;
  openedAt?: string;
  repliedAt?: string;
}

export interface OwnerGuest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: 'en' | 'fr';
  birthday?: string;
  anniversary?: string;

  isVip: boolean;
  isBlocked: boolean;

  totalVisits: number;
  totalSpend: number;
  averageSpendPerVisit: number;
  highestSingleBill: number;
  lastVisitAt: string;
  firstVisitAt: string;

  noShowCount: number;
  cancellationCount: number;
  noShowRiskScore: number; // 0–100
  lifetimeValueScore: number; // 0–100
  acquisitionSource: string;
  lastContactedAt?: string;

  allergies: string[];
  dietaryRestrictions: string[];
  seatingPreference?: string;
  noisePreference?: string;
  favouriteDishes: string[];
  favouriteDrinks: string[];
  preferredServerName?: string;

  loyaltyTier: LoyaltyTier;
  loyaltyPointsBalance: number;
  loyaltyPointsEarnedTotal: number;
  loyaltyPointsRedeemedTotal: number;

  foodSpendTotal: number;
  drinksSpendTotal: number;
  totalDepositsPaid: number;
  totalDepositsForfeited: number;

  preferredPaymentBrand?: string;
  preferredPaymentLast4?: string;

  smsOptIn: boolean;
  emailOptIn: boolean;

  carDetails?: { make: string; model: string; plate: string };

  notes: GuestNote[];
  surveys: GuestSurvey[];
  incidents: GuestAllergyIncident[];
  comms: GuestCommLog[];
  loyaltyTx: GuestLoyaltyTx[];
}

export const OWNER_GUESTS: OwnerGuest[] = [
  {
    id: 'g1',
    fullName: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1 (514) 555-0142',
    preferredLanguage: 'en',
    birthday: '1988-04-12',
    anniversary: '2016-09-04',
    isVip: true,
    isBlocked: false,
    totalVisits: 24,
    totalSpend: 4680,
    averageSpendPerVisit: 195,
    highestSingleBill: 420,
    lastVisitAt: '2026-03-28',
    firstVisitAt: '2023-11-02',
    noShowCount: 0,
    cancellationCount: 1,
    noShowRiskScore: 8,
    lifetimeValueScore: 92,
    acquisitionSource: 'Referral · Priya N.',
    lastContactedAt: '2026-03-25',
    allergies: ['Shellfish'],
    dietaryRestrictions: ['Pescatarian'],
    seatingPreference: 'Window booth',
    noisePreference: 'Quiet',
    favouriteDishes: ['Branzino', 'Tagliatelle al ragù'],
    favouriteDrinks: ['Barolo 2018', 'Espresso'],
    preferredServerName: 'Maya Chen',
    loyaltyTier: 'gold',
    loyaltyPointsBalance: 1860,
    loyaltyPointsEarnedTotal: 4200,
    loyaltyPointsRedeemedTotal: 2340,
    foodSpendTotal: 3120,
    drinksSpendTotal: 1560,
    totalDepositsPaid: 400,
    totalDepositsForfeited: 0,
    preferredPaymentBrand: 'Visa',
    preferredPaymentLast4: '4821',
    smsOptIn: true,
    emailOptIn: true,
    notes: [
      {
        id: 'n1',
        note: 'Celebrates anniversary every September — always offers a complimentary dessert.',
        category: 'Occasion',
        staffName: 'Maya Chen',
        createdAt: '2026-03-01',
        isPinned: true,
      },
      {
        id: 'n2',
        note: 'Prefers still water, no ice.',
        category: 'Preference',
        staffName: 'Jordan Lee',
        createdAt: '2026-02-14',
      },
    ],
    surveys: [
      {
        id: 's1',
        overall: 5,
        food: 5,
        service: 5,
        ambience: 4,
        wouldRecommend: true,
        createdAt: '2026-03-28',
      },
      {
        id: 's2',
        overall: 4,
        food: 5,
        service: 4,
        ambience: 4,
        wouldRecommend: true,
        createdAt: '2026-02-10',
      },
    ],
    incidents: [],
    comms: [
      {
        id: 'c1',
        channel: 'email',
        type: 'Reservation reminder',
        subject: 'See you Saturday at 7:30 PM',
        status: 'opened',
        sentAt: '2026-03-27T10:00:00-04:00',
        openedAt: '2026-03-27T11:12:00-04:00',
      },
      {
        id: 'c2',
        channel: 'sms',
        type: 'Birthday message',
        subject: 'Happy birthday, Alex — dessert is on us.',
        status: 'replied',
        sentAt: '2026-04-12T09:00:00-04:00',
        repliedAt: '2026-04-12T09:07:00-04:00',
      },
    ],
    loyaltyTx: [
      { id: 'lt1', type: 'earn', points: 195, description: 'Dinner · March 28', createdAt: '2026-03-28' },
      { id: 'lt2', type: 'redeem', points: -400, description: 'Bottle of Barolo', createdAt: '2026-02-14' },
      { id: 'lt3', type: 'earn', points: 240, description: 'Dinner · February 14', createdAt: '2026-02-14' },
    ],
    carDetails: { make: 'Audi', model: 'A4', plate: 'GHK 412' },
  },
  {
    id: 'g2',
    fullName: 'Sarah Lee',
    email: 'sarah.lee@example.com',
    phone: '+1 (438) 555-0917',
    preferredLanguage: 'en',
    birthday: '1992-07-21',
    isVip: false,
    isBlocked: false,
    totalVisits: 6,
    totalSpend: 820,
    averageSpendPerVisit: 137,
    highestSingleBill: 186,
    lastVisitAt: '2026-03-15',
    firstVisitAt: '2025-08-19',
    noShowCount: 0,
    cancellationCount: 0,
    noShowRiskScore: 12,
    lifetimeValueScore: 58,
    acquisitionSource: 'Instagram',
    allergies: [],
    dietaryRestrictions: ['Gluten-free'],
    seatingPreference: 'Booth',
    favouriteDishes: ['Risotto ai funghi'],
    favouriteDrinks: ['Aperol spritz'],
    loyaltyTier: 'silver',
    loyaltyPointsBalance: 420,
    loyaltyPointsEarnedTotal: 820,
    loyaltyPointsRedeemedTotal: 400,
    foodSpendTotal: 560,
    drinksSpendTotal: 260,
    totalDepositsPaid: 0,
    totalDepositsForfeited: 0,
    smsOptIn: true,
    emailOptIn: false,
    notes: [],
    surveys: [
      {
        id: 's3',
        overall: 4,
        food: 4,
        service: 5,
        ambience: 4,
        wouldRecommend: true,
        createdAt: '2026-03-15',
      },
    ],
    incidents: [],
    comms: [],
    loyaltyTx: [
      { id: 'lt4', type: 'earn', points: 137, description: 'Dinner · March 15', createdAt: '2026-03-15' },
    ],
  },
  {
    id: 'g3',
    fullName: 'David Kim',
    email: 'david.kim@example.com',
    phone: '+1 (514) 555-2204',
    preferredLanguage: 'en',
    isVip: false,
    isBlocked: false,
    totalVisits: 2,
    totalSpend: 210,
    averageSpendPerVisit: 105,
    highestSingleBill: 120,
    lastVisitAt: '2026-02-02',
    firstVisitAt: '2025-12-18',
    noShowCount: 2,
    cancellationCount: 1,
    noShowRiskScore: 78,
    lifetimeValueScore: 22,
    acquisitionSource: 'Google',
    allergies: [],
    dietaryRestrictions: [],
    seatingPreference: 'No preference',
    favouriteDishes: [],
    favouriteDrinks: [],
    loyaltyTier: 'bronze',
    loyaltyPointsBalance: 40,
    loyaltyPointsEarnedTotal: 40,
    loyaltyPointsRedeemedTotal: 0,
    foodSpendTotal: 150,
    drinksSpendTotal: 60,
    totalDepositsPaid: 0,
    totalDepositsForfeited: 50,
    smsOptIn: true,
    emailOptIn: true,
    notes: [
      {
        id: 'n3',
        note: 'Late twice, one no-show. Consider deposit hold.',
        category: 'Risk',
        staffName: 'Maya Chen',
        createdAt: '2026-02-02',
        isPinned: true,
      },
    ],
    surveys: [],
    incidents: [],
    comms: [
      {
        id: 'c3',
        channel: 'sms',
        type: 'No-show follow-up',
        subject: 'We missed you last night.',
        status: 'delivered',
        sentAt: '2026-02-03T10:00:00-05:00',
      },
    ],
    loyaltyTx: [],
  },
  {
    id: 'g4',
    fullName: 'Priya N.',
    email: 'priya.n@example.com',
    phone: '+1 (514) 555-8801',
    preferredLanguage: 'en',
    anniversary: '2019-06-08',
    isVip: true,
    isBlocked: false,
    totalVisits: 18,
    totalSpend: 2020,
    averageSpendPerVisit: 112,
    highestSingleBill: 240,
    lastVisitAt: '2026-03-21',
    firstVisitAt: '2024-01-14',
    noShowCount: 0,
    cancellationCount: 0,
    noShowRiskScore: 4,
    lifetimeValueScore: 84,
    acquisitionSource: 'Walk-in',
    allergies: ['Peanuts'],
    dietaryRestrictions: ['Vegetarian'],
    seatingPreference: 'Bar',
    noisePreference: 'Lively',
    favouriteDishes: ['Burrata', 'Margherita'],
    favouriteDrinks: ['Negroni'],
    preferredServerName: 'Priya Singh',
    loyaltyTier: 'gold',
    loyaltyPointsBalance: 1250,
    loyaltyPointsEarnedTotal: 2020,
    loyaltyPointsRedeemedTotal: 770,
    foodSpendTotal: 1280,
    drinksSpendTotal: 740,
    totalDepositsPaid: 0,
    totalDepositsForfeited: 0,
    smsOptIn: false,
    emailOptIn: true,
    notes: [],
    surveys: [],
    incidents: [
      {
        id: 'ai1',
        allergen: 'Peanuts',
        severity: 'mild',
        actionTaken: 'Flagged on ticket, replaced dish with pesto-free pasta.',
        dishName: 'Tagliatelle al ragù',
        createdAt: '2025-11-08',
      },
    ],
    comms: [],
    loyaltyTx: [
      { id: 'lt5', type: 'earn', points: 112, description: 'Dinner · March 21', createdAt: '2026-03-21' },
    ],
  },
  {
    id: 'g5',
    fullName: 'Jordan Smith',
    email: 'jordan.smith@example.com',
    phone: '+1 (514) 555-4410',
    preferredLanguage: 'fr',
    isVip: false,
    isBlocked: false,
    totalVisits: 1,
    totalSpend: 84,
    averageSpendPerVisit: 84,
    highestSingleBill: 84,
    lastVisitAt: '2026-03-02',
    firstVisitAt: '2026-03-02',
    noShowCount: 0,
    cancellationCount: 0,
    noShowRiskScore: 15,
    lifetimeValueScore: 32,
    acquisitionSource: 'App',
    allergies: [],
    dietaryRestrictions: [],
    favouriteDishes: [],
    favouriteDrinks: [],
    loyaltyTier: 'bronze',
    loyaltyPointsBalance: 84,
    loyaltyPointsEarnedTotal: 84,
    loyaltyPointsRedeemedTotal: 0,
    foodSpendTotal: 64,
    drinksSpendTotal: 20,
    totalDepositsPaid: 0,
    totalDepositsForfeited: 0,
    smsOptIn: true,
    emailOptIn: true,
    notes: [],
    surveys: [],
    incidents: [],
    comms: [],
    loyaltyTx: [],
  },
  {
    id: 'g6',
    fullName: 'Chris & Sam',
    email: 'c.sam@example.com',
    phone: '+1 (438) 555-3321',
    preferredLanguage: 'en',
    isVip: false,
    isBlocked: false,
    totalVisits: 9,
    totalSpend: 1150,
    averageSpendPerVisit: 128,
    highestSingleBill: 210,
    lastVisitAt: '2026-03-10',
    firstVisitAt: '2024-07-21',
    noShowCount: 1,
    cancellationCount: 2,
    noShowRiskScore: 34,
    lifetimeValueScore: 61,
    acquisitionSource: 'Referral',
    allergies: [],
    dietaryRestrictions: [],
    seatingPreference: 'Patio',
    favouriteDishes: ['Steak frites'],
    favouriteDrinks: ['Old Fashioned'],
    loyaltyTier: 'silver',
    loyaltyPointsBalance: 780,
    loyaltyPointsEarnedTotal: 1150,
    loyaltyPointsRedeemedTotal: 370,
    foodSpendTotal: 720,
    drinksSpendTotal: 430,
    totalDepositsPaid: 50,
    totalDepositsForfeited: 50,
    smsOptIn: true,
    emailOptIn: true,
    notes: [],
    surveys: [
      {
        id: 's4',
        overall: 4,
        food: 4,
        service: 4,
        ambience: 5,
        wouldRecommend: true,
        createdAt: '2026-03-10',
      },
    ],
    incidents: [],
    comms: [],
    loyaltyTx: [],
  },
];

export function findGuest(id: string): OwnerGuest | undefined {
  return OWNER_GUESTS.find((g) => g.id === id);
}

export function isAtRisk(g: OwnerGuest): boolean {
  return g.noShowRiskScore >= 50 || g.noShowCount >= 2;
}

export function isNewGuest(g: OwnerGuest): boolean {
  const first = new Date(g.firstVisitAt).getTime();
  const now = Date.now();
  return now - first <= 1000 * 60 * 60 * 24 * 30;
}

export function isRegular(g: OwnerGuest): boolean {
  return g.totalVisits >= 5;
}
