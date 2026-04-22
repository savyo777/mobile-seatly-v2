export type UserRole = 'customer' | 'owner' | 'manager' | 'server' | 'host' | 'kitchen' | 'bar' | 'staff';

export interface UserProfile {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: UserRole;
  restaurantId?: string;
  dietaryRestrictions: string[];
  allergies: string[];
  seatingPreference?: string;
  noisePreference?: string;
  preferredLanguage: string;
  loyaltyPointsBalance: number;
  loyaltyTier?: string;
  // Security fields
  passwordLastChangedAt?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  biometricEnabled?: boolean;
}

export const mockCustomer: UserProfile = {
  id: 'u1',
  authUserId: 'auth1',
  fullName: 'Alex Johnson',
  email: 'alex@example.com',
  phone: '(416) 555-1234',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  role: 'customer',
  dietaryRestrictions: ['vegetarian'],
  allergies: ['nuts'],
  seatingPreference: 'window',
  noisePreference: 'quiet',
  preferredLanguage: 'en',
  loyaltyPointsBalance: 1250,
  loyaltyTier: 'Silver',
  passwordLastChangedAt: '2026-02-14T10:00:00Z',
  emailVerified: true,
  twoFactorEnabled: false,
  biometricEnabled: true,
};

export const mockOwner: UserProfile = {
  id: 'u2',
  authUserId: 'auth2',
  fullName: 'Marco Rossi',
  email: 'marco@novaristorante.com',
  phone: '(416) 555-5678',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
  role: 'owner',
  restaurantId: 'r1',
  dietaryRestrictions: [],
  allergies: [],
  preferredLanguage: 'en',
  loyaltyPointsBalance: 0,
};
