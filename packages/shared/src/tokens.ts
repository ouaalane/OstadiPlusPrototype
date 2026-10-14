/**
 * OstadiPlus design tokens — single source of truth for both applications.
 *
 * Derived from the project's existing `DESIGN.md` (Atlas Academic) and the
 * OstadiPlus logo gradient. The web dashboard mirrors these values in
 * `apps/teacher-dashboard/src/styles/theme.css`; the Android app consumes
 * this module directly.
 */

export const palette = {
  /** Primary interactive blue — buttons, links, active states. */
  brand: '#2F5BFF',
  brandDark: '#1E3FCC',
  brandSoft: '#E8EEFF',
  brandSofter: '#F2F5FF',

  /** Logo gradient (graduation cap → play button). */
  gradientFrom: '#2E7BFF',
  gradientVia: '#3B5BF0',
  gradientTo: '#4B2FE0',

  accent: '#FFB400',
  accentSoft: '#FFF4D6',
  success: '#12A66A',
  successSoft: '#E3F6EE',
  danger: '#D93025',
  dangerSoft: '#FDE8E6',
  info: '#0EA5E9',
  infoSoft: '#E4F4FE',

  canvas: '#F5F7FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4FB',

  ink: '#0F1B33',
  body: '#33415C',
  muted: '#5B6882',
  faint: '#8A94AC',

  border: '#E3E8F2',
  borderStrong: '#CFD8EA',

  /** Cover / subject card gradients keyed by CoverKey. */
} as const;

export const coverGradients: Record<string, [string, string]> = {
  blue: ['#2E7BFF', '#1E3FCC'],
  indigo: ['#4F6BFF', '#2F3ED8'],
  violet: ['#6D5BF5', '#4226C8'],
  cyan: ['#22B8F5', '#0C7BD6'],
  teal: ['#12B8A6', '#0A7C8F'],
  amber: ['#FFB400', '#F07A00'],
  rose: ['#FF6B8A', '#D6304F'],
  slate: ['#5B6B8C', '#2C3550'],
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
  card: '0px 2px 8px rgba(15, 27, 51, 0.06)',
  raised: '0px 8px 24px rgba(15, 27, 51, 0.10)',
  overlay: '0px 24px 64px rgba(15, 27, 51, 0.22)',
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
  web: `'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Segoe UI', system-ui, -apple-system, sans-serif`,
  /** Latin/numerals family used alongside the Arabic face. */
  latin: `'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif`,
  /** Android asset font file names (android/app/src/main/assets/fonts). */
  native: {
    Regular: 'IBMPlexSansArabic-Regular',
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
