import type {
  Chapter,
  Course,
  CourseTeacher,
  DemoState,
  Enrollment,
  Lesson,
  LessonProgress,
  Semester,
} from './types';

/* ------------------------------------------------------------------ */
/* Course helpers                                                      */
/* ------------------------------------------------------------------ */

/** Every topic of a course, across both semesters. */
export function allChapters(course: Course): Chapter[] {
  return course.semesters.flatMap((s) => s.chapters);
}

export function allLessons(course: Course): Lesson[] {
  return allChapters(course).flatMap((c) => c.lessons);
}

/** Number of topics (chapters) in a course, semesters included. */
export function countChapters(course: Course): number {
  return allChapters(course).length;
}

/** Locate a topic and the semester that holds it. */
export function findChapter(
  course: Course,
  chapterId: string,
): {
  semester: Semester;
  semesterIndex: number;
  chapter: Chapter;
  chapterIndex: number;
} | undefined {
  for (let si = 0; si < course.semesters.length; si++) {
    const semester = course.semesters[si];
    const chapterIndex = semester.chapters.findIndex((c) => c.id === chapterId);
    if (chapterIndex >= 0) {
      return { semester, semesterIndex: si, chapter: semester.chapters[chapterIndex], chapterIndex };
    }
  }
  return undefined;
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

/**
 * The prof who owns a course — the one the student should see credited.
 * Falls back to the platform teacher profile for courses that do not
 * declare an owner yet (e.g. ones created from the dashboard).
 */
export function courseTeacher(state: DemoState, course: Course): CourseTeacher {
  if (course.teacher) return course.teacher;
  return {
    name: state.teacher.name,
    subject: state.teacher.subject,
    monogram: state.teacher.monogram,
    photo: state.teacher.photo,
  };
}

export function findLesson(
  state: DemoState,
  lessonId: string,
): {
  course: Course;
  lesson: Lesson;
  semesterIndex: number;
  chapterIndex: number;
  lessonIndex: number;
} | undefined {
  for (const course of state.courses) {
    for (let si = 0; si < course.semesters.length; si++) {
      const chapters = course.semesters[si].chapters;
      for (let ci = 0; ci < chapters.length; ci++) {
        const li = chapters[ci].lessons.findIndex((l) => l.id === lessonId);
        if (li >= 0) {
          return {
            course,
            lesson: chapters[ci].lessons[li],
            semesterIndex: si,
            chapterIndex: ci,
            lessonIndex: li,
          };
        }
      }
    }
  }
  return undefined;
}

/** Flatten with semester + chapter metadata — used to render lesson lists. */
export interface LessonRow {
  lesson: Lesson;
  semester: string;
  semesterIndex: number;
  chapter: string;
  chapterIndex: number;
  index: number;
  /** Global 0-based position inside the course. */
  globalIndex: number;
}

export function lessonRows(course: Course): LessonRow[] {
  const rows: LessonRow[] = [];
  let global = 0;
  course.semesters.forEach((semester, si) => {
    semester.chapters.forEach((chapter, ci) => {
      chapter.lessons.forEach((lesson, li) => {
        rows.push({
          lesson,
          semester: semester.title,
          semesterIndex: si,
          chapter: chapter.title,
          chapterIndex: ci,
          index: li,
          globalIndex: global++,
        });
      });
    });
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/* Access / enrollment                                                 */
/* ------------------------------------------------------------------ */

/** Returns true when the enrollment's access window has elapsed. */
export function isEnrollmentExpired(e: Enrollment): boolean {
  return e.status === 'active' && new Date(e.expiresAt) < new Date();
}

export function enrollmentsOf(state: DemoState, studentId: string) {
  return state.enrollments.filter((e) => e.studentId === studentId);
}

/** Active enrollments that have not expired. */
export function activeEnrollments(state: DemoState, studentId: string) {
  return state.enrollments.filter(
    (e) => e.studentId === studentId && e.status === 'active' && !isEnrollmentExpired(e),
  );
}

/** Enrollments whose status is 'active' but expiresAt is in the past. */
export function expiredEnrollments(state: DemoState, studentId: string) {
  return state.enrollments.filter(
    (e) => e.studentId === studentId && isEnrollmentExpired(e),
  );
}

/**
 * Courses a student may actually open: published + active + not expired.
 * Mirrors PRD rule ENR-06.
 */
export function accessibleCourses(state: DemoState, studentId: string): Course[] {
  const ids = new Set(
    state.enrollments
      .filter(
        (e) =>
          e.studentId === studentId &&
          e.status === 'active' &&
          !isEnrollmentExpired(e),
      )
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
          e.status === 'active' &&
          !isEnrollmentExpired(e) &&
          (!courseId || e.courseId === courseId),
      )
      .map((e) => e.studentId),
  );
  return set.size;
}

export function expiredStudentCount(state: DemoState): number {
  const set = new Set(
    state.enrollments.filter(isEnrollmentExpired).map((e) => e.studentId),
  );
  return set.size;
}

/* ------------------------------------------------------------------ */
/* Center memberships                                                  */
/* ------------------------------------------------------------------ */

/** Unread notification count for a student. */
export function unreadNotificationCount(state: DemoState, studentId: string): number {
  if (!state.notifications) return 0;
  return state.notifications.filter(
    (n) => n.studentId === studentId && !n.read,
  ).length;
}

/** Active center memberships for a student. */
export function activeMemberships(state: DemoState, studentId: string) {
  if (!state.memberships) return [];
  return state.memberships.filter(
    (m) => m.studentId === studentId && m.status === 'active',
  );
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
  if (Math.abs(minutes) < 1) return locale === 'fr' ? 'maintenant' : 'الآن';

  // Hermes (React Native's engine) does not implement Intl.RelativeTimeFormat,
  // so feature-detect and fall back to equivalent wording.
  const rtf =
    typeof Intl.RelativeTimeFormat === 'function'
      ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      : null;
  const fmt = (value: number, unit: 'minute' | 'hour' | 'day' | 'month'): string => {
    if (rtf) return rtf.format(value, unit);
    if (locale === 'fr') {
      const past = value < 0;
      const n = Math.abs(value);
      const words: Record<typeof unit, string> = {
        minute: n > 1 ? `${n} minutes` : '1 minute',
        hour: n > 1 ? `${n} heures` : '1 heure',
        day: n === 1 ? 'hier' : `${n} jours`,
        month: n > 1 ? `${n} mois` : '1 mois',
      };
      return past ? `il y a ${words[unit]}` : `dans ${words[unit]}`;
    }
    // Arabic fallback
    const past = value < 0;
    const n = Math.abs(value);
    if (unit === 'day' && n === 1) return past ? 'أمس' : 'غداً';
    const words: Record<typeof unit, [string, string, string]> = {
      minute: ['دقيقة', 'دقيقتين', 'دقائق'],
      hour: ['ساعة', 'ساعتين', 'ساعات'],
      day: ['يوم', 'يومين', 'أيام'],
      month: ['شهر', 'شهرين', 'أشهر'],
    };
    const [one, two, many] = words[unit];
    const amount = n === 1 ? one : n === 2 ? two : `${n} ${many}`;
    return past ? `قبل ${amount}` : `خلال ${amount}`;
  };

  if (Math.abs(minutes) < 60) return fmt(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return fmt(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return fmt(-days, 'day');
  const months = Math.round(days / 30);
  return fmt(-months, 'month');
}

export function formatDate(iso: string, locale = 'ar-MA'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function shortDate(iso: string, locale = 'ar-MA'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}
