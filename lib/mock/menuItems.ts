export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  photoUrl: string;
  allergens: string[];
  dietaryFlags: string[];
  isAvailable: boolean;
  isPreorderable: boolean;
  isFeatured: boolean;
  preparationTimeMinutes: number;
  calories?: number;
}

export const mockMenuItems: MenuItem[] = [
  // Nova Ristorante
  { id: 'm1', restaurantId: 'r1', name: 'Bruschetta al Pomodoro', description: 'Toasted ciabatta with fresh tomatoes, basil, and extra virgin olive oil', price: 14.99, category: 'Appetizers', photoUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400', allergens: ['gluten'], dietaryFlags: ['vegetarian'], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 10, calories: 280 },
  { id: 'm2', restaurantId: 'r1', name: 'Burrata e Prosciutto', description: 'Creamy burrata with aged prosciutto di Parma and arugula', price: 22.99, category: 'Appetizers', photoUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=400', allergens: ['dairy'], dietaryFlags: [], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 8, calories: 420 },
  { id: 'm3', restaurantId: 'r1', name: 'Tagliatelle al Ragù', description: 'Fresh handmade tagliatelle with slow-cooked Bolognese sauce', price: 26.99, category: 'Mains', photoUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', allergens: ['gluten', 'eggs', 'dairy'], dietaryFlags: [], isAvailable: true, isPreorderable: true, isFeatured: false, preparationTimeMinutes: 20, calories: 680 },
  { id: 'm4', restaurantId: 'r1', name: 'Risotto ai Funghi Porcini', description: 'Arborio rice with wild porcini mushrooms and parmesan', price: 28.99, category: 'Mains', photoUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400', allergens: ['dairy'], dietaryFlags: ['vegetarian', 'gluten-free'], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 25, calories: 580 },
  { id: 'm5', restaurantId: 'r1', name: 'Branzino alla Griglia', description: 'Grilled Mediterranean sea bass with lemon, capers, and roasted vegetables', price: 38.99, category: 'Mains', photoUrl: 'https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?w=400', allergens: ['fish'], dietaryFlags: ['gluten-free'], isAvailable: true, isPreorderable: true, isFeatured: false, preparationTimeMinutes: 22, calories: 450 },
  { id: 'm6', restaurantId: 'r1', name: 'Tiramisu Classico', description: 'Traditional tiramisu with mascarpone, espresso, and cocoa', price: 14.99, category: 'Desserts', photoUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', allergens: ['dairy', 'eggs', 'gluten'], dietaryFlags: ['vegetarian'], isAvailable: true, isPreorderable: false, isFeatured: true, preparationTimeMinutes: 5, calories: 450 },
  { id: 'm7', restaurantId: 'r1', name: 'Panna Cotta', description: 'Vanilla bean panna cotta with mixed berry compote', price: 12.99, category: 'Desserts', photoUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', allergens: ['dairy'], dietaryFlags: ['vegetarian', 'gluten-free'], isAvailable: true, isPreorderable: false, isFeatured: false, preparationTimeMinutes: 5, calories: 380 },
  { id: 'm8', restaurantId: 'r1', name: 'Negroni', description: 'Classic Negroni with Campari, gin, and sweet vermouth', price: 16.99, category: 'Drinks', photoUrl: 'https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=400', allergens: [], dietaryFlags: ['vegan', 'gluten-free'], isAvailable: true, isPreorderable: false, isFeatured: false, preparationTimeMinutes: 3, calories: 180 },
  // Sakura Sushi
  { id: 'm9', restaurantId: 'r2', name: 'Edamame', description: 'Steamed soybean pods with sea salt', price: 8.99, category: 'Appetizers', photoUrl: 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?w=400', allergens: ['soy'], dietaryFlags: ['vegan', 'gluten-free'], isAvailable: true, isPreorderable: true, isFeatured: false, preparationTimeMinutes: 5, calories: 120 },
  { id: 'm10', restaurantId: 'r2', name: 'Salmon Sashimi', description: '8 pieces of premium Atlantic salmon sashimi', price: 24.99, category: 'Sashimi', photoUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400', allergens: ['fish'], dietaryFlags: ['gluten-free'], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 8, calories: 280 },
  { id: 'm11', restaurantId: 'r2', name: 'Dragon Roll', description: 'Shrimp tempura, avocado, eel, and tobiko', price: 22.99, category: 'Rolls', photoUrl: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400', allergens: ['shellfish', 'gluten', 'soy'], dietaryFlags: [], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 12, calories: 420 },
  { id: 'm12', restaurantId: 'r2', name: 'Wagyu Nigiri', description: 'A5 Wagyu beef nigiri with truffle salt', price: 32.99, category: 'Nigiri', photoUrl: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400', allergens: [], dietaryFlags: ['gluten-free'], isAvailable: true, isPreorderable: false, isFeatured: true, preparationTimeMinutes: 5, calories: 180 },
  { id: 'm13', restaurantId: 'r2', name: 'Matcha Cheesecake', description: 'Japanese-style matcha cheesecake with yuzu cream', price: 14.99, category: 'Desserts', photoUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', allergens: ['dairy', 'eggs', 'gluten'], dietaryFlags: ['vegetarian'], isAvailable: true, isPreorderable: false, isFeatured: false, preparationTimeMinutes: 5, calories: 380 },
  // Le Petit Bistro
  { id: 'm14', restaurantId: 'r3', name: 'French Onion Soup', description: 'Classic French onion soup gratinée with Gruyère', price: 16.99, category: 'Appetizers', photoUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', allergens: ['dairy', 'gluten'], dietaryFlags: ['vegetarian'], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 10, calories: 350 },
  { id: 'm15', restaurantId: 'r3', name: 'Steak Frites', description: 'Grilled 10oz AAA striploin with hand-cut fries and béarnaise', price: 42.99, category: 'Mains', photoUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400', allergens: ['dairy', 'eggs'], dietaryFlags: ['gluten-free'], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 25, calories: 850 },
  { id: 'm16', restaurantId: 'r3', name: 'Crème Brûlée', description: 'Classic vanilla bean crème brûlée', price: 13.99, category: 'Desserts', photoUrl: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400', allergens: ['dairy', 'eggs'], dietaryFlags: ['vegetarian', 'gluten-free'], isAvailable: true, isPreorderable: false, isFeatured: true, preparationTimeMinutes: 5, calories: 420 },
  // The Smoky Grill
  { id: 'm17', restaurantId: 'r4', name: 'Smoked Brisket Platter', description: '12-hour smoked AAA brisket with two sides', price: 29.99, category: 'Mains', photoUrl: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400', allergens: [], dietaryFlags: ['gluten-free'], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 15, calories: 920 },
  { id: 'm18', restaurantId: 'r4', name: 'Pulled Pork Sandwich', description: 'House-smoked pulled pork with coleslaw on a brioche bun', price: 18.99, category: 'Mains', photoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400', allergens: ['gluten'], dietaryFlags: [], isAvailable: true, isPreorderable: true, isFeatured: false, preparationTimeMinutes: 10, calories: 750 },
  // Café Soleil
  { id: 'm19', restaurantId: 'r5', name: 'Avocado Toast', description: 'Smashed avocado on sourdough with poached eggs and chili flakes', price: 16.99, category: 'Brunch', photoUrl: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400', allergens: ['gluten', 'eggs'], dietaryFlags: ['vegetarian'], isAvailable: true, isPreorderable: true, isFeatured: true, preparationTimeMinutes: 12, calories: 450 },
  { id: 'm20', restaurantId: 'r5', name: 'Oat Milk Latte', description: 'Double shot espresso with steamed oat milk', price: 6.99, category: 'Drinks', photoUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', allergens: [], dietaryFlags: ['vegan'], isAvailable: true, isPreorderable: false, isFeatured: true, preparationTimeMinutes: 3, calories: 120 },
];

export const menuCategories = ['Appetizers', 'Sashimi', 'Nigiri', 'Rolls', 'Mains', 'Brunch', 'Desserts', 'Drinks'];
