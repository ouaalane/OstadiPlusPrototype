/**
 * Shared building blocks — reference design system.
 *
 * White surfaces with hairline borders, a single vivid blue, uppercase
 * letter-spaced eyebrows, generous radii and very soft shadows. Everything
 * reads its values from `src/theme.ts`, and text picks its font family from
 * the active language (Arabic → IBM Plex Sans Arabic, French → Inter).
 */

import React, { useRef, useState } from 'react';
import {
  Image,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { coverGradients, type Lang, type LessonKind } from '@ostadiplus/shared';
import { LESSON_ICONS, lessonTint } from '../lib/lesson';

import { colors, familyFor, fonts, radius, shadow, spacing, tracking } from '../theme';
import { coverAssets } from '../assets/covers';
import { useI18n } from '../i18n/useI18n';

type IconName = keyof typeof Ionicons.glyphMap;

/** Icon key map so subject tiles stay stable across the app. */
const SUBJECT_ICONS: Record<string, IconName> = {
  'الرياضيات': 'calculator-outline',
  'الفيزياء': 'pulse-outline',
  'علوم الحياة والأرض': 'leaf-outline',
  'الكيمياء': 'flask-outline',
  'الفلسفة': 'bulb-outline',
  'اللغة العربية': 'book-outline',
  'الإنجليزية': 'language-outline',
  'التاريخ والجغرافيا': 'globe-outline',
  'الفيزياء والكيمياء': 'flask-outline',
};

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

export type TextTone =
  | 'ink'
  | 'body'
  | 'muted'
  | 'faint'
  | 'brand'
  | 'white'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info';

const TONE_COLOR: Record<TextTone, string> = {
  ink: colors.ink,
  body: colors.body,
  muted: colors.muted,
  faint: colors.faint,
  brand: colors.brand,
  white: colors.white,
  danger: colors.danger,
  success: colors.success,
  warning: colors.brand,
  info: colors.info,
};

export function AppText({
  children,
  size = 14.5,
  weight = 'regular',
  tone = 'body',
  lang,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  ...textProps
}: {
  children: React.ReactNode;
  size?: number;
  weight?: keyof typeof fonts;
  tone?: TextTone;
  /** Overrides the language used to pick the font family. */
  lang?: Lang;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
} & Omit<
  React.ComponentProps<typeof Text>,
  'style' | 'children' | 'numberOfLines' | 'adjustsFontSizeToFit' | 'minimumFontScale'
>) {
  const { lang: activeLang } = useI18n();
  const l = lang ?? activeLang;
  const rtlDir = l === 'ar';
  return (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      {...textProps}
      style={[
        {
          textAlign: rtlDir ? 'right' : 'left',
          writingDirection: rtlDir ? 'rtl' : 'ltr',
        },
        { fontFamily: familyFor(l, weight), fontSize: size, color: TONE_COLOR[tone] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Uppercase, letter-spaced section label — «ABOUT THIS COURSE». */
export function Eyebrow({
  children,
  tone = 'muted',
  style,
}: {
  children: React.ReactNode;
  tone?: TextTone;
  style?: TextStyle;
}) {
  return (
    <AppText
      size={11}
      weight="bold"
      tone={tone}
      style={[
        { textTransform: 'uppercase', letterSpacing: tracking.eyebrow, lineHeight: 16 },
        style,
      ]}
    >
      {children}
    </AppText>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  style,
  flush,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** No inner padding — for cards that own their own rows. */
  flush?: boolean;
}) {
  return (
    <View style={[styles.card, flush && styles.cardFlush, style as ViewStyle]}>{children}</View>
  );
}

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[styles.screen, style as ViewStyle]}>{children}</View>;
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <View style={styles.hr} />;
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <AppText size={12} tone="faint">
        {label}
      </AppText>
      <View style={styles.dividerLine} />
    </View>
  );
}

/** Section heading: eyebrow on the left, optional action/counter on the right. */
export function SectionHead({
  eyebrow,
  title,
  counter,
  action,
  onAction,
  style,
}: {
  eyebrow?: string;
  title?: string;
  /** Muted right-aligned text, e.g. «3 active». */
  counter?: string;
  /** Brand-coloured right-aligned action, e.g. «Edit all». */
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const rowDir = useRowDir();
  return (
    <View style={[styles.sectionHead, { flexDirection: rowDir }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        {title ? (
          <AppText size={17} weight="bold" tone="ink">
            {title}
          </AppText>
        ) : null}
      </View>
      {counter ? (
        <AppText size={markSize(counter)} tone="muted">
          {counter}
        </AppText>
      ) : null}
      {action ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          disabled={!onAction}
          accessible
          accessibilityRole="button"
          accessibilityLabel={action}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <AppText size={13.5} weight="semibold" tone="brand">
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const markSize = (text: string) => (text.length > 14 ? 11.5 : 12.5);

/**
 * Horizontal flow for the active language.
 *
 * The app runs with the platform in LTR (Arabic is handled per screen), so
 * horizontal rows must be reversed explicitly for Arabic — otherwise leading
 * content (icons, thumbnails, back buttons) stays on the wrong side.
 */
function useRowDir(): 'row' | 'row-reverse' {
  const { dir } = useI18n();
  return dir === 'rtl' ? 'row-reverse' : 'row';
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export type ButtonVariant = 'primary' | 'accent' | 'soft' | 'outline' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<
  ButtonVariant,
  { bg: string; fg: string; border: string; icon: string }
> = {
  primary: { bg: colors.brand, fg: colors.white, border: 'transparent', icon: colors.white },
  accent: { bg: colors.accent, fg: colors.ink, border: 'transparent', icon: colors.ink },
  soft: { bg: colors.brandSoft, fg: colors.brand, border: 'transparent', icon: colors.brand },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.line, icon: colors.ink },
  ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent', icon: colors.brand },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent', icon: colors.danger },
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  compact,
  icon,
  leadingIcon,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Async submit in flight — disables the button and exposes `busy` to TalkBack/VoiceOver. */
  busy?: boolean;
  compact?: boolean;
  /** Trailing glyph, e.g. «→» on «Get started». */
  icon?: IconName;
  /** Leading glyph, e.g. «▶» on «Continue · Lecture 5». */
  leadingIcon?: IconName;
  /** Overrides the visible label for screen readers (e.g. adds the item name). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle | ViewStyle[];
}) {
  const v = BUTTON_VARIANTS[variant];
  const off = !!disabled || !!busy;
  const { lang } = useI18n();
  const rowDir = useRowDir();
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: !!busy }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          flexDirection: rowDir,
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: off ? 0.45 : pressed ? 0.88 : 1,
        },
        style as ViewStyle,
      ]}
    >
      {leadingIcon ? (
        <Ionicons name={leadingIcon} size={compact ? 15 : 17} color={v.icon} importantForAccessibility="no" />
      ) : null}
      <Text
        style={{
          fontFamily: familyFor(lang, 'semibold'),
          fontSize: compact ? 13.5 : 15.5,
          color: v.fg,
        }}
      >
        {label}
      </Text>
      {icon ? (
        <Ionicons name={icon} size={compact ? 15 : 17} color={v.icon} importantForAccessibility="no" />
      ) : null}
    </Pressable>
  );
}

/** Circular icon button — photo heroes, headers, list affordances. */
export function IconButton({
  icon,
  onPress,
  variant = 'surface',
  size = 40,
  label,
  disabled,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  variant?: 'surface' | 'glass' | 'onPhoto' | 'plain' | 'brand';
  size?: number;
  label: string;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}) {
  const variants = {
    surface: { bg: colors.surface, border: colors.line, fg: colors.ink },
    glass: { bg: colors.glass, border: 'transparent', fg: colors.ink },
    onPhoto: { bg: colors.glassSoft, border: 'transparent', fg: colors.white },
    plain: { bg: 'transparent', border: 'transparent', fg: colors.ink },
    brand: { bg: colors.brand, border: 'transparent', fg: colors.white },
  } as const;
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: v.bg,
          borderWidth: v.border === 'transparent' ? 0 : 1,
          borderColor: v.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style as ViewStyle,
      ]}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.48)}
        color={v.fg}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

/** Bordered pill action — «Save», «Download», «Add note». */
export function ActionChip({
  icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon?: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const rowDir = useRowDir();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.actionChip,
        { flexDirection: rowDir },
        active && { borderColor: colors.brand, backgroundColor: colors.brandSofter },
        pressed && !disabled && { opacity: 0.75 },
        disabled && { opacity: 0.45 },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={active ? colors.brand : colors.ink}
          importantForAccessibility="no"
        />
      ) : null}
      <AppText size={13} weight="semibold" tone={active ? 'brand' : 'ink'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Pill({
  label,
  tone = 'neutral',
  dot,
  onBrand = false,
}: {
  label: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  dot?: boolean;
  /** Sits on the brand gradient: no chip fill, white label, tone-coloured dot. */
  onBrand?: boolean;
}) {
  const tones = {
    brand: { bg: colors.brandSoft, fg: colors.brand },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.accentSoft, fg: colors.brand },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    info: { bg: colors.infoSoft, fg: colors.info },
  } as const;
  const t = tones[tone];
  const rowDir = useRowDir();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: onBrand ? 'transparent' : t.bg,
          paddingHorizontal: onBrand ? 0 : 9,
          flexDirection: rowDir,
        },
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <AppText size={11.5} weight="medium" style={{ color: onBrand ? colors.white : t.fg }}>
        {label}
      </AppText>
    </View>
  );
}

/** Solid blue status pill — the player's «NOW» marker. */
export function Badge({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'dark' | 'success' }) {
  const bg =
    tone === 'dark' ? 'rgba(41,30,43,0.62)' : tone === 'success' ? colors.success : colors.brand;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText size={11} weight="bold" tone="white" style={{ letterSpacing: 0.3 }}>
        {label}
      </AppText>
    </View>
  );
}

export function ProgressBar({
  value,
  tone = 'brand',
  height = 7,
  track,
}: {
  value: number;
  tone?: 'brand' | 'success';
  height?: number;
  track?: string;
}) {
  const width = Math.max(0, Math.min(100, value));
  /* The fill grows from the leading edge — the right edge in Arabic. */
  const rowDir = useRowDir();
  return (
    <View
      style={[
        styles.progressTrack,
        {
          flexDirection: rowDir,
          height,
          borderRadius: height / 2,
          backgroundColor: track ?? colors.line,
        },
      ]}
    >
      <View
        style={{
          height: '100%',
          width: `${width}%`,
          borderRadius: height / 2,
          backgroundColor: tone === 'success' ? colors.success : colors.brand,
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Informational blocks                                                */
/* ------------------------------------------------------------------ */

/** Dashed-border tip card — «How downloads work». */
export function TipCard({
  icon = 'download-outline',
  title,
  body,
}: {
  icon?: IconName;
  title: string;
  body: string;
}) {
  const rowDir = useRowDir();
  return (
    <View style={styles.tipCard}>
      <View style={[styles.tipHead, { flexDirection: rowDir }]}>
        <Ionicons name={icon} size={18} color={colors.brand} importantForAccessibility="no" />
        <AppText size={14.5} weight="bold" tone="ink" style={{ flex: 1 }}>
          {title}
        </AppText>
      </View>
      <AppText size={13.5} tone="muted" style={{ lineHeight: 21 }}>
        {body}
      </AppText>
    </View>
  );
}

/** Inset notice card — bold lead-in plus muted continuation. */
export function NoticeCard({
  icon = 'information-circle-outline',
  title,
  body,
  tone = 'neutral',
}: {
  icon?: IconName;
  title: string;
  body: string;
  tone?: 'neutral' | 'brand' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: { bg: colors.surfaceAlt, border: colors.line, fg: colors.ink },
    brand: { bg: colors.brandSofter, border: colors.brandSoft, fg: colors.brand },
    warning: { bg: colors.accentSoft, border: 'transparent', fg: colors.brand },
    danger: { bg: colors.dangerSoft, border: 'transparent', fg: colors.danger },
  } as const;
  const t = tones[tone];
  const rowDir = useRowDir();
  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: t.bg, borderColor: t.border, flexDirection: rowDir },
      ]}
    >
      <Ionicons name={icon} size={18} color={t.fg} style={{ marginTop: 1 }} importantForAccessibility="no" />
      <AppText size={13.5} style={{ flex: 1, lineHeight: 21 }}>
        <AppText size={13.5} weight="bold" style={{ color: t.fg }}>
          {title}
        </AppText>
        <AppText size={13.5} tone="muted">
          {body}
        </AppText>
      </AppText>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon = 'cloud-download-outline',
  badgeIcon,
  title,
  description,
  action,
  compact,
  style,
}: {
  icon?: IconName;
  /** Small circular glyph that overlaps the icon circle. */
  badgeIcon?: IconName;
  title: string;
  description: string;
  action?: React.ReactNode;
  /** Tighter variant for empty sections that sit above primary content. */
  compact?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.empty, compact && styles.emptyCompact, style]}>
      <View importantForAccessibility="no">
        <View style={[styles.emptyCircle, compact && styles.emptyCircleCompact]}>
          <Ionicons name={icon} size={compact ? 26 : 34} color={colors.brand} />
        </View>
        {badgeIcon ? (
          <View style={[styles.emptyBadge, compact && styles.emptyBadgeCompact]}>
            <Ionicons name={badgeIcon} size={compact ? 10 : 13} color={colors.muted} />
          </View>
        ) : null}
      </View>
      <AppText
        size={compact ? 17 : 20}
        weight="bold"
        tone="ink"
        style={{ textAlign: 'center', marginTop: compact ? spacing.md : spacing.xl }}
      >
        {title}
      </AppText>
      <AppText
        size={compact ? 13 : 14}
        tone="muted"
        style={{
          textAlign: 'center',
          lineHeight: compact ? 19 : 22,
          paddingHorizontal: spacing.sm,
        }}
      >
        {description}
      </AppText>
      {action ? <View style={{ alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

/** Circular status glyph in front of a chapter/lecture row. */
export function StatusDot({
  icon,
  tone = 'neutral',
  size = 34,
}: {
  icon: IconName;
  tone?: 'neutral' | 'brand' | 'success' | 'danger';
  size?: number;
}) {
  const tones = {
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    brand: { bg: colors.brand, fg: colors.white },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  } as const;
  const t = tones[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      importantForAccessibility="no"
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={t.fg} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Course cover / avatar                                               */
/* ------------------------------------------------------------------ */

export function CourseCover({
  cover,
  subject,
  height = 110,
  children,
}: {
  cover: string;
  subject: string;
  height?: number;
  children?: React.ReactNode;
}) {
  const source = coverAssets[cover];
  const { dir } = useI18n();
  const rtl = dir === 'rtl';
  /** The subject chip hugs the leading edge — the right one in Arabic. */
  const pillRow = {
    flexDirection: 'row' as const,
    justifyContent: (rtl ? 'flex-end' : 'flex-start') as 'flex-end' | 'flex-start',
  };
  if (source) {
    return (
      <View style={[styles.cover, { height, overflow: 'hidden' }]}>
        <Image source={source} style={styles.absoluteImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(41,30,43,0.05)', 'rgba(41,30,43,0.38)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={pillRow}>
          <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
            <AppText size={11.5} weight="medium" tone="white">
              {subject}
            </AppText>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        {children}
      </View>
    );
  }
  const pair = coverGradients[cover as keyof typeof coverGradients] ?? coverGradients.blue;
  return (
    <LinearGradient
      colors={[pair[0], pair[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cover, { height }]}
    >
      <View style={styles.coverBubbleLarge} />
      <View style={styles.coverBubbleSmall} />
      <View style={pillRow}>
        <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <AppText size={11.5} weight="medium" tone="white">
            {subject}
          </AppText>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      {children}
    </LinearGradient>
  );
}

const AVATAR_GRADIENTS: Record<string, [string, string]> = {
  brand: [colors.brand, colors.brandDark],
  accent: [colors.gradientFrom, colors.gradientTo],
  teal: [colors.gradientFrom, colors.gradientTo],
  info: [colors.gradientFrom, colors.gradientTo],
  violet: [colors.gradientFrom, colors.gradientTo],
  rose: [colors.gradientFrom, colors.gradientTo],
};

/**
 * Circular (or rounded-square) avatar: the teacher's real photo when one is
 * bundled, otherwise a monogram on a soft gradient.
 */
export function Avatar({
  monogram,
  size = 48,
  seed = 0,
  square = false,
  tone,
  photo,
}: {
  monogram: string;
  size?: number;
  seed?: number;
  square?: boolean;
  tone?: keyof typeof AVATAR_GRADIENTS;
  /** Bundled photo (see `assets/teacher-photos`); falls back to the monogram. */
  photo?: number;
}) {
  const keys = Object.keys(AVATAR_GRADIENTS);
  const key = tone ?? keys[Math.abs(seed) % keys.length];
  const pair = AVATAR_GRADIENTS[key] ?? AVATAR_GRADIENTS.brand;
  const radius = square ? Math.round(size * 0.28) : size / 2;

  if (photo) {
    return (
      <Image
        source={photo}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceAlt }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <LinearGradient
      colors={[pair[0], pair[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText size={Math.max(10, Math.round(size * 0.34))} weight="bold" tone="white">
        {monogram}
      </AppText>
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ */
/* Search + home rail                                                  */
/* ------------------------------------------------------------------ */

export function SearchBar({ placeholder, onPress }: { placeholder: string; onPress?: () => void }) {
  const rowDir = useRowDir();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.searchBar,
        { flexDirection: rowDir },
        pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={placeholder}
    >
      <Ionicons name="search" size={19} color={colors.muted} importantForAccessibility="no" />
      <AppText size={14} tone="faint" style={{ flex: 1 }}>
        {placeholder}
      </AppText>
    </Pressable>
  );
}

export function SubjectTile({ subject, onPress }: { subject: string; onPress?: () => void }) {
  const icon = SUBJECT_ICONS[subject] ?? 'albums-outline';
  return (
    <Pressable
      style={({ pressed }) => [styles.subjectTile, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={subject}
    >
      <View style={styles.subjectCircle} importantForAccessibility="no">
        <Ionicons name={icon} size={24} color={colors.brand} />
      </View>
      <AppText size={12} weight="medium" tone="body" numberOfLines={1} style={{ textAlign: 'center', width: 74 }}>
        {subject}
      </AppText>
    </Pressable>
  );
}

/** Quick-metric tile — completed lessons / minutes watched / courses. */
export function MetricChip({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string;
  label: string;
}) {
  const rowDir = useRowDir();
  return (
    <View style={[styles.metricChip, { flexDirection: rowDir }]}>
      <View style={styles.metricIcon} importantForAccessibility="no">
        <Ionicons name={icon} size={16} color={colors.brand} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <AppText size={15} weight="bold" tone="ink">
          {value}
        </AppText>
        <AppText size={11} tone="muted" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Card thumbnail                                                      */
/* ------------------------------------------------------------------ */

/** Rounded photo/gradient thumbnail used by course + lecture cards. */
export function Thumb({
  cover,
  poster,
  width = 104,
  height = 68,
  aspectRatio,
  radiusValue = radius.sm,
  overlay,
  children,
}: {
  cover: string;
  poster?: number;
  width?: number;
  height?: number;
  /** Fill the parent's width at this ratio (e.g. `16 / 9`) instead of a fixed box. */
  aspectRatio?: number;
  radiusValue?: number;
  /** Soft dark scrim so overlaid content stays legible. */
  overlay?: boolean;
  children?: React.ReactNode;
}) {
  const coverSource = coverAssets[cover];
  const pair = coverGradients[cover] ?? coverGradients.blue;
  return (
    <View
      style={[
        { borderRadius: radiusValue, overflow: 'hidden' },
        aspectRatio ? { width: '100%', aspectRatio } : { width, height },
      ]}
    >
      {poster ? (
        <Image source={poster} style={styles.absoluteImage} resizeMode="cover" />
      ) : coverSource ? (
        <Image source={coverSource} style={styles.absoluteImage} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[pair[0], pair[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.thumbBubbleLarge} />
          <View style={styles.thumbBubbleSmall} />
        </LinearGradient>
      )}
      {overlay ? (
        <LinearGradient
          colors={['rgba(41,30,43,0.0)', 'rgba(41,30,43,0.34)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

/** Small white play glyph that sits on a thumbnail. */
export function PlayGlyph({ size = 32, tone = 'glass' }: { size?: number; tone?: 'glass' | 'brand' }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone === 'brand' ? colors.brand : colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      importantForAccessibility="no"
    >
      <Ionicons
        name="play"
        size={Math.round(size * 0.46)}
        color={tone === 'brand' ? colors.white : colors.brand}
        style={{ marginLeft: 2 }}
      />
    </View>
  );
}

/**
 * Thumbnail affordance for a lesson row. Videos keep the branded play button;
 * every other kind shows its own tinted glyph so a row never promises a video
 * it cannot play (a PDF opens the reader, a quiz opens the questions).
 */
export function LessonGlyph({ kind, size = 30 }: { kind: LessonKind; size?: number }) {
  if (kind === 'video') return <PlayGlyph size={size} />;
  const tint = lessonTint(kind);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint.soft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      importantForAccessibility="no"
    >
      <Ionicons name={LESSON_ICONS[kind]} size={Math.round(size * 0.52)} color={tint.dark} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Gradient surfaces                                                   */
/* ------------------------------------------------------------------ */
/**
 * Brand gradient header. Used by the splash and the auth hero; the dashboard
 * screens use flat white surfaces instead.
 */
export function GradientHeader({
  children,
  style,
  colors: gradient = [colors.brand, colors.brandDark],
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: [string, string];
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientHeader, style]}
    >
      {children}
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ */
/* Auth primitives                                                     */
/* ------------------------------------------------------------------ */

/** Rounded-square back button + optional centred caption. */
export function AuthAppBar({
  caption,
  title,
  onBack,
  right,
}: {
  /** Small centred caption, e.g. «Step 1 of 2». */
  caption?: string;
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { dir } = useI18n();
  const rowDir = useRowDir();
  const rtl = dir === 'rtl';
  return (
    <View style={[styles.appBar, { flexDirection: rowDir }]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [styles.backSquare, pressed && { opacity: 0.7 }]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={rtl ? 'رجوع' : 'Retour'}
        >
          <Ionicons
            name={rtl ? 'chevron-forward' : 'chevron-back'}
            size={20}
            color={colors.ink}
            importantForAccessibility="no"
          />
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {caption ? (
          <AppText size={13} tone="muted">
            {caption}
          </AppText>
        ) : null}
        {title ? (
          <AppText size={16} weight="bold" tone="ink" numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
      </View>
      <View style={{ width: 40, alignItems: rtl ? 'flex-start' : 'flex-end' }}>{right}</View>
    </View>
  );
}

/**
 * Labeled text field — bold label (with an optional required marker) above a
 * bordered input. `icon` sits on the leading edge, `trailing` on the other.
 */
export function LabeledField({
  label,
  icon,
  trailing,
  error,
  required,
  style,
  inputRef,
  ...inputProps
}: {
  label: string;
  icon?: IconName;
  trailing?: React.ReactNode;
  error?: string | null;
  /** Renders the red asterisk the reference uses on required fields. */
  required?: boolean;
  style?: ViewStyle;
  inputRef?: React.Ref<TextInput>;
} & {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  prefix?: string;
  autoComplete?: 'name' | 'username' | 'email' | 'tel' | 'current-password' | 'new-password' | 'off';
  textContentType?: 'name' | 'username' | 'emailAddress' | 'telephoneNumber' | 'password' | 'newPassword';
  returnKeyType?: 'next' | 'done' | 'go' | 'search';
  submitBehavior?: 'submit' | 'blurAndSubmit';
  onSubmitEditing?: () => void;
  maxLength?: number;
  autoFocus?: boolean;
  accessibilityHint?: string;
}) {
  const { lang } = useI18n();
  const rowDir = useRowDir();
  return (
    <View style={[{ gap: spacing.sm }, style]}>
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 3 }}>
        <AppText size={13.5} weight="bold" tone="ink">
          {label}
        </AppText>
        {required ? (
          <AppText size={13.5} weight="bold" tone="danger">
            *
          </AppText>
        ) : null}
      </View>
      <View style={[styles.field, { flexDirection: rowDir }, error ? styles.fieldError : null]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.muted} importantForAccessibility="no" />
        ) : null}
        {inputProps.prefix ? (
          <AppText size={14} weight="semibold" tone="muted" importantForAccessibility="no">
            {inputProps.prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={inputRef}
          style={[
            styles.fieldInput,
            { fontFamily: familyFor(lang, 'regular') },
          ]}
          placeholderTextColor={colors.faint}
          accessibilityLabel={label}
          {...inputProps}
        />
        {trailing}
      </View>
      {error ? (
        <AppText size={12} weight="semibold" tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

/** One choice in a {@link SelectField}. */
export interface SelectOption {
  value: string;
  label: string;
  /** Secondary line under the label — the académie régionale, a filière, … */
  hint?: string;
  /** Consecutive options sharing a group render under one section header. */
  group?: string;
}

/**
 * Search fold for {@link SelectField} — case-, accent- and diacritic-insensitive
 * so « Fès », « fes » and « FES » all match, and Arabic variants (أ/ا، ة/ه، ى/ي)
 * collapse together.
 */
function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/[àâäá]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îïí]/g, 'i')
    .replace(/[ôöó]/g, 'o')
    .replace(/[ûüùú]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[’'`\-]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Read-only field that opens a searchable sheet — the pattern to use wherever
 * the choice list is too long for inline chips (the city list is ~90 entries).
 *
 * Browse mode shows the options grouped by `group`; typing filters on the
 * label and the hint, and drops the headers so results read as one flat list.
 */
export function SelectField({
  label,
  icon,
  value,
  options,
  onSelect,
  placeholder,
  sheetTitle,
  searchPlaceholder,
  emptyText,
  clearLabel,
  closeLabel,
  error,
  required,
  style,
}: {
  label: string;
  icon?: IconName;
  value: string | null;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder: string;
  sheetTitle: string;
  searchPlaceholder: string;
  emptyText: string;
  clearLabel: string;
  closeLabel: string;
  error?: string | null;
  required?: boolean;
  style?: ViewStyle;
}) {
  const { lang } = useI18n();
  const rowDir = useRowDir();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value) ?? null;

  const needle = fold(query);
  const matches = needle
    ? options.filter(
        (o) => fold(o.label).includes(needle) || fold(o.hint ?? '').includes(needle),
      )
    : options;

  /** Flat render list; headers only while browsing, never for search results. */
  const rows: ({ header: string } | { option: SelectOption })[] = [];
  let lastGroup: string | undefined;
  for (const option of matches) {
    if (!needle && option.group && option.group !== lastGroup) rows.push({ header: option.group });
    lastGroup = needle ? undefined : option.group;
    rows.push({ option });
  }

  const pick = (next: string) => {
    onSelect(next);
    setOpen(false);
  };

  return (
    <View style={[{ gap: spacing.sm }, style]}>
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 3 }}>
        <AppText size={13.5} weight="bold" tone="ink">
          {label}
        </AppText>
        {required ? (
          <AppText size={13.5} weight="bold" tone="danger">
            *
          </AppText>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        style={({ pressed }) => [
          styles.field,
          { flexDirection: rowDir },
          error ? styles.fieldError : null,
          pressed && { opacity: 0.7 },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.muted} importantForAccessibility="no" />
        ) : null}
        <AppText
          size={15}
          tone={selected ? 'ink' : 'faint'}
          numberOfLines={1}
          style={{ flex: 1 }}
          importantForAccessibility="no"
        >
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.muted} importantForAccessibility="no" />
      </Pressable>

      {error ? (
        <AppText
          size={12}
          weight="semibold"
          tone="danger"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </AppText>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.selectScrim} onPress={() => setOpen(false)} accessible={false}>
          <Pressable style={styles.selectSheet} onPress={() => undefined} accessible={false}>
            <View style={styles.selectGrabber} />
            <View style={[styles.selectHead, { flexDirection: rowDir }]}>
              <AppText size={17} weight="bold" tone="ink" style={{ flex: 1 }}>
                {sheetTitle}
              </AppText>
              <IconButton
                icon="close"
                variant="plain"
                size={34}
                label={closeLabel}
                onPress={() => setOpen(false)}
              />
            </View>

            <View style={[styles.field, styles.selectSearch, { flexDirection: rowDir }]}>
              <Ionicons name="search-outline" size={18} color={colors.muted} importantForAccessibility="no" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.faint}
                autoCorrect={false}
                autoFocus
                accessibilityLabel={searchPlaceholder}
                style={[styles.fieldInput, { fontFamily: familyFor(lang, 'regular') }]}
              />
              {query ? (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={10}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={clearLabel}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.lineStrong}
                    importantForAccessibility="no"
                  />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              style={styles.selectList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: spacing.sm }}
            >
              {rows.length === 0 ? (
                <AppText size={14} tone="muted" style={styles.selectEmpty}>
                  {emptyText}
                </AppText>
              ) : (
                rows.map((row) =>
                  'header' in row ? (
                    <AppText
                      key={`header-${row.header}`}
                      size={11.5}
                      weight="bold"
                      tone="faint"
                      style={styles.selectGroup}
                    >
                      {row.header}
                    </AppText>
                  ) : (
                    <Pressable
                      key={row.option.value}
                      onPress={() => pick(row.option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: row.option.value === value }}
                      accessibilityLabel={
                        row.option.hint ? `${row.option.label} — ${row.option.hint}` : row.option.label
                      }
                      style={({ pressed }) => [
                        styles.selectRow,
                        { flexDirection: rowDir },
                        pressed && { backgroundColor: colors.brandSofter },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }} importantForAccessibility="no">
                        <AppText
                          size={14.5}
                          weight={row.option.value === value ? 'bold' : 'medium'}
                          tone="ink"
                        >
                          {row.option.label}
                        </AppText>
                        {row.option.hint ? (
                          <AppText size={11.5} tone="muted">
                            {row.option.hint}
                          </AppText>
                        ) : null}
                      </View>
                      {row.option.value === value ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.brand}
                          importantForAccessibility="no"
                        />
                      ) : null}
                    </Pressable>
                  ),
                )
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** 6-digit verification code input with a hidden text field behind the boxes. */
export function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  accessibilityLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  accessibilityLabel?: string;
}) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const rowDir = useRowDir();
  const digits = value.split('');
  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={[styles.codeRow, { flexDirection: rowDir }]}
    >
      {Array.from({ length }).map((_, i) => {
        const filled = i < digits.length;
        const isNext = focused && i === digits.length;
        return (
          <View
            key={i}
            style={[
              styles.codeBox,
              filled && { backgroundColor: colors.surfaceAlt, borderColor: colors.line },
              isNext && { borderColor: colors.brand },
            ]}
            importantForAccessibility="no"
          >
            <AppText size={19} weight="bold" tone="ink">
              {digits[i] ?? ''}
            </AppText>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel}
        caretHidden
        style={styles.codeHiddenInput}
      />
    </Pressable>
  );
}

/**
 * Segmented progress for a multi-step form. The step count itself is rendered
 * by the caller, which knows the active language.
 */
export function Stepper({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={styles.stepperRow} importantForAccessibility="no">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepperSeg,
            { backgroundColor: i < step ? colors.brand : colors.line },
          ]}
        />
      ))}
    </View>
  );
}

/** Row of page dots; `active` is the zero-based current index. */
export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots} importantForAccessibility="no">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dotMark,
            i === active
              ? { width: 22, backgroundColor: colors.brand }
              : { backgroundColor: colors.line },
          ]}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

/** Three-up stat strip — «9 Correct / 1 Missed / 2:48 Time». */
export function StatStrip({
  items,
}: {
  items: { value: string; label: string }[];
}) {
  const rowDir = useRowDir();
  return (
    <View style={[styles.statStrip, { flexDirection: rowDir }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 ? <View style={styles.statDivider} /> : null}
          <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <AppText size={20} weight="bold" tone="ink">
              {item.value}
            </AppText>
            <AppText size={12} tone="muted">
              {item.label}
            </AppText>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Quiz option                                                         */
/* ------------------------------------------------------------------ */

export type OptionState = 'idle' | 'picked' | 'correct' | 'wrong';

export function OptionRow({
  label,
  state,
  multi,
  disabled,
  onPress,
}: {
  label: string;
  state: OptionState;
  multi?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const border =
    state === 'correct'
      ? colors.success
      : state === 'wrong'
        ? colors.danger
        : state === 'picked'
          ? colors.brand
          : colors.line;
  const bg =
    state === 'correct'
      ? colors.successSoft
      : state === 'wrong'
        ? colors.dangerSoft
        : state === 'picked'
          ? colors.brandSofter
          : colors.surface;
  const boxBg =
    state === 'correct'
      ? colors.success
      : state === 'wrong'
        ? colors.danger
        : state === 'picked'
          ? colors.brand
          : 'transparent';
  const rowDir = useRowDir();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: state !== 'idle', disabled: !!disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        { flexDirection: rowDir, borderColor: border, backgroundColor: bg },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <View
        style={[
          multi ? styles.optionBox : styles.optionRadio,
          { borderColor: state === 'idle' ? colors.lineStrong : boxBg, backgroundColor: boxBg },
        ]}
        importantForAccessibility="no"
      >
        {state === 'correct' ? (
          <Ionicons name="checkmark" size={13} color={colors.white} />
        ) : state === 'wrong' ? (
          <Ionicons name="close" size={13} color={colors.white} />
        ) : state === 'picked' ? (
          <Ionicons name="checkmark" size={13} color={colors.white} />
        ) : null}
      </View>
      <AppText size={14.5} tone="ink" style={{ flex: 1, lineHeight: 21 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Photo hero overlay bar                                              */
/* ------------------------------------------------------------------ */

/** Standard screen bar: back affordance, centred title, optional action. */
export function TopBar({
  title,
  onBack,
  backLabel,
  right,
  bordered = true,
}: {
  title?: string;
  onBack?: () => void;
  /** Text next to the chevron, e.g. «Back». */
  backLabel?: string;
  right?: React.ReactNode;
  bordered?: boolean;
}) {
  const { lang } = useI18n();
  const rowDir = useRowDir();
  return (
    <View style={[styles.topBar, { flexDirection: rowDir }, bordered && styles.topBarBordered]}>
      <View style={{ flex: 1, flexDirection: rowDir, alignItems: 'center' }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={backLabel ?? 'Back'}
            style={({ pressed }) => [
              { flexDirection: rowDir, alignItems: 'center', gap: 2, minHeight: 40 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name={lang === 'ar' ? 'chevron-forward' : 'chevron-back'}
              size={20}
              color={colors.brand}
              importantForAccessibility="no"
            />
            {backLabel ? (
              <AppText size={14.5} weight="semibold" tone="brand">
                {backLabel}
              </AppText>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      {title ? (
        <AppText
          size={15.5}
          weight="bold"
          tone="ink"
          numberOfLines={1}
          style={{ flex: 2, textAlign: 'center' }}
        >
          {title}
        </AppText>
      ) : null}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/** Translucent circular buttons that float over a photo hero. */
export function HeroBar({
  onBack,
  right,
  style,
}: {
  onBack: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { dir } = useI18n();
  const rowDir = useRowDir();
  const rtl = dir === 'rtl';
  return (
    <View style={[styles.heroBar, { flexDirection: rowDir }, style]}>
      <IconButton
        icon={rtl ? 'chevron-forward' : 'chevron-back'}
        variant="onPhoto"
        size={38}
        label={rtl ? 'رجوع' : 'Retour'}
        onPress={onBack}
      />
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  hr: { height: 1, backgroundColor: colors.line },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardFlush: { padding: 0, overflow: 'hidden' },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },

  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: spacing.lg, gap: 6 },

  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
  },
  badge: {
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },

  progressTrack: { overflow: 'hidden', width: '100%' },

  tipCard: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },

  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyCompact: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircleCompact: { width: 64, height: 64, borderRadius: 32 },
  emptyBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadgeCompact: { width: 24, height: 24, borderRadius: 12 },

  cover: { borderRadius: radius.lg, overflow: 'hidden', padding: spacing.md },
  coverBubbleLarge: {
    position: 'absolute',
    top: -34,
    start: -26,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  coverBubbleSmall: {
    position: 'absolute',
    bottom: -30,
    end: -18,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  thumbBubbleLarge: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -40,
    start: -30,
  },
  thumbBubbleSmall: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.09)',
    bottom: -30,
    end: -20,
  },

  /* An `Image` given only insets (`StyleSheet.absoluteFill`) resolves to its own
     intrinsic pixel size in the New Architecture — a magnified slice of the art
     painted outside the frame. Explicit percentages keep it filling the box
     (same workaround as `CourseDetailScreen.heroArt`). */
  absoluteImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
  },

  subjectTile: { width: 74, alignItems: 'center', gap: 6 },
  subjectCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gradientHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
  },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  backSquare: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  fieldError: { borderColor: colors.danger },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: spacing.md,
  },

  selectScrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  selectSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '82%',
    ...shadow.overlay,
  },
  selectGrabber: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  selectHead: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  selectSearch: {
    marginHorizontal: spacing.xl,
    minHeight: 48,
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
  },
  selectList: { maxHeight: 400 },
  selectGroup: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: tracking.eyebrow,
  },
  selectRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  selectEmpty: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },

  codeRow: { flexDirection: 'row', gap: spacing.sm },
  codeBox: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeHiddenInput: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    opacity: 0.02,
    color: 'transparent',
  },

  stepperRow: { flexDirection: 'row', gap: 6 },
  stepperSeg: { flex: 1, height: 5, borderRadius: 3 },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotMark: { width: 7, height: 7, borderRadius: 4 },

  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  statDivider: { width: 1, height: 34, backgroundColor: colors.line },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    backgroundColor: colors.surface,
  },
  optionBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  topBarBordered: { borderBottomWidth: 1, borderBottomColor: colors.line },
});

/* ------------------------------------------------------------------ */
/* Reusable card row sizes used by several screens                     */
/* ------------------------------------------------------------------ */

export const ROW = { thumbWidth: 104, thumbHeight: 68 } as const;
