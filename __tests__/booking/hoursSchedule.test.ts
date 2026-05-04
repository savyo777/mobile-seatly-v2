import { rememberRestaurants } from '@/lib/data/restaurantCatalog';
import { isMockDateBookable, getMockTimeSlots } from '@/lib/mock/bookingAvailability';
import type { Restaurant, RestaurantHoursJson } from '@/lib/mock/restaurants';
import {
  deriveClosedJsWeekdaysFromHoursJson,
  getBookingMinutesWindowForDate,
  isClosedBookingDate,
} from '@/lib/booking/hoursSchedule';
import { toLocalDateKey } from '@/lib/booking/dateUtils';

const openWeek: RestaurantHoursJson = {
  sunday: { open: '11:00', close: '22:00' },
  monday: { open: '11:00', close: '22:00' },
  tuesday: { open: '11:00', close: '22:00' },
  wednesday: { open: '11:00', close: '22:00' },
  thursday: { open: '11:00', close: '22:00' },
  friday: { open: '11:00', close: '22:00' },
  saturday: { open: '11:00', close: '22:00' },
};

function futureDateKeyForJsDay(jsDay: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const offset = ((jsDay - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + offset);
  return toLocalDateKey(d);
}

function restaurant(id: string, hoursJson: RestaurantHoursJson): Restaurant {
  return {
    id,
    slug: id,
    name: id,
    cuisineType: 'Test',
    description: '',
    address: '',
    city: 'Toronto',
    province: 'ON',
    area: '',
    lat: 0,
    lng: 0,
    phone: '',
    coverPhotoUrl: '',
    logoUrl: '',
    avgRating: 5,
    totalReviews: 0,
    priceRange: 2,
    distanceKm: 0,
    availability: 'Available Tonight',
    ambiance: '',
    tags: [],
    featuredIn: ['recommended'],
    isActive: true,
    hoursJson,
    taxRate: 0.13,
    currency: 'CAD',
  };
}

describe('booking hours schedule', () => {
  it('treats missing or null weekly hours as closed weekdays', () => {
    expect(deriveClosedJsWeekdaysFromHoursJson({
      ...openWeek,
      monday: null,
      wednesday: undefined,
    })).toEqual([1, 3]);
  });

  it('blocks mock booking dates for live cached restaurants closed that weekday', () => {
    const id = 'live-closed-monday';
    rememberRestaurants([restaurant(id, { ...openWeek, monday: null })]);
    const monday = futureDateKeyForJsDay(1);

    expect(isMockDateBookable(id, monday)).toBe(false);
    expect(getMockTimeSlots(id, monday, 2)).toEqual([]);
  });

  it('blocks date-specific closed specials even when the weekly day is open', () => {
    const id = 'live-special-closed';
    const friday = futureDateKeyForJsDay(5);
    const hoursJson: RestaurantHoursJson = {
      ...openWeek,
      special: [{ date: friday, closed: true }],
    };
    rememberRestaurants([restaurant(id, hoursJson)]);

    expect(isClosedBookingDate(hoursJson, friday, 5)).toBe(true);
    expect(isMockDateBookable(id, friday)).toBe(false);
    expect(getMockTimeSlots(id, friday, 2)).toEqual([]);
  });

  it('uses date-specific special hours for slot windows', () => {
    const dateKey = futureDateKeyForJsDay(6);
    const hoursJson: RestaurantHoursJson = {
      ...openWeek,
      special: [{ date: dateKey, from: '5:00 PM', to: '9:00 PM' }],
    };

    expect(getBookingMinutesWindowForDate(hoursJson, dateKey, 6)).toEqual({
      open: 17 * 60,
      close: 21 * 60,
    });
  });
});
