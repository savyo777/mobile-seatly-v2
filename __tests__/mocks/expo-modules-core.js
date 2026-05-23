// Jest mock for expo-modules-core. Tests that import expo-* packages
// transitively load this; the real module instantiates an
// EventEmitter backed by NativeEventEmitter which doesn't exist in a
// Node test environment. Return the minimum surface our code path
// reads — most of it is only referenced when something is actually
// being subscribed to at runtime, so a no-op shim is sufficient for
// pure-logic tests.

class FakeEventEmitter {
  addListener() { return { remove() {} }; }
  removeListener() {}
  removeAllListeners() {}
  removeSubscription() {}
  emit() {}
}

class FakeNativeModule {
  addListener() { return { remove() {} }; }
  removeListeners() {}
}

const NativeModule = FakeNativeModule;
const EventEmitter = FakeEventEmitter;
const Platform = { OS: 'ios', select: (o) => o.ios ?? o.default ?? null };
const requireNativeModule = () => new FakeNativeModule();
const requireOptionalNativeModule = () => null;

module.exports = {
  NativeModule,
  EventEmitter,
  Platform,
  requireNativeModule,
  requireOptionalNativeModule,
  CodedError: class CodedError extends Error {},
  SyntheticPlatformEmitter: new FakeEventEmitter(),
  uuid: { v4: () => '00000000-0000-0000-0000-000000000000' },
};
