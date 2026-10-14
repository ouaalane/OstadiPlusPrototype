/**
 * Student-app demo store.
 *
 * Holds the shared OstadiPlus dataset (see `packages/shared/src/seed.ts`),
 * persists it to AsyncStorage and exposes the few mutations a student can
 * make: signing in, recording lesson progress and importing a payload that
 * the teacher copied from the dashboard.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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
  createDemoState,
  decodeDemoState,
  encodeDemoState,
  enrollmentFor,
  progressFor,
  type Course,
  type DemoState,
  type LessonProgress,
  type Student,
} from '@ostadiplus/shared';

const STORAGE_KEY = 'ostadiplus.student.v1';

interface Persisted {
  data: DemoState;
}

interface StoreValue {
  hydrated: boolean;
  state: DemoState;
  me: Student | null;
  myCourses: Course[];
  /** Status of the enrollment for a course ('none' when not enrolled). */
  statusOf: (courseId: string) => 'active' | 'pending' | 'suspended' | 'none';
  signIn: (studentId: string) => void;
  signOut: () => void;
  saveProgress: (lessonId: string, positionSec: number, completed?: boolean) => void;
  markCompleted: (lessonId: string) => void;
  progressOf: (lessonId: string) => LessonProgress | undefined;
  importPayload: (payload: string) => Promise<void>;
  exportPayload: () => Promise<string>;
  resetDemo: () => void;
  lastSyncedAt: string | null;
}

const StoreContext = createContext<StoreValue | null>(null);

type Action =
  | { type: 'hydrate'; state: DemoState }
  | { type: 'replace'; state: DemoState; syncedAt: string | null }
  | { type: 'signIn'; studentId: string }
  | { type: 'signOut' }
  | { type: 'reset' }
  | { type: 'progress'; lessonId: string; positionSec: number; completed: boolean };

const nowIso = () => new Date().toISOString();

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

    default:
      return state;
  }
}

export function StudentStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createDemoState);
  const [hydrated, setHydrated] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Persisted;
          if (parsed?.data && Array.isArray(parsed.data.courses)) {
            dispatch({ type: 'hydrate', state: parsed.data });
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

  const me = useMemo(
    () => state.students.find((s) => s.id === state.activeStudentId) ?? null,
    [state.students, state.activeStudentId],
  );

  const myCourses = useMemo(
    () => accessibleCourses(state, state.activeStudentId),
    [state, state.activeStudentId],
  );

  const statusOf = useCallback(
    (courseId: string): 'active' | 'pending' | 'suspended' | 'none' => {
      if (!state.activeStudentId) return 'none';
      const enrollment = enrollmentFor(state, state.activeStudentId, courseId);
      return enrollment ? enrollment.status : 'none';
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

  const value = useMemo<StoreValue>(
    () => ({
      hydrated,
      state,
      me,
      myCourses,
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
    }),
    [
      hydrated,
      state,
      me,
      myCourses,
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
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StudentStoreProvider');
  return ctx;
}
