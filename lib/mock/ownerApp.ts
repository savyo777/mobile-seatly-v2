import type { Table } from '@/lib/mock/tables';

export type RevenuePeriod = 'day' | 'week' | '2w' | 'month' | '6m' | 'year';

export const OWNER_FIRST_NAME = 'Savannah';

export const TONIGHT_SUMMARY = {
  revenue: 4280,
  guests: 79,
  risks: 2,
};

/** Live dashboard metrics */
export const LIVE_METRICS = {
  tonightCovers: 79,
  openTables: 6,
  activeOrders: 14,
  noShowRisks: 2,
};

export type LiveFeedKind = 'seated' | 'order' | 'arrived' | 'alert';

export interface LiveFeedItem {
  id: string;
  kind: LiveFeedKind;
  message: string;
  timeLabel: string;
}

export const LIVE_FEED: LiveFeedItem[] = [
  { id: 'lf1', kind: 'seated', message: 'Table 4 seated · Party of 4', timeLabel: 'Just now' },
  { id: 'lf2', kind: 'order', message: 'Order ready · Kitchen · Ticket #204', timeLabel: '2m ago' },
  { id: 'lf3', kind: 'arrived', message: 'Reservation arrived · Chen party · T2', timeLabel: '4m ago' },
  { id: 'lf4', kind: 'order', message: 'Bar order fired · Table 9', timeLabel: '6m ago' },
  { id: 'lf5', kind: 'seated', message: 'Table 12 seated · Nova Corp', timeLabel: '12m ago' },
];

export interface OwnerAlert {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

export const OWNER_ALERTS_STRIP: OwnerAlert[] = [
  { id: 'oa1', message: 'High no-show risk: David Kim · 7:00 PM', severity: 'critical' },
  { id: 'oa2', message: 'Table 7 waiting 14m past quote', severity: 'warning' },
  { id: 'oa3', message: 'Reservation running 8m late — Chen', severity: 'warning' },
];

export interface OperationPulse {
  id: string;
  message: string;
}

export const OPERATIONS_PULSE: OperationPulse[] = [
  { id: 'op1', message: 'Kitchen delay: +12 min on hot mains (line 2)' },
  { id: 'op2', message: '3 open tickets · 2 at bar, 1 dessert' },
];

export interface MarketingPromo {
  id: string;
  title: string;
  subtitle: string;
}

export const MARKETING_ACTIVE: MarketingPromo = {
  id: 'm1',
  title: '10% off early seating',
  subtitle: '5:00–5:45 PM tonight · Lift dead-hour covers',
};

export const RECEIPTS_EXPORT_HINT = 'Weekly P&L ready · Tap to export PDF';

/** Last 7 days — reservation counts (booking-focused home chart, not revenue). */
export const BOOKING_TREND_WEEK: {
  dayLabels: string[];
  counts: number[];
  /** Positive = more bookings than prior week. */
  vsPrevWeekPct: number;
} = {
  dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  counts: [18, 22, 19, 24, 31, 38, 26],
  vsPrevWeekPct: 8,
};

export const REVENUE_DATA: Record<
  RevenuePeriod,
  { total: number; trendPct: number; series: number[] }
> = {
  day: { total: 4280, trendPct: 12, series: [28, 32, 38, 35, 42, 48, 52, 58, 55, 62, 68, 72] },
  week: { total: 28400, trendPct: 8, series: [45, 52, 48, 61, 55, 70, 68, 75, 82, 78, 88, 92] },
  '2w': { total: 54200, trendPct: 15, series: [38, 42, 45, 50, 48, 55, 60, 58, 65, 70, 68, 75] },
  month: { total: 118400, trendPct: 6, series: [55, 58, 62, 60, 68, 72, 70, 78, 82, 80, 88, 95] },
  '6m': { total: 682000, trendPct: 22, series: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100] },
  year: { total: 1280000, trendPct: 18, series: [30, 38, 45, 52, 60, 68, 75, 82, 88, 92, 96, 100] },
};

/** Actionable AI insights — revenue & ops */
export const AI_INSIGHTS_HOME = [
  "You're losing ~$500/week from empty 5:30–6:15 slots — run a happy-hour anchor.",
  'Fridays generate 22% more revenue than Thursdays; push Thursday email blast.',
  'Safe to overbook 7:00 PM by ~10% — modeled walk-in buffer supports it.',
  'David Kim has a 72% no-show risk — send SMS confirm or hold card.',
];

export type TimelineStatus = 'seated' | 'arriving' | 'risk' | 'completed';

export interface LiveTimelineEntry {
  id: string;
  timeLabel: string;
  guestName: string;
  partySize: number;
  status: TimelineStatus;
  table?: string;
  statusLabel: string;
}

export const LIVE_TIMELINE: LiveTimelineEntry[] = [
  {
    id: 'lt1',
    timeLabel: '6:00 PM',
    guestName: 'Martinez',
    partySize: 4,
    status: 'seated',
    table: 'T4',
    statusLabel: 'Seated',
  },
  {
    id: 'lt2',
    timeLabel: '7:00 PM',
    guestName: 'Chen party',
    partySize: 2,
    status: 'arriving',
    table: 'T2',
    statusLabel: 'Arriving',
  },
  {
    id: 'lt3',
    timeLabel: '7:30 PM',
    guestName: 'Kim / anniversary',
    partySize: 2,
    status: 'risk',
    table: 'T8',
    statusLabel: 'Risk',
  },
];

export interface OwnerFloorTable {
  id: string;
  tableNumber: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'circle';
  status: Table['status'];
  capacity: number;
  currentGuestName?: string;
  billCents?: number;
  seatedAt?: string;
}

