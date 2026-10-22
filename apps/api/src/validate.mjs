/**
 * Server-side playback validation + trace resolution.
 *
 * The prototype has no central database yet, so the API validates against
 * the shared demo seed (`@ostadiplus/shared`) — the same domain model both
 * apps already use. A request is only granted a watermark code when the
 * student exists AND currently holds an active, non-expired enrollment for
 * a published course AND the video belongs to that course.
 *
 * NOTE (prototype): the request identifies the student by id; in production
 * this endpoint sits behind the authenticated playback token, and the
 * student comes from the verified session — never from the request body.
 */
import {
  DEMO_STATE,
  allLessons,
  findCourse,
  isEnrollmentExpired,
} from '@ostadiplus/shared';

/**
 * @returns `{ ok: true, student, course, lesson }` or
 *          `{ ok: false, status, error }` ready to send as the response.
 */
export function validatePlayback({ studentId, courseId, videoId }) {
  return validateLessonAccess({ studentId, courseId, lessonId: videoId }, 'video');
}

export function validateDocument({ studentId, courseId, documentId }) {
  return validateLessonAccess({ studentId, courseId, lessonId: documentId }, 'pdf');
}

function validateLessonAccess({ studentId, courseId, lessonId }, kind) {
  const student = DEMO_STATE.students.find((s) => s.id === studentId);
  if (!student) return { ok: false, status: 403, error: 'unknown-student' };

  const course = findCourse(DEMO_STATE, courseId);
  if (!course || course.status !== 'published') {
    return { ok: false, status: 404, error: 'unknown-course' };
  }

  const enrolled = DEMO_STATE.enrollments.some(
    (e) =>
      e.studentId === studentId &&
      e.courseId === courseId &&
      e.status === 'active' &&
      !isEnrollmentExpired(e),
  );
  if (!enrolled) return { ok: false, status: 403, error: 'not-enrolled' };

  const lesson = allLessons(course).find((l) => l.id === lessonId);
  if (!lesson || lesson.kind !== kind || !lesson.published) {
    return { ok: false, status: 404, error: kind === 'pdf' ? 'unknown-document' : 'unknown-video' };
  }

  return { ok: true, student, course, lesson };
}

/**
 * Turns a stored watermark row into the admin-facing trace report: who
 * (student identity), what (course + lesson), when (createdAt) and from
 * which session/device the leaked code was issued.
 */
export function resolveWatermarkRecord(record) {
  if (!record) return null;
  const student = DEMO_STATE.students.find((s) => s.id === record.studentId) ?? null;
  const course = findCourse(DEMO_STATE, record.courseId) ?? null;
  const lesson = course
    ? (allLessons(course).find((l) => l.id === record.videoId) ?? null)
    : null;

  return {
    code: record.code,
    sessionId: record.sessionId,
    deviceInfo: record.deviceInfo,
    createdAt: record.createdAt,
    student: student && {
      id: student.id,
      fullName: student.fullName,
      studentCode: student.studentCode,
      phone: student.phone,
      email: student.email,
    },
    course: course && { id: course.id, title: course.title, level: course.level },
    lesson: lesson && { id: lesson.id, kind: lesson.kind, title: lesson.title, file: lesson.file },
  };
}
