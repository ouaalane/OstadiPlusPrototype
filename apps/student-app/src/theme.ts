/**
 * OstadiPlus — mobile design tokens.
 *
 * Mirrors the dashboard (`apps/teacher-dashboard/src/styles/theme.css`) and
 * the source of truth in `packages/shared/src/tokens.ts`, so the two apps
 * read as one product.
 */

import { StyleSheet } from 'react-native';

export const colors = {
  brand: '#2F5BFF',
  brandDark: '#1E3FCC',
  brandSoft: '#E6ECFF',
  brandSofter: '#F1F4FF',

  canvas: '#F5F7FC',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2FA',

  ink: '#0E1B33',
  body: '#334066',
  muted: '#6C7A99',
  faint: '#9AA6BF',

  line: '#E3E8F4',
  lineStrong: '#CBD4E8',

  accent: '#FFB400',
  accentSoft: '#FFF3D1',

  success: '#12A66A',
  successSoft: '#DFF5EA',

  danger: '#E5484D',
  dangerSoft: '#FCE6E7',

  info: '#22B8F5',
  infoSoft: '#DFF2FC',

  black: '#000000',
  white: '#FFFFFF',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Font family names loaded in App.tsx. */
export const fonts = {
  regular: 'IBMPlexArabic_400Regular',
  medium: 'IBMPlexArabic_500Medium',
  semibold: 'IBMPlexArabic_600SemiBold',
  bold: 'IBMPlexArabic_700Bold',
} as const;

export const shadow = {
  card: {
    shadowColor: '#0E1B33',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  overlay: {
    shadowColor: '#0E1B33',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
} as const;

/**
 * The prototype is laid out explicitly right-to-left (no `I18nManager`
 * restart gymnastics): rows run right → left, text is right aligned.
 */
export const rtl = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  rowTop: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  rowBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { textAlign: 'right', writingDirection: 'rtl' },
});

export type ColorKey = keyof typeof colors;