export const OWNER_FLOOR_TABLES: OwnerFloorTable[] = [
  { id: 'of1', tableNumber: '1', x: 24, y: 40, w: 72, h: 56, shape: 'rect', status: 'occupied', capacity: 4, currentGuestName: 'Martinez', billCents: 18640, seatedAt: '6:05 PM' },
  { id: 'of2', tableNumber: '2', x: 112, y: 44, w: 56, h: 56, shape: 'circle', status: 'reserved', capacity: 2, currentGuestName: 'Chen' },
  { id: 'of3', tableNumber: '3', x: 188, y: 36, w: 72, h: 56, shape: 'rect', status: 'empty', capacity: 4 },
  { id: 'of4', tableNumber: '4', x: 24, y: 120, w: 80, h: 64, shape: 'rect', status: 'occupied', capacity: 6, currentGuestName: 'Patel', billCents: 31200, seatedAt: '5:50 PM' },
  { id: 'of5', tableNumber: '5', x: 120, y: 128, w: 56, h: 56, shape: 'circle', status: 'cleaning', capacity: 2 },
  { id: 'of6', tableNumber: '6', x: 200, y: 120, w: 72, h: 56, shape: 'rect', status: 'empty', capacity: 4 },
  { id: 'of7', tableNumber: '7', x: 24, y: 208, w: 64, h: 56, shape: 'rect', status: 'reserved', capacity: 4, currentGuestName: 'Kim' },
  { id: 'of8', tableNumber: '8', x: 108, y: 204, w: 56, h: 56, shape: 'circle', status: 'blocked', capacity: 2 },
];

export const TABLE_AI_SUGGESTION =
  'Seat the next walk-in at T6 — fastest path to turn before 7:30 rush.';

export type ResFilter = 'all' | 'confirmed' | 'pending' | 'walkin' | 'risk';

export interface OwnerReservationSlot {
  id: string;
  startTime: string;
  guestName: string;
  partySize: number;
  status: 'confirmed' | 'pending' | 'seated' | 'risk';
  table?: string;
  walkIn?: boolean;
  notes?: string;
  pastVisits?: number;
  avgSpend?: number;
  vip?: boolean;
}

export type WalkInQueueItem = {
  id: string;
  party: number;
  waitMins: number;
  name: string;
};

export const WALKIN_QUEUE: WalkInQueueItem[] = [
  { id: 'wq1', party: 2, waitMins: 12, name: 'A. Moreau' },
  { id: 'wq2', party: 4, waitMins: 22, name: 'Guest B' },
  { id: 'wq3', party: 3, waitMins: 18, name: 'M. Laurent' },
  { id: 'wq4', party: 2, waitMins: 8, name: 'Chen' },
];

export type WaitlistEntryStatus = 'waiting' | 'late' | 'arriving';

export type WaitlistEntry = {
  id: string;
  name: string;
  party: number;
  quoted: string;
  status: WaitlistEntryStatus;
  risk?: boolean;
};

export const WAITLIST_ENTRIES: WaitlistEntry[] = [
  { id: 'wl1', name: 'R. Santos', party: 2, quoted: '7:45 PM', status: 'waiting' },
  { id: 'wl2', name: 'Y. Park', party: 3, quoted: '8:10 PM', status: 'late', risk: true },
  { id: 'wl3', name: 'M. Chen', party: 4, quoted: '8:30 PM', status: 'arriving' },
];

export const OWNER_RESERVATIONS: OwnerReservationSlot[] = [
  { id: 'or1', startTime: '5:30 PM', guestName: 'Walk-in · Queue', partySize: 2, status: 'pending', walkIn: true, notes: 'Prefers window' },
  { id: 'or2', startTime: '6:00 PM', guestName: 'Alex Johnson', partySize: 4, status: 'confirmed', table: 'T4', pastVisits: 6, avgSpend: 186, vip: true },
  { id: 'or3', startTime: '6:30 PM', guestName: 'Sarah Lee', partySize: 2, status: 'confirmed', table: 'T2', pastVisits: 2, avgSpend: 94 },
  { id: 'or4', startTime: '7:00 PM', guestName: 'David Kim', partySize: 2, status: 'risk', table: 'T8', pastVisits: 1, avgSpend: 72, notes: 'Late twice' },
  { id: 'or5', startTime: '7:30 PM', guestName: 'Nova Corp dinner', partySize: 8, status: 'confirmed', table: 'T12', pastVisits: 4, avgSpend: 620 },
  { id: 'or6', startTime: '8:00 PM', guestName: 'Jordan Smith', partySize: 3, status: 'pending', pastVisits: 0 },
  { id: 'or7', startTime: '8:30 PM', guestName: 'Priya N.', partySize: 4, status: 'confirmed', pastVisits: 9, avgSpend: 112, vip: true },
  { id: 'or8', startTime: '9:00 PM', guestName: 'Chris & Sam', partySize: 2, status: 'seated', table: 'T1', pastVisits: 3, avgSpend: 128 },
];

export const ANALYTICS_METRICS: Record<
  RevenuePeriod,
  { revenue: number; covers: number; avgSpend: number; noShowPct: number; turnover: number }
> = {
  day: { revenue: 4280, covers: 79, avgSpend: 54.2, noShowPct: 4.2, turnover: 2.1 },
  week: { revenue: 28400, covers: 512, avgSpend: 55.5, noShowPct: 3.8, turnover: 2.3 },
  '2w': { revenue: 54200, covers: 978, avgSpend: 55.4, noShowPct: 4.0, turnover: 2.2 },
  month: { revenue: 118400, covers: 2130, avgSpend: 55.6, noShowPct: 3.9, turnover: 2.25 },
  '6m': { revenue: 682000, covers: 12200, avgSpend: 55.9, noShowPct: 4.1, turnover: 2.2 },
  year: { revenue: 1280000, covers: 22900, avgSpend: 55.9, noShowPct: 4.0, turnover: 2.2 },
};

export const ANALYTICS_INSIGHTS = {
  peakHours: '7:00–9:00 PM · 38% of nightly covers',
  deadHours: '3:00–5:00 PM · lowest check — target promos',
  bestDays: 'Fri–Sat · +28% vs Mon–Tue',
};

