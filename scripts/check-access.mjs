import { register } from 'node:module';
import assert from 'node:assert/strict';
register('../apps/api/src/resolve.mjs', import.meta.url);
const {
  createDemoState,
  createAccessPeriod,
  centerMidnight,
  enrollmentHasAccess,
  enrollmentAllowsLesson,
  courseWithEnrollmentScope,
  accessibleCourses,
  isEnrollmentExpired,
} = await import('@ostadiplus/shared');
const { validatePlayback, validateDocument } =
  await import('../apps/api/src/validate.mjs');
const course = {
  id: 'test-course',
  status: 'published',
  semesters: [1, 2].map((n) => ({
    id: `term-${n}`,
    title: `Term ${n}`,
    chapters: [
      {
        id: `chapter-${n}`,
        lessons: ['video', 'pdf', 'text', 'quiz'].map((kind) => ({
          id: `${kind}-${n}`,
          kind,
          published: true,
        })),
      },
    ],
  })),
};
const studentId = 'student-test';
const enrollment = {
  id: 'enrollment-test',
  courseId: course.id,
  studentId,
  status: 'active',
  expiresAt: '2030-01-01T00:00:00Z',
  authorizedAt: '2026-01-01T00:00:00Z',
};
let checks = 0;
function check(name, fn) {
  fn();
  console.log('ok - ' + name);
  checks++;
}
const month = (n) =>
  createAccessPeriod(
    { kind: 'months', durationMonths: n, startsOn: '2026-01-31' },
    course,
    `month-${n}`,
  );
check('monthly calendar clamping and 1/2/3 month durations', () => {
  assert.equal(month(1).expiresAt, centerMidnight('2026-02-28'));
  assert.equal(month(2).expiresAt, centerMidnight('2026-03-31'));
  assert.equal(month(3).expiresAt, centerMidnight('2026-04-30'));
});
check('Moroccan clock changes use center midnight', () => {
  assert.equal(centerMidnight('2026-01-01'), '2025-12-31T23:00:00.000Z');
  assert.equal(centerMidnight('2026-03-01'), '2026-03-01T00:00:00.000Z');
});
const semester = (id) =>
  createAccessPeriod(
    {
      kind: 'semester',
      semesterId: id,
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
    },
    course,
    id,
  );
const scoped = { ...enrollment, accessPeriods: [semester('term-1')] };
const now = +new Date('2026-10-22T12:00:00Z');
check(
  'semester grants all four lesson kinds only in the purchased term',
  () => {
    for (const kind of ['video', 'pdf', 'text', 'quiz']) {
      assert.equal(
        enrollmentAllowsLesson(scoped, course, `${kind}-1`, now),
        true,
      );
      assert.equal(
        enrollmentAllowsLesson(scoped, course, `${kind}-2`, now),
        false,
      );
    }
  },
);
check('first and second term grants combine without broadening scope', () => {
  assert.equal(
    enrollmentAllowsLesson(
      { ...scoped, accessPeriods: [semester('term-2')] },
      course,
      'video-1',
      now,
    ),
    false,
  );
  assert.equal(
    enrollmentAllowsLesson(
      {
        ...scoped,
        accessPeriods: [...scoped.accessPeriods, semester('term-2')],
      },
      course,
      'video-2',
      now,
    ),
    true,
  );
});
check('monthly grant allows the whole course only during its dates', () => {
  const e = { ...enrollment, accessPeriods: [month(1)] };
  assert.equal(
    enrollmentHasAccess(e, +new Date('2026-01-30T12:00:00Z')),
    false,
  );
  assert.equal(
    enrollmentAllowsLesson(
      e,
      course,
      'pdf-2',
      +new Date('2026-02-15T12:00:00Z'),
    ),
    true,
  );
  assert.equal(enrollmentHasAccess(e, +new Date(month(1).expiresAt)), false);
});
check('term end date is inclusive; next midnight denies access', () => {
  const p = semester('term-1');
  assert.equal(enrollmentHasAccess(scoped, +new Date(p.expiresAt) - 1), true);
  assert.equal(enrollmentHasAccess(scoped, +new Date(p.expiresAt)), false);
});
check(
  'invalid dates, inverted periods, wrong terms and invalid durations rejected',
  () => {
    for (const plan of [
      { kind: 'months', startsOn: '2026-02-30', durationMonths: 1 },
      { kind: 'months', startsOn: '2026-01-01', durationMonths: 0 },
      { kind: 'months', startsOn: '2026-01-01', durationMonths: 1.5 },
      {
        kind: 'semester',
        startsOn: '2026-03-01',
        endsOn: '2026-02-28',
        semesterId: 'term-1',
      },
      {
        kind: 'semester',
        startsOn: '2026-01-01',
        endsOn: '2026-02-28',
        semesterId: 'unknown',
      },
    ])
      assert.throws(() => createAccessPeriod(plan, course, 'invalid'));
  },
);
check(
  'student-visible course keeps original lesson data but removes unpurchased term lessons',
  () => {
    const visible = courseWithEnrollmentScope(course, scoped, now);
    assert.equal(visible.semesters[0].chapters[0].lessons.length, 4);
    assert.equal(visible.semesters[1].chapters[0].lessons.length, 0);
    assert.equal(course.semesters[1].chapters[0].lessons.length, 4);
  },
);
check('legacy guest enrollments keep whole-course access', () => {
  assert.equal(enrollmentHasAccess(enrollment, now), true);
  assert.equal(courseWithEnrollmentScope(course, enrollment), course);
});
// Real server validation uses today's date; choose explicit current year window.
const today = new Date().getUTCFullYear();
const current = createAccessPeriod(
  {
    kind: 'semester',
    semesterId: 'term-1',
    startsOn: `${today}-01-01`,
    endsOn: `${today}-12-31`,
  },
  course,
  'current',
);
const state = {
  ...createDemoState(),
  courses: [course],
  students: [{ id: studentId }],
  enrollments: [{ ...enrollment, accessPeriods: [current] }],
};
check('server denies direct video/PDF IDs from another term', () => {
  assert.equal(
    validatePlayback(
      { studentId, courseId: course.id, videoId: 'video-1' },
      state,
    ).ok,
    true,
  );
  assert.equal(
    validateDocument(
      { studentId, courseId: course.id, documentId: 'pdf-1' },
      state,
    ).ok,
    true,
  );
  assert.equal(
    validatePlayback(
      { studentId, courseId: course.id, videoId: 'video-2' },
      state,
    ).status,
    403,
  );
  assert.equal(
    validateDocument(
      { studentId, courseId: course.id, documentId: 'pdf-2' },
      state,
    ).status,
    403,
  );
});
check('future grants do not unlock courses or appear expired', () => {
  const future = createAccessPeriod(
    { kind: 'months', startsOn: `${today + 1}-01-01`, durationMonths: 1 },
    course,
    'future',
  );
  const next = {
    ...state,
    enrollments: [{ ...enrollment, accessPeriods: [future] }],
  };
  assert.equal(accessibleCourses(next, studentId).length, 0);
  assert.equal(isEnrollmentExpired(next.enrollments[0]), false);
});
console.log(`${checks} subscription access checks passed`);
