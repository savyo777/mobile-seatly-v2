export type ReceiptActivityKind = 'booking' | 'order';

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
}

export interface ReceiptPayload {
  kind: ReceiptActivityKind;
  restaurantName: string;
  dateTimeIso: string;
  statusLabel: string;
  partySize: number;
  referenceId: string;
  guestName: string;
  guestEmail?: string;
  items: ReceiptLineItem[];
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  currency: 'CAD';
  /** Booking-only note when there are no preorder lines */
  footerNote?: string;
}