/** Busy hour heatmap 0–23 */
export const BUSY_HEATMAP = [2, 2, 1, 1, 2, 3, 4, 6, 7, 8, 7, 6, 5, 5, 6, 7, 9, 10, 10, 9, 8, 6, 4, 3];

/** Production-style CRM guest — filters use numeric rules */
export interface CrmGuest {
  id: string;
  name: string;
  isVIP: boolean;
  totalVisits: number;
  avgSpend: number;
  /** ISO date yyyy-mm-dd */
  lastVisitDate: string;
  /** 0–100 */
  churnRisk: number;
  /** Visits per month (rolling) */
  visitFrequency: number;
  frequency: string;
  preference: string;
  preferencesShort: string;
  aiLine: string;
  nextBestAction: string;
  predictedSpendTonight: number;
  ltvScore: number;
  predictedLifetimeValue: number;
  hasUpcomingReservation: boolean;
  upcomingReservationTime?: string;
  isSeated: boolean;
  seatedLabel?: string;
  visitHistory: { date: string; spend: number }[];
  favoriteDishes: string[];
  preferredTable: string;
  notes: string;
  noShowNote: string;
  aiSuggestions: string[];
}

/** @deprecated Use CrmGuest */
export type CrmGuestRow = CrmGuest;

export const CRM_AI_INSIGHTS: { id: string; headline: string; sub: string }[] = [
  {
    id: 'ai1',
    headline: '3 VIP guests arriving tonight',
    sub: 'Confirm preferences and pre-stage wine pairings.',
  },
  {
    id: 'ai2',
    headline: '2 high-risk guests — confirm now',
    sub: 'Card hold recommended for at-risk reservations.',
  },
  {
    id: 'ai3',
    headline: 'Alex Johnson likely to spend $200+ tonight',
    sub: 'Based on party size, history, and tonight’s booking.',
  },
  {
    id: 'ai4',
    headline: 'Revenue opportunity: upsell wine on 4 tables',
    sub: 'Guests with high predicted spend seated before 8 PM.',
  },
  {
    id: 'ai5',
    headline: '1 guest hasn’t returned in 30+ days',
    sub: 'Maya Ortiz — send win-back message with soft offer.',
  },
];

export const CRM_SPOTLIGHT: CrmGuest[] = [
  {
    id: 'c1',
    name: 'Alex Johnson',
    isVIP: true,
    totalVisits: 12,
    avgSpend: 186,
    lastVisitDate: '2026-04-12',
    churnRisk: 4,
    visitFrequency: 2,
    frequency: '2× / month',
    preference: 'Booth, sparkling',
    preferencesShort: 'Booth • Sparkling • No dairy',
    aiLine: 'Usually orders wine · Prefers window seating',
    nextBestAction: 'Offer wine pairing · Seat near window',
    predictedSpendTonight: 215,
    ltvScore: 94,
    predictedLifetimeValue: 8200,
    hasUpcomingReservation: true,
    upcomingReservationTime: '7:00 PM',
    isSeated: false,
    visitHistory: [
      { date: 'Apr 12', spend: 198 },
      { date: 'Mar 14', spend: 172 },
      { date: 'Feb 1', spend: 205 },
    ],
    favoriteDishes: ['Tagliatelle', 'Branzino', 'Tiramisu'],
    preferredTable: 'Window · T4',
    notes: 'Anniversary preference — champagne on arrival.',
    noShowNote: 'No late cancellations in 12 visits.',
    aiSuggestions: ['Offer wine pairing', 'Seat near window', 'Send dessert promo on next visit'],
  },
  {
    id: 'c2',
    name: 'Priya N.',
    isVIP: true,
    totalVisits: 9,
    avgSpend: 112,
    lastVisitDate: '2026-04-10',
    churnRisk: 9,
    visitFrequency: 1,
    frequency: 'Monthly',
    preference: 'Vegetarian',
    preferencesShort: 'Vegetarian • Low spice • Gin cocktails',
    aiLine: 'Books bar high-tops · Late 1× recently',
    nextBestAction: 'Chef’s veg tasting · Quiet corner',
    predictedSpendTonight: 124,
    ltvScore: 81,
    predictedLifetimeValue: 4100,
    hasUpcomingReservation: false,
    isSeated: true,
    seatedLabel: 'Table T8',
    visitHistory: [
      { date: 'Apr 10', spend: 108 },
      { date: 'Mar 4', spend: 96 },
    ],
    favoriteDishes: ['Risotto', 'Seasonal salad'],
    preferredTable: 'Bar · high-top',
    notes: 'Allergic to shellfish — kitchen flagged.',
    noShowNote: 'One late arrival last month.',
    aiSuggestions: ['Offer chef’s veg tasting', 'Reserve quiet corner'],
  },
  {
    id: 'c3',
    name: 'David Kim',
    isVIP: false,
    totalVisits: 1,
    avgSpend: 72,
    lastVisitDate: '2026-04-17',
    churnRisk: 72,
    visitFrequency: 0.5,
    frequency: 'New',
    preference: '—',
    preferencesShort: 'Exploring menu · No prefs yet',
    aiLine: '72% no-show risk without card hold',
    nextBestAction: 'Require card to hold · SMS confirm',
    predictedSpendTonight: 85,
    ltvScore: 22,
    predictedLifetimeValue: 890,
    hasUpcomingReservation: false,
    isSeated: false,
    visitHistory: [{ date: 'First', spend: 0 }],
    favoriteDishes: ['—'],
    preferredTable: 'Any',
    notes: 'First booking — confirm by SMS.',
    noShowNote: 'Two late cancellations at other venues (synced).',
    aiSuggestions: ['Require card to hold', 'Offer 5:30 soft promo'],
  },
  {
    id: 'c4',
    name: 'Jordan Lee',
    isVIP: false,
    totalVisits: 3,
    avgSpend: 156,
    lastVisitDate: '2026-04-02',
    churnRisk: 18,
    visitFrequency: 0.8,
    frequency: 'Occasional',
    preference: 'Window, red wine',
    preferencesShort: 'Window • Red wine · Gluten-aware',
    aiLine: 'High check on short history — nurture',
    nextBestAction: 'Upsell wine flight · Private dining offer',
    predictedSpendTonight: 168,
    ltvScore: 68,
    predictedLifetimeValue: 3200,
    hasUpcomingReservation: true,
    upcomingReservationTime: '8:15 PM',
    isSeated: false,
    visitHistory: [
      { date: 'Apr 2', spend: 142 },
      { date: 'Jan 20', spend: 168 },
    ],
    favoriteDishes: ['Steak frites', 'Burrata'],
    preferredTable: 'Window',
    notes: 'Corporate card on file.',
    noShowNote: 'Always on time.',
    aiSuggestions: ['Upsell wine flight', 'Offer private dining'],
  },
  {
    id: 'c5',
    name: 'Maya Ortiz',
    isVIP: false,
    totalVisits: 22,
    avgSpend: 98,
    lastVisitDate: '2026-03-01',
    churnRisk: 6,
    visitFrequency: 2,
    frequency: '2× / month',
    preference: 'Quiet, early seating',
    preferencesShort: 'Quiet • Early · Sparkling water',
    aiLine: 'Stable regular — churn risk low',
    nextBestAction: 'Loyalty tier · Birthday dessert',
    predictedSpendTonight: 95,
    ltvScore: 76,
    predictedLifetimeValue: 5600,
    hasUpcomingReservation: false,
    isSeated: false,
    visitHistory: [
      { date: 'Mar 1', spend: 94 },
      { date: 'Feb 15', spend: 101 },
    ],
    favoriteDishes: ['Roast chicken', 'Chocolate torte'],
    preferredTable: 'Back room · Q1',
    notes: 'Prefers 6:00 PM slot.',
    noShowNote: 'Never no-show.',
    aiSuggestions: ['Loyalty tier upgrade', 'Birthday dessert'],
  },
  {
    id: 'c6',
    name: 'Nova Corp',
    isVIP: true,
    totalVisits: 8,
    avgSpend: 620,
    lastVisitDate: '2025-12-15',
    churnRisk: 2,
    visitFrequency: 0.33,
    frequency: 'Quarterly',
    preference: 'Private dining',
    preferencesShort: 'Private room · Sparkling · Dietary roster',
    aiLine: 'Large parties — pre-order recommended',
    nextBestAction: 'Pre-sell wine package · Captain assigned',
    predictedSpendTonight: 2400,
    ltvScore: 99,
    predictedLifetimeValue: 48000,
    hasUpcomingReservation: true,
    upcomingReservationTime: '6:30 PM',
    isSeated: false,
    visitHistory: [
      { date: 'Dec 15', spend: 5800 },
      { date: 'Sep 8', spend: 4200 },
    ],
    favoriteDishes: ['Chef’s tasting', 'Wine pairings'],
    preferredTable: 'Private · P1',
    notes: 'Contract billing — AR contact on file.',
    noShowNote: 'Never cancelled.',
    aiSuggestions: ['Pre-sell wine package', 'Assign dedicated captain'],
  },
];

