import { mockCustomer } from '@/lib/mock/users';

/** Profile tab display (single source: {@link mockCustomer}). */
export const profileDisplayUser = {
  fullName: mockCustomer.fullName,
  email: mockCustomer.email,
  phone: mockCustomer.phone,
  avatarUrl: mockCustomer.avatarUrl ?? null,
  loyaltyPointsBalance: mockCustomer.loyaltyPointsBalance,
  loyaltyTier: mockCustomer.loyaltyTier ?? 'Silver',
};
