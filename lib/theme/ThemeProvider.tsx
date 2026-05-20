import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { key } from '@/lib/storage/keys';
import { darkColors, lightColors, type Palette } from './palettes';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  effective: 'light' | 'dark';
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = key('theme');

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  effective: 'dark',
  colors: darkColors,
  setMode: () => {},
});

function resolveEffective(mode: ThemeMode, system: ColorSchemeName): 'light' | 'dark' {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return system === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Cenaiva ships dark-first. Until the user explicitly picks light or
  // system in staff Settings / customer Profile (which persists via
  // AsyncStorage), the app renders dark regardless of OS color scheme.
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() ?? 'dark',
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  const effective = resolveEffective(mode, systemScheme);
  const colors = effective === 'light' ? lightColors : darkColors;

  // Push our app-chosen scheme down to the native layer so iOS native
  // controls (Stripe PaymentSheet, DateTimePicker, native modals, action
  // sheets) honor it. Without this, app.json's `userInterfaceStyle` (or
  // the device-level setting when set to "automatic") wins and the user
  // sees a dark Stripe sheet over a light app — or vice versa.
  //
  // When the user picks 'system' we pass `null` to clear our override and
  // let the OS color scheme through. RN's `Appearance.setColorScheme` is
  // a no-op on web/older platforms; wrap in try/catch defensively.
  useEffect(() => {
    try {
      if (mode === 'system') {
        Appearance.setColorScheme('unspecified');
      } else {
        Appearance.setColorScheme(effective);
      }
    } catch {
      // Ignore — older RN versions or unsupported platforms.
    }
  }, [mode, effective]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, effective, colors, setMode }),
    [mode, effective, colors, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
