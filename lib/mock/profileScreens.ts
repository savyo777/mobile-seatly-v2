import type { Restaurant } from '@/lib/mock/restaurants';
import { mockRestaurants } from '@/lib/mock/restaurants';

/** Saved / favorites list — premium demo venues */
export const SAVED_RESTAURANT_IDS = ['r1', 'r2', 'r8', 'r15', 'r5'];

export function getSavedRestaurants(): Restaurant[] {
  const set = new Set<string>(SAVED_RESTAURANT_IDS);
  return mockRestaurants.filter((r) => set.has(r.id));
}

export type PaymentMethod = {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiry: string;
  cardholder: string;
  isDefault: boolean;
};

export const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm1', brand: 'visa', last4: '4821', expiry: '09/27', cardholder: 'Alex Johnson', isDefault: true },
  { id: 'pm2', brand: 'mastercard', last4: '1194', expiry: '04/28', cardholder: 'Alex Johnson', isDefault: false },
];

export type NotificationPref = {
  id: string;
  title: string;
  subtitle: string;
  defaultOn: boolean;
};

export const mockNotificationPrefs: NotificationPref[] = [
  { id: 'n1', title: 'Booking confirmations', subtitle: 'When a reservation is confirmed or updated', defaultOn: true },
  { id: 'n2', title: 'Special promotions', subtitle: 'Exclusive offers from Cenaiva and partners', defaultOn: true },
  { id: 'n3', title: 'Rewards updates', subtitle: 'Points earned, tier changes, expiring rewards', defaultOn: true },
  { id: 'n4', title: 'New restaurant alerts', subtitle: 'When spots you follow add tables or menus', defaultOn: true },
  { id: 'n5', title: 'Nearby dining suggestions', subtitle: 'Curated picks near your location', defaultOn: true },
  { id: 'n6', title: 'SMS notifications', subtitle: 'Important booking updates by text', defaultOn: true },
  { id: 'n7', title: 'Email notifications', subtitle: 'Receipts, summaries, and marketing', defaultOn: true },
  { id: 'n8', title: 'Push notifications', subtitle: 'In-app alerts on this device', defaultOn: true },
];

// Promotions are LIVE — the type stays so callers can import it,
// but the mockPromotions data was deleted on 2026-05-21. Live data
// comes from `lib/promotions/getPromotions.ts` (fetchActivePromotions).
export type PromotionOffer = {
  id: string;
  headline: string;
  description: string;
  expiresLabel: string;
  terms: string;
  badge?: string;
};

export type HelpTopic = {
  id: string;
  title: string;
  icon: 'calendar-outline' | 'card-outline' | 'cash-outline' | 'flag-outline';
  description: string;
};

export const mockHelpTopics: HelpTopic[] = [
  { id: 'h1', title: 'Booking issues', icon: 'calendar-outline', description: 'Changes, cancellations, no-shows' },
  { id: 'h2', title: 'Payment issues', icon: 'card-outline', description: 'Charges, deposits, refunds' },
  { id: 'h3', title: 'Refunds', icon: 'cash-outline', description: 'Policies and timelines' },
  { id: 'h4', title: 'Report a restaurant issue', icon: 'flag-outline', description: 'Service, safety, or accuracy' },
];

export type FaqItem = {
  id: string;
  q: string;
  a: string;
};