export const AI_OPPORTUNITIES = [
  'Fill 5:30 slots with a prix-fixe — projected +$4.2k/mo.',
  'Turn bar high-tops at 7 PM — demand +14% vs supply.',
];

export const AI_ALERTS = ['David Kim — 72% no-show probability without card hold.'];

export const AI_SUGGESTIONS = [
  'Offer 10% off 5:00 PM tonight to lift dead hour.',
  'Merge 15-minute buffers on Fri–Sat to reduce gaps.',
];

/** Kitchen / bar ticket — mirrors web KDS rows */
export interface KdsTicket {
  id: string;
  station: 'Kitchen' | 'Bar' | 'Dessert';
  table: string;
  items: string;
  status: 'fired' | 'in_progress' | 'ready';
  /** Minutes on station / ticket age */
  mins: number;
  /** Explicit SLA breach (optional; UI may also infer from mins) */
  delayed?: boolean;
}

export const KDS_TICKETS: KdsTicket[] = [
  { id: 'k1', station: 'Kitchen', table: 'T4', items: '2× Tagliatelle · 1× Branzino', status: 'in_progress', mins: 14, delayed: true },
  { id: 'k2', station: 'Kitchen', table: 'T9', items: '1× Steak Frites · 1× Soup', status: 'fired', mins: 2 },
  { id: 'k3', station: 'Bar', table: 'T2', items: '3× Negroni · 1× Old Fashioned', status: 'ready', mins: 0 },
  { id: 'k4', station: 'Dessert', table: 'T1', items: '2× Tiramisu', status: 'in_progress', mins: 4 },
  { id: 'k5', station: 'Kitchen', table: 'T12', items: '1× Risotto · 2× Chopped salad', status: 'in_progress', mins: 11 },
  { id: 'k6', station: 'Bar', table: 'T7', items: '2× Martini · 1× Amaro', status: 'fired', mins: 1 },
];

export interface StaffRosterMember {
  id: string;
  name: string;
  role: string;
  shift: string;
  onClock: boolean;
}

export const STAFF_ROSTER: StaffRosterMember[] = [
  { id: 'st1', name: 'Maya Chen', role: 'Floor manager', shift: '4:00 PM – close', onClock: true },
  { id: 'st2', name: 'Jordan Lee', role: 'Host', shift: '5:00 PM – 11:00 PM', onClock: true },
  { id: 'st3', name: 'Sam Rivera', role: 'Server', shift: 'Off tonight', onClock: false },
  { id: 'st4', name: 'Priya Singh', role: 'Bar', shift: '5:30 PM – 1:00 AM', onClock: true },
];

