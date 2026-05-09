// Canonical staff role list. Centralized so adding a new role propagates to
// every staff/team management screen.

export const STAFF_ROLES = [
  'Owner',
  'Manager',
  'Host',
  'Server',
  'Kitchen',
  'Bar',
  'Support',
] as const;

export type StaffRole = typeof STAFF_ROLES[number];
