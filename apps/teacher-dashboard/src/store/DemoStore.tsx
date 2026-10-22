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
  type Center,
  type CenterMembership,
  type Course,
  type CourseStatus,
  type DemoState,
  type EnrollmentStatus,
  type Lang,
  type Lesson,
  type QnaReply,
  type TeacherProfile,
} from '@ostadiplus/shared';

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export type Action =
  | { type: 'replace'; state: DemoState }
  | { type: 'reset' }
  | { type: 'setLang'; lang: Lang }
  | { type: 'course/create'; payload: NewCourse }
  | { type: 'course/update'; payload: { id: string; patch: Partial<Course> } }
  | { type: 'course/setStatus'; payload: { id: string; status: CourseStatus } }
  | { type: 'course/delete'; payload: { id: string } }
  | {
      type: 'chapter/add';
      payload: { courseId: string; semesterId: string; title: string };
    }
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
      payload: {
        studentId: string;
        courseId: string;
        status: EnrollmentStatus;
        durationMonths?: number;
      };
    }
  | {
      type: 'enrollment/renew';
      payload: { studentId: string; courseId: string; durationMonths: number };
    }
  | {
      type: 'student/create';
      payload: {
        fullName: string;
        phone: string;
        level: string;
        courseId: string | null;
        authorize: boolean;
        durationMonths?: number;
      };
    }
  | { type: 'teacher/update'; payload: Partial<TeacherProfile> }
  | { type: 'membership/approve'; payload: { membershipId: string } }
  | { type: 'membership/reject'; payload: { membershipId: string } }
  | { type: 'membership/request'; payload: { studentId: string; centerId: string } }
  | { type: 'qna/reply'; payload: { questionId: string; reply: QnaReply } };

export interface NewCourse {
  id: string;
  title: string;
  subject: string;
  level: string;
  summary: string;
  cover: Course['cover'];
}

export interface NewLesson {
  /** Optional caller-generated ID keeps creation and editor navigation atomic. */
  id?: string;
  title: string;
  kind: Lesson['kind'];
  file: string;
  durationSec: number;
  pages: number;
  sizeMb: number;
  published: boolean;
  description?: string;
  body?: string;
  questions?: Lesson['questions'];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'ostadiplus.demo.v3';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let counter = 0;
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;

/** Generates a short readable student code. */
function makeStudentCode(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[hash % chars.length];
    hash = (hash * 1664525 + 1013904223) >>> 0;
  }
  return `UST-${code}`;
}

