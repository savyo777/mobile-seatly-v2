export interface LoyaltyTransaction {
  id: string;
  type: 'earn' | 'redeem' | 'expire';
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'free_item' | 'discount' | 'event';
}

export const mockLoyaltyTransactions: LoyaltyTransaction[] = [
  { id: 'lt1', type: 'earn', points: 185, balanceAfter: 1250, description: 'Dinner at Nova Ristorante', createdAt: '2026-03-08T22:00:00-04:00' },
  { id: 'lt2', type: 'earn', points: 98, balanceAfter: 1065, description: 'Dinner at Le Petit Bistro', createdAt: '2026-03-15T22:30:00-04:00' },
  { id: 'lt3', type: 'redeem', points: -200, balanceAfter: 967, description: 'Free Tiramisu at Nova Ristorante', createdAt: '2026-03-01T21:00:00-04:00' },
  { id: 'lt4', type: 'earn', points: 250, balanceAfter: 1167, description: 'Birthday dinner at Sakura Sushi', createdAt: '2026-02-14T23:00:00-05:00' },
  { id: 'lt5', type: 'earn', points: 83, balanceAfter: 917, description: 'Brunch at Café Soleil', createdAt: '2026-02-02T14:00:00-05:00' },
];

export const mockRewards: LoyaltyReward[] = [
  { id: 'rw1', name: 'Free Appetizer', description: 'Any appetizer up to $20 at participating restaurants', pointsCost: 300, category: 'free_item' },
  { id: 'rw2', name: '$10 Off Your Bill', description: '$10 discount on your next order over $50', pointsCost: 500, category: 'discount' },
  { id: 'rw3', name: 'Free Dessert', description: 'Any dessert at participating restaurants', pointsCost: 200, category: 'free_item' },
  { id: 'rw4', name: '$25 Off Your Bill', description: '$25 discount on your next order over $100', pointsCost: 1000, category: 'discount' },
  { id: 'rw5', name: 'Free Event Ticket', description: 'One ticket to any restaurant event', pointsCost: 1500, category: 'event' },
];
