export type CenaivaVoicePermissionStatus =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export type CenaivaPermissionResult = {
  granted?: boolean;
  status?: string;
  canAskAgain?: boolean;
  restricted?: boolean;
};

export type CenaivaVoicePermissionState = {
  status: CenaivaVoicePermissionStatus;
  canAskAgain: boolean;
};

export const UNKNOWN_VOICE_PERMISSION: CenaivaVoicePermissionState = {
  status: 'unknown',
  canAskAgain: true,
};

export const GRANTED_VOICE_PERMISSION: CenaivaVoicePermissionState = {
  status: 'granted',
  canAskAgain: false,
};

export function permissionGranted(value: CenaivaPermissionResult | null | undefined): boolean {
  return value?.granted === true || value?.status === 'granted';
}

function permissionBlocked(value: CenaivaPermissionResult): boolean {
  return value.restricted === true || (value.status === 'denied' && value.canAskAgain === false);
}

function permissionDenied(value: CenaivaPermissionResult): boolean {
  return value.status === 'denied' || value.granted === false;
}

function resolveSingleGroup(results: CenaivaPermissionResult[]): CenaivaVoicePermissionState {
  if (!results.length) return UNKNOWN_VOICE_PERMISSION;
  if (results.some(permissionGranted)) return GRANTED_VOICE_PERMISSION;
  if (results.some(permissionBlocked)) return { status: 'blocked', canAskAgain: false };
  if (results.some(permissionDenied)) {
    return {
      status: 'denied',
      canAskAgain: results.some((result) => result.canAskAgain !== false),
    };
  }
  return UNKNOWN_VOICE_PERMISSION;
}

export function resolveWakePermissionState(input: {
  microphone: Array<CenaivaPermissionResult | null | undefined>;
  speechRecognizer?: CenaivaPermissionResult | null;
  recognitionAvailable?: boolean;
}): CenaivaVoicePermissionState {
  if (input.recognitionAvailable === false) {
    return { status: 'unavailable', canAskAgain: false };
  }

  const microphone = resolveSingleGroup(
    input.microphone.filter((result): result is CenaivaPermissionResult => Boolean(result)),
  );
  const recognizer = input.speechRecognizer
    ? resolveSingleGroup([input.speechRecognizer])
    : GRANTED_VOICE_PERMISSION;

  if (microphone.status === 'granted' && recognizer.status === 'granted') {
    return GRANTED_VOICE_PERMISSION;
  }

  if (microphone.status === 'unavailable' || recognizer.status === 'unavailable') {
    return { status: 'unavailable', canAskAgain: false };
  }

  if (microphone.status === 'blocked' || recognizer.status === 'blocked') {
    return { status: 'blocked', canAskAgain: false };
  }

  if (microphone.status === 'denied' || recognizer.status === 'denied') {
    return {
      status: 'denied',
      canAskAgain: microphone.canAskAgain || recognizer.canAskAgain,
    };
  }

  return UNKNOWN_VOICE_PERMISSION;
}
