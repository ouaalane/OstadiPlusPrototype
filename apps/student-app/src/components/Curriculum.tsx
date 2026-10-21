/**
 * Compact Udemy-style curriculum rows.
 *
 * Shared by the course detail screen and the lesson player so both places show
 * the same numbered lesson rows, completion checks and download affordances.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  formatDuration,
  type Lesson,
} from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { AppText } from './ui';
import { DownloadButton } from './DownloadButton';
import { lessonMetaText } from '../lib/lesson';
import type { DownloadStatus } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';

const SECTION_DOWNLOAD_ICON = 'cloud-download-outline';

/** Section header with a bulk-download affordance, Udemy style. */
export function CurriculumSectionHeader({
  title,
  lessonCount,
  durationSec,
  onDownloadAll,
  downloadAllLabel,
  downloadAllDisabled,
  downloadAllStatus,
  downloadAllProgress = 0,
}: {
  title: string;
  lessonCount: number;
  durationSec: number;
  onDownloadAll?: () => void;
  downloadAllLabel: string;
  downloadAllDisabled?: boolean;
  /** Aggregate state of every video in the section. */
  downloadAllStatus?: DownloadStatus;
  downloadAllProgress?: number;
}) {
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const meta = `${lessonCount} ${rtl ? 'دروس' : lessonCount === 1 ? 'leçon' : 'leçons'}${
    durationSec > 0 ? ` · ${durationLabel(durationSec, rtl)}` : ''
  }`;

  return (
    <View style={[styles.sectionHead, l.rowBetween]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText size={15.5} weight="bold" tone="ink" numberOfLines={2}>
          {title}
        </AppText>
        <AppText size={11.5} tone="muted">
          {meta}
        </AppText>
      </View>
      {onDownloadAll ? (
        <DownloadButton
          status={downloadAllStatus}
          progress={downloadAllProgress}
          onPress={onDownloadAll}
          label={downloadAllLabel}
          disabled={downloadAllDisabled}
          size={32}
          idleIcon={SECTION_DOWNLOAD_ICON}
        />
      ) : null}
    </View>
  );
}

/** One numbered lesson row. */
export function CurriculumRow({
  lesson,
  number,
  first = false,
  current = false,
  completed = false,
  accessible = true,
  status,
  progress = 0,
  onPress,
  onDownload,
  downloadLabel,
  bundled = false,
}: {
  lesson: Lesson;
  number: number;
  first?: boolean;
  current?: boolean;
  completed?: boolean;
  accessible?: boolean;
  status?: DownloadStatus;
  progress?: number;
  onPress: () => void;
  /** Video download action, or open-document action for a bundled PDF. */
  onDownload?: () => void;
  downloadLabel: string;
  /** PDF/document ships inside the app — already available offline. */
  bundled?: boolean;
}) {
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const baseMeta = curriculumMetaText(lesson, lang);

  const meta = baseMeta;

  const showDownload = !!onDownload && (lesson.kind === 'video' || lesson.kind === 'pdf');

  return (
    <Pressable
      onPress={onPress}
      disabled={!accessible}
      style={({ pressed }) => [
        styles.row,
        l.row,
        !first && styles.rowDivider,
        current && { backgroundColor: colors.brandSofter },
        pressed && accessible && { backgroundColor: colors.brandSoft },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${rtl ? 'الدرس' : 'Leçon'} ${number}: ${lesson.title}${
        meta ? ` — ${meta}` : ''
      }${current ? (rtl ? '، قيد المشاهدة' : ', en cours') : ''}${
        completed ? (rtl ? '، مكتمل' : ', terminée') : ''
      }${accessible ? '' : rtl ? '، مقفل' : ', verrouillée'}`}
      accessibilityHint={
        accessible ? (rtl ? 'يفتح الدرس' : 'Ouvre la leçon') : undefined
      }
      accessibilityState={{ disabled: !accessible }}
    >
      <View
        style={[
          styles.number,
          current && { backgroundColor: colors.brand },
          completed && !current && { backgroundColor: colors.successSoft },
        ]}
        importantForAccessibility="no"
      >
        <AppText
          size={12}
          weight="bold"
          tone={current ? 'white' : completed ? 'success' : accessible ? 'brand' : 'faint'}
        >
          {number}
        </AppText>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={[l.row, { gap: 5 }]}>
          <AppText
            size={13.5}
            weight={current ? 'bold' : 'semibold'}
            tone={accessible ? 'ink' : 'faint'}
            numberOfLines={2}
            style={{ flex: 1 }}
          >
            {lesson.title}
          </AppText>
          {completed ? (
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={colors.success}
              importantForAccessibility="no"
            />
          ) : null}
        </View>
        <AppText size={11.5} tone={accessible ? 'muted' : 'faint'} numberOfLines={2}>
          {meta || (rtl ? 'درس' : 'Leçon')}
        </AppText>
      </View>

      {showDownload ? (
        <DownloadButton
          status={status}
          progress={progress}
          onPress={onDownload!}
          label={downloadLabel}
          bundled={bundled}
          disabled={!accessible}
          size={30}
        />
      ) : (
        <Ionicons
          name={rtl ? 'chevron-back' : 'chevron-forward'}
          size={17}
          color={accessible ? colors.faint : colors.lineStrong}
          importantForAccessibility="no"
        />
      )}
    </Pressable>
  );
}

/**
 * Udemy-style row meta: «Vidéo - 04:35 minutes», «PDF - 8 pages».
 * Durations always pad the minutes so the row lines up across a section.
 */
function curriculumMetaText(lesson: Lesson, lang: 'ar' | 'fr'): string | null {
  const rtl = lang === 'ar';
  if (lesson.kind === 'video') {
    const total = Math.max(0, Math.round(lesson.durationSec || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    const clock = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    return rtl ? `فيديو - ${clock} دقيقة` : `Vidéo - ${clock} minutes`;
  }
  if (lesson.kind === 'pdf') {
    return rtl ? `PDF - ${lesson.pages} صفحات` : `PDF - ${lesson.pages} pages`;
  }
  return lessonMetaText(lesson, lang);
}

/** «3h 20m» / «3 س 20 د». */
function durationLabel(seconds: number, rtl: boolean): string {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} ${rtl ? 'دقيقة' : 'min'}`;
  if (m === 0) return `${h} ${rtl ? 'ساعة' : 'h'}`;
  return rtl ? `${h} س ${m} د` : `${h}h ${m}m`;
}

/** Handy for a one-off duration label in the same visual language. */
export function curriculumDuration(seconds: number, rtl: boolean): string {
  return durationLabel(seconds || 0, rtl);
}

/** Sum of a list of lessons, used by the section header. */
export function lessonsDuration(lessons: Lesson[]): number {
  return lessons.reduce((sum, lesson) => sum + (lesson.durationSec || 0), 0);
}

/** Safe fallback when a lesson has no duration but a document has pages. */
export function lessonRuntimeLabel(lesson: Lesson): string | null {
  return lesson.kind === 'video' ? formatDuration(lesson.durationSec) : null;
}

const styles = StyleSheet.create({
  sectionHead: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  number: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
