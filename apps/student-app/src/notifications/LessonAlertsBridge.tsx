/**
 * Lesson alerts bridge — the app side of «your teacher published a lesson».
 *
 * Wires three things together:
 *
 * 1. **Incoming** — a `new-lesson` alert recorded for the signed-in student
 *    (see `StudentStore`) is delivered to the device's notification shade, once
 *    per alert, so the student sees a real Android notification.
 * 2. **Opening** — tapping that notification pushes the lesson it points at.
 * 3. **The teacher side** — this prototype has no push backend, so
 *    `DEMO_TEACHER_PUBLISH` stands in for FCM: shortly after the app opens, the
 *    app records one lesson alert the way a push payload would. Delete that
 *    effect once real pushes are wired — everything else already works off the
 *    store, not off the demo.
 *
 * Rendered by `RootNavigator` inside its `NavigationContainer`, so taps can
 * navigate.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  allLessons,
  courseTeacher,
  type AppNotification,
  type Course,
  type Lesson,
  type NewLessonNotificationPayload,
} from '@ostadiplus/shared';

import { useStore } from '../store/StudentStore';
import { lessonKindOf, lessonRoute } from '../lib/lesson';
import { navigationRef } from '../navigation/ref';
import {
  alertFromNotificationData,
  prepareLessonAlertsAsync,
  presentLessonAlertAsync,
} from './lessonAlerts';

/** Stand-in for the teacher's upload reaching us over FCM (see the file header). */
const DEMO_TEACHER_PUBLISH = true;
/** Let the app settle before the demo alert lands, so the banner is actually seen. */
const DEMO_DELAY_MS = 4000;
/** Which alerts this device has already put in the shade, and whether the demo ran. */
const BOOKKEEPING_KEY = 'ostadiplus.student.alerts.v1';

type Target = NewLessonNotificationPayload & { notificationId?: string };

type Bookkeeping = { delivered: string[]; demoDone: boolean };
const EMPTY_BOOKKEEPING: Bookkeeping = { delivered: [], demoDone: false };

async function readBookkeeping(): Promise<Bookkeeping> {
  const raw = await AsyncStorage.getItem(BOOKKEEPING_KEY);
  if (!raw) return EMPTY_BOOKKEEPING;
  const parsed = JSON.parse(raw) as Bookkeeping;
  return {
    delivered: Array.isArray(parsed.delivered) ? parsed.delivered : [],
    demoDone: Boolean(parsed.demoDone),
  };
}

function writeBookkeeping(value: Bookkeeping) {
  return AsyncStorage.setItem(BOOKKEEPING_KEY, JSON.stringify(value));
}

/** The newest lesson of a course: the last one the teacher published. */
function newestLesson(course: Course): Lesson | undefined {
  return allLessons(course).filter((lesson) => lesson.published).pop();
}

/** Rebuilds the alert payload out of the stored notification record. */
function payloadOf(notification: AppNotification): Target {
  const p = notification.payload;
  return {
    lessonId: p.lessonId ?? '',
    lessonKind: p.lessonKind ?? 'pdf',
    lessonTitle: p.lessonTitle ?? '',
    courseId: p.courseId ?? '',
    courseTitle: p.courseTitle ?? '',
    teacherName: p.teacherName ?? '',
    notificationId: notification.id,
  };
}

export default function LessonAlerts() {
  const { state, hydrated, me, lang, myCourses, myNotifications, addLessonNotification, markNotificationRead } =
    useStore();
  const [bookkeeping, setBookkeeping] = useState<Bookkeeping | null>(null);
  /* Whether the student lets us notify them. `null` until they answer, so an
     alert waiting behind the permission prompt is not thrown away. */
  const [allowed, setAllowed] = useState<boolean | null>(null);
  /* A tap that arrived before the app could act on it (cold start, or before
     sign-in). Flushed as soon as both the session and the navigator are ready. */
  const pending = useRef<Target | null>(null);

  /* Channel + permission, once per launch. */
  useEffect(() => {
    prepareLessonAlertsAsync()
      .then(setAllowed)
      .catch(() => setAllowed(false));
    readBookkeeping()
      .then(setBookkeeping)
      .catch(() => setBookkeeping(EMPTY_BOOKKEEPING));
  }, []);

  const open = useCallback(
    (target: Target) => {
      if (!me || !navigationRef.isReady()) {
        pending.current = target;
        return;
      }
      pending.current = null;
      if (target.notificationId) markNotificationRead(target.notificationId);

      const { lessonId } = target;
      switch (lessonRoute(lessonKindOf(target.lessonKind))) {
        case 'Video':
          navigationRef.navigate('Video', { lessonId });
          break;
        case 'Quiz':
          navigationRef.navigate('Quiz', { lessonId });
          break;
        case 'Reader':
          navigationRef.navigate('Reader', { lessonId });
          break;
        default:
          navigationRef.navigate('Pdf', { lessonId });
      }
    },
    [me, markNotificationRead],
  );

  /* Taps, including the one that launched the app. */
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = alertFromNotificationData(response.notification.request.content.data);
      if (target) open(target);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const target = response
          ? alertFromNotificationData(response.notification.request.content.data)
          : null;
        if (target) open(target);
      })
      .catch(() => undefined);

    return () => subscription.remove();
  }, [open]);

  /* A tap that had to wait for sign-in / the navigator. */
  useEffect(() => {
    const target = pending.current;
    if (target) open(target);
  }, [open, hydrated]);

  /* Teacher side (demo): record one lesson alert per install. */
  useEffect(() => {
    if (!DEMO_TEACHER_PUBLISH || !hydrated || !me || !bookkeeping || bookkeeping.demoDone) return;

    const settle = (done: Bookkeeping) => {
      setBookkeeping(done);
      writeBookkeeping(done).catch(() => undefined);
    };

    if (myNotifications.some((n) => n.kind === 'new-lesson')) {
      settle({ ...bookkeeping, demoDone: true });
      return;
    }

    const course = myCourses[0];
    const lesson = course ? newestLesson(course) : undefined;
    if (!course || !lesson) return;

    const timer = setTimeout(() => {
      addLessonNotification({
        lessonId: lesson.id,
        lessonKind: lesson.kind,
        lessonTitle: lesson.title,
        courseId: course.id,
        courseTitle: course.title,
        teacherName: courseTeacher(state, course).name,
      });
      settle({ ...bookkeeping, demoDone: true });
    }, DEMO_DELAY_MS);

    return () => clearTimeout(timer);
  }, [hydrated, me, bookkeeping, myCourses, myNotifications, state, addLessonNotification]);

  /* Deliver, into the shade, every lesson alert this device has not shown yet.
     An alert the student never saw — because they had not allowed notifications
     yet — waits here instead of being dropped. */
  useEffect(() => {
    if (!hydrated || !me || !bookkeeping || !allowed) return;

    const fresh = myNotifications.filter(
      (n) => n.kind === 'new-lesson' && !bookkeeping.delivered.includes(n.id),
    );
    if (fresh.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const notification of fresh) {
        await presentLessonAlertAsync(payloadOf(notification), lang).catch(() => undefined);
      }
      if (cancelled) return;
      const done: Bookkeeping = {
        ...bookkeeping,
        delivered: [...bookkeeping.delivered, ...fresh.map((n) => n.id)],
      };
      setBookkeeping(done);
      await writeBookkeeping(done).catch(() => undefined);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, me, bookkeeping, myNotifications, lang, allowed]);

  return null;
}
