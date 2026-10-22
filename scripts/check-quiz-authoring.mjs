import assert from 'node:assert/strict';
import {
  createQuestion,
  parseQuizImport,
  questionError,
  quizError,
  lessonPublishError,
} from '../apps/teacher-dashboard/src/lib/authoring.ts';
let checks = 0;
const check = (name, fn) => {
  fn();
  checks++;
  console.log('ok - ' + name);
};
const valid = {
  prompt: 'ما نتيجة 2+2؟',
  options: [
    { id: 'a', text: '4' },
    { id: 'b', text: '5' },
  ],
  correctIds: ['a'],
};
check('blank questions need a prompt', () =>
  assert.ok(questionError(createQuestion())),
);
check('valid single choice', () =>
  assert.equal(questionError({ ...valid, id: 'q' }), null),
);
check('valid multiple choice', () =>
  assert.equal(
    questionError({ ...valid, id: 'q', correctIds: ['a', 'b'] }),
    null,
  ),
);
check('blank options cannot silently change a correct answer', () =>
  assert.ok(
    questionError({
      ...valid,
      id: 'q',
      options: [
        { id: 'a', text: ' ' },
        { id: 'b', text: '5' },
      ],
    }),
  ),
);
check('unknown correct option rejected', () =>
  assert.ok(questionError({ ...valid, id: 'q', correctIds: ['c'] })),
);
check('duplicate options rejected', () =>
  assert.ok(
    questionError({
      ...valid,
      id: 'q',
      options: [
        { id: 'a', text: '4' },
        { id: 'a', text: '5' },
      ],
    }),
  ),
);
check('empty and oversized quizzes rejected', () => {
  assert.ok(quizError([], 0));
  assert.ok(quizError(Array(101).fill({ ...valid, id: 'q' }), 0));
});
check('time limit accepts only whole seconds in range', () => {
  for (const t of [-1, 0.5, 86401, NaN])
    assert.ok(quizError([{ ...valid, id: 'q' }], t));
  assert.equal(quizError([{ ...valid, id: 'q' }], 0), null);
  assert.equal(quizError([{ ...valid, id: 'q' }], 86400), null);
});
check(
  'JSON import keeps original correct IDs and regenerates question identity',
  () => {
    const a = parseQuizImport(
      JSON.stringify({ questions: [valid], timeLimitSec: 120 }),
    );
    const b = parseQuizImport(JSON.stringify({ questions: [valid] }));
    assert.notEqual(a.questions[0].id, b.questions[0].id);
    assert.deepEqual(a.questions[0].correctIds, ['a']);
    assert.equal(a.timeLimitSec, 120);
    assert.equal(b.timeLimitSec, 0);
  },
);
check('malformed JSON and wrong shapes fail clearly', () => {
  for (const text of [
    'bad',
    'null',
    '{}',
    JSON.stringify({ questions: [{ prompt: 'question', options: null }] }),
  ])
    assert.throws(() => parseQuizImport(text));
});
check('import validates answer ownership and timer', () => {
  assert.throws(() =>
    parseQuizImport(
      JSON.stringify({ questions: [{ ...valid, correctIds: ['missing'] }] }),
    ),
  );
  assert.throws(() =>
    parseQuizImport(
      JSON.stringify({ questions: [valid], timeLimitSec: '120' }),
    ),
  );
});
check('publication requires a real file or non-empty text', () => {
  assert.ok(lessonPublishError({ title: 'Video', kind: 'video', file: '' }));
  assert.equal(
    lessonPublishError({ title: 'PDF lesson', kind: 'pdf', file: 'sheet.pdf' }),
    null,
  );
  assert.ok(
    lessonPublishError({ title: 'Text lesson', kind: 'text', body: ' ' }),
  );
});
check('bulk and editor publication use the same quiz readiness rule', () => {
  assert.ok(
    lessonPublishError({
      title: 'Quiz',
      kind: 'quiz',
      questions: [{ ...valid, id: 'q', correctIds: [] }],
      timeLimitSec: 0,
    }),
  );
  assert.equal(
    lessonPublishError({
      title: 'Quiz',
      kind: 'quiz',
      questions: [{ ...valid, id: 'q' }],
      timeLimitSec: 120,
    }),
    null,
  );
});
console.log(`PASS ${checks} quiz authoring checks`);
