/**
 * OstadiPlus — direction-aware layout helpers.
 *
 * The prototype was built Arabic-first with explicit `row-reverse` layouts.
 * To support French (LTR) alongside Arabic (RTL), screens use this hook
 * instead of hard-coding `flexDirection: 'row-reverse'`. The returned styles
 * flip automatically when the language changes.
 *
 * Usage:
 *   const { row, text, field } = useLayout(lang);
 *   <View style={row}>…</View>
 *   <AppText style={text}>…</AppText>
 */
import { useMemo } from 'react';
import { ViewStyle, TextStyle } from 'react-native';

import { colors, spacing, radius } from '../theme';

/** Styles that flip between RTL and LTR. */
export interface LayoutStyles {
  row: ViewStyle;
  rowTop: ViewStyle;
  rowBetween: ViewStyle;
  text: TextStyle;
  field: ViewStyle;
  fieldInput: TextStyle;
  sectionHeader: ViewStyle;
  chipRow: ViewStyle;
  appBar: ViewStyle;
  appBarSide: ViewStyle;
  backBtn: ViewStyle;
  dividerRow: ViewStyle;
  dividerLine: ViewStyle;
  pill: ViewStyle;
  metricChip: ViewStyle;
  metricIcon: ViewStyle;
}

/** Build direction-aware style objects for the given language. */
export function buildLayout(lang: 'ar' | 'fr'): LayoutStyles {
  const isRtl = lang === 'ar';
  const dir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? 'right' : 'left';
  const start = isRtl ? 'flex-end' : 'flex-start';

  return {
    row: { flexDirection: dir, alignItems: 'center' },
    rowTop: { flexDirection: dir, alignItems: 'flex-start' },
    rowBetween: {
      flexDirection: dir,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    text: { textAlign, writingDirection: isRtl ? 'rtl' : 'ltr' },
    field: {
      flexDirection: dir,
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1.2,
      borderColor: colors.line,
      borderRadius: radius.sm + 2,
      paddingHorizontal: spacing.md,
      minHeight: 52,
    },
    fieldInput: {
      flex: 1,
      textAlign,
      writingDirection: isRtl ? 'rtl' : 'ltr',
    },
    sectionHeader: {
      flexDirection: dir,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    chipRow: { flexDirection: dir, gap: spacing.sm },
    appBar: {
      flexDirection: dir,
      alignItems: 'center',
      height: 54,
      paddingHorizontal: spacing.lg,
    },
    appBarSide: { width: 40, alignItems: start },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dividerRow: { flexDirection: dir, alignItems: 'center', gap: spacing.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
    pill: {
      flexDirection: dir,
      alignItems: 'center',
      gap: 5,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 9,
      alignSelf: 'flex-start',
    },
    metricChip: {
      flexDirection: dir,
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 8,
    },
    metricIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.24)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
}

/** Hook: direction-aware styles for the current language. */
export function useLayout(lang: 'ar' | 'fr'): LayoutStyles {
  return useMemo(() => buildLayout(lang), [lang]);
}
