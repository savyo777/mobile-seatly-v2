import { RECEIPT_GUEST } from '@/lib/mock/receiptGuest';
import { mockOrders, type Order, type OrderItem } from '@/lib/mock/orders';
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import type { ReceiptActivityKind, ReceiptLineItem, ReceiptPayload } from '@/lib/receipt/receiptTypes';

function mapOrderItem(it: OrderItem): ReceiptLineItem {
  return {
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal,
    note: it.modifications,
  };
}

function receiptStatusReservation(s: Reservation['status']): string {
  switch (s) {
    case 'confirmed':
    case 'seated':
      return 'Confirmed';
    case 'pending':
      return 'Pending';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'no_show':
      return 'No show';
    default:
      return 'Pending';
  }
}

function receiptStatusOrder(s: Order['status']): string {
  switch (s) {
    case 'confirmed':
      return 'Confirmed';
    case 'pending':
      return 'Pending';
    case 'preparing':
    case 'ready':
      return 'In progress';
    case 'served':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Pending';
  }
}

function orderFromReservation(r: Reservation): Order | undefined {
  if (!r.preorderOrderId) return undefined;
  return mockOrders.find((o) => o.id === r.preorderOrderId);
}

export function getReceiptPayload(kind: ReceiptActivityKind, id: string): ReceiptPayload | null {
  if (kind === 'booking') {
    const r = mockReservations.find((x) => x.id === id);
    if (!r) return null;

    const preorder = orderFromReservation(r);
    let items: ReceiptLineItem[] = preorder ? preorder.items.map(mapOrderItem) : [];

    if (items.length === 0 && r.depositAmount != null && r.depositAmount > 0) {
      items = [
        {
          name: 'Reservation deposit (hold)',
          quantity: 1,
          unitPrice: r.depositAmount,
          lineTotal: r.depositAmount,
        },
      ];
    }

    const subtotal = preorder?.subtotal ?? (items.length ? items.reduce((s, i) => s + i.lineTotal, 0) : 0);
    const taxAmount = preorder?.taxAmount ?? 0;
    const tipAmount = preorder?.tipAmount ?? 0;
    const totalAmount = preorder?.totalAmount ?? subtotal + taxAmount + tipAmount;

    let footerNote: string | undefined;
    if (!preorder && items.length === 0) {
      footerNote = 'Table reservation — add a preorder from your booking to see itemized charges.';
    }

    return {
      kind: 'booking',
      restaurantName: r.restaurantName,
      dateTimeIso: r.reservedAt,
      statusLabel: receiptStatusReservation(r.status),
      partySize: r.partySize,
      referenceId: r.confirmationCode,
      guestName: r.guestName,
      guestEmail: RECEIPT_GUEST.email,
      items,
      subtotal,
      taxAmount,
      tipAmount,
      totalAmount,
      currency: 'CAD',
      footerNote,
    };
  }

  const o = mockOrders.find((x) => x.id === id);
  if (!o) return null;

  const res = o.reservationId ? mockReservations.find((r) => r.id === o.reservationId) : undefined;
  const partySize = res?.partySize ?? 2;

  return {
    kind: 'order',
    restaurantName: o.restaurantName,
    dateTimeIso: o.createdAt,
    statusLabel: receiptStatusOrder(o.status),
    partySize,
    referenceId: o.id.toUpperCase(),
    guestName: res?.guestName ?? RECEIPT_GUEST.name,
    guestEmail: RECEIPT_GUEST.email,
    items: o.items.map(mapOrderItem),
    subtotal: o.subtotal,
    taxAmount: o.taxAmount,
    tipAmount: o.tipAmount,
    totalAmount: o.totalAmount,
    currency: 'CAD',
  };
}
