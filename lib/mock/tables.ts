export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  label: string;
  capacity: number;
  minParty: number;
  section: string;
  positionX: number;
  positionY: number;
  shape: 'rectangle' | 'circle' | 'square';
  status: 'empty' | 'reserved' | 'occupied' | 'cleaning' | 'blocked';
  currentGuestName?: string;
  currentPartySize?: number;
}

export const mockTables: Table[] = [
  { id: 't1', restaurantId: 'r1', tableNumber: 'T1', label: 'Window 1', capacity: 4, minParty: 2, section: 'Main Floor', positionX: 50, positionY: 50, shape: 'rectangle', status: 'empty' },
  { id: 't2', restaurantId: 'r1', tableNumber: 'T2', label: 'Window 2', capacity: 2, minParty: 1, section: 'Main Floor', positionX: 50, positionY: 150, shape: 'square', status: 'occupied', currentGuestName: 'Sarah Chen', currentPartySize: 2 },
  { id: 't3', restaurantId: 'r1', tableNumber: 'T3', label: 'Center 1', capacity: 4, minParty: 2, section: 'Main Floor', positionX: 180, positionY: 50, shape: 'rectangle', status: 'reserved', currentGuestName: 'Alex Johnson', currentPartySize: 2 },
  { id: 't4', restaurantId: 'r1', tableNumber: 'T4', label: 'Center 2', capacity: 4, minParty: 2, section: 'Main Floor', positionX: 180, positionY: 150, shape: 'rectangle', status: 'empty' },
  { id: 't5', restaurantId: 'r1', tableNumber: 'T5', label: 'Booth 1', capacity: 6, minParty: 4, section: 'Main Floor', positionX: 310, positionY: 50, shape: 'rectangle', status: 'occupied', currentGuestName: 'Emma Dubois', currentPartySize: 6 },
  { id: 't6', restaurantId: 'r1', tableNumber: 'T6', label: 'Booth 2', capacity: 6, minParty: 4, section: 'Main Floor', positionX: 310, positionY: 150, shape: 'rectangle', status: 'cleaning' },
  { id: 't7', restaurantId: 'r1', tableNumber: 'T7', label: 'Patio 1', capacity: 4, minParty: 2, section: 'Patio', positionX: 50, positionY: 280, shape: 'circle', status: 'empty' },
  { id: 't8', restaurantId: 'r1', tableNumber: 'T8', label: 'Patio 2', capacity: 4, minParty: 2, section: 'Patio', positionX: 180, positionY: 280, shape: 'circle', status: 'reserved' },
  { id: 't9', restaurantId: 'r1', tableNumber: 'T9', label: 'Bar 1', capacity: 2, minParty: 1, section: 'Bar', positionX: 310, positionY: 280, shape: 'square', status: 'occupied', currentGuestName: 'Walk-in', currentPartySize: 1 },
  { id: 't10', restaurantId: 'r1', tableNumber: 'T10', label: 'Private', capacity: 10, minParty: 6, section: 'Private Room', positionX: 180, positionY: 380, shape: 'rectangle', status: 'blocked' },
];
