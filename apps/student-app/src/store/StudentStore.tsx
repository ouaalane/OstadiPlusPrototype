/**
 * Student-app demo store — v2.
 *
 * Holds the shared OstadiPlus dataset (see `packages/shared/src/seed.ts`),
 * persists it to AsyncStorage and exposes the mutations a student can make:
 * signing in/out, lesson progress, payload sync, language switching,
 * notification management, and center membership handling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  accessibleCourses,
  allLessons,
  createDemoState,
  decodeDemoState,
  DEMO_STATE,
  encodeDemoState,
  enrollmentFor,
  isEnrollmentExpired,
  enrollmentHasAccess,
  enrollmentAllowsLesson,
  courseWithEnrollmentScope,
  makeQuestion,
  progressFor,
  questionsForCourse as selectQuestionsForCourse,
  type AppNotification,
  type CenterMembership,
  type Course,
  type DemoState,
  type Lang,
  type LessonProgress,
  type QnaQuestion,
  type Student,
} from '@ostadiplus/shared';

import { videoAssets } from '../assets/registry';

import { applyProfileDetails, profileErrors, type ProfileDetails } from '../lib/profile-details';
import { loadDemoEndpoint, demoAssetUrl } from '../lib/demo-sync';
import { setLocalPassword } from '../lib/local-password';

const STORAGE_KEY = 'ostadiplus.student.v3';
const PREFS_KEY = 'ostadiplus.student.prefs.v1';

interface Persisted {
  data: DemoState;
}

interface LibraryPrefs {
  archived: string[];
  favorites: string[];
}

const EMPTY_PREFS: LibraryPrefs = { archived: [], favorites: [] };

interface StoreValue {
  hydrated: boolean;
  state: DemoState;
  me: Student | null;
  myCourses: Course[];
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Status of the enrollment for a course ('none' when not enrolled). */
  statusOf: (courseId: string) => 'active' | 'pending' | 'suspended' | 'requested' | 'rejected' | 'cancelled' | 'none' | 'expired';
  /** Whether a lesson's download can be played (subscription must be active). */
  canPlayDownload: (lessonId: string) => boolean;
  signIn: (studentId: string) => void;
  signOut: () => void;
  saveProgress: (lessonId: string, positionSec: number, completed?: boolean) => void;
  markCompleted: (lessonId: string) => void;
  progressOf: (lessonId: string) => LessonProgress | undefined;
  importPayload: (payload: string) => Promise<void>;
  exportPayload: () => Promise<string>;
  resetDemo: () => void;
  lastSyncedAt: string | null;
  /** Notifications for the signed-in student. */
  myNotifications: AppNotification[];
  markNotificationRead: (notifId: string) => void;
  /** Records a `new-lesson` alert for the signed-in student. */
  addLessonNotification: (payload: Record<string, string>) => void;
  /** Center memberships for the signed-in student. */
  myMemberships: CenterMembership[];
  requestCenterJoin: (inviteCode: string) => 'ok' | 'not_found' | 'already_requested';
  respondToMembership: (membershipId: string, accept: boolean) => void;
  /** Downloads for the signed-in student, keyed by lessonId. */
  myDownloads: DownloadRecord[];
  /** Archived ("Archivés") course ids, persisted locally. */
  archivedCourseIds: string[];
  /** Favourite ("Favoris") course ids, persisted locally. */
  favoriteCourseIds: string[];
  isArchived: (courseId: string) => boolean;
  isFavorite: (courseId: string) => boolean;
  toggleArchived: (courseId: string) => void;
  toggleFavorite: (courseId: string) => void;
  /** Shared course Q & R threads, newest first. */
  questionsOfCourse: (courseId: string) => QnaQuestion[];
  /** Post a question on a course (optionally attached to one lesson). */
  askCourseQuestion: (courseId: string, body: string, lessonId?: string) => boolean;
  /** Start downloading a lesson (video or PDF). Returns the download record. */
  downloadLesson: (lessonId: string) => Promise<'ok' | 'already_downloaded' | 'error'>;
  /** Start several downloads at once (section / course « download all »). */
  downloadLessons: (lessonIds: string[]) => Promise<void>;
  /** Cancel an in-progress download. */
  cancelDownload: (lessonId: string) => void;
  /** Delete a downloaded file. */
  deleteDownload: (lessonId: string) => Promise<void>;
  /** Delete several downloaded files at once (course / section bulk actions). */
  deleteDownloads: (lessonIds: string[]) => Promise<void>;
  /** Get the local file URI for a downloaded lesson, if present. */
  downloadUriFor: (lessonId: string) => string | undefined;
  /** Get the download status for a lesson. */
  downloadStatusFor: (lessonId: string) => DownloadStatus | undefined;
  /** Replace only the signed-in student's local profile thumbnail. */
  setProfilePhoto: (photo: string) => void;
  recordQuizResult: (lessonId: string, correct: number, total: number, elapsedSec: number) => void;
  updateProfile: (details: ProfileDetails) => boolean;
  /** Register a new student account (creates the student in the store). */
  registerStudent: (args: {
    fullName: string;
    phone: string;
    email: string;
    level: string;
    studentType: 'bac-libre' | 'moutamadris';
    password: string;
    profilePhoto?: string;
  }) => Promise<string>; // returns new studentId
}