export interface ExpenseLine {
  id: string;
  label: string;
  amount: number;
  period: string;
}

export const EXPENSE_LINES: ExpenseLine[] = [
  { id: 'e1', label: 'Food & beverage COGS', amount: 8420, period: 'This week' },
  { id: 'e2', label: 'Labor (scheduled)', amount: 6120, period: 'This week' },
  { id: 'e3', label: 'Utilities & occupancy', amount: 1840, period: 'This month' },
];

export interface OwnerEventRow {
  id: string;
  title: string;
  dateLabel: string;
  rsvp: number;
  status: 'draft' | 'live' | 'sold_out';
}

export const OWNER_EVENTS: OwnerEventRow[] = [
  { id: 'ev1', title: 'Wine dinner · 5 courses', dateLabel: 'Sat Mar 22 · 6:30 PM', rsvp: 28, status: 'live' },
  { id: 'ev2', title: 'Jazz brunch', dateLabel: 'Sun Mar 23 · 11:00 AM', rsvp: 14, status: 'live' },
  { id: 'ev3', title: 'Chef counter takeover', dateLabel: 'Thu Apr 3 · 7:00 PM', rsvp: 0, status: 'draft' },
];

export interface ExportOptionRow {
  id: string;
  title: string;
  subtitle: string;
}

export const EXPORT_OPTIONS: ExportOptionRow[] = [
  { id: 'x1', title: 'Nightly close report', subtitle: 'PDF · sales, comps, voids' },
  { id: 'x2', title: 'Weekly P&L snapshot', subtitle: 'CSV + PDF' },
  { id: 'x3', title: 'Reservations export', subtitle: 'ICS / CSV for date range' },
  { id: 'x4', title: 'Guest CRM export', subtitle: 'VIP & tags · CSV' },
];

/** Full promotion model — owner promotions console */
export type PromoStatus = 'live' | 'scheduled' | 'paused' | 'expired' | 'draft';

/** Why a promo appears in “Needs attention” (owner console). */
export type PromoAttentionReason =
  | 'low_engagement'
  | 'no_redemptions_recent'
  | 'overlapping_time'
  | 'expired_still_listed'
  | 'scheduled_zero_usage';
export type PromoType =
  | 'percent_off'
  | 'fixed_discount'
  | 'free_item'
  | 'happy_hour'
  | 'birthday'
  | 'first_time_guest';

export interface OwnerPromotion {
  id: string;
  name: string;
  type: PromoType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  /** 0=Mon … 6=Sun */
  daysOfWeek: number[];
  appliesTo: {
    dineIn: boolean;
    takeout: boolean;
    bar: boolean;
    patio: boolean;
    menuItems: boolean;
    guestGroups: boolean;
  };
  autoApply: boolean;
  description: string;
  status: PromoStatus;
  targetAudience: string;
  whereApplies: string;
  analytics: {
    redemptions: number;
    guestsReached: number;
    revenueGenerated: number;
  };
  estimatedLiftPct: number;
  /** Featured strip hints (computed in UI; optional seed) */
  startsTonight?: boolean;
  needsAttention?: boolean;
  /** Primary attention reason (optional; UI may still derive) */
  attentionReason?: PromoAttentionReason;
  /** Display fields for the Promos tab card design */
  offerTag?: string;
  views?: number;
  claims?: number;
  clicks?: number;
  newGuests?: number;
  returningGuests?: number;
  bestTimeLabel?: string;
  scheduleLabel?: string;
  audienceLabel?: string;
  coverImage?: string;
  spotsLeft?: number;
}

