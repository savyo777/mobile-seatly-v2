import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { DEFAULT_MAP_CENTER } from '@/lib/map/mapFilters';

export type LocationState = {
  lat: number;
  lng: number;
  locationReady: boolean;
  permissionDenied: boolean;
};

const FALLBACK: LocationState = {
  lat: DEFAULT_MAP_CENTER.latitude,
  lng: DEFAULT_MAP_CENTER.longitude,
  locationReady: true,
  permissionDenied: false,
};

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    lat: DEFAULT_MAP_CENTER.latitude,
    lng: DEFAULT_MAP_CENTER.longitude,
    locationReady: false,
    permissionDenied: false,
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      setState(FALLBACK);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setState({ ...FALLBACK, permissionDenied: true });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          locationReady: true,
          permissionDenied: false,
        });
      } catch {
        if (!cancelled) setState(FALLBACK);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
