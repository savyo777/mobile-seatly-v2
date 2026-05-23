import { deleteAccount } from '@/lib/services/accountSecurity';
import { clearSupabaseStorageOnly, getSupabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  clearSupabaseStorageOnly: jest.fn(),
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockedClearStorage =
  clearSupabaseStorageOnly as jest.MockedFunction<typeof clearSupabaseStorageOnly>;

function makeSupabaseMock(options: {
  invokeResult: {
    data?: { deleted?: boolean; error?: string; code?: string } | null;
    error?: { message?: string; context?: unknown } | null;
    response?: { json: () => Promise<unknown> } | null;
  };
  signOutImpl?: () => Promise<unknown>;
}) {
  const invoke = jest.fn(async () => options.invokeResult);
  const signOut = jest.fn(options.signOutImpl ?? (async () => ({ error: null })));

  mockedGetSupabase.mockReturnValue({
    functions: { invoke },
    auth: { signOut },
  } as unknown as ReturnType<typeof getSupabase>);

  return { invoke, signOut };
}

describe('account security helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClearStorage.mockResolvedValue(undefined);
  });

  it('deletes the current account, signs out, and clears persisted auth state', async () => {
    const { invoke, signOut } = makeSupabaseMock({
      invokeResult: { data: { deleted: true }, error: null },
    });

    await expect(deleteAccount()).resolves.toBeUndefined();

    expect(invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockedClearStorage).toHaveBeenCalledTimes(1);
  });

  it('clears persisted auth state even when sign out fails after deletion', async () => {
    const { signOut } = makeSupabaseMock({
      invokeResult: { data: { deleted: true }, error: null },
      signOutImpl: async () => {
        throw new Error('session is already gone');
      },
    });

    await expect(deleteAccount()).resolves.toBeUndefined();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockedClearStorage).toHaveBeenCalledTimes(1);
  });

  it('surfaces function error response bodies when deletion fails', async () => {
    const { signOut } = makeSupabaseMock({
      invokeResult: {
        data: null,
        error: { message: 'Edge Function returned a non-2xx status code' },
        response: {
          json: async () => ({ error: 'Account could not be deleted.', code: 'delete_failed' }),
        },
      },
    });

    await expect(deleteAccount()).rejects.toThrow('Account could not be deleted.');
    expect(signOut).not.toHaveBeenCalled();
    expect(mockedClearStorage).not.toHaveBeenCalled();
  });

  it('does not show raw non-2xx Edge Function errors', async () => {
    makeSupabaseMock({
      invokeResult: {
        data: null,
        error: { message: 'Edge Function returned a non-2xx status code' },
      },
    });

    await expect(deleteAccount()).rejects.toThrow(
      'Account deletion is not available yet. Please try again shortly.',
    );
  });
});
