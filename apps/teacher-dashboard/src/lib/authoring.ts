import type { QuizQuestion, Lesson } from '@ostadiplus/shared';
export const authoringId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const createQuestion = (): QuizQuestion => ({
  id: authoringId(),
  prompt: '',
  options: [
    { id: authoringId(), text: '' },
    { id: authoringId(), text: '' },
  ],
  correctIds: [],
});
export function questionError(q: QuizQuestion): string | null {
  if (!q.prompt.trim()) return 'اكتب نص السؤال.';
  if (q.options.length < 2 || q.options.some((o) => !o.text.trim()))
    return 'أضف اختيارين على الأقل واملأ جميع الاختيارات.';
  if (new Set(q.options.map((o) => o.id)).size !== q.options.length)
    return 'معرّفات الاختيارات مكرّرة.';
  if (
    !q.correctIds.length ||
    new Set(q.correctIds).size !== q.correctIds.length ||
    q.correctIds.some((id) => !q.options.some((o) => o.id === id))
  )
    return 'حدّد الإجابة أو الإجابات الصحيحة.';
  return null;
}
export function quizError(
  questions: QuizQuestion[],
  timeLimitSec: number,
): string | null {
  if (
    !Number.isInteger(timeLimitSec) ||
    timeLimitSec < 0 ||
    timeLimitSec > 86400
  )
    return 'المدة بين 0 و86400 ثانية، بدون كسور.';
  if (!questions.length || questions.length > 100)
    return 'الاختبار يحتاج بين سؤال واحد و100 سؤال.';
  for (let i = 0; i < questions.length; i++) {
    const error = questionError(questions[i]);
    if (error) return `السؤال ${i + 1}: ${error}`;
  }
  return null;
}
export function parseQuizImport(text: string): {
  questions: QuizQuestion[];
  timeLimitSec: number;
} {
  const data = JSON.parse(text);
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray(data.questions) ||
    data.questions.length > 100
  )
    throw new Error('ملف الاختبار يحتاج قائمة أسئلة (حتى 100 سؤال).');
  const questions: QuizQuestion[] = data.questions.map((q: QuizQuestion) => {
    if (
      typeof q?.prompt !== 'string' ||
      !Array.isArray(q.options) ||
      !Array.isArray(q.correctIds) ||
      q.options.some(
        (o) => typeof o?.id !== 'string' || typeof o?.text !== 'string',
      ) ||
      q.correctIds.some((id) => typeof id !== 'string')
    )
      throw new Error('بنية السؤال أو الاختيارات غير صالحة.');
    return {
      id: authoringId(),
      prompt: q.prompt,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      correctIds: [...q.correctIds],
    };
  });
  const timeLimitSec = data.timeLimitSec ?? 0;
  const error = quizError(questions, timeLimitSec);
  if (error) throw new Error(error);
  return { questions, timeLimitSec };
}

/** The same readiness rule protects editor save, bulk publish and course review. */
export function lessonPublishError(lesson: Lesson): string | null {
  if (lesson.title.trim().length < 2) return 'اكتب عنواناً من حرفين على الأقل.';
  if (lesson.kind === 'quiz')
    return quizError(lesson.questions ?? [], lesson.timeLimitSec ?? 0);
  if (lesson.kind === 'text')
    return lesson.body?.trim() ? null : 'أضف نص الدرس قبل النشر.';
  return lesson.file ? null : 'أرفق ملف الدرس قبل النشر.';
}
