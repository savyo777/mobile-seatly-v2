export type PostTurnRequestType = 'review' | 'photo';
export type PostTurnRequestStatus = 'pending' | 'completed';

export type CompletedVisit = {
  bookingId: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  reservedAt: string;
  turnTimeMinutes: number;
  turnCompletedAt: string;
};

export type PostTurnRequest = {
  id: string;
  bookingId: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  type: PostTurnRequestType;
  status: PostTurnRequestStatus;
  requestedAt: string;
  turnCompletedAt: string;
  completedAt?: string;
  dismissedAt?: string;
  pushSentAt?: string;
  inAppReadAt?: string;
};
