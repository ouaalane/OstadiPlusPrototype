/**
 * Mobile presentation tokens. Layout, sizes, spacing and motion match bf823c7.
 * Only the five supplied brand colors and their opacity variants are used.
 * Complete Noto Sans Arabic / Bricolage Grotesque families are loaded in App.tsx.
 */

import { StyleSheet } from 'react-native';
import { colorWithOpacity, identityColors, palette, type Lang } from '@ostadiplus/shared';

export const overlays = {
  ink00: colorWithOpacity(identityColors.text, 0),
  ink05: colorWithOpacity(identityColors.text, 0.05),
  ink18: colorWithOpacity(identityColors.text, 0.18),
  ink34: colorWithOpacity(identityColors.text, 0.34),
  ink38: colorWithOpacity(identityColors.text, 0.38),
  ink42: colorWithOpacity(identityColors.text, 0.42),
  ink50: colorWithOpacity(identityColors.text, 0.5),
  ink55: colorWithOpacity(identityColors.text, 0.55),
  ink60: colorWithOpacity(identityColors.text, 0.6),
  ink62: colorWithOpacity(identityColors.text, 0.62),
  ink65: colorWithOpacity(identityColors.text, 0.65),
  ink68: colorWithOpacity(identityColors.text, 0.68),
  ink82: colorWithOpacity(identityColors.text, 0.82),
  ink86: colorWithOpacity(identityColors.text, 0.86),
  white09: colorWithOpacity(identityColors.white, 0.09),
  white10: colorWithOpacity(identityColors.white, 0.1),
  white16: colorWithOpacity(identityColors.white, 0.16),
  white18: colorWithOpacity(identityColors.white, 0.18),
  white22: colorWithOpacity(identityColors.white, 0.22),
  white24: colorWithOpacity(identityColors.white, 0.24),
  white32: colorWithOpacity(identityColors.white, 0.32),
  white92: colorWithOpacity(identityColors.white, 0.92),
} as const;

export const colors = {
  ...palette,
  line: palette.border,
  lineStrong: palette.borderStrong,
  launch: identityColors.surface,
  scrim: overlays.ink38,
  glass: overlays.white92,
  glassSoft: overlays.white22,
  black: identityColors.text,
  white: identityColors.white,
  transparent: overlays.ink00,
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
  regular: 'NotoSansArabic_400Regular',
  medium: 'NotoSansArabic_500Medium',
  semibold: 'NotoSansArabic_600SemiBold',
  bold: 'NotoSansArabic_700Bold',
} as const;

/** Latin family used for the French (LTR) UI. */
export const fontsLatin = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
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
