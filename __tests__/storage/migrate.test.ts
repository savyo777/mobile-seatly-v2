// Tests for the one-shot AsyncStorage migration that moves legacy
// `@seatly/...` and bare keys into the `@cenaiva/...` namespace.
//
// `lib/storage/migrate.ts` has a module-scope `migrationRan` guard, so each
// scenario uses `jest.isolateModules` to load a fresh copy of the module
// (and a fresh in-memory AsyncStorage mock) before invoking the migration.

type StorageMap = Map<string, string>;

interface MockStorage {
  store: StorageMap;
  getAllKeys: jest.Mock<Promise<string[]>, []>;
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  removeItem: jest.Mock<Promise<void>, [string]>;
}

function buildMockStorage(initial: Record<string, string> = {}): MockStorage {
  const store: StorageMap = new Map(Object.entries(initial));
  return {
    store,
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
    getItem: jest.fn(async (k: string) => (store.has(k) ? (store.get(k) as string) : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  };
}

async function runWithMock(
  mock: MockStorage,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    jest.isolateModules(() => {
      jest.doMock('@react-native-async-storage/async-storage', () => ({
        __esModule: true,
        default: mock,
      }));
      // Require inside the isolated registry so the fresh `migrationRan`
      // flag and the freshly-mocked AsyncStorage are picked up together.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@/lib/storage/migrate') as {
        runStorageMigrations: () => Promise<void>;
      };
      mod
        .runStorageMigrations()
        .then(resolve)
        .catch(reject);
    });
  });
}

describe('runStorageMigrations', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('copies a @seatly/<name> key to @cenaiva/<name> and removes the legacy entry', async () => {
    const mock = buildMockStorage({ '@seatly/foo': 'bar' });

    await runWithMock(mock);

    expect(mock.store.get('@cenaiva/foo')).toBe('bar');
    expect(mock.store.has('@seatly/foo')).toBe(false);
  });

  it('copies a bare legacy key to the @cenaiva/<name> namespace and removes the bare entry', async () => {
    const payload = JSON.stringify([{ id: 'promo-1', claimedAt: 1 }]);
    const mock = buildMockStorage({ 'claimed-promotions-v1': payload });

    await runWithMock(mock);

    expect(mock.store.get('@cenaiva/claimed-promotions-v1')).toBe(payload);
    expect(mock.store.has('claimed-promotions-v1')).toBe(false);
  });

  it('does not overwrite an existing @cenaiva/<name> value when the legacy key collides, and still drops the legacy entry', async () => {
    const mock = buildMockStorage({
      '@seatly/foo': 'legacy',
      '@cenaiva/foo': 'current',
    });

    await runWithMock(mock);

    expect(mock.store.get('@cenaiva/foo')).toBe('current');
    expect(mock.store.has('@seatly/foo')).toBe(false);
    expect(mock.setItem).not.toHaveBeenCalledWith('@cenaiva/foo', expect.anything());
  });

  it('is a no-op when there are no legacy keys', async () => {
    const mock = buildMockStorage({
      '@cenaiva/foo': 'already-namespaced',
      'unrelated-key': 'leave-me-alone',
    });

    await runWithMock(mock);

    expect(mock.store.get('@cenaiva/foo')).toBe('already-namespaced');
    expect(mock.store.get('unrelated-key')).toBe('leave-me-alone');
    expect(mock.setItem).not.toHaveBeenCalled();
    expect(mock.removeItem).not.toHaveBeenCalled();
  });

  it('swallows errors when AsyncStorage.getAllKeys rejects', async () => {
    const mock = buildMockStorage();
    mock.getAllKeys.mockRejectedValueOnce(new Error('boom'));

    await expect(runWithMock(mock)).resolves.toBeUndefined();
    expect(mock.setItem).not.toHaveBeenCalled();
    expect(mock.removeItem).not.toHaveBeenCalled();
  });
});
