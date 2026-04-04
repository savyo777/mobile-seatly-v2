import type { Table } from '@/lib/mock/tables';

export type RevenuePeriod = 'day' | 'week' | '2w' | 'month' | '6m' | 'year';

export const OWNER_FIRST_NAME = 'Steven';

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

export const WALKIN_QUEUE: { id: string; party: number; waitMins: number; name: string }[] = [
  { id: 'wq1', party: 2, waitMins: 12, name: 'Guest A' },
  { id: 'wq2', party: 4, waitMins: 22, name: 'Guest B' },
];

export const WAITLIST_ENTRIES: { id: string; name: string; party: number; quoted: string }[] = [
  { id: 'wl1', name: 'R. Santos', party: 2, quoted: '7:45 PM' },
  { id: 'wl2', name: 'Y. Park', party: 3, quoted: '8:10 PM' },
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

export interface CrmGuestRow {
  id: string;
  name: string;
  visits: number;
  avgSpend: number;
  frequency: string;
  preference: string;
  vip: boolean;
}

export const CRM_SPOTLIGHT: CrmGuestRow[] = [
  { id: 'c1', name: 'Alex Johnson', visits: 12, avgSpend: 186, frequency: '2× / month', preference: 'Booth, sparkling', vip: true },
  { id: 'c2', name: 'Priya N.', visits: 9, avgSpend: 112, frequency: 'Monthly', preference: 'Vegetarian', vip: true },
  { id: 'c3', name: 'David Kim', visits: 1, avgSpend: 72, frequency: 'New', preference: '—', vip: false },
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
