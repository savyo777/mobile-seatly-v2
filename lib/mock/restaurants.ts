export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisineType: string;
  description: string;
  address: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  phone: string;
  coverPhotoUrl: string;
  logoUrl: string;
  avgRating: number;
  totalReviews: number;
  priceRange: 1 | 2 | 3 | 4;
  isActive: boolean;
  hoursJson: Record<string, { open: string; close: string }>;
  taxRate: number;
  currency: string;
}

export const mockRestaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'Nova Ristorante',
    slug: 'nova-ristorante',
    cuisineType: 'Italian',
    description: 'Authentic Italian cuisine in the heart of downtown Toronto. Fresh pasta made daily, wood-fired pizzas, and an extensive wine list.',
    address: '123 King Street West',
    city: 'Toronto',
    province: 'ON',
    lat: 43.6485,
    lng: -79.3832,
    phone: '(416) 555-0101',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    avgRating: 4.7,
    totalReviews: 342,
    priceRange: 3,
    isActive: true,
    hoursJson: {
      monday: { open: '11:30', close: '22:00' },
      tuesday: { open: '11:30', close: '22:00' },
      wednesday: { open: '11:30', close: '22:00' },
      thursday: { open: '11:30', close: '23:00' },
      friday: { open: '11:30', close: '23:30' },
      saturday: { open: '10:00', close: '23:30' },
      sunday: { open: '10:00', close: '21:00' },
    },
    taxRate: 0.13,
    currency: 'CAD',
  },
  {
    id: 'r2',
    name: 'Sakura Sushi',
    slug: 'sakura-sushi',
    cuisineType: 'Japanese',
    description: 'Premium omakase and à la carte sushi experience. Fresh fish flown in daily from Tokyo\'s Tsukiji market.',
    address: '456 Yonge Street',
    city: 'Toronto',
    province: 'ON',
    lat: 43.6543,
    lng: -79.3807,
    phone: '(416) 555-0202',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=200',
    avgRating: 4.9,
    totalReviews: 189,
    priceRange: 4,
    isActive: true,
    hoursJson: {
      monday: { open: '17:00', close: '22:00' },
      tuesday: { open: '17:00', close: '22:00' },
      wednesday: { open: '17:00', close: '22:00' },
      thursday: { open: '17:00', close: '23:00' },
      friday: { open: '17:00', close: '23:30' },
      saturday: { open: '12:00', close: '23:30' },
      sunday: { open: '12:00', close: '21:00' },
    },
    taxRate: 0.13,
    currency: 'CAD',
  },
  {
    id: 'r3',
    name: 'Le Petit Bistro',
    slug: 'le-petit-bistro',
    cuisineType: 'French',
    description: 'A charming French bistro serving classic dishes with a modern twist. Intimate atmosphere perfect for date nights.',
    address: '789 Queen Street West',
    city: 'Toronto',
    province: 'ON',
    lat: 43.6482,
    lng: -79.4008,
    phone: '(416) 555-0303',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200',
    avgRating: 4.5,
    totalReviews: 256,
    priceRange: 3,
    isActive: true,
    hoursJson: {
      monday: { open: '11:00', close: '22:00' },
      tuesday: { open: '11:00', close: '22:00' },
      wednesday: { open: '11:00', close: '22:00' },
      thursday: { open: '11:00', close: '23:00' },
      friday: { open: '11:00', close: '23:30' },
      saturday: { open: '10:00', close: '23:30' },
      sunday: { open: '10:00', close: '21:00' },
    },
    taxRate: 0.13,
    currency: 'CAD',
  },
  {
    id: 'r4',
    name: 'The Smoky Grill',
    slug: 'the-smoky-grill',
    cuisineType: 'BBQ & Steakhouse',
    description: 'Premium cuts, house-smoked meats, and craft cocktails. Live music on weekends.',
    address: '321 Front Street',
    city: 'Toronto',
    province: 'ON',
    lat: 43.6452,
    lng: -79.3737,
    phone: '(416) 555-0404',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200',
    avgRating: 4.3,
    totalReviews: 412,
    priceRange: 2,
    isActive: true,
    hoursJson: {
      monday: { open: '12:00', close: '23:00' },
      tuesday: { open: '12:00', close: '23:00' },
      wednesday: { open: '12:00', close: '23:00' },
      thursday: { open: '12:00', close: '00:00' },
      friday: { open: '12:00', close: '01:00' },
      saturday: { open: '11:00', close: '01:00' },
      sunday: { open: '11:00', close: '22:00' },
    },
    taxRate: 0.13,
    currency: 'CAD',
  },
  {
    id: 'r5',
    name: 'Café Soleil',
    slug: 'cafe-soleil',
    cuisineType: 'Café & Brunch',
    description: 'Artisan coffee, fresh pastries, and all-day brunch. A bright and airy space in the heart of Kensington.',
    address: '55 Kensington Avenue',
    city: 'Toronto',
    province: 'ON',
    lat: 43.6547,
    lng: -79.4025,
    phone: '(416) 555-0505',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
    logoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200',
    avgRating: 4.6,
    totalReviews: 523,
    priceRange: 1,
    isActive: true,
    hoursJson: {
      monday: { open: '07:00', close: '17:00' },
      tuesday: { open: '07:00', close: '17:00' },
      wednesday: { open: '07:00', close: '17:00' },
      thursday: { open: '07:00', close: '17:00' },
      friday: { open: '07:00', close: '18:00' },
      saturday: { open: '08:00', close: '18:00' },
      sunday: { open: '08:00', close: '16:00' },
    },
    taxRate: 0.13,
    currency: 'CAD',
  },
];