/** A downloaded lesson tracked by the app. */
export interface DownloadRecord {
  lessonId: string;
  status: DownloadStatus;
  progress: number; // 0-100
  localUri: string;
  sizeMb: number;
  downloadedAt: string;
}

/** Download status values. */
export type DownloadStatus = 'downloading' | 'complete' | 'failed' | 'cancelled';

/** Directory under the app cache where downloaded lessons are stored. */
const DOWNLOAD_DIR = `${Paths.cache.uri}/ostadiplus/downloads/`;

const StoreContext = createContext<StoreValue | null>(null);

type Action =
  | { type: 'hydrate'; state: DemoState }
  | { type: 'replace'; state: DemoState; syncedAt: string | null }
  | { type: 'signIn'; studentId: string }
  | { type: 'signOut' }
  | { type: 'reset' }
  | { type: 'setLang'; lang: Lang }
  | { type: 'progress'; lessonId: string; positionSec: number; completed: boolean }
  | { type: 'notification/read'; notifId: string }
  | { type: 'notification/new-lesson'; studentId: string; payload: Record<string, string> }
  | { type: 'qna/ask'; question: QnaQuestion }
  | { type: 'membership/request'; centerId: string; studentId: string }
  | { type: 'membership/respond'; membershipId: string; accept: boolean; studentId: string }
  | { type: 'student/register'; student: Student }
  | { type: 'student/photo'; studentId: string; photo: string }
  | { type: 'student/profile'; studentId: string; details: ProfileDetails }
  | { type: 'quiz/result'; attempt: NonNullable<DemoState['quizAttempts']>[number] };

const nowIso = () => new Date().toISOString();

let _idCounter = 0;
const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;

