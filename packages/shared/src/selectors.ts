import type {
  Course,
  DemoState,
  Lesson,
  LessonProgress,
} from './types';

/* ------------------------------------------------------------------ */
/* Course helpers                                                      */
/* ------------------------------------------------------------------ */

export function allLessons(course: Course): Lesson[] {
  return course.chapters.flatMap((c) => c.lessons);
}

export function countLessons(course: Course): number {
  return allLessons(course).length;
}

export function courseDurationSec(course: Course): number {
  return allLessons(course).reduce((sum, l) => sum + l.durationSec, 0);
}

export function findCourse(state: DemoState, courseId: string): Course | undefined {
  return state.courses.find((c) => c.id === courseId);
}

export function findLesson(
  state: DemoState,
  lessonId: string,
): { course: Course; lesson: Lesson; chapterIndex: number; lessonIndex: number } | undefined {
  for (const course of state.courses) {
    for (let ci = 0; ci < course.chapters.length; ci++) {
      const chapter = course.chapters[ci];
      const li = chapter.lessons.findIndex((l) => l.id === lessonId);
      if (li >= 0) {
        return { course, lesson: chapter.lessons[li], chapterIndex: ci, lessonIndex: li };
      }
    }
  }
  return undefined;
}

/** Flatten with chapter metadata — used to render the lesson list. */
export interface LessonRow {
  lesson: Lesson;
  chapter: string;
  chapterIndex: number;
  index: number;
  /** Global 0-based position inside the course. */
  globalIndex: number;
}

export function lessonRows(course: Course): LessonRow[] {
  const rows: LessonRow[] = [];
  let global = 0;
  course.chapters.forEach((chapter, ci) => {
    chapter.lessons.forEach((lesson, li) => {
      rows.push({
        lesson,
        chapter: chapter.title,
        chapterIndex: ci,
        index: li,
        globalIndex: global++,
      });
    });
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/* Access / enrollment                                                 */
/* ------------------------------------------------------------------ */

export function enrollmentsOf(state: DemoState, studentId: string) {
  return state.enrollments.filter((e) => e.studentId === studentId);
}

/**
 * Courses a student may actually open: published + active enrollment.
 * Mirrors PRD rule ENR-06.
 */
export function accessibleCourses(state: DemoState, studentId: string): Course[] {
  const ids = new Set(
    state.enrollments
      .filter((e) => e.studentId === studentId && e.status === 'active')
      .map((e) => e.courseId),
  );
  return state.courses.filter((c) => c.status === 'published' && ids.has(c.id));
}

export function enrollmentFor(
  state: DemoState,
  studentId: string,
  courseId: string,
) {
  return state.enrollments.find(
    (e) => e.studentId === studentId && e.courseId === courseId,
  );
}

export function activeStudentCount(state: DemoState, courseId?: string): number {
  const set = new Set(
    state.enrollments
      .filter(
        (e) =>
          e.status === 'active' && (!courseId || e.courseId === courseId),
      )
      .map((e) => e.studentId),
  );
  return set.size;
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function progressFor(
  state: DemoState,
  studentId: string,
): LessonProgress[] {
  return state.progress[studentId] ?? [];
}

export function lessonProgress(
  state: DemoState,
  studentId: string,
  lessonId: string,
): LessonProgress | undefined {
  return progressFor(state, studentId).find((p) => p.lessonId === lessonId);
}

export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
  /** First unfinished lesson, else the last one touched. */
  nextLessonId: string | null;
  lastPositionSec: number;
}

export function courseProgress(
  state: DemoState,
  studentId: string,
  course: Course,
): CourseProgress {
  const lessons = allLessons(course);
  const tracked = progressFor(state, studentId);
  let completed = 0;
  let nextLessonId: string | null = null;
  let lastPositionSec = 0;

  for (const lesson of lessons) {
    const p = tracked.find((t) => t.lessonId === lesson.id);
    if (p?.completed) {
      completed += 1;
    } else if (!nextLessonId) {
      nextLessonId = lesson.id;
      lastPositionSec = p?.positionSec ?? 0;
    }
  }

  if (!nextLessonId && lessons.length > 0) {
    nextLessonId = lessons[lessons.length - 1].id;
    lastPositionSec =
      tracked.find((t) => t.lessonId === nextLessonId)?.positionSec ?? 0;
  }

  const total = lessons.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percent, nextLessonId, lastPositionSec };
}

/** A flat "continue learning" item across every accessible course. */
export interface ContinueItem {
  course: Course;
  lesson: Lesson;
  positionSec: number;
  percent: number;
}

/**
 * The single most useful next action: the lesson the student was watching
 * (largest saved position); otherwise the first unfinished lesson of the
 * first enrolled course.
 */
export function continueLearning(
  state: DemoState,
  studentId: string,
): ContinueItem | null {
  const candidates: ContinueItem[] = [];

  for (const course of accessibleCourses(state, studentId)) {
    const progress = courseProgress(state, studentId, course);
    if (!progress.nextLessonId) continue;
    const lesson = allLessons(course).find((l) => l.id === progress.nextLessonId);
    if (!lesson) continue;
    candidates.push({
      course,
      lesson,
      positionSec: progress.lastPositionSec,
      percent: progress.percent,
    });
  }

  if (candidates.length === 0) return null;
  const inProgress = candidates.filter((c) => c.positionSec > 0);
  if (inProgress.length > 0) {
    return inProgress.reduce((a, b) => (b.positionSec > a.positionSec ? b : a));
  }
  return candidates[0];
}

/* ------------------------------------------------------------------ */
/* Activity feed                                                       */
/* ------------------------------------------------------------------ */

export function relativeTime(iso: string, locale = 'ar'): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(minutes) < 1) return 'الآن';
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(-days, 'day');
  const months = Math.round(days / 30);
  return rtf.format(-months, 'month');
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ar-MA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('ar-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}