export const OWNER_PROMOTIONS: OwnerPromotion[] = [
  {
    id: 'p1',
    name: '10% off early seating',
    type: 'percent_off',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    startTime: '5:00 PM',
    endTime: '5:45 PM',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    appliesTo: {
      dineIn: true,
      takeout: false,
      bar: false,
      patio: true,
      menuItems: false,
      guestGroups: false,
    },
    autoApply: false,
    description: 'Drive covers in the dead hour before peak.',
    status: 'live',
    targetAudience: 'All guests · in-app',
    whereApplies: 'Dine-in · patio · 5:00–5:45 PM',
    analytics: { redemptions: 428, guestsReached: 1204, revenueGenerated: 3820 },
    estimatedLiftPct: 12,
    clicks: 1204,
    newGuests: 134,
    returningGuests: 294,
    bestTimeLabel: 'Thu-Fri · 5:00-5:30 PM',
  },
  {
    id: 'p2',
    name: 'Birthday dessert comp',
    type: 'birthday',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    startTime: '12:00 PM',
    endTime: '10:00 PM',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    appliesTo: {
      dineIn: true,
      takeout: true,
      bar: false,
      patio: false,
      menuItems: true,
      guestGroups: true,
    },
    autoApply: true,
    description: 'Auto-apply for CRM birthday tags.',
    status: 'scheduled',
    targetAudience: 'Tagged birthdays',
    whereApplies: 'Dine-in & takeout',
    analytics: { redemptions: 0, guestsReached: 0, revenueGenerated: 0 },
    estimatedLiftPct: 8,
    startsTonight: true,
    attentionReason: 'scheduled_zero_usage',
    clicks: 0,
    newGuests: 0,
    returningGuests: 0,
    bestTimeLabel: 'No data yet',
  },
  {
    id: 'p3',
    name: 'Bar high-top happy hour',
    type: 'happy_hour',
    startDate: '2026-03-01',
    endDate: '2026-12-31',
    startTime: '4:00 PM',
    endTime: '6:00 PM',
    daysOfWeek: [3, 4, 5, 6],
    appliesTo: {
      dineIn: false,
      takeout: false,
      bar: true,
      patio: false,
      menuItems: true,
      guestGroups: false,
    },
    autoApply: false,
    description: 'Thu–Sun bar & high-tops.',
    status: 'paused',
    targetAudience: 'Walk-in bar guests',
    whereApplies: 'Bar only',
    analytics: { redemptions: 28, guestsReached: 2102, revenueGenerated: 420 },
    estimatedLiftPct: 18,
    needsAttention: true,
    attentionReason: 'low_engagement',
    clicks: 342,
    newGuests: 9,
    returningGuests: 19,
    bestTimeLabel: 'Fri · 4:00-5:00 PM',
  },
  {
    id: 'p4',
    name: 'Winter prefix menu',
    type: 'fixed_discount',
    startDate: '2025-11-01',
    endDate: '2026-02-28',
    startTime: '5:00 PM',
    endTime: '10:00 PM',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    appliesTo: {
      dineIn: true,
      takeout: false,
      bar: false,
      patio: false,
      menuItems: true,
      guestGroups: false,
    },
    autoApply: false,
    description: 'Ended with winter menu rotation.',
    status: 'expired',
    targetAudience: 'Dine-in',
    whereApplies: 'Main dining',
    analytics: { redemptions: 2104, guestsReached: 5600, revenueGenerated: 89400 },
    estimatedLiftPct: 0,
    attentionReason: 'expired_still_listed',
    clicks: 5600,
    newGuests: 482,
    returningGuests: 1622,
    bestTimeLabel: 'Sat · 7:00-9:00 PM',
  },
  {
    id: 'p5',
    name: 'First visit welcome drink',
    type: 'first_time_guest',
    startDate: '2026-05-01',
    endDate: '2026-08-31',
    startTime: '4:00 PM',
    endTime: '11:00 PM',
    daysOfWeek: [4, 5, 6],
    appliesTo: {
      dineIn: true,
      takeout: false,
      bar: true,
      patio: true,
      menuItems: false,
      guestGroups: true,
    },
    autoApply: true,
    description: 'Draft — review copy and CRM rule.',
    status: 'draft',
    targetAudience: 'First-time guests',
    whereApplies: 'Bar + patio + dining',
    analytics: { redemptions: 0, guestsReached: 0, revenueGenerated: 0 },
    estimatedLiftPct: 15,
    needsAttention: true,
    attentionReason: 'overlapping_time',
    clicks: 0,
    newGuests: 0,
    returningGuests: 0,
    bestTimeLabel: 'No data yet',
  },
  {
    id: 'p6',
    name: 'Half-price pasta Tuesdays',
    type: 'percent_off',
    startDate: '2026-04-14',
    endDate: '2026-06-30',
    startTime: '5:00 PM',
    endTime: '7:00 PM',
    daysOfWeek: [1],
    appliesTo: { dineIn: true, takeout: false, bar: false, patio: false, menuItems: true, guestGroups: false },
    autoApply: false,
    description: '50% off pasta every Tuesday.',
    status: 'live',
    targetAudience: 'All guests',
    whereApplies: 'Dine-in',
    analytics: { redemptions: 88, guestsReached: 2840, revenueGenerated: 3200 },
    estimatedLiftPct: 22,
    offerTag: '50% off pasta',
    views: 2840,
    claims: 124,
    clicks: 2840,
    newGuests: 24,
    returningGuests: 64,
    bestTimeLabel: 'Tue · 5:00-6:00 PM',
    scheduleLabel: 'Tue · 5–7 PM',
    audienceLabel: 'All guests',
    coverImage: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  },
  {
    id: 'p7',
    name: 'Sunset oyster hour',
    type: 'happy_hour',
    startDate: '2026-04-01',
    endDate: '2026-05-31',
    startTime: '4:00 PM',
    endTime: '6:00 PM',
    daysOfWeek: [2, 3, 4],
    appliesTo: { dineIn: false, takeout: false, bar: true, patio: true, menuItems: true, guestGroups: false },
    autoApply: false,
    description: '$1 oysters on the patio and bar.',
    status: 'live',
    targetAudience: 'All guests',
    whereApplies: 'Patio + Bar',
    analytics: { redemptions: 72, guestsReached: 1920, revenueGenerated: 2100 },
    estimatedLiftPct: 19,
    offerTag: '$1 oysters',
    views: 1920,
    claims: 96,
    clicks: 1920,
    newGuests: 21,
    returningGuests: 51,
    bestTimeLabel: 'Thu · 4:00-5:00 PM',
    scheduleLabel: 'Wed–Fri · 4–6 PM',
    audienceLabel: 'Patio + Bar',
    coverImage: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800',
    spotsLeft: 6,
  },
  {
    id: 'p8',
    name: 'Easter brunch prix-fixe',
    type: 'fixed_discount',
    startDate: '2026-04-01',
    endDate: '2026-04-09',
    startTime: '11:00 AM',
    endTime: '3:00 PM',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    appliesTo: { dineIn: true, takeout: false, bar: false, patio: false, menuItems: true, guestGroups: false },
    autoApply: false,
    description: '$48 prix-fixe Easter brunch.',
    status: 'expired',
    targetAudience: 'All guests',
    whereApplies: 'Dine-in',
    analytics: { redemptions: 182, guestsReached: 3210, revenueGenerated: 8736 },
    estimatedLiftPct: 0,
    offerTag: '$48 prix-fixe',
    views: 3210,
    claims: 204,
    clicks: 3210,
    newGuests: 74,
    returningGuests: 108,
    bestTimeLabel: 'Sun · 11:00 AM-1:00 PM',
    scheduleLabel: 'Apr 9 · 11AM–3PM',
    audienceLabel: 'All guests',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
  },
  {
    id: 'p9',
    name: 'Restaurant week tasting',
    type: 'fixed_discount',
    startDate: '2026-03-18',
    endDate: '2026-03-24',
    startTime: '5:00 PM',
    endTime: '10:00 PM',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    appliesTo: { dineIn: true, takeout: false, bar: false, patio: false, menuItems: true, guestGroups: false },
    autoApply: false,
    description: '$55 tasting menu for restaurant week.',
    status: 'expired',
    targetAudience: 'All guests',
    whereApplies: 'Dine-in',
    analytics: { redemptions: 268, guestsReached: 5640, revenueGenerated: 14740 },
    estimatedLiftPct: 0,
    offerTag: '$55 tasting',
    views: 5640,
    claims: 320,
    clicks: 5640,
    newGuests: 96,
    returningGuests: 172,
    bestTimeLabel: 'Fri · 6:00-8:00 PM',
    scheduleLabel: 'Mar 18–24 · Dinner',
    audienceLabel: 'All guests',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  },
  {
    id: 'p10',
    name: "Valentine's prix-fixe",
    type: 'fixed_discount',
    startDate: '2026-02-14',
    endDate: '2026-02-14',
    startTime: '5:00 PM',
    endTime: '10:00 PM',
    daysOfWeek: [5],
    appliesTo: { dineIn: true, takeout: false, bar: false, patio: false, menuItems: true, guestGroups: true },
    autoApply: false,
    description: '$95 / couple prix-fixe for Valentine\'s Day.',
    status: 'expired',
    targetAudience: 'All guests',
    whereApplies: 'Dine-in',
    analytics: { redemptions: 228, guestsReached: 4120, revenueGenerated: 21660 },
    estimatedLiftPct: 0,
    offerTag: '$95 / couple',
    views: 4120,
    claims: 240,
    clicks: 4120,
    newGuests: 118,
    returningGuests: 110,
    bestTimeLabel: 'Sat · 7:00-9:00 PM',
    scheduleLabel: 'Feb 14 · 5–10 PM',
    audienceLabel: 'All guests',
    coverImage: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800',
  },
];

