export type SnapOverlayCategoryId =
  | 'branded'
  | 'location'
  | 'occasion'
  | 'food'
  | 'vibe'
  | 'review';

export type SnapOverlayDefinition = {
  id: string;
  categoryId: SnapOverlayCategoryId;
  label: string;
};

export type SnapOverlayContext = {
  restaurantName: string;
  city: string;
  area: string;
  /** e.g. "7:30 PM" */
  bookedTimeLabel: string;
  partySize: number;
};
