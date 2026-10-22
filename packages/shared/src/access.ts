import type { Course, Enrollment } from './types';

/** Calendar dates use the center's timezone, including Ramadan clock changes. */
export const ACCESS_TIME_ZONE = 'Africa/Casablanca';
export interface AccessPeriod {
  id: string;
  kind: 'months' | 'semester';
  startsOn: string;
  endsOn: string;
  startsAt: string;
  expiresAt: string; // exclusive boundary
  durationMonths?: number;
  semesterId?: string;
}
export type AccessPlan = { startsOn: string } & (
  | { kind: 'months'; durationMonths: number }
  | { kind: 'semester'; semesterId: string; endsOn: string }
);

function day(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(+date) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error('أدخل تاريخاً صحيحاً');
  }
  return date;
}
function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}
function nextDay(value: string, delta: number) {
  const date = day(value);
  date.setUTCDate(date.getUTCDate() + delta);
  return isoDay(date);
}
export function centerToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join('-');
}
export function centerMidnight(value: string): string {
  const target = +day(value);
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (let i = 0; i < 4; i++) {
    const p = formatter.formatToParts(new Date(guess));
    const n = (key: string) => Number(p.find((v) => v.type === key)!.value);
    const represented = Date.UTC(
      n('year'),
      n('month') - 1,
      n('day'),
      n('hour'),
      n('minute'),
      n('second'),
    );
    guess += target - represented;
  }
  return new Date(guess).toISOString();
}
export function createAccessPeriod(
  plan: AccessPlan,
  course: Course,
  id: string,
): AccessPeriod {
  const start = day(plan.startsOn);
  let endsOn: string;
  let expiryDay: string;
  if (plan.kind === 'months') {
    if (
      !Number.isInteger(plan.durationMonths) ||
      plan.durationMonths < 1 ||
      plan.durationMonths > 24
    )
      throw new Error('المدة من شهر إلى 24 شهراً');
    const target = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + plan.durationMonths,
        1,
      ),
    );
    const last = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(start.getUTCDate(), last));
    expiryDay = isoDay(target);
    endsOn = nextDay(expiryDay, -1);
  } else {
    if (!course.semesters.some((s) => s.id === plan.semesterId))
      throw new Error('الدورة غير موجودة في هذا المقرر');
    day(plan.endsOn);
    if (plan.endsOn < plan.startsOn)
      throw new Error('تاريخ النهاية يجب أن يكون بعد البداية');
    endsOn = plan.endsOn;
    expiryDay = nextDay(endsOn, 1);
  }
  return {
    ...plan,
    id,
    endsOn,
    startsAt: centerMidnight(plan.startsOn),
    expiresAt: centerMidnight(expiryDay),
  };
}
export function currentPeriods(
  enrollment: Enrollment,
  now = Date.now(),
): AccessPeriod[] {
  return enrollment.status === 'active'
    ? (enrollment.accessPeriods ?? []).filter(
        (p) => +new Date(p.startsAt) <= now && now < +new Date(p.expiresAt),
      )
    : [];
}
export function enrollmentHasAccess(
  enrollment: Enrollment | undefined,
  now = Date.now(),
): boolean {
  if (!enrollment || enrollment.status !== 'active') return false;
  if (enrollment.accessPeriods)
    return currentPeriods(enrollment, now).length > 0;
  return !(+new Date(enrollment.expiresAt) <= now);
}
export function enrollmentAllowsLesson(
  enrollment: Enrollment | undefined,
  course: Course,
  lessonId: string,
  now = Date.now(),
): boolean {
  if (!enrollmentHasAccess(enrollment, now)) return false;
  const semester = course.semesters.find((s) =>
    s.chapters.some((c) => c.lessons.some((l) => l.id === lessonId)),
  );
  if (!semester) return false;
  return (
    !enrollment!.accessPeriods ||
    currentPeriods(enrollment!, now).some(
      (p) => p.kind === 'months' || p.semesterId === semester.id,
    )
  );
}
export function courseWithEnrollmentScope(
  course: Course,
  enrollment: Enrollment | undefined,
  now = Date.now(),
): Course {
  if (!enrollment?.accessPeriods) return course;
  return {
    ...course,
    semesters: course.semesters.map((s) => ({
      ...s,
      chapters: s.chapters.map((c) => ({
        ...c,
        lessons: c.lessons.filter((l) =>
          enrollmentAllowsLesson(enrollment, course, l.id, now),
        ),
      })),
    })),
  };
}
