export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  modifications?: string;
  status: 'ordered' | 'preparing' | 'ready' | 'served';
  course: 'starter' | 'main' | 'dessert' | 'drink';
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  reservationId?: string;
  isPreorder: boolean;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  tableNumber?: string;
}

export const mockOrders: Order[] = [
  {
    id: 'ord1',
    restaurantId: 'r1',
    restaurantName: 'Nova Ristorante',
    reservationId: 'res4',
    isPreorder: false,
    status: 'served',
    subtotal: 142.94,
    taxAmount: 18.58,
    tipAmount: 24.00,
    totalAmount: 185.52,
    items: [
      { id: 'oi1', menuItemId: 'm1', name: 'Bruschetta al Pomodoro', quantity: 2, unitPrice: 14.99, lineTotal: 29.98, status: 'served', course: 'starter' },
      { id: 'oi2', menuItemId: 'm2', name: 'Burrata e Prosciutto', quantity: 1, unitPrice: 22.99, lineTotal: 22.99, status: 'served', course: 'starter' },
      { id: 'oi3', menuItemId: 'm4', name: 'Risotto ai Funghi Porcini', quantity: 2, unitPrice: 28.99, lineTotal: 57.98, status: 'served', course: 'main' },
      { id: 'oi4', menuItemId: 'm6', name: 'Tiramisu Classico', quantity: 2, unitPrice: 14.99, lineTotal: 29.98, status: 'served', course: 'dessert' },
      { id: 'oi5', menuItemId: 'm8', name: 'Negroni', quantity: 1, unitPrice: 16.99, lineTotal: 16.99, modifications: 'Extra Campari', status: 'served', course: 'drink' },
    ],
    createdAt: '2026-03-08T19:45:00-04:00',
    tableNumber: 'T1',
  },
  {
    id: 'ord2',
    restaurantId: 'r2',
    restaurantName: 'Sakura Sushi',
    reservationId: 'res2',
    isPreorder: true,
    status: 'pending',
    subtotal: 80.96,
    taxAmount: 10.52,
    tipAmount: 0,
    totalAmount: 91.48,
    items: [
      { id: 'oi6', menuItemId: 'm9', name: 'Edamame', quantity: 1, unitPrice: 8.99, lineTotal: 8.99, status: 'ordered', course: 'starter' },
      { id: 'oi7', menuItemId: 'm10', name: 'Salmon Sashimi', quantity: 2, unitPrice: 24.99, lineTotal: 49.98, status: 'ordered', course: 'main' },
      { id: 'oi8', menuItemId: 'm11', name: 'Dragon Roll', quantity: 1, unitPrice: 22.99, lineTotal: 22.99, status: 'ordered', course: 'main' },
    ],
    createdAt: '2026-03-25T12:00:00-04:00',
  },
  {
    id: 'ord3',
    restaurantId: 'r3',
    restaurantName: 'Le Petit Bistro',
    reservationId: 'res3',
    isPreorder: false,
    status: 'served',
    subtotal: 73.97,
    taxAmount: 9.62,
    tipAmount: 14.00,
    totalAmount: 97.59,
    items: [
      { id: 'oi9', menuItemId: 'm14', name: 'French Onion Soup', quantity: 1, unitPrice: 16.99, lineTotal: 16.99, status: 'served', course: 'starter' },
      { id: 'oi10', menuItemId: 'm15', name: 'Steak Frites', quantity: 1, unitPrice: 42.99, lineTotal: 42.99, modifications: 'Medium-rare', status: 'served', course: 'main' },
      { id: 'oi11', menuItemId: 'm16', name: 'Crème Brûlée', quantity: 1, unitPrice: 13.99, lineTotal: 13.99, status: 'served', course: 'dessert' },
    ],
    createdAt: '2026-03-15T20:15:00-04:00',
    tableNumber: 'T7',
  },
  // Staff-visible KDS orders
  {
    id: 'ord4',
    restaurantId: 'r1',
    restaurantName: 'Nova Ristorante',
    reservationId: 'res8',
    isPreorder: false,
    status: 'preparing',
    subtotal: 95.96,
    taxAmount: 12.47,
    tipAmount: 0,
    totalAmount: 108.43,
    items: [
      { id: 'oi12', menuItemId: 'm1', name: 'Bruschetta al Pomodoro', quantity: 2, unitPrice: 14.99, lineTotal: 29.98, status: 'ready', course: 'starter' },
      { id: 'oi13', menuItemId: 'm3', name: 'Tagliatelle al Ragù', quantity: 1, unitPrice: 26.99, lineTotal: 26.99, status: 'preparing', course: 'main' },
      { id: 'oi14', menuItemId: 'm5', name: 'Branzino alla Griglia', quantity: 1, unitPrice: 38.99, lineTotal: 38.99, status: 'preparing', course: 'main' },
    ],
    createdAt: '2026-03-25T19:45:00-04:00',
    tableNumber: 'T5',
  },
  {
    id: 'ord5',
    restaurantId: 'r1',
    restaurantName: 'Nova Ristorante',
    reservationId: 'res6',
    isPreorder: false,
    status: 'confirmed',
    subtotal: 51.98,
    taxAmount: 6.76,
    tipAmount: 0,
    totalAmount: 58.74,
    items: [
      { id: 'oi15', menuItemId: 'm2', name: 'Burrata e Prosciutto', quantity: 1, unitPrice: 22.99, lineTotal: 22.99, status: 'ordered', course: 'starter' },
      { id: 'oi16', menuItemId: 'm4', name: 'Risotto ai Funghi Porcini', quantity: 1, unitPrice: 28.99, lineTotal: 28.99, status: 'ordered', course: 'main' },
    ],
    createdAt: '2026-03-25T18:10:00-04:00',
    tableNumber: 'T2',
  },
];
