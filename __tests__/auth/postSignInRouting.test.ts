import { getRoleForSignedInUser, resolveHomeForSignedInUser } from '@/lib/auth/postSignInRouting';
import { getAppShellPreference } from '@/lib/navigation/appShellPreference';
import { getSupabase } from '@/lib/supabase/client';

jest.mock('@/lib/navigation/appShellPreference', () => ({
  getAppShellPreference: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(),
}));

const mockedGetAppShellPreference = getAppShellPreference as jest.MockedFunction<typeof getAppShellPreference>;
const mockedGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

function mockRoleLookup(role: string | null, error: unknown = null) {
  const maybeSingle = jest.fn(async () => ({
    data: role ? { role } : null,
    error,
  }));
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  mockedGetSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof getSupabase>);
  return { from, select, eq, maybeSingle };
}

describe('post sign-in routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAppShellPreference.mockResolvedValue('auto');
  });

  it('defaults missing profile and metadata role to customer', async () => {
    mockRoleLookup(null);

    await expect(getRoleForSignedInUser('user-1', { id: 'user-1' } as never)).resolves.toBe('customer');
  });

  it('uses profile role when it exists', async () => {
    mockRoleLookup('owner');

    await expect(getRoleForSignedInUser('user-1', { id: 'user-1' } as never)).resolves.toBe('owner');
  });

  it('routes customer by default when staff preference is unavailable', async () => {
    mockRoleLookup(null);
    mockedGetAppShellPreference.mockResolvedValue('staff');

    await expect(resolveHomeForSignedInUser('user-1', { id: 'user-1' } as never)).resolves.toEqual({
      href: '/(customer)',
      role: 'customer',
    });
  });
});
