/**
 * OstadiPlus design tokens — single source of truth for both applications.
 *
 * Brand colors from oustadi-education-identity/colors.json. Status roles
 * use mulberry/lilac or mulberry/apricot; muted text and borders are ink/lilac blends.
 * The web dashboard mirrors these values in
 * `apps/teacher-dashboard/src/styles/theme.css`; the Android app consumes
 * this module directly.
 */

export const palette = {
  /** Primary interactive mulberry — buttons, links, active states. */
  brand: '#68234F',
  brandDark: '#68234F',
  brandSoft: '#F1E9F4',
  brandSofter: '#F1E9F4',

  /** Brand surface gradient (mulberry → ink). */
  gradientFrom: '#68234F',
  gradientVia: '#68234F',
  gradientTo: '#291E2B',

  accent: '#FFCCA9',
  accentSoft: '#FFCCA9',
  success: '#68234F',
  successSoft: '#F1E9F4',
  danger: '#68234F',
  dangerSoft: '#FFCCA9',
  info: '#68234F',
  infoSoft: '#F1E9F4',

  canvas: '#F1E9F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F1E9F4',

  ink: '#291E2B',
  body: '#291E2B',
  muted: '#6F6072',
  faint: '#6F6072',

  border: '#D7C6DA',
  borderStrong: '#796B7C',

  /** Cover / subject card gradients keyed by CoverKey. */
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
  card: '0px 2px 8px rgba(41, 30, 43, 0.06)',
  raised: '0px 8px 24px rgba(41, 30, 43, 0.10)',
  overlay: '0px 24px 64px rgba(41, 30, 43, 0.22)',
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
  web: `'Noto Sans Arabic', 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, -apple-system, sans-serif`,
  /** Latin/numerals family used alongside the Arabic face. */
  latin: `'Bricolage Grotesque', 'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif`,
  /** Android asset font file names (android/app/src/main/assets/fonts). */
  native: {
    Regular: 'NotoSansArabic-Brand',
    Medium: 'IBMPlexSansArabic-Medium',
    SemiBold: 'IBMPlexSansArabic-SemiBold',
    Bold: 'IBMPlexSansArabic-Bold',
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
  name: 'OstadiPlus',
  /** Hero line on the splash / sign-in screens. */
  tagline: 'درسك يصل إلى كل تلاميذك، أينما كانوا.',
  /** One-sentence explanation used in empty states and onboarding. */
  valueProp: 'امنح تلاميذك وصولاً رقمياً إلى دروسك من هواتفهم.',
} as const;
