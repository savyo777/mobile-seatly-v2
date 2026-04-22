export type Session = {
  id: string;
  device: string;
  platform: 'ios' | 'android' | 'web';
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
};

export const mockSessions: Session[] = [
  {
    id: 's1',
    device: 'iPhone 15 Pro',
    platform: 'ios',
    location: 'Toronto, ON',
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: 's2',
    device: 'MacBook Pro — Safari',
    platform: 'web',
    location: 'Toronto, ON',
    lastActiveAt: '2026-04-20T18:32:00Z',
    isCurrent: false,
  },
  {
    id: 's3',
    device: 'iPad Air',
    platform: 'ios',
    location: 'Mississauga, ON',
    lastActiveAt: '2026-04-18T09:11:00Z',
    isCurrent: false,
  },
  {
    id: 's4',
    device: 'Pixel 8',
    platform: 'android',
    location: 'Toronto, ON',
    lastActiveAt: '2026-04-10T14:55:00Z',
    isCurrent: false,
  },
  {
    id: 's5',
    device: 'Chrome — Windows',
    platform: 'web',
    location: 'Unknown',
    lastActiveAt: '2026-03-28T22:04:00Z',
    isCurrent: false,
  },
];
