/**
 * OstadiPlus — mobile design tokens.
 *
 * Rebuilt to match the reference design system (white surfaces + hairline
 * borders, the mulberry/apricot identity, uppercase letter-spaced eyebrows, generous
 * corner radii and very soft shadows). The brand palette is also mirrored into
 * `packages/shared/src/tokens.ts` and the teacher dashboard.
 *
 * Typography switches family by language: Arabic regular → Noto Sans Arabic,
 * French bold → Bricolage Grotesque; other weights retain their existing fonts. Both are loaded in `App.tsx`.
 */

import { StyleSheet } from 'react-native';
import { palette, type Lang } from '@ostadiplus/shared';

export const colors = {
  ...palette,
  line: palette.border,
  lineStrong: palette.borderStrong,
  scrim: 'rgba(41,30,43,0.38)',
  glass: 'rgba(255,255,255,0.92)',
  glassSoft: 'rgba(255,255,255,0.22)',
  black: '#000000',
  white: palette.surface,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  sheet: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Font family names loaded in App.tsx. */
export const fonts = {
  regular: 'NotoSansArabic_Brand',
  medium: 'IBMPlexArabic_500Medium',
  semibold: 'IBMPlexArabic_600SemiBold',
  bold: 'IBMPlexArabic_700Bold',
} as const;

/** Latin family used for the French (LTR) UI. */
export const fontsLatin = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'BricolageGrotesque_Bold',
} as const;

export type FontWeight = keyof typeof fonts;

/** Picks the right font family for the active language. */
export function familyFor(lang: Lang, weight: FontWeight = 'regular'): string {
  return lang === 'fr' ? fontsLatin[weight] : fonts[weight];
}

/** Reference type scale. */
export const type = {
  eyebrow: 11,
  micro: 11.5,
  meta: 12.5,
  body: 14.5,
  title: 16,
  h3: 17,
  h2: 20,
  h1: 24,
  display: 28,
  stat: 30,
} as const;

export const tracking = {
  eyebrow: 0.9,
} as const;

export const shadow = {
  /** Reference cards are border-first, shadow-second. */
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  overlay: {
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
} as const;

/**
 * The prototype is laid out explicitly right-to-left (no `I18nManager`
 * restart gymnastics): rows run right → left, text is right aligned.
 * Screens that support French use `useLayout(lang)` instead of these.
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
