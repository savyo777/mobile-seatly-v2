export type Palette = {
  gold: string;
  goldLight: string;
  goldDark: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  tableEmpty: string;
  tableReserved: string;
  tableOccupied: string;
  tableCleaning: string;
  tableBlocked: string;
};

export const darkColors: Palette = {
  gold: '#C9A24A',
  goldLight: '#DDD5C4',
  goldDark: '#A38630',

  bgBase: '#000000',
  bgSurface: '#0F0F0F',
  bgElevated: '#161616',
  border: 'rgba(255,255,255,0.06)',

  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  success: '#22C55E',
  warning: '#D4A574',
  danger: '#EF4444',
  info: '#71717A',

  tableEmpty: '#22C55E',
  tableReserved: '#C9A24A',
  tableOccupied: '#EF4444',
  tableCleaning: '#71717A',
  tableBlocked: '#52525C',
};

export const lightColors: Palette = {
  gold: '#A8832A',
  goldLight: '#7A5E1A',
  goldDark: '#7A5E1A',

  bgBase: '#F8F7F4',
  bgSurface: '#FFFFFF',
  bgElevated: '#F0EDE8',
  border: 'rgba(0,0,0,0.08)',

  textPrimary: '#0F0E0C',
  textSecondary: '#4A4740',
  textMuted: '#8A8480',

  success: '#16A34A',
  warning: '#92540A',
  danger: '#DC2626',
  info: '#6B7280',

  tableEmpty: '#16A34A',
  tableReserved: '#A8832A',
  tableOccupied: '#DC2626',
  tableCleaning: '#6B7280',
  tableBlocked: '#9CA3AF',
};