function expiresAt(durationMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString();
}

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
  for (const semester of course.semesters) {
    const index = semester.chapters.findIndex((c) => c.id === chapterId);
    if (index >= 0) {
      return { chapter: semester.chapters[index], semester, index };
    }
  }
  throw new Error('الفصل غير موجود');
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

    case 'setLang': {
      const next = clone(state);
      next.lang = action.lang;
      return next;
    }

    /* ---------------- courses ---------------- */

    case 'course/create': {
      const next = clone(state);
      const nowIso = new Date().toISOString();
      next.courses.unshift({
        ...action.payload,
        status: 'draft',
        createdAt: nowIso,
        updatedAt: nowIso,
        /* The teacher who creates a course owns it. */
        teacher: {
          name: next.teacher.name,
          subject: next.teacher.subject,
          monogram: next.teacher.monogram,
        },
        /* The school year always ships as two semesters — the teacher
           only fills them with topics. */
        semesters: [
          { id: newId('sem'), title: 'الدورة الأولى', chapters: [] },
          { id: newId('sem'), title: 'الدورة الثانية', chapters: [] },
        ],
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
      const semester =
        course.semesters.find((s) => s.id === action.payload.semesterId) ??
        course.semesters[0];
      if (!semester) throw new Error('الدورة بلا دورات دراسية');
      semester.chapters.push({
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
      course.semesters.forEach((semester) => {
        semester.chapters = semester.chapters.filter(
          (c) => c.id !== action.payload.chapterId,
        );
      });
      touch(next, course.id);
      return next;
    }

    case 'chapter/move': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { semester, index } = findChapter(course, action.payload.chapterId);
      swap(semester.chapters, index, action.payload.dir);
      touch(next, course.id);
      return next;
    }

    /* ---------------- lessons ---------------- */

    case 'lesson/add': {
      const next = clone(state);
      const course = requireCourse(next, action.payload.courseId);
      const { chapter } = findChapter(course, action.payload.chapterId);
      chapter.lessons.push({ ...action.payload.lesson, id: action.payload.lesson.id ?? newId('lsn') });
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

    /* ---------------- enrollment ---------------- */

    case 'enrollment/setStatus': {
      const next = clone(state);
      const dur = action.payload.durationMonths ?? 6;
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
          enrollment.expiresAt = expiresAt(dur);
          enrollment.durationMonths = dur;
        }
      } else if (action.payload.status !== 'pending') {
        next.enrollments.push({
          id: newId('enr'),
          studentId: action.payload.studentId,
          courseId: action.payload.courseId,
          status: action.payload.status,
          authorizedAt: new Date().toISOString(),
          authorizedBy: next.teacher.name,
          expiresAt: expiresAt(dur),
          durationMonths: dur,
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

    case 'enrollment/renew': {
      const next = clone(state);
      const enrollment = next.enrollments.find(
        (e) =>
          e.studentId === action.payload.studentId &&
          e.courseId === action.payload.courseId,
      );
      if (enrollment) {
        // Renew from today (not from current expiresAt, so it doesn't stack)
        enrollment.expiresAt = expiresAt(action.payload.durationMonths);
        enrollment.durationMonths = action.payload.durationMonths;
        enrollment.status = 'active';
        enrollment.authorizedAt = new Date().toISOString();
      }
      const student = next.students.find((s) => s.id === action.payload.studentId);
      const course = next.courses.find((c) => c.id === action.payload.courseId);
      logActivity(
        next,
        'student',
        `تم تجديد اشتراك «${student?.fullName ?? ''}» في دورة ${course?.title ?? ''}`,
      );
      return next;
    }

    /* ---------------- students ---------------- */

    case 'student/create': {
      const next = clone(state);
      const nowIso = new Date().toISOString();
      const id = newId('st');
      const parts = action.payload.fullName.trim().split(/\s+/);
      const monogram = parts.slice(0, 2).map((p) => p[0]).join('');
      const studentCode = makeStudentCode(id);
      next.students.unshift({
        id,
        fullName: action.payload.fullName.trim(),
        phone: action.payload.phone.trim(),
        email: `${id}@example.ma`,
        level: action.payload.level,
        joinedAt: nowIso,
        monogram: monogram || 'ط',
        studentCode,
        studentType: 'moutamadris',
      });
      const dur = action.payload.durationMonths ?? 6;
      if (action.payload.courseId) {
        next.enrollments.push({
          id: newId('enr'),
          studentId: id,
          courseId: action.payload.courseId,
          status: action.payload.authorize ? 'active' : 'pending',
          authorizedAt: nowIso,
          authorizedBy: next.teacher.name,
          expiresAt: expiresAt(dur),
          durationMonths: dur,
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

    /* ---------------- memberships ---------------- */

    case 'membership/approve': {
      const next = clone(state);
      const membership = (next.memberships ?? []).find(
        (m) => m.id === action.payload.membershipId,
      );
      if (membership) {
        membership.status = 'active';
        membership.respondedAt = new Date().toISOString();
      }
      return next;
    }

    case 'membership/reject': {
      const next = clone(state);
      const membership = (next.memberships ?? []).find(
        (m) => m.id === action.payload.membershipId,
      );
      if (membership) {
        membership.status = 'rejected';
        membership.respondedAt = new Date().toISOString();
      }
      return next;
    }

    case 'membership/request': {
      const next = clone(state);
      const { studentId, centerId } = action.payload;
      const existing = (next.memberships ?? []).find(
        (m) =>
          m.studentId === studentId &&
          m.centerId === centerId &&
          (m.status === 'active' || m.status === 'requested'),
      );
      if (existing) return next; // duplicate guard
      const center = next.centers.find((c) => c.id === centerId);
      const student = next.students.find((s) => s.id === studentId);
      const membership: CenterMembership = {
        id: newId('mbr'),
        studentId,
        centerId,
        status: 'requested',
        requestedAt: new Date().toISOString(),
      };
      next.memberships = [...(next.memberships ?? []), membership];
      // Notification for the student (delivered when the student imports the
      // dashboard's sync payload).
      next.notifications = [
        ...(next.notifications ?? []),
        {
          id: newId('notif'),
          studentId,
          kind: 'center-request',
          payload: {
            centerId,
            centerName: center?.name ?? 'مركزك',
          },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
      logActivity(
        next,
        'student',
        `تم إرسال طلب انضمام إلى مركز ${center?.name ?? ''} للتلميذ «${
          student?.fullName ?? ''
        }»`,
      );
      return next;
    }

    case 'qna/reply': {
      const next = clone(state);
      const question = (next.questions ?? []).find(
        (item) => item.id === action.payload.questionId,
      );
      if (question) {
        question.replies.push(action.payload.reply);
      }
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
  /** Active center memberships awaiting approval. */
  pendingMemberships: DemoState['memberships'];
  /** Look up a student by their unique studentCode. */
  findStudentByCode: (code: string) => DemoState['students'][number] | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadInitial(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      // Payloads written by an older data model (before courses gained
      // semesters) would crash the curriculum screens — reseed instead.
      if (
        parsed &&
        parsed.version === createDemoState().version &&
        Array.isArray(parsed.courses)
      ) {
        /* Q & R was added after v8: keep the saved dashboard data and attach
           the seeded threads so the inbox is not empty on first open. */
        return parsed.questions === undefined
          ? { ...parsed, questions: createDemoState().questions ?? [] }
          : parsed;
      }
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

  const pendingMemberships = useMemo(
    () => (state.memberships ?? []).filter((m) => m.status === 'requested'),
    [state.memberships],
  );

  const findStudentByCode = useCallback(
    (code: string) =>
      state.students.find(
        (s) => s.studentCode?.toLowerCase() === code.toLowerCase(),
      ),
    [state.students],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      dispatch,
      notify,
      toasts,
      dismissToast,
      exportPayload,
      isDirty,
      pendingMemberships,
      findStudentByCode,
    }),
    [
      state,
      notify,
      toasts,
      dismissToast,
      exportPayload,
      isDirty,
      pendingMemberships,
      findStudentByCode,
    ],
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

// Re-export Center for convenience
export type { Center, CenterMembership };