/** Generates a short readable student code like "UST-7F3K2". */
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

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'hydrate':
    case 'replace':
      return action.state;

    case 'signIn':
      return { ...state, activeStudentId: action.studentId };

    case 'signOut':
      return { ...state, activeStudentId: '' };

    case 'reset':
      return createDemoState();

    case 'setLang':
      return { ...state, lang: action.lang };

    case 'progress': {
      const studentId = state.activeStudentId;
      if (!studentId) return state;
      const list = state.progress[studentId] ?? [];
      const existing = list.find((p) => p.lessonId === action.lessonId);
      const next: LessonProgress = existing
        ? {
            ...existing,
            positionSec: action.positionSec,
            completed: existing.completed || action.completed,
            updatedAt: nowIso(),
          }
        : {
            lessonId: action.lessonId,
            positionSec: action.positionSec,
            completed: action.completed,
            updatedAt: nowIso(),
          };
      return {
        ...state,
        progress: {
          ...state.progress,
          [studentId]: existing
            ? list.map((p) => (p.lessonId === action.lessonId ? next : p))
            : [...list, next],
        },
      };
    }

    case 'notification/read': {
      const notifications = (state.notifications ?? []).map((n) =>
        n.id === action.notifId ? { ...n, read: true } : n,
      );
      return { ...state, notifications };
    }

    case 'notification/new-lesson': {
      // In production this is dispatched from the push handler: the teacher
      // publishes a lesson, the student's device is told about it.
      const newNotif: AppNotification = {
        id: newId('notif'),
        studentId: action.studentId,
        kind: 'new-lesson',
        payload: action.payload,
        read: false,
        createdAt: nowIso(),
      };
      return {
        ...state,
        notifications: [...(state.notifications ?? []), newNotif],
      };
    }

    case 'qna/ask': {
      return {
        ...state,
        questions: [...(state.questions ?? []), action.question],
      };
    }

    case 'membership/request': {
      const existing = (state.memberships ?? []).find(
        (m) =>
          m.studentId === action.studentId &&
          m.centerId === action.centerId &&
          (m.status === 'active' || m.status === 'requested'),
      );
      if (existing) return state; // duplicate guard
      const newMembership: CenterMembership = {
        id: newId('mbr'),
        studentId: action.studentId,
        centerId: action.centerId,
        status: 'requested',
        requestedAt: nowIso(),
      };
      // Create a center-request notification for the student (simulating the
      // center sending a request to the student after scanning their code)
      const center = (state.centers ?? []).find((c) => c.id === action.centerId);
      const newNotif: AppNotification = {
        id: newId('notif'),
        studentId: action.studentId,
        kind: 'center-request',
        payload: { centerId: action.centerId, centerName: center?.name ?? '' },
        read: false,
        createdAt: nowIso(),
      };
      return {
        ...state,
        memberships: [...(state.memberships ?? []), newMembership],
        notifications: [...(state.notifications ?? []), newNotif],
      };
    }

    case 'membership/respond': {
      const memberships = (state.memberships ?? []).map((m) => {
        if (m.id !== action.membershipId) return m;
        return {
          ...m,
          status: (action.accept ? 'active' : 'rejected') as CenterMembership['status'],
          respondedAt: nowIso(),
        };
      });
      // Mark associated notification as read
      const notifications = (state.notifications ?? []).map((n) => {
        if (
          n.studentId === action.studentId &&
          n.kind === 'center-request'
        ) {
          return { ...n, read: true };
        }
        return n;
      });
      return { ...state, memberships, notifications };
    }

    case 'quiz/result': return { ...state, quizAttempts: [...(state.quizAttempts ?? []), action.attempt] };

    case 'student/profile': {
      return { ...state, students: state.students.map(student => student.id === action.studentId
        ? applyProfileDetails(student, action.details) : student) };
    }

    case 'student/photo': {
      return { ...state, students: state.students.map(student => student.id === action.studentId
        ? { ...student, profilePhoto: action.photo } : student) };
    }

    case 'student/register': {
      // Add the new student; set them as active
      return {
        ...state,
        students: [action.student, ...state.students],
        activeStudentId: action.student.id,
      };
    }

    default:
      return state;
  }
}