/** @deprecated Compact row for legacy screens — derived from OWNER_PROMOTIONS */
export interface OwnerPromoRow {
  id: string;
  title: string;
  subtitle: string;
  active: boolean;
}

export const OWNER_PROMO_ROWS: OwnerPromoRow[] = OWNER_PROMOTIONS.map((p) => ({
  id: p.id,
  title: p.name,
  subtitle: p.whereApplies,
  active: p.status === 'live',
}));

export interface BusinessHoursRow {
  /** 0 = Mon … 6 = Sun */
  day: number;
  label: string;
  /** 24h "HH:MM"; null = closed */
  open: string | null;
  close: string | null;
}

export const OWNER_BUSINESS_HOURS: BusinessHoursRow[] = [
  { day: 0, label: 'Monday', open: '17:00', close: '22:30' },
  { day: 1, label: 'Tuesday', open: '17:00', close: '22:30' },
  { day: 2, label: 'Wednesday', open: '17:00', close: '22:30' },
  { day: 3, label: 'Thursday', open: '17:00', close: '23:00' },
  { day: 4, label: 'Friday', open: '17:00', close: '23:30' },
  { day: 5, label: 'Saturday', open: '11:00', close: '23:30' },
  { day: 6, label: 'Sunday', open: '11:00', close: '21:00' },
];

export interface OwnerBusinessProfile {
  name: string;
  cuisine: string;
  neighborhood: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  coverPhotoSeed: string;
}

export const OWNER_BUSINESS_PROFILE: OwnerBusinessProfile = {
  name: 'Nova Ristorante',
  cuisine: 'Italian',
  neighborhood: 'King West, Toronto',
  description:
    'Candlelit Northern Italian with a wood-fired hearth and a deep natural-wine list. Handmade pasta daily; seasonal tasting menu Thu–Sat.',
  phone: '(416) 555-0142',
  email: 'hello@novaristorante.com',
  address: '412 King St W, Toronto',
  website: 'novaristorante.com',
  rating: 4.8,
  reviewCount: 512,
  followerCount: 1248,
  coverPhotoSeed: 'nova-ristorante',
};

export const OWNER_BUSINESS_PRICE = '$$$';
export const OWNER_BUSINESS_INSTAGRAM = '@nova.ristorante';

/** Bookings by hour for the schedule demand chart (4 PM – midnight). */
export const BOOKINGS_BY_HOUR: { label: string; count: number; tier: 'peak' | 'busy' | 'slow' }[] = [
  { label: '4p', count: 8, tier: 'slow' },
  { label: '5p', count: 18, tier: 'busy' },
  { label: '6p', count: 34, tier: 'busy' },
  { label: '7p', count: 42, tier: 'peak' },
  { label: '8p', count: 38, tier: 'peak' },
  { label: '9p', count: 28, tier: 'busy' },
  { label: '10p', count: 16, tier: 'busy' },
  { label: '11p', count: 9, tier: 'slow' },
  { label: '12a', count: 3, tier: 'slow' },
];

export const BOOKINGS_BY_HOUR_TOTAL = 196;
export const BOOKINGS_BY_HOUR_PEAK = '7 PM';

/** Day pills for the schedule screen (this week's booking counts). */
export const SCHEDULE_WEEK_DAYS = [
  { key: 'Mon', count: 78 },
  { key: 'Tue', count: 93 },
  { key: 'Wed', count: 107 },
  { key: 'Thu', count: 138 },
  { key: 'Fri', count: 162 },
  { key: 'Sat', count: 184 },
  { key: 'Sun', count: 94 },
];

export interface ShiftStaff {
  id: string;
  initials: string;
  name: string;
  role: string;
  section: string;
  startTime: string;
  endTime: string;
  hours: number;
  onShift: boolean;
}

