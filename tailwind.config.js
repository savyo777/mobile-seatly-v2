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
        gold: {
          DEFAULT: '#C9A84C',
          light: '#F5E6C8',
          dark: '#A8873A',
        },
        'bg-base': '#0A0A0A',
        'bg-surface': '#1A1A1A',
        'bg-elevated': '#242424',
        'seatly-border': '#2E2E2E',
        'text-primary': '#FFFFFF',
        'text-secondary': '#AAAAAA',
        'text-muted': '#666666',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
      },
      spacing: {
        '4.5': '18px',
      },
    },
  },
  plugins: [],
};
