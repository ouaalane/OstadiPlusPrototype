/**
 * OstadiPlus design tokens — single source of truth for both applications.
 *
 * Brand colors from oustadi-education-identity/colors.json. Status roles
 * use mulberry/lilac or mulberry/apricot; text/borders use the supplied ink with opacity.
 * The web dashboard mirrors these values in
 * `apps/teacher-dashboard/src/styles/theme.css`; the Android app consumes
 * this module directly.
 */

/** Exact five-color palette in oustadi-education-identity/colors.json. */
export const identityColors = {
  primary: '#68234F',
  accent: '#FFCCA9',
  white: '#FFFFFF',
  surface: '#F1E9F4',
  text: '#291E2B',
} as const;

/** Opacity variants preserve the supplied hue rather than inventing new shades. */
export function colorWithOpacity(hex: string, opacity: number): string {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `rgba(${channels.join(',')},${opacity})`;
}

export const palette = {
  brand: identityColors.primary,
  brandDark: identityColors.text,
  brandSoft: identityColors.surface,
  brandSofter: identityColors.surface,
  gradientFrom: identityColors.primary,
  gradientVia: identityColors.primary,
  gradientTo: identityColors.text,
  accent: identityColors.accent,
  accentSoft: identityColors.accent,
  success: identityColors.primary,
  successSoft: identityColors.surface,
  danger: identityColors.primary,
  dangerSoft: identityColors.accent,
  info: identityColors.primary,
  infoSoft: identityColors.surface,
  // Preserve the original app's white canvas and card hierarchy.
  canvas: identityColors.white,
  surface: identityColors.white,
  surfaceAlt: identityColors.surface,
  ink: identityColors.text,
  body: identityColors.text,
  muted: colorWithOpacity(identityColors.text, 0.72),
  faint: colorWithOpacity(identityColors.text, 0.72),
  border: colorWithOpacity(identityColors.text, 0.12),
  borderStrong: colorWithOpacity(identityColors.text, 0.28),
} as const;

export const coverGradients: Record<string, [string, string]> = {
  blue: [palette.gradientFrom, palette.gradientTo],
  indigo: [palette.gradientFrom, palette.gradientTo],
  violet: [palette.gradientFrom, palette.gradientTo],
  cyan: [palette.gradientFrom, palette.gradientTo],
  teal: [palette.gradientFrom, palette.gradientTo],
  amber: [palette.gradientFrom, palette.gradientTo],
  rose: [palette.gradientFrom, palette.gradientTo],
  slate: [palette.gradientFrom, palette.gradientTo],
};

export const brandGradient = `linear-gradient(135deg, ${palette.gradientFrom} 0%, ${palette.gradientVia} 52%, ${palette.gradientTo} 100%)`;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  card: `0px 2px 8px ${colorWithOpacity(identityColors.text, 0.06)}`,
  raised: `0px 8px 24px ${colorWithOpacity(identityColors.text, 0.10)}`,
  overlay: `0px 24px 64px ${colorWithOpacity(identityColors.text, 0.22)}`,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const typography = {
  /** Web family stack. */
  web: `'Bricolage Grotesque', 'Noto Sans Arabic', sans-serif`,
  /** Latin/numerals family used alongside the Arabic face. */
  latin: `'Bricolage Grotesque', 'Noto Sans Arabic', sans-serif`,
  /** Android asset font file names (android/app/src/main/assets/fonts). */
  native: {
    Regular: 'NotoSansArabic-Brand',
    Medium: 'NotoSansArabic-Brand',
    SemiBold: 'NotoSansArabic-Brand',
    Bold: 'NotoSansArabic-Brand',
  },
  size: {
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  /** Line heights are relaxed (≥1.4) for Arabic diacritics. */
  leading: {
    tight: 1.3,
    snug: 1.45,
    relaxed: 1.65,
  },
} as const;

/** Minimum touch target for the mobile app (WCAG 2.5.5 / PRD design notes). */
export const touchTarget = 48;

/** Static brand copy — kept in one place so both apps stay consistent. */
export const brand = {
  name: 'oustadi plus',
  /** Hero line on the splash / sign-in screens. */
  tagline: 'الدرس كيكمل',
  /** One-sentence explanation used in empty states and onboarding. */
  valueProp: 'امنح تلاميذك وصولاً رقمياً إلى دروسك من هواتفهم.',
} as const;
