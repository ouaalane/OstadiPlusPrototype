/**
 * Lesson-kind helpers shared by the student screens: which route opens a
 * lesson, its row icon, tint and short meta text.
 */

import { Ionicons } from '@expo/vector-icons';
import {
  formatDuration,
  type Lesson,
  type LessonKind,
} from '@ostadiplus/shared';
import { colors } from '../theme';

/** Stack route that opens a lesson of the given kind. */
export function lessonRoute(kind: LessonKind): 'Video' | 'Pdf' | 'Reader' | 'Quiz' {
  if (kind === 'video') return 'Video';
  if (kind === 'quiz') return 'Quiz';
  if (kind === 'text') return 'Reader';
  return 'Pdf';
}

const LESSON_KINDS: LessonKind[] = ['video', 'pdf', 'text', 'quiz', 'image', 'exercise', 'exam'];

/**
 * Narrows a `LessonKind` that arrived as data — a push payload or a stored
 * notification holds plain strings, so it has to be validated before use.
 */
export function lessonKindOf(value: string | undefined): LessonKind {
  return LESSON_KINDS.find((kind) => kind === value) ?? 'pdf';
}

/** Ionicons glyph shown on a lesson row for each kind. */
export const LESSON_ICONS: Record<LessonKind, keyof typeof Ionicons.glyphMap> = {
  video: 'play',
  pdf: 'document-text',
  text: 'reader',
  quiz: 'help-circle',
  image: 'image',
  exercise: 'create',
  exam: 'ribbon',
};

/** Soft/dark colour pair for the lesson-kind badge. */
export function lessonTint(kind: LessonKind): { soft: string; dark: string } {
  switch (kind) {
    case 'video':
      return { soft: colors.brandSoft, dark: colors.brandDark };
    case 'quiz':
      return { soft: colors.accentSoft, dark: colors.brand };
    case 'text':
      return { soft: colors.successSoft, dark: colors.success };
    case 'pdf':
      return { soft: colors.dangerSoft, dark: colors.danger };
    default:
      return { soft: colors.brandSofter, dark: colors.faint };
  }
}

/** Short meta line for a lesson row (duration / pages / questions). */
export function lessonMetaText(lesson: Lesson, lang: 'ar' | 'fr'): string | null {
  if (lesson.kind === 'video') return formatDuration(lesson.durationSec);
  if (lesson.kind === 'pdf') {
    return lang === 'ar'
      ? `${lesson.pages} صفحات`
      : `${lesson.pages} pages`;
  }
  if (lesson.kind === 'quiz') {
    const count = lesson.questions?.length ?? 0;
    return lang === 'ar' ? `${count} أسئلة` : `${count} questions`;
  }
  return null;
}
