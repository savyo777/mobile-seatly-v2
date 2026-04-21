export interface FeedCollection {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  gradient: [string, string];
}

export const feedCollections: FeedCollection[] = [
  {
    id: 'ramen-toronto',
    emoji: '🍜',
    title: "Toronto's best ramen",
    subtitle: '12 spots',
    gradient: ['#1A1208', '#2A1F0E'],
  },
  {
    id: 'date-night',
    emoji: '🕯️',
    title: 'Date night picks',
    subtitle: '18 spots',
    gradient: ['#120A18', '#1E1025'],
  },
  {
    id: 'new-openings',
    emoji: '✨',
    title: 'New openings',
    subtitle: '7 spots',
    gradient: ['#0A1218', '#0E1A22'],
  },
  {
    id: 'brunch',
    emoji: '🥂',
    title: 'Weekend brunch',
    subtitle: '24 spots',
    gradient: ['#18120A', '#251C0E'],
  },
  {
    id: 'under-50',
    emoji: '💸',
    title: 'Great under $50',
    subtitle: '31 spots',
    gradient: ['#0A1812', '#0E251C'],
  },
];