export const SHIFT_STAFF: ShiftStaff[] = [
  { id: 'sh1', initials: 'AR', name: 'Alex Rivera', role: 'Lead server', section: 'Patio', startTime: '4:00', endTime: '11:00 PM', hours: 7, onShift: true },
  { id: 'sh2', initials: 'SC', name: 'Sam Chen', role: 'Server', section: 'Main', startTime: '5:00', endTime: '11:00 PM', hours: 6, onShift: true },
  { id: 'sh3', initials: 'JP', name: 'Jordan Pike', role: 'Host', section: 'Front', startTime: '4:30', endTime: '10:30 PM', hours: 6, onShift: true },
  { id: 'sh4', initials: 'MY', name: 'Morgan Yu', role: 'Bar', section: 'Bar', startTime: '6:00', endTime: 'midnight', hours: 6, onShift: false },
  { id: 'sh5', initials: 'PD', name: 'Priya Desai', role: 'Server', section: 'Main', startTime: '', endTime: '', hours: 0, onShift: false },
];

export const RESTAURANT_SERVICE_HOURS: { label: string; open: string; close: string; peak: boolean }[] = [
  { label: 'Mon–Wed', open: '5:00 PM', close: '11:00 PM', peak: false },
  { label: 'Thu', open: '5:00 PM', close: 'midnight', peak: true },
  { label: 'Fri–Sat', open: '5:00 PM', close: '1:00 AM', peak: true },
  { label: 'Sun', open: '5:00 PM', close: '10:00 PM', peak: false },
];

// ── Tonight briefing mock data ───────────────────────────────────────────────

export const TONIGHT_BRIEFING = {
  status: 'quiet' as 'quiet' | 'busy' | 'normal',
  statusLabel: 'QUIET',
  headline: 'Quiet night tonight.',
  vsTypical: -38,
  covers: 36,
  bookings: 12,
  busiestWindow: '7p–8p',
  busiestCovers: 12,
  bookedPct: 41,
  doorsOpen: '5:00 PM',
  firstResTime: '5:30p',
  firstResParty: 2,
  runwayMin: 30,
  totalCapacity: 88,
  bookedSeats: 36,
  openSeats: 52,
};

export type TonightBadge = 'vip' | 'large-party' | 'first-visit' | 'allergy';

export interface TonightGuest {
  id: string;
  name: string;
  time: string;
  partySize: number;
  badge: TonightBadge;
  note?: string;
  avatarColor: string;
}

export const TONIGHT_GUESTS: TonightGuest[] = [
  { id: 'tg1', name: 'Elena Marchetti', time: '5:30p', partySize: 2, badge: 'vip', note: 'Anniversary — candle setup requested', avatarColor: '#7A5F1E' },
  { id: 'tg2', name: 'Sofia & Jules',   time: '7:00p', partySize: 2, badge: 'vip', note: 'Regulars — prefer corner table', avatarColor: '#7A5F1E' },
  { id: 'tg3', name: 'Victoria Blake',  time: '9:00p', partySize: 2, badge: 'vip', avatarColor: '#7A5F1E' },
  { id: 'tg4', name: 'Marcus Holloway', time: '6:45p', partySize: 6, badge: 'large-party', note: 'Celebrating prom night', avatarColor: '#2A4A8A' },
  { id: 'tg5', name: 'The Harrisons',   time: '7:45p', partySize: 5, badge: 'large-party', avatarColor: '#2A4A8A' },
  { id: 'tg6', name: 'Aisha Raghavan',  time: '7:15p', partySize: 3, badge: 'first-visit', note: 'First visit — no contact notes', avatarColor: '#2A4A8A' },
];

/** Structured attention items for the home screen. */
export const HOME_ATTENTION_ITEMS: { id: string; icon: string; title: string; sub: string; severity: 'critical' | 'warning' | 'info' }[] = [
  { id: 'ha1', icon: 'warning', title: '1 reservation at risk — 2 past no-shows', sub: 'Send a confirmation text', severity: 'critical' },
  { id: 'ha2', icon: 'time', title: '2 reservations awaiting confirmation', sub: 'Nudge guests automatically', severity: 'warning' },
  { id: 'ha3', icon: 'sparkles', title: 'Tuesday 6–7 PM is quiet — post a promo?', sub: '45% below average for that slot', severity: 'info' },
];

/** Reservation flow rows shown on the home screen. */
export const HOME_RESERVATION_FLOW: { id: string; time: string; name: string; partyInfo: string; status: 'confirmed' | 'pending' | 'risk' | 'seated'; vip?: boolean }[] = [
  { id: 'rf1', time: '6:45', period: 'PM', name: 'Marcus Holloway', partyInfo: 'Party 6 · M-8', status: 'confirmed' } as never,
  { id: 'rf2', time: '7:00', period: 'PM', name: 'Sofia & Jules', partyInfo: 'Party 2 · P-1', status: 'confirmed', vip: true } as never,
  { id: 'rf3', time: '7:15', period: 'PM', name: 'Aisha Raghavan', partyInfo: 'Party 3 · M-6', status: 'pending' } as never,
  { id: 'rf4', time: '7:30', period: 'PM', name: 'Kenji Tanaka', partyInfo: 'Party 2 · no table', status: 'risk' } as never,
];

/** Returns whether the restaurant is currently open based on OWNER_BUSINESS_HOURS and the supplied Date. */
export function isBusinessOpenNow(
  now: Date = new Date(),
  hours: BusinessHoursRow[] = OWNER_BUSINESS_HOURS,
): { open: boolean; nextChange: string } {
  // Convert JS getDay() (0 Sun … 6 Sat) to our 0 Mon … 6 Sun layout
  const jsDow = now.getDay();
  const dow = (jsDow + 6) % 7;
  const row = hours.find((h) => h.day === dow);
  if (!row || !row.open || !row.close) {
    return { open: false, nextChange: 'Closed today' };
  }
  const [oh, om] = row.open.split(':').map(Number);
  const [ch, cm] = row.close.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  const isOpen = mins >= openMins && mins < closeMins;
  const fmt = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  return {
    open: isOpen,
    nextChange: isOpen ? `Closes ${fmt(ch, cm)}` : `Opens ${fmt(oh, om)}`,
  };
}
