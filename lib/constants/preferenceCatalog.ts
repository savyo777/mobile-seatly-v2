// Catalog of suggestion chips used by the customer profile preferences UI.
// Keep these centralized so adding/removing a chip happens in one place.
// Long-term, these would come from a `preference_options` admin table; for
// now they're code-managed.

export const SUGGESTED_CUISINES = [
  'Italian',
  'Japanese',
  'Mexican',
  'Korean',
  'Thai',
  'French',
  'Indian',
  'Mediterranean',
  'Vietnamese',
  'Chinese',
  'Ethiopian',
  'BBQ',
  'Seafood',
  'Steakhouse',
  'Brunch',
] as const;

export const SUGGESTED_DIETARY = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Halal',
  'Kosher',
  'Dairy-free',
  'Nut-free',
  'Shellfish-free',
  'Low sodium',
  'Low carb',
  'Pescatarian',
  'No alcohol',
  'Kid-friendly menu',
] as const;

export const SUGGESTED_VIBES = [
  'Date night',
  'Business dinner',
  'Birthday',
  'Group dinner',
  'Counter / bar',
  'Quiet table',
  'Patio',
  'Rooftop',
  'Live music',
  "Chef's tasting",
  'Solo dining',
  'Late night',
  'Casual',
  'Romantic',
  'Celebration',
] as const;