export function StudentStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createDemoState);
  const [hydrated, setHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [prefs, setPrefs] = useState<LibraryPrefs>(EMPTY_PREFS);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDownloads = useRef<Map<string, () => void>>(new Map());
  const progressTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Persisted;
          // A payload written by an older data model (e.g. before courses
          // gained semesters) would crash every course screen — drop it and
          // fall back to the bundled seed instead.
          if (
            parsed?.data &&
            parsed.data.version === DEMO_STATE.version &&
            Array.isArray(parsed.data.courses)
          ) {
            /* Q & R was added after v8. Payloads written before it keep their
               courses/progress and simply receive the seeded threads. */
            const hydratedState =
              parsed.data.questions === undefined
                ? { ...parsed.data, questions: createDemoState().questions ?? [] }
                : parsed.data;
            dispatch({ type: 'hydrate', state: hydratedState });
          }
        }
      } catch {
        /* unreadable storage — fall back to the bundled seed */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Library preferences (archive / favourites) live outside DemoState so a
     teacher sync never overwrites personal shelf choices. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<LibraryPrefs>;
          setPrefs({
            archived: Array.isArray(parsed.archived) ? parsed.archived : [],
            favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
          });
        }
      } catch {
        /* unreadable preferences — start with an empty shelf */
      } finally {
        if (!cancelled) setPrefsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => undefined);
  }, [prefs, prefsHydrated]);

  /* Debounced persistence so playback progress does not thrash the disk. */
  useEffect(() => {
    if (!hydrated) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ data: state })).catch(
        () => undefined,
      );
    }, 350);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [state, hydrated]);

  /* Ensure the downloads directory exists once the store is mounted. */
  useEffect(() => {
    (async () => {
      try {
        const dir = new Directory(Paths.cache, 'ostadiplus', 'downloads');
        const dirInfo = Paths.info(dir.uri);
        if (!dirInfo.exists) {
          await dir.create({ intermediates: true, idempotent: true });
        }
      } catch {
        /* directory creation is non-fatal; downloads will fail gracefully */
      }
    })();
  }, []);

  const me = useMemo(
    () => state.students.find((s) => s.id === state.activeStudentId) ?? null,
    [state.students, state.activeStudentId],
  );

  const lang = state.lang ?? 'ar';

  const [accessClock, setAccessClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAccessClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const studentViewState = useMemo(() => ({
    ...state,
    courses: state.courses.map(course => courseWithEnrollmentScope(
      course, enrollmentFor(state, state.activeStudentId, course.id), accessClock,
    )),
  }), [state, accessClock]);

  const myCourses = useMemo(
    () => accessibleCourses(studentViewState, state.activeStudentId),
    [state.activeStudentId, studentViewState],
  );

  const statusOf = useCallback(
    (courseId: string): 'active' | 'pending' | 'suspended' | 'requested' | 'rejected' | 'cancelled' | 'none' | 'expired' => {
      if (!state.activeStudentId) return 'none';
      const enrollment = enrollmentFor(state, state.activeStudentId, courseId);
      if (!enrollment) return 'none';
      if (enrollment.status === 'active' && isEnrollmentExpired(enrollment)) return 'expired';
      if (enrollment.status === 'active' && !enrollmentHasAccess(enrollment)) return 'pending';
      return enrollment.status;
    },
    [state],
  );

  const progressOf = useCallback(
    (lessonId: string) =>
      state.activeStudentId
        ? progressFor(state, state.activeStudentId).find((p) => p.lessonId === lessonId)
        : undefined,
    [state],
  );

  const signIn = useCallback((studentId: string) => {
    dispatch({ type: 'signIn', studentId });
  }, []);

  const signOut = useCallback(() => dispatch({ type: 'signOut' }), []);

  const setLang = useCallback((l: Lang) => dispatch({ type: 'setLang', lang: l }), []);

  const saveProgress = useCallback(
    (lessonId: string, positionSec: number, completed = false) =>
      dispatch({ type: 'progress', lessonId, positionSec, completed }),
    [],
  );

  const markCompleted = useCallback(
    (lessonId: string) => dispatch({ type: 'progress', lessonId, positionSec: 0, completed: true }),
    [],
  );

  const importPayload = useCallback(async (payload: string) => {
    const data = await decodeDemoState(payload);
    const keepsStudent = data.students.some((s) => s.id === data.activeStudentId);
    dispatch({
      type: 'replace',
      state: { ...data, activeStudentId: keepsStudent ? data.activeStudentId : '' },
      syncedAt: nowIso(),
    });
    setLastSyncedAt(nowIso());
  }, []);

  const exportPayload = useCallback(() => encodeDemoState(state), [state]);

  const resetDemo = useCallback(() => dispatch({ type: 'reset' }), []);

  const myNotifications = useMemo(
    () =>
      (state.notifications ?? [])
        .filter((n) => n.studentId === state.activeStudentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.notifications, state.activeStudentId],
  );

  const markNotificationRead = useCallback((notifId: string) => {
    dispatch({ type: 'notification/read', notifId });
  }, []);

  /* Called when the device is told a teacher published a lesson — the push
     handler in `src/notifications` is the only caller today. */
  const addLessonNotification = useCallback(
    (payload: Record<string, string>) => {
      const studentId = state.activeStudentId;
      if (!studentId) return;
      dispatch({ type: 'notification/new-lesson', studentId, payload });
    },
    [state.activeStudentId],
  );

  const myMemberships = useMemo(
    () => (state.memberships ?? []).filter((m) => m.studentId === state.activeStudentId),
    [state.memberships, state.activeStudentId],
  );

  const requestCenterJoin = useCallback(
    (inviteCode: string): 'ok' | 'not_found' | 'already_requested' => {
      const center = (state.centers ?? []).find(
        (c) => c.inviteCode.toLowerCase() === inviteCode.toLowerCase(),
      );
      if (!center) return 'not_found';
      const studentId = state.activeStudentId;
      if (!studentId) return 'not_found';
      const already = (state.memberships ?? []).find(
        (m) =>
          m.studentId === studentId &&
          m.centerId === center.id &&
          (m.status === 'active' || m.status === 'requested'),
      );
      if (already) return 'already_requested';
      dispatch({ type: 'membership/request', centerId: center.id, studentId });
      return 'ok';
    },
    [state],
  );

  const respondToMembership = useCallback(
    (membershipId: string, accept: boolean) => {
      dispatch({
        type: 'membership/respond',
        membershipId,
        accept,
        studentId: state.activeStudentId,
      });
    },
    [state.activeStudentId],
  );

  const isArchived = useCallback(
    (courseId: string) => prefs.archived.includes(courseId),
    [prefs.archived],
  );

  const isFavorite = useCallback(
    (courseId: string) => prefs.favorites.includes(courseId),
    [prefs.favorites],
  );

  const toggleArchived = useCallback((courseId: string) => {
    setPrefs((prev) => ({
      ...prev,
      archived: prev.archived.includes(courseId)
        ? prev.archived.filter((id) => id !== courseId)
        : [...prev.archived, courseId],
    }));
  }, []);

  const toggleFavorite = useCallback((courseId: string) => {
    setPrefs((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(courseId)
        ? prev.favorites.filter((id) => id !== courseId)
        : [...prev.favorites, courseId],
    }));
  }, []);

  const questionsOfCourse = useCallback(
    (courseId: string) => selectQuestionsForCourse(state, courseId).filter(q => {
      if (!q.lessonId) return true;
      const course = state.courses.find(c => c.id === courseId);
      return !!course && enrollmentAllowsLesson(
        enrollmentFor(state, state.activeStudentId, courseId), course, q.lessonId,
      );
    }),
    [state],
  );

  const askCourseQuestion = useCallback(
    (courseId: string, body: string, lessonId?: string): boolean => {
      const trimmed = body.trim();
      if (!trimmed || !me) return false;
      if (statusOf(courseId) !== 'active') return false;
      const course = state.courses.find(c => c.id === courseId);
      if (lessonId && (!course || !enrollmentAllowsLesson(enrollmentFor(state, me.id, courseId), course, lessonId))) return false;
      const question = makeQuestion({
        courseId,
        lessonId,
        studentId: me.id,
        authorName: me.fullName,
        body: trimmed,
      });
      dispatch({ type: 'qna/ask', question });
      return true;
    },
    [me, statusOf, state],
  );

  /** Whether a downloaded lesson can be played — the course subscription
   *  must be active and not expired. */
  const canPlayDownload = useCallback(
    (lessonId: string): boolean => {
      if (!state.activeStudentId) return false;
      // Find the course containing this lesson.
      let courseId: string | undefined;
      for (const course of state.courses) {
        if (allLessons(course).some((l) => l.id === lessonId)) {
          courseId = course.id;
          break;
        }
      }
      if (!courseId) return false;
      const enrollment = enrollmentFor(state, state.activeStudentId, courseId);
      if (!enrollment) return false;
      if (enrollment.status !== 'active') return false;
      const course = state.courses.find(c => c.id === courseId);
      return !!course && enrollmentAllowsLesson(enrollment, course, lessonId);
    },
    [state],
  );

  const downloadUriFor = useCallback(
    (lessonId: string): string | undefined => {
      return downloads.find((d) => d.lessonId === lessonId && d.status === 'complete')
        ?.localUri;
    },
    [downloads],
  );

  const downloadStatusFor = useCallback(
    (lessonId: string): DownloadStatus | undefined => {
      return downloads.find((d) => d.lessonId === lessonId)?.status;
    },
    [downloads],
  );

  const downloadLesson = useCallback(
    async (lessonId: string): Promise<'ok' | 'already_downloaded' | 'error'> => {
      if (!state.activeStudentId) return 'error';
      const existing = downloads.find((d) => d.lessonId === lessonId);
      if (existing?.status === 'complete') return 'already_downloaded';
      if (existing?.status === 'downloading') return 'already_downloaded';

      // Find the lesson and its course.
      let lesson: { file: string; kind: string; durationSec: number; sizeMb: number; allowDownload?: boolean } | undefined;
      let courseId: string | undefined;
      for (const course of state.courses) {
        const found = allLessons(course).find((l) => l.id === lessonId);
        if (found) {
          lesson = found;
          courseId = course.id;
          break;
        }
      }
      if (!lesson) return 'error';
      // Only video lessons have a bundled file that can be saved for offline use
      // (text/quiz lessons carry no media; PDFs are bundled as page images).
      if (lesson.allowDownload === false || lesson.kind !== 'video' || !lesson.file || (!videoAssets[lesson.file] && !lesson.file.startsWith('/api/demo/'))) {
        return 'error';
      }

      // Verify the student can access this course.
      if (!courseId) return 'error';
      const enrollment = enrollmentFor(state, state.activeStudentId, courseId);
      if (!enrollment || !enrollmentAllowsLesson(enrollment, state.courses.find(c => c.id === courseId)!, lessonId)) {
        return 'error';
      }

      const ext = lesson.file.split('.').pop() ?? 'bin';
      const localUri = `${DOWNLOAD_DIR}${lessonId}.${ext}`;

      setDownloads((prev) => [
        ...prev.filter((d) => d.lessonId !== lessonId),
        { lessonId, status: 'downloading', progress: 0, localUri, sizeMb: lesson.sizeMb, downloadedAt: nowIso() },
      ]);

      const stopTicker = () => {
        const timer = progressTimers.current.get(lessonId);
        if (timer) {
          clearInterval(timer);
          progressTimers.current.delete(lessonId);
        }
      };

      /* The bundled asset resolves almost instantly; this ticker keeps the
         ring alive long enough to communicate progress and to make cancelling
         a real interaction instead of a no-op. */
      const ticker = setInterval(() => {
        setDownloads((prev) =>
          prev.map((d) =>
            d.lessonId === lessonId && d.status === 'downloading'
              ? { ...d, progress: Math.min(92, d.progress + 6 + Math.round(Math.random() * 7)) }
              : d,
          ),
        );
      }, 180);
      progressTimers.current.set(lessonId, ticker);

      const cancel = () => {
        stopTicker();
        activeDownloads.current.delete(lessonId);
        setDownloads((prev) =>
          prev.map((d) =>
            d.lessonId === lessonId ? { ...d, status: 'cancelled' } : d,
          ),
        );
      };
      activeDownloads.current.set(lessonId, cancel);

      try {
        // Resolve the bundled asset to a file:// URI, then copy to downloads dir.
        // Static lookup from the generated registry — Metro cannot bundle
        // dynamic require() calls.
        const remote = lesson.file.startsWith('/api/demo/');
        const asset = remote ? null : Asset.fromModule(videoAssets[lesson.file]);
        if (asset) await asset.downloadAsync();

        // Ensure downloads directory exists.
        const dir = new Directory(Paths.cache, 'ostadiplus', 'downloads');
        const dirInfo = Paths.info(dir.uri);
        if (!dirInfo.exists) {
          await dir.create({ intermediates: true, idempotent: true });
        }

        // Copy the downloaded asset to our downloads directory.
        const destFile = new File(Paths.cache, 'ostadiplus', 'downloads', `${lessonId}.${ext}`);
        if (remote) await File.downloadFileAsync(demoAssetUrl(lesson.file), destFile);
        else if (asset) await new File(asset.localUri ?? asset.uri).copy(destFile);

        activeDownloads.current.delete(lessonId);
        stopTicker();
        const info = await destFile.info();
        setDownloads((prev) =>
          prev.map((d) =>
            d.lessonId === lessonId
              ? {
                  ...d,
                  status: 'complete',
                  progress: 100,
                  sizeMb: (info.size ?? 0) / 1024 / 1024,
                }
              : d,
          ),
        );
        return 'ok';
      } catch {
        activeDownloads.current.delete(lessonId);
        stopTicker();
        setDownloads((prev) =>
          prev.map((d) =>
            d.lessonId === lessonId ? { ...d, status: 'failed' } : d,
          ),
        );
        return 'error';
      }
    },
    [state, downloads],
  );

  const cancelDownload = useCallback((lessonId: string) => {
    const timer = progressTimers.current.get(lessonId);
    if (timer) {
      clearInterval(timer);
      progressTimers.current.delete(lessonId);
    }
    const cancel = activeDownloads.current.get(lessonId);
    if (cancel) {
      cancel();
      activeDownloads.current.delete(lessonId);
    }
  }, []);

  /**
   * Downloads several lessons concurrently. Each lesson keeps its own
   * progress record, so the section / course buttons can aggregate them
   * without the engine knowing about the UI grouping.
   */
  const downloadLessons = useCallback(
    async (lessonIds: string[]) => {
      const unique = [...new Set(lessonIds)];
      await Promise.all(
        unique.map((lessonId) => downloadLesson(lessonId).catch(() => 'error' as const)),
      );
    },
    [downloadLesson],
  );

  const deleteDownloads = useCallback(
    async (lessonIds: string[]) => {
      const ids = new Set(lessonIds);
      const records = downloads.filter((d) => ids.has(d.lessonId));
      for (const record of records) {
        const timer = progressTimers.current.get(record.lessonId);
        if (timer) {
          clearInterval(timer);
          progressTimers.current.delete(record.lessonId);
        }
        activeDownloads.current.get(record.lessonId)?.();
        activeDownloads.current.delete(record.lessonId);
        try {
          const file = new File(record.localUri);
          await file.delete();
        } catch {
          /* file may already be gone */
        }
      }
      setDownloads((prev) => prev.filter((d) => !ids.has(d.lessonId)));
    },
    [downloads],
  );

  const deleteDownload = useCallback(
    async (lessonId: string) => {
      await deleteDownloads([lessonId]);
    },
    [deleteDownloads],
  );

  const registerStudent = useCallback(
    async (args: {
      fullName: string;
      phone: string;
      email: string;
      level: string;
      studentType: 'bac-libre' | 'moutamadris';
      password: string;
      profilePhoto?: string;
    }): Promise<string> => {
      const id = newId('st');
      const parts = args.fullName.trim().split(/\s+/);
      const monogram = parts.slice(0, 2).map((p) => p[0]).join('');
      const studentCode = makeStudentCode(id + args.phone);
      const student: Student = {
        id,
        fullName: args.fullName.trim(),
        phone: args.phone.trim(),
        email: args.email.trim(),
        level: args.level,
        joinedAt: nowIso(),
        monogram: monogram || 'ط',
        studentCode,
        studentType: args.studentType,
        ...(args.profilePhoto ? { profilePhoto: args.profilePhoto } : {}),
      };
      if (args.password) await setLocalPassword(id, args.password);
      dispatch({ type: 'student/register', student });
      return id;
    },
    [],
  );

  const setProfilePhoto = useCallback((photo: string) => {
    if (state.activeStudentId) dispatch({ type: 'student/photo', studentId: state.activeStudentId, photo });
  }, [state.activeStudentId]);

  const updateProfile = useCallback((details: ProfileDetails) => {
    if (!me || Object.keys(profileErrors(details, state.students, me.id)).length) return false;
    dispatch({ type: 'student/profile', studentId: me.id, details });
    return true;
  }, [me, state.students]);

  const recordQuizResult = useCallback((lessonId: string, correct: number, total: number, elapsedSec: number) => {
    if (!me) return;
    dispatch({ type: 'quiz/result', attempt: { id: newId('attempt'), studentId: me.id, lessonId, correct, total, elapsedSec, submittedAt: nowIso() } });
  }, [me]);
  useEffect(() => { void loadDemoEndpoint().catch(() => undefined); }, []);

  const value = useMemo<StoreValue>(
    () => ({
      hydrated,
      state: studentViewState,
      me,
      myCourses,
      lang,
      setLang,
      statusOf,
      signIn,
      signOut,
      saveProgress,
      markCompleted,
      progressOf,
      importPayload,
      exportPayload,
      resetDemo,
      lastSyncedAt,
      myNotifications,
      markNotificationRead,
      addLessonNotification,
      myMemberships,
      requestCenterJoin,
      respondToMembership,
      archivedCourseIds: prefs.archived,
      favoriteCourseIds: prefs.favorites,
      isArchived,
      isFavorite,
      toggleArchived,
      toggleFavorite,
      questionsOfCourse,
      askCourseQuestion,
      myDownloads: downloads,
      canPlayDownload,
      downloadLesson,
      downloadLessons,
      cancelDownload,
      deleteDownload,
      deleteDownloads,
      downloadUriFor,
      downloadStatusFor,
      registerStudent,
      setProfilePhoto,
      updateProfile,
      recordQuizResult,
    }),
    [
      hydrated,
      studentViewState,
      me,
      myCourses,
      lang,
      setLang,
      statusOf,
      signIn,
      signOut,
      saveProgress,
      markCompleted,
      progressOf,
      importPayload,
      exportPayload,
      resetDemo,
      lastSyncedAt,
      myNotifications,
      markNotificationRead,
      addLessonNotification,
      myMemberships,
      requestCenterJoin,
      respondToMembership,
      prefs.archived,
      prefs.favorites,
      isArchived,
      isFavorite,
      toggleArchived,
      toggleFavorite,
      questionsOfCourse,
      askCourseQuestion,
      downloads,
      canPlayDownload,
      downloadLesson,
      downloadLessons,
      cancelDownload,
      deleteDownload,
      deleteDownloads,
      downloadUriFor,
      downloadStatusFor,
      registerStudent,
      setProfilePhoto,
      updateProfile,
      recordQuizResult,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StudentStoreProvider');
  return ctx;
}

// Re-export Student type for consumers
export type { Student };
