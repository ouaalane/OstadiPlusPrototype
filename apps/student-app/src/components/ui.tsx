/**
 * Shared building blocks — deliberately tiny, all styled from `src/theme.ts`.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { coverGradients } from '@ostadiplus/shared';

import { colors, fonts, radius, rtl, shadow, spacing } from '../theme';

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

type TextTone = 'ink' | 'body' | 'muted' | 'faint' | 'brand' | 'white' | 'danger' | 'success';

const TONE_COLOR: Record<TextTone, string> = {
  ink: colors.ink,
  body: colors.body,
  muted: colors.muted,
  faint: colors.faint,
  brand: colors.brand,
  white: colors.white,
  danger: colors.danger,
  success: colors.success,
};

export function AppText({
  children,
  size = 15,
  weight = 'regular',
  tone = 'body',
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: keyof typeof fonts;
  tone?: TextTone;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        rtl.text,
        { fontFamily: fonts[weight], fontSize: size, color: TONE_COLOR[tone] },
        style as TextStyle,
      ]}
    >
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[styles.card, style as ViewStyle]}>{children}</View>;
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

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  compact,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'outline' | 'danger';
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle | ViewStyle[];
}) {
  const variants = {
    primary: { bg: colors.brand, fg: colors.white, border: 'transparent' },
    soft: { bg: colors.brandSoft, fg: colors.brandDark, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.body, border: colors.lineStrong },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
  } as const;
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style as ViewStyle,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: compact ? 13 : 15,
          color: v.fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({
  label,
  tone = 'neutral',
  dot,
}: {
  label: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  dot?: boolean;
}) {
  const tones = {
    brand: { bg: colors.brandSoft, fg: colors.brandDark },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.accentSoft, fg: '#8A5A00' },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    info: { bg: colors.infoSoft, fg: '#0B6E99' },
  } as const;
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <Text style={{ fontFamily: fonts.medium, fontSize: 11.5, color: t.fg }}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'success' }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${width}%`, backgroundColor: tone === 'success' ? colors.success : colors.brand },
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Course cover                                                        */
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
      <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 11.5, color: colors.white }}>
          {subject}
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      {children}
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card style={styles.empty}>
      <AppText size={17} weight="bold" tone="ink">
        {title}
      </AppText>
      <AppText size={13.5} tone="muted" style={{ textAlign: 'center', lineHeight: 21 }}>
        {description}
      </AppText>
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </Card>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    ...shadow.card,
  },
  button: {
    borderRadius: radius.sm + 2,
    borderWidth: 1.2,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { paddingVertical: 9, paddingHorizontal: spacing.md },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  cover: {
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: spacing.md,
  },
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
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
});
