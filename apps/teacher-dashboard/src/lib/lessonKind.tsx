import { translate as t } from '@/i18n/locale';
import {
  FileText,
  Film,
  GraduationCap,
  Image as ImageIcon,
  ListChecks,
  PenLine,
  Type as TypeIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  formatDuration,
  formatSize,
  type Lesson,
  type LessonKind,
} from '@ostadiplus/shared';

/** Icon + colours for every lesson kind, shared across the curriculum UI. */
export interface KindMeta {
  icon: LucideIcon;
  label: string;
  soft: string;
  dark: string;
}

export const KIND_META: Record<LessonKind, KindMeta> = {
  video: {
    icon: Film,
    label: 'فيديو',
    soft: 'var(--color-brand-soft)',
    dark: 'var(--color-brand-dark)',
  },
  pdf: {
    icon: FileText,
    label: 'ملف PDF',
    soft: 'var(--color-danger-soft)',
    dark: 'var(--color-danger)',
  },
  text: {
    icon: TypeIcon,
    label: 'نص وصور',
    soft: 'var(--color-success-soft)',
    dark: 'var(--color-success)',
  },
  quiz: {
    icon: ListChecks,
    label: 'اختبار',
    soft: 'var(--color-accent-soft)',
    dark: 'var(--color-brand)',
  },
  image: {
    icon: ImageIcon,
    label: 'صورة',
    soft: 'var(--color-surface-alt)',
    dark: 'var(--color-muted)',
  },
  exercise: {
    icon: PenLine,
    label: 'تمرين',
    soft: 'var(--color-surface-alt)',
    dark: 'var(--color-muted)',
  },
  exam: {
    icon: GraduationCap,
    label: 'امتحان',
    soft: 'var(--color-surface-alt)',
    dark: 'var(--color-muted)',
  },
};

/** Does the lesson have real content attached? */
export function hasContent(lesson: Lesson): boolean {
  if (lesson.kind === 'quiz') return (lesson.questions?.length ?? 0) > 0;
  if (lesson.kind === 'text') return !!lesson.body?.trim();
  return !!lesson.file;
}

/** Short meta line shown under a lesson title. */
export function lessonMeta(lesson: Lesson): string {
  if (lesson.kind === 'video') {
    return `${formatDuration(lesson.durationSec)} · ${formatSize(lesson.sizeMb)}`;
  }
  if (lesson.kind === 'pdf')
    return t('{0} صفحات · {1}', [lesson.pages, formatSize(lesson.sizeMb)]);
  if (lesson.kind === 'quiz')
    return t('{0} أسئلة', [lesson.questions?.length ?? 0]);
  if (lesson.kind === 'text') return lesson.body?.trim() ? t('نص') : '';
  return '';
}