export const mockFaqs: FaqItem[] = [
  {
    id: 'f1',
    q: 'How do I make a reservation?',
    a: 'Tap a restaurant from the Discover tab, then follow the booking steps: choose your date, time, and party size. You can optionally pre-order from the menu, add special requests, and pay any required deposit before confirming.',
  },
  {
    id: 'f2',
    q: 'How do I change or cancel a reservation?',
    a: 'Go to Activity, select your booking, then tap Modify or Cancel. Cancellation policies vary by restaurant — some may withhold the deposit if you cancel too close to your reservation time.',
  },
  {
    id: 'f3',
    q: 'When will my card be charged?',
    a: 'A deposit is captured at the time of booking when required by the restaurant. If you pre-order food, that amount is added to the deposit. Any remaining charges are handled by the restaurant after your visit.',
  },
  {
    id: 'f4',
    q: 'How do refunds work?',
    a: 'Refund eligibility depends on the restaurant\'s cancellation policy. If you cancel within the allowed window, your deposit is refunded to the original payment method within 5–10 business days. For disputes, contact us through the help topics above.',
  },
  {
    id: 'f5',
    q: 'How do loyalty points and tiers work?',
    a: 'You earn points on every eligible dining visit. Points unlock tiers — Bronze, Silver, Gold, and Platinum — each with increasing perks. Redeem points for rewards like free appetizers, discounts, or event tickets in the Loyalty section of your profile.',
  },
  {
    id: 'f6',
    q: 'What is Cenaiva and how do I use it?',
    a: 'Cenaiva is your AI dining assistant. Just say "Hey Cenaiva" from anywhere in the app to activate it by voice. You can ask for restaurant recommendations, help with bookings, browse menus, and more — all hands-free.',
  },
  {
    id: 'f7',
    q: 'Can I pre-order food before I arrive?',
    a: 'Yes! During the booking process you can browse the restaurant\'s menu and add items to your cart. Pre-ordered items are charged at checkout along with your deposit, so your food can be ready when you arrive.',
  },
  {
    id: 'f8',
    q: 'How do I add dietary preferences or special requests?',
    a: 'You can set dietary preferences in your profile under Preferences. When making a booking, there\'s also a special requests field where you can note allergies, seating preferences, or celebrations for that specific visit.',
  },
  {
    id: 'f9',
    q: 'What payment methods are accepted?',
    a: 'Cenaiva accepts credit and debit cards (Visa, Mastercard, Amex), Apple Pay on iOS, and Google Pay on Android. You can manage your saved payment methods in Profile → Payment.',
  },
  {
    id: 'f10',
    q: 'How do I download a receipt for my booking?',
    a: 'Go to Activity, select a completed booking with a payment, and tap the receipt option. From there you can download a PDF, share it, or print it directly from your phone.',
  },
];

// Wallet, Gift Cards, and Diner Referrals are NOT Cenaiva features.
// Per consumer ToS audit 2026-05-21:
//   - §10 Wallet — DELETED (not a planned product)
//   - §11.4 Gift Cards — DELETED (not a planned product)
//   - §9.3 Diner Referrals — DELETED (the ONLY referral program is
//     owner-side "Refer & Earn" via lib/owner/referralPolicy.ts +
//     register-restaurant-owner edge fn, Stripe-integrated as a
//     +30-day subscription trial; governed by the Restaurant Partner
//     Agreement, not the consumer ToS)
// The mockGiftCards / mockWalletCredits / mockInviteRecords /
// REFERRAL_* exports that previously lived here were removed.
// Do NOT re-introduce them.

export type DietaryPreferenceOption = { id: string; label: string };
export const mockDietaryPreferenceOptions: DietaryPreferenceOption[] = [
  { id: 'd1', label: 'Vegetarian' },
  { id: 'd2', label: 'Vegan' },
  { id: 'd3', label: 'Halal' },
  { id: 'd4', label: 'Kosher' },
  { id: 'd5', label: 'Pescatarian' },
  { id: 'd6', label: 'Gluten-conscious' },
  { id: 'd7', label: 'Dairy-free' },
];

export type RestrictionOption = { id: string; label: string; severity: 'allergy' | 'intolerance' };
export const mockRestrictionOptions: RestrictionOption[] = [
  { id: 'a1', label: 'Peanut allergy', severity: 'allergy' },
  { id: 'a2', label: 'Tree nut allergy', severity: 'allergy' },
  { id: 'a3', label: 'Shellfish allergy', severity: 'allergy' },
  { id: 'a4', label: 'Gluten intolerance', severity: 'intolerance' },
  { id: 'a5', label: 'Dairy intolerance', severity: 'intolerance' },
  { id: 'a6', label: 'Egg allergy', severity: 'allergy' },
];

export type DateNightOption = { id: string; label: string };
export const mockDateNightOptions: DateNightOption[] = [
  { id: 'dn1', label: 'Romantic ambience' },
  { id: 'dn2', label: 'Quiet seating' },
  { id: 'dn3', label: 'Rooftop preferred' },
  { id: 'dn4', label: 'Outdoor patio' },
  { id: 'dn5', label: 'Wine-focused spots' },
  { id: 'dn6', label: 'Dressy venues' },
  { id: 'dn7', label: 'Fine dining only' },
];

export type SeatingOption = { id: string; label: string };
export const mockSeatingOptions: SeatingOption[] = [
  { id: 's1', label: 'Window' },
  { id: 's2', label: 'Patio' },
  { id: 's3', label: 'Quiet corner' },
  { id: 's4', label: 'Booth' },
  { id: 's5', label: 'Bar seating' },
  { id: 's6', label: "Chef's counter" },
  { id: 's7', label: 'Private room' },
];
