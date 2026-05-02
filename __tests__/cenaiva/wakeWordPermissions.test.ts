import { resolveWakePermissionState } from '@/lib/cenaiva/voice/voicePermission';

describe('resolveWakePermissionState', () => {
  it('grants wake word when microphone and speech recognition are granted', () => {
    expect(
      resolveWakePermissionState({
        microphone: [{ status: 'granted', granted: true }],
        speechRecognizer: { status: 'granted', granted: true },
      }),
    ).toEqual({ status: 'granted', canAskAgain: false });
  });

  it('keeps denied permission askable when the OS can still prompt', () => {
    expect(
      resolveWakePermissionState({
        microphone: [{ status: 'denied', granted: false, canAskAgain: true }],
        speechRecognizer: { status: 'granted', granted: true },
      }),
    ).toEqual({ status: 'denied', canAskAgain: true });
  });

  it('marks denied permission blocked when the OS cannot prompt again', () => {
    expect(
      resolveWakePermissionState({
        microphone: [{ status: 'denied', granted: false, canAskAgain: false }],
        speechRecognizer: { status: 'granted', granted: true },
      }),
    ).toEqual({ status: 'blocked', canAskAgain: false });
  });

  it('marks restricted speech recognition blocked', () => {
    expect(
      resolveWakePermissionState({
        microphone: [{ status: 'granted', granted: true }],
        speechRecognizer: { status: 'denied', granted: false, canAskAgain: false, restricted: true },
      }),
    ).toEqual({ status: 'blocked', canAskAgain: false });
  });

  it('marks unavailable recognizer as unavailable', () => {
    expect(
      resolveWakePermissionState({
        microphone: [{ status: 'granted', granted: true }],
        recognitionAvailable: false,
      }),
    ).toEqual({ status: 'unavailable', canAskAgain: false });
  });
});
