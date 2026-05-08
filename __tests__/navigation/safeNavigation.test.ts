import { Alert } from 'react-native';
import { safeBack, safePush, safeReplace } from '@/lib/navigation/safeNavigation';

describe('safe navigation helpers', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('pushes normally when navigation succeeds', () => {
    const router = {
      push: jest.fn(),
      replace: jest.fn(),
    };

    safePush(router, '/(customer)/discover');

    expect(router.push).toHaveBeenCalledWith('/(customer)/discover');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('recovers push failures with a fallback replace', () => {
    const router = {
      push: jest.fn(() => {
        throw new Error('bad route');
      }),
      replace: jest.fn(),
    };

    safePush(router, '/missing' as never, { fallback: '/(staff)/home', context: 'test' });

    expect(router.replace).toHaveBeenCalledWith('/(staff)/home');
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('recovers replace failures with a fallback replace attempt', () => {
    const router = {
      push: jest.fn(),
      replace: jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('bad replace');
        })
        .mockImplementationOnce(() => undefined),
    };

    safeReplace(router, '/missing' as never, { fallback: '/(customer)/discover' });

    expect(router.replace).toHaveBeenNthCalledWith(1, '/missing');
    expect(router.replace).toHaveBeenNthCalledWith(2, '/(customer)/discover');
  });

  it('falls back when back cannot go back', () => {
    const router = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
    };

    safeBack(router, { fallback: '/(auth)/welcome' });

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(auth)/welcome');
  });
});
