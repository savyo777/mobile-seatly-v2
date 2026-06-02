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
    data?: {
      ok?: boolean;
      deleted?: boolean;
      error?: string;
      code?: string;
      cancelled_reservation_ids?: string[];
      refund_total_cents?: number;
    } | null;
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

const EMAIL = 'user@example.com';

describe('account security helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClearStorage.mockResolvedValue(undefined);
  });

  it('sends email_confirmation, returns the refund summary, signs out, and clears state', async () => {
    const { invoke, signOut } = makeSupabaseMock({
      invokeResult: {
        data: { ok: true, cancelled_reservation_ids: ['r1', 'r2'], refund_total_cents: 4500 },
        error: null,
      },
    });

    await expect(deleteAccount(EMAIL)).resolves.toEqual({
      cancelledReservationIds: ['r1', 'r2'],
      refundTotalCents: 4500,
    });

    expect(invoke).toHaveBeenCalledWith('delete-account', {
      method: 'POST',
      body: { email_confirmation: EMAIL },
    });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockedClearStorage).toHaveBeenCalledTimes(1);
  });

  it('tolerates the legacy { deleted: true } response shape', async () => {
    makeSupabaseMock({ invokeResult: { data: { deleted: true }, error: null } });

    await expect(deleteAccount(EMAIL)).resolves.toEqual({
      cancelledReservationIds: [],
      refundTotalCents: 0,
    });
  });

  it('clears persisted auth state even when sign out fails after deletion', async () => {
    const { signOut } = makeSupabaseMock({
      invokeResult: { data: { ok: true }, error: null },
      signOutImpl: async () => {
        throw new Error('session is already gone');
      },
    });

    await expect(deleteAccount(EMAIL)).resolves.toEqual({
      cancelledReservationIds: [],
      refundTotalCents: 0,
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockedClearStorage).toHaveBeenCalledTimes(1);
  });

  it('maps the email-mismatch error to a friendly message', async () => {
    const { signOut } = makeSupabaseMock({
      invokeResult: {
        data: null,
        error: { message: 'Edge Function returned a non-2xx status code' },
        response: { json: async () => ({ error: 'Email confirmation does not match.' }) },
      },
    });

    await expect(deleteAccount('wrong@example.com')).rejects.toThrow(
      'The email you entered doesn’t match the email on your account.',
    );
    expect(signOut).not.toHaveBeenCalled();
    expect(mockedClearStorage).not.toHaveBeenCalled();
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

    await expect(deleteAccount(EMAIL)).rejects.toThrow('Account could not be deleted.');
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

    await expect(deleteAccount(EMAIL)).rejects.toThrow(
      'Account deletion is not available yet. Please try again shortly.',
    );
  });
});
