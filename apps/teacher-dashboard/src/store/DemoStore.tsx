import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import {
  createDemoState,
  type Announcement,
  type Course,
  type CourseStatus,
  type DemoState,
  type EnrollmentStatus,
  type Lesson,
  type TeacherProfile,
} from '@ostadiplus/shared';

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export type Action =
  | { type: 'replace'; state: DemoState }
  | { type: 'reset' }
  | { type: 'course/create'; payload: NewCourse }
  | { type: 'course/update'; payload: { id: string; patch: Partial<Course> } }
  | { type: 'course/setStatus'; payload: { id: string; status: CourseStatus } }
  | { type: 'course/delete'; payload: { id: string } }
  | { type: 'chapter/add'; payload: { courseId: string; title: string } }
  | {
      type: 'chapter/update';
      payload: { courseId: string; chapterId: string; title: string };
    }
  | {
      type: 'chapter/delete';
      payload: { courseId: string; chapterId: string };
    }
  | {
      type: 'chapter/move';
      payload: { courseId: string; chapterId: string; dir: -1 | 1 };
    }
  | {
      type: 'lesson/add';
      payload: { courseId: string; chapterId: string; lesson: NewLesson };
    }
  | {
      type: 'lesson/update';
      payload: {
        courseId: string;
        chapterId: string;
        lessonId: string;
        patch: Partial<Lesson>;
      };
    }
  | {
      type: 'lesson/delete';
      payload: { courseId: string; chapterId: string; lessonId: string };
    }
  | {
      type: 'lesson/move';
      payload: {
        courseId: string;
        chapterId: string;
        lessonId: string;
        dir: -1 | 1;
      };
    }
  | {
      type: 'lesson/setPublished';
      payload: {
        courseId: string;
        chapterId: string;
        lessonId: string;
        published: boolean;
      };
    }
  | {
      type: 'enrollment/setStatus';
      payload: { studentId: string; courseId: string; status: EnrollmentStatus };
    }
  | {
      type: 'student/create';
      payload: {
        fullName: string;
        phone: string;
        level: string;
        courseId: string | null;
        authorize: boolean;
      };
    }
  | { type: 'announcement/create'; payload: NewAnnouncement }
  | { type: 'announcement/delete'; payload: { id: string } }
  | { type: 'teacher/update'; payload: Partial<TeacherProfile> };

export interface NewCourse {
  id: string;
  title: string;
  subject: string;
  level: string;
  summary: string;
  cover: Course['cover'];
}

export interface NewLesson {
  title: string;
  kind: Lesson['kind'];
  file: string;
  durationSec: number;
  pages: number;
  sizeMb: number;
  published: boolean;
}

export interface NewAnnouncement {
  title: string;
  body: string;
  courseId: string | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'ostadiplus.demo.v1';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let counter = 0;
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;

function touch(state: DemoState, courseId?: string) {
  if (!courseId) return;
  const course = state.courses.find((c) => c.id === courseId);
  if (course) course.updatedAt = new Date().toISOString();
}

function logActivity(
  state: DemoState,
  kind: DemoState['activity'][number]['kind'],
  text: string,
) {
  state.activity.unshift({
    id: newId('ac'),
    kind,
    text,
    at: new Date().toISOString(),
  });
  state.activity = state.activity.slice(0, 24);
}

function requireCourse(state: DemoState, id: string): Course {
  const course = state.courses.find((c) => c.id === id);
  if (!course) throw new Error(`الدورة غير موجودة: ${id}`);
  return course;
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

function findChapter(course: Course, chapterId: string) {
  const index = course.chapters.findIndex((c) => c.id === chapterId);
  if (index < 0) throw new Error('الفصل غير موجود');
  return { chapter: course.chapters[index], index };
}

function swap<T>(list: T[], index: number, dir: -1 | 1) {
  const target = index + dir;
  if (target < 0 || target >= list.length) return;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  list.splice(0, list.length, ...next);
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'replace':
      return action.state;

    case 'reset':
      return createDemoState();

    /* ---------------- courses ---------------- */

    case 'course/create': {
      const next = clone(state);
      const nowIso = new Date().toISOString();
      next.courses.unshift({
        ...action.payload,
        status: 'draft',
        createdAt: nowIso,
        updatedAt: nowIso,
        chapters: [],
      });
      logActivity(next, 'course', `تم إنشاء دورة «${action.payload.title}»`);
      return next;
    }

    case 'course/update': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.id);
      Object.assign(course, action.payload.patch);
      course.updatedAt = new Date().toISOString();
      return next;
    }

