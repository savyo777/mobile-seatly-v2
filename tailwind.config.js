// Tailwind theme extensions for NativeWind. Note: at the time of writing
// this app uses zero `className=""` props — every component styles via
// StyleSheet.create() with the runtime palette from lib/theme. This config
// exists for any future Tailwind usage, with values mirrored from the
// canonical design tokens at lib/theme/tokens.ts.
//
// If you change brand gold, spacing, or radius here you MUST also update
// lib/theme/tokens.ts to match. Tailwind doesn't support importing TS at
// config-load time without ts-node, hence the manual mirror.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Mirrors brandGold + darkPalette in lib/theme/tokens.ts.
        gold: {
          DEFAULT: '#C9A24A',
          light: '#DDD5C4',
          dark: '#A38630',
        },
        'bg-base': '#000000',
        'bg-surface': '#0F0F0F',
        'bg-elevated': '#161616',
        'cenaiva-border': 'rgba(255,255,255,0.06)',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1AA',
        'text-muted': '#71717A',
        success: '#22C55E',
        warning: '#D4A574',
        danger: '#EF4444',
        info: '#71717A',
      },
      borderRadius: {
        // Mirrors borderRadius in lib/theme/tokens.ts.
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '18px',
      },
      spacing: {
        '4.5': '18px',
      },
    },
  },
  plugins: [],
};
