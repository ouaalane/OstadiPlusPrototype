/**
 * Lesson alerts — real notifications in the device's notification shade.
 *
 * When a teacher publishes a lesson, the student should be told the way any
 * Android app tells them: a notification with the teacher's name, the lesson and
 * the course, that opens the lesson when tapped. This module owns the device
 * side of that: the Android channel, the permission prompt, the delivery call,
 * and the tap listener.
 *
 * `src/notifications/LessonAlerts.tsx` is the bridge that feeds it from the
 * student's data and routes taps back into the navigator.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Lang, NewLessonNotificationPayload } from '@ostadiplus/shared';

/** Android channel for lesson alerts (the student can tune it in system settings). */
export const LESSON_CHANNEL = 'lessons';

/** Shows an alert while the app is open, instead of swallowing it. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Creates the channel and gets permission. Android 13+ only shows the system
 * prompt once a channel exists, so the channel is created first.
 *
 * Resolves to whether the student has allowed notifications.
 */
export async function prepareLessonAlertsAsync(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(LESSON_CHANNEL, {
      name: 'الدروس الجديدة · Nouveaux cours',
      description: 'يُشعرك هذا القناة عند نشر الأستاذ لدرس جديد',
      importance: Notifications.AndroidImportance.HIGH,
      /* Omit `sound` on purpose: Android then uses the system default sound.
         Passing 'default' makes expo-notifications look for a custom
         `default.*` asset and log an error over the UI. */
      lightColor: '#0B5CFF',
      vibrationPattern: [0, 220, 120, 220],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Delivers a lesson alert to the notification shade, immediately. */
export async function presentLessonAlertAsync(
  alert: NewLessonNotificationPayload & { notificationId?: string },
  lang: Lang,
): Promise<void> {
  const rtl = lang === 'ar';

  /* Flat string data — the same keys a push payload would carry, and what the
     tap handler reads back to work out which lesson to open. */
  const data: Record<string, string> = {
    lessonId: alert.lessonId,
    lessonKind: alert.lessonKind,
    lessonTitle: alert.lessonTitle,
    courseId: alert.courseId,
    courseTitle: alert.courseTitle,
    teacherName: alert.teacherName,
  };
  if (alert.notificationId) data.notificationId = alert.notificationId;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: rtl
        ? `${alert.teacherName} نشر درساً جديداً`
        : `${alert.teacherName} a publié une nouvelle leçon`,
      body: rtl
        ? `«${alert.lessonTitle}» في ${alert.courseTitle}`
        : `« ${alert.lessonTitle} » dans ${alert.courseTitle}`,
      data,
      sound: 'default',
      color: '#0B5CFF',
    },
    /* A channel-aware trigger delivers immediately through the channel above. */
    trigger: { channelId: LESSON_CHANNEL },
  });
}

/** Reads the lesson a tapped notification points at, if it carries one. */
export function alertFromNotificationData(
  data: unknown,
): (NewLessonNotificationPayload & { notificationId?: string }) | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const str = (key: string) => (typeof d[key] === 'string' ? (d[key] as string) : '');
  const lessonId = str('lessonId');
  if (!lessonId) return null;
  return {
    lessonId,
    lessonKind: str('lessonKind') || 'pdf',
    lessonTitle: str('lessonTitle'),
    courseId: str('courseId'),
    courseTitle: str('courseTitle'),
    teacherName: str('teacherName'),
    notificationId: str('notificationId') || undefined,
  };
}