    case 'course/setStatus': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.id);
      course.status = action.payload.status;
      course.updatedAt = new Date().toISOString();
      if (action.payload.status === 'published') {
        course.publishedAt = course.publishedAt ?? new Date().toISOString();
        logActivity(next, 'course', `تم نشر دورة «${course.title}»`);
      } else {
        logActivity(next, 'course', `تم إيقاف نشر دورة «${course.title}»`);
      }
      return next;
    }

    case 'course/delete': {
      const next = clone(state);
      const course = next.courses.find((c) => c.id === action.payload.id);
      next.courses = next.courses.filter((c) => c.id !== action.payload.id);
      next.enrollments = next.enrollments.filter(
        (e) => e.courseId !== action.payload.id,
      );
      if (course) logActivity(next, 'course', `تم حذف دورة «${course.title}»`);
      return next;
    }

    /* ---------------- chapters ---------------- */

    case 'chapter/add': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      course.chapters.push({
        id: newId('chp'),
        title: action.payload.title,
        lessons: [],
      });
      touch(next, course.id);
      return next;
    }

    case 'chapter/update': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { chapter } = findChapter(course, action.payload.chapterId);
      chapter.title = action.payload.title;
      touch(next, course.id);
      return next;
    }

    case 'chapter/delete': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      course.chapters = course.chapters.filter(
        (c) => c.id !== action.payload.chapterId,
      );
      touch(next, course.id);
      return next;
    }

    case 'chapter/move': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { index } = findChapter(course, action.payload.chapterId);
      swap(course.chapters, index, action.payload.dir);
      touch(next, course.id);
      return next;
    }

    /* ---------------- lessons ---------------- */

    case 'lesson/add': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { chapter } = findChapter(course, action.payload.chapterId);
      chapter.lessons.push({ id: newId('lsn'), ...action.payload.lesson });
      touch(next, course.id);
      logActivity(
        next,
        'lesson',
        `تمت إضافة درس «${action.payload.lesson.title}» إلى ${course.title}`,
      );
      return next;
    }

    case 'lesson/update': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { chapter } = findChapter(course, action.payload.chapterId);
      const target = chapter.lessons.find((l) => l.id === action.payload.lessonId);
      if (!target) throw new Error('الدرس غير موجود');
      Object.assign(target, action.payload.patch);
      touch(next, course.id);
      return next;
    }

    case 'lesson/delete': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { chapter } = findChapter(course, action.payload.chapterId);
      chapter.lessons = chapter.lessons.filter(
        (l) => l.id !== action.payload.lessonId,
      );
      touch(next, course.id);
      return next;
    }

    case 'lesson/move': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { chapter } = findChapter(course, action.payload.chapterId);
      const index = chapter.lessons.findIndex(
        (l) => l.id === action.payload.lessonId,
      );
      swap(chapter.lessons, index, action.payload.dir);
      touch(next, course.id);
      return next;
    }

    case 'lesson/setPublished': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { chapter } = findChapter(course, action.payload.chapterId);
      const target = chapter.lessons.find((l) => l.id === action.payload.lessonId);
      if (!target) throw new Error('الدرس غير موجود');
      target.published = action.payload.published;
      touch(next, course.id);
      if (action.payload.published) {
        logActivity(next, 'lesson', `تم نشر الدرس «${target.title}»`);
      }
      return next;
    }

    /* ---------------- students ---------------- */

    case 'enrollment/setStatus': {
      const next = clone(state);
      const enrollment = next.enrollments.find(
        (e) =>
          e.studentId === action.payload.studentId &&
          e.courseId === action.payload.courseId,
      );
      const student = next.students.find(
        (s) => s.id === action.payload.studentId,
      );
      const course = next.courses.find((c) => c.id === action.payload.courseId);

      if (enrollment) {
        enrollment.status = action.payload.status;
        if (action.payload.status === 'active') {
          enrollment.authorizedAt = new Date().toISOString();
          enrollment.authorizedBy = next.teacher.name;
        }
      } else if (action.payload.status !== 'pending') {
        next.enrollments.push({
          id: newId('enr'),
          studentId: action.payload.studentId,
          courseId: action.payload.courseId,
          status: action.payload.status,
          authorizedAt: new Date().toISOString(),
          authorizedBy: next.teacher.name,
          expiresAt: new Date(Date.now() + 214 * 86400000).toISOString(),
        });
      }

      const verb =
        action.payload.status === 'active'
          ? 'تم تفعيل وصول'
          : action.payload.status === 'suspended'
            ? 'تم إيقاف وصول'
            : 'تم إرجاع الطلب';
      logActivity(
        next,
        'student',
        `${verb} «${student?.fullName ?? ''}» في دورة ${course?.title ?? ''}`,
      );
      return next;
    }

    case 'student/create': {
      const next = clone(state);
      const nowIso = new Date().toISOString();
      const id = newId('st');
      const parts = action.payload.fullName.trim().split(/\s+/);
      const monogram = parts.slice(0, 2).map((p) => p[0]).join('');
      next.students.unshift({
        id,
        fullName: action.payload.fullName.trim(),
        phone: action.payload.phone.trim(),
        email: `${id}@example.ma`,
        level: action.payload.level,
        joinedAt: nowIso,
        monogram: monogram || 'ط',
      });
      if (action.payload.courseId) {
        next.enrollments.push({
          id: newId('enr'),
          studentId: id,
          courseId: action.payload.courseId,
          status: action.payload.authorize ? 'active' : 'pending',
          authorizedAt: nowIso,
          authorizedBy: next.teacher.name,
          expiresAt: new Date(Date.now() + 214 * 86400000).toISOString(),
        });
      }
      logActivity(
        next,
        'student',
        `تمت إضافة التلميذ «${action.payload.fullName.trim()}»${
          action.payload.authorize && action.payload.courseId
            ? ' مع تفعيل الوصول'
            : ''
        }`,
      );
      return next;
    }

    /* ---------------- announcements ---------------- */

    case 'announcement/create': {
      const next = clone(state);
      const announcement: Announcement = {
        id: newId('an'),
        title: action.payload.title.trim(),
        body: action.payload.body.trim(),
        courseId: action.payload.courseId,
        publishedAt: new Date().toISOString(),
      };
      next.announcements.unshift(announcement);
      logActivity(
        next,
        'announcement',
        `تم نشر إعلان «${announcement.title}»`,
      );
      return next;
    }

    case 'announcement/delete': {
      const next = clone(state);
      next.announcements = next.announcements.filter(
        (a) => a.id !== action.payload.id,
      );
      return next;
    }

    case 'teacher/update': {
      const next = clone(state);
      Object.assign(next.teacher, action.payload);
      return next;
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface StoreValue {
  state: DemoState;
  dispatch: Dispatch<Action>;
  notify: (message: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  /** Serialize the current state for transfer to the phone app. */
  exportPayload: () => Promise<string>;
  isDirty: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadInitial(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && Array.isArray(parsed.courses)) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  return createDemoState();
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  /** `true` once the teacher changed something from the shipped sample data. */
  const isDirty = useMemo(() => {
    try {
      return JSON.stringify(state) !== JSON.stringify(createDemoState());
    } catch {
      return false;
    }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full — the in-memory state still works */
    }
  }, [state]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: Toast['tone'] = 'success') => {
      const id = newId('toast');
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      const handle = window.setTimeout(() => dismissToast(id), 3600);
      timers.current.push(handle);
    },
    [dismissToast],
  );

  const exportPayload = useCallback(async () => {
    const { encodeDemoState } = await import('@ostadiplus/shared');
    return encodeDemoState(state);
  }, [state]);

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, notify, toasts, dismissToast, exportPayload, isDirty }),
    [state, notify, toasts, dismissToast, exportPayload, isDirty],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside DemoStoreProvider');
  return ctx;
}

/** Convenience wrapper: dispatch + toast in one call. */
export function useAction() {
  const { dispatch, notify } = useStore();
  return useCallback(
    (action: Action, successMessage?: string) => {
      dispatch(action);
      if (successMessage) notify(successMessage);
    },
    [dispatch, notify],
  );
}
