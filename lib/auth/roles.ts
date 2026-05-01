export type AppRoleExpectation = 'customer' | 'owner';

function toTokens(roleValue: string | null | undefined): string[] {
  if (!roleValue) return [];
  const normalized = roleValue.toLowerCase().trim();
  if (!normalized) return [];
  if (normalized === 'both' || normalized === 'diner_and_owner') return ['customer', 'owner'];
  return normalized
    .replace(/diner/g, 'customer')
    .split(/[,\s|/_-]+/)
    .filter(Boolean);
}

export function roleIncludes(roleValue: string | null | undefined, expected: AppRoleExpectation): boolean {
  const tokens = toTokens(roleValue);
  return tokens.includes(expected);
}

export function mergeRole(roleValue: string | null | undefined, nextRole: AppRoleExpectation): string {
  const current = new Set(toTokens(roleValue));
  current.add(nextRole);
  const hasCustomer = current.has('customer');
  const hasOwner = current.has('owner');
  if (hasCustomer && hasOwner) return 'diner_and_owner';
  if (hasOwner) return 'owner';
  return 'customer';
}

export function resolveIsStaffLike(roleValue: string | null | undefined): boolean {
  return roleIncludes(roleValue, 'owner');
}
