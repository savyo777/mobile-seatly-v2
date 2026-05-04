import {
  friendlyPhoneAuthError,
  normalizePhoneToE164,
  sendPhoneOtp,
  shouldAttemptProfilePhoneLink,
} from '@/lib/services/phoneAuth';
import { getSupabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

function makeSupabaseMock(options: {
  otpResults: Array<{ error: { message: string } | null }>;
  prepareResult?: {
    data?: { linked?: boolean; error?: string; code?: string } | null;
    error?: { message: string; context?: unknown } | null;
    response?: { json: () => Promise<unknown> } | null;
  };
}) {
  const signInWithOtp = jest.fn(async () => options.otpResults.shift() ?? { error: null });
  const prepareData = Object.prototype.hasOwnProperty.call(options.prepareResult ?? {}, 'data')
    ? options.prepareResult?.data
    : { linked: true };
  const invoke = jest.fn(async () => ({
    data: prepareData,
    error: options.prepareResult?.error ?? null,
    response: options.prepareResult?.response ?? undefined,
  }));

  mockedGetSupabase.mockReturnValue({
    auth: { signInWithOtp },
    functions: { invoke },
  } as unknown as ReturnType<typeof getSupabase>);

  return { signInWithOtp, invoke };
}

describe('phone auth helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes US phone numbers to E.164', () => {
    expect(normalizePhoneToE164('(416) 555-1212')).toBe('+14165551212');
    expect(normalizePhoneToE164('+44 20 7123 4567')).toBe('+442071234567');
    expect(normalizePhoneToE164('12345')).toBeNull();
  });

  it('recognizes missing-account SMS errors', () => {
    expect(shouldAttemptProfilePhoneLink('Signups not allowed for otp')).toBe(true);
    expect(shouldAttemptProfilePhoneLink('User not found')).toBe(true);
    expect(shouldAttemptProfilePhoneLink('SMS rate limit exceeded')).toBe(false);
    expect(friendlyPhoneAuthError('User not found')).toContain('No account is linked');
  });

  it('sends SMS immediately when auth phone is already linked', async () => {
    const { signInWithOtp, invoke } = makeSupabaseMock({
      otpResults: [{ error: null }],
    });

    await expect(sendPhoneOtp('+14165551212')).resolves.toEqual({ error: null });
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('prepares profile-linked phones and retries SMS login', async () => {
    const { signInWithOtp, invoke } = makeSupabaseMock({
      otpResults: [
        { error: { message: 'Signups not allowed for otp' } },
        { error: null },
      ],
      prepareResult: { data: { linked: true }, error: null },
    });

    await expect(sendPhoneOtp('+14165551212')).resolves.toEqual({ error: null });
    expect(invoke).toHaveBeenCalledWith('prepare-phone-login', {
      body: { phone: '+14165551212' },
    });
    expect(signInWithOtp).toHaveBeenCalledTimes(2);
  });

  it('keeps unlinked phone numbers on the create-account path', async () => {
    makeSupabaseMock({
      otpResults: [{ error: { message: 'Signups not allowed for otp' } }],
      prepareResult: {
        data: { linked: false, code: 'phone_not_linked', error: 'No account is linked.' },
        error: null,
      },
    });

    await expect(sendPhoneOtp('+14165551212')).resolves.toEqual({
      error: 'No account is linked to this phone number. Sign in with email or Google, then add your phone in Security.',
    });
  });

  it('does not surface raw non-2xx Edge Function errors', async () => {
    makeSupabaseMock({
      otpResults: [{ error: { message: 'Signups not allowed for otp' } }],
      prepareResult: {
        data: null,
        error: { message: 'Edge Function returned a non-2xx status code' },
        response: {
          json: async () => ({ error: 'not found' }),
        },
      },
    });

    await expect(sendPhoneOtp('+14165551212')).resolves.toEqual({
      error: 'SMS login setup is not available yet. Please try again shortly or sign in with email.',
    });
  });
});
