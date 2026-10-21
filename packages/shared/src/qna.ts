/**
 * Course Q & R selectors + factories.
 *
 * The prototype keeps questions in the shared demo state so the teacher
 * dashboard export carries them to the student app. A production backend
 * should expose the same shape from a `course_questions` / `question_replies`
 * pair of tables (see the student app's final report).
 */

import type {
  QnaAuthorRole,
  QnaQuestion,
  QnaReply,
  DemoState,
} from './types';

/** Stable-enough id for locally-created prototype records. */
export function qnaId(prefix: 'qst' | 'rpl'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/** All questions of a course, newest first. */
export function questionsForCourse(
  state: DemoState,
  courseId: string,
): QnaQuestion[] {
  return (state.questions ?? [])
    .filter((q) => q.courseId === courseId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Questions attached to one lesson, newest first. */
export function questionsForLesson(
  state: DemoState,
  lessonId: string,
): QnaQuestion[] {
  return (state.questions ?? [])
    .filter((q) => q.lessonId === lessonId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A thread is answered as soon as the teacher has replied at least once. */
export function isQuestionAnswered(question: QnaQuestion): boolean {
  return question.replies.some((reply) => reply.authorRole === 'teacher');
}

/** Unanswered questions, newest first. */
export function unansweredQuestions(
  state: DemoState,
  courseId?: string,
): QnaQuestion[] {
  return (state.questions ?? [])
    .filter((q) => !courseId || q.courseId === courseId)
    .filter((q) => !isQuestionAnswered(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Number of questions still waiting for a teacher reply. */
export function unansweredCount(state: DemoState, courseId?: string): number {
  return unansweredQuestions(state, courseId).length;
}

export function makeQuestion(input: {
  courseId: string;
  lessonId?: string;
  studentId: string;
  authorName: string;
  body: string;
}): QnaQuestion {
  return {
    id: qnaId('qst'),
    courseId: input.courseId,
    lessonId: input.lessonId,
    studentId: input.studentId,
    authorName: input.authorName,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    replies: [],
  };
}

export function makeReply(input: {
  authorId: string;
  authorName: string;
  authorRole: QnaAuthorRole;
  body: string;
}): QnaReply {
  return {
    id: qnaId('rpl'),
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  };
}

/** Lesson label for a question row, resolved from the course program. */
export function lessonTitleForQuestion(
  state: DemoState,
  question: QnaQuestion,
): string | null {
  if (!question.lessonId) return null;
  for (const course of state.courses) {
    if (course.id !== question.courseId) continue;
    for (const semester of course.semesters) {
      for (const chapter of semester.chapters) {
        const found = chapter.lessons.find((l) => l.id === question.lessonId);
        if (found) return found.title;
      }
    }
  }
  return null;
}
