import { register } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
register('../apps/api/src/resolve.mjs', import.meta.url);
const { createWatermarkApi } = await import('../apps/api/src/server.mjs');
const directory = await mkdtemp(join(tmpdir(), 'oustadi-sync-'));
let api;
let base;
let checks = 0;
async function start() {
  api = createWatermarkApi({
    demoDirectory: directory,
    logger: { log() {}, error() {} },
  });
  await new Promise((r) => api.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${api.server.address().port}`;
}
async function request(path, body) {
  const response = await fetch(
    base + path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  assert.equal(
    response.status,
    200,
    `${path}: ${await response.clone().text()}`,
  );
  return response.json();
}
try {
  await start();
  const initial = await request('/api/demo/state');
  const teacher = structuredClone(initial);
  const course = teacher.courses.find((c) => c.id === 'crs-math-2bac');
  const chapter = course.semesters[0].chapters[0];
  const bytes = Buffer.from('prototype-video-bytes-0123456789');
  let response = await fetch(base + '/api/demo/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'video/mp4', 'X-File-Name': 'lesson.mp4' },
    body: bytes,
  });
  assert.equal(response.status, 201);
  const { file } = await response.json();
  checks++;
  response = await fetch(base + file, { headers: { Range: 'bytes=3-9' } });
  assert.equal(response.status, 206);
  assert.equal(
    Buffer.from(await response.arrayBuffer()).toString(),
    bytes.subarray(3, 10).toString(),
  );
  checks++;
  response = await fetch(base + file, { headers: { Range: 'bytes=9999-' } });
  assert.equal(response.status, 416);
  checks++;
  response = await fetch(base + '/api/demo/upload', {
    method: 'POST',
    headers: { 'X-File-Name': 'attack.html' },
    body: '<script/>',
  });
  assert.equal(response.status, 415);
  checks++;
  const lesson = {
    id: 'lsn-sync-video',
    title: 'درس مرفوع',
    kind: 'video',
    description: 'وصف الفيديو',
    thumbnailUrl: 'data:image/png;base64,test',
    file,
    published: true,
    durationSec: 30,
    sizeMb: 0.1,
    pages: 0,
  };
  chapter.lessons.push(lesson);
  const quiz = {
    ...lesson,
    id: 'lsn-sync-quiz',
    kind: 'quiz',
    file: '',
    timeLimitSec: 2,
    questions: [
      {
        id: 'q-sync',
        prompt: '1 + 1 ?',
        options: [
          { id: 'a', text: '2' },
          { id: 'b', text: '3' },
        ],
        correctIds: ['a'],
      },
    ],
  };
  chapter.lessons.push(quiz);
  await request('/api/demo/state', teacher);
  let state = await request('/api/demo/state');
  assert.equal(
    state.courses
      .find((c) => c.id === course.id)
      .semesters[0].chapters[0].lessons.at(-1).timeLimitSec,
    2,
  );
  checks++;
  response = await fetch(base + '/api/playback/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: 'st-iman',
      courseId: course.id,
      videoId: lesson.id,
    }),
  });
  assert.equal(response.status, 201);
  assert.match((await response.json()).code, /^[A-Z0-9]{12}$/);
  checks++;
  const student = state.students.find((s) => s.id === 'st-iman');
  const question = {
    id: 'qn-sync',
    courseId: course.id,
    lessonId: lesson.id,
    studentId: student.id,
    authorName: student.fullName,
    body: 'سؤال حول الفيديو',
    createdAt: new Date().toISOString(),
    replies: [],
  };
  state = await request('/api/demo/student', {
    student,
    progress: [
      {
        lessonId: lesson.id,
        completed: true,
        positionSec: 30,
        updatedAt: new Date().toISOString(),
      },
    ],
    questions: [question],
    quizAttempts: [
      {
        id: 'attempt-sync',
        studentId: student.id,
        lessonId: quiz.id,
        correct: 1,
        total: 1,
        elapsedSec: 2,
        submittedAt: new Date().toISOString(),
      },
    ],
  });
  assert.ok(
    state.progress[student.id].some(
      (p) => p.lessonId === lesson.id && p.completed,
    ),
  );
  assert.ok(state.questions.some((q) => q.id === question.id));
  assert.ok(state.quizAttempts.some((a) => a.id === 'attempt-sync'));
  checks += 3;
  const reply = {
    id: 'reply-sync',
    authorId: teacher.teacher.id,
    authorName: teacher.teacher.name,
    authorRole: 'teacher',
    body: 'جواب الأستاذ',
    createdAt: new Date().toISOString(),
  };
  teacher.questions.push({ ...question, replies: [reply] });
  state = await request('/api/demo/state', teacher);
  assert.ok(
    state.progress[student.id].some(
      (p) => p.lessonId === lesson.id && p.completed,
    ),
  );
  assert.ok(
    state.questions
      .find((q) => q.id === question.id)
      .replies.some((r) => r.id === reply.id),
  );
  checks += 2;
  state = await request('/api/demo/student', {
    student,
    progress: [],
    questions: [question],
  });
  assert.ok(
    state.questions
      .find((q) => q.id === question.id)
      .replies.some((r) => r.id === reply.id),
  );
  checks++;
  response = await fetch(base + '/api/demo/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courses: [] }),
  });
  assert.equal(response.status, 400);
  checks++;
  const newcomer = {
    ...student,
    id: 'st-new-sync',
    fullName: 'New learner',
    studentCode: 'UST-NEWSY',
  };
  state = await request('/api/demo/student', {
    student: newcomer,
    questions: [],
    progress: [],
  });
  assert.ok(state.students.some((s) => s.id === newcomer.id));
  assert.equal(
    state.enrollments.filter((e) => e.studentId === newcomer.id).length,
    0,
  );
  checks++;
  const membership = {
    id: 'membership-sync',
    studentId: newcomer.id,
    centerId: state.centers[0].id,
    status: 'requested',
    requestedAt: new Date().toISOString(),
  };
  state = await request('/api/demo/student', {
    student: newcomer,
    memberships: [membership],
  });
  assert.ok(
    state.memberships.some(
      (m) => m.id === membership.id && m.status === 'requested',
    ),
  );
  const beforeConsent = structuredClone(state);
  state = await request('/api/demo/student', {
    student: newcomer,
    memberships: [{ ...membership, status: 'active' }],
  });
  assert.equal(
    state.memberships.find((m) => m.id === membership.id).status,
    'active',
  );
  state = await request('/api/demo/state', beforeConsent);
  assert.equal(
    state.memberships.find((m) => m.id === membership.id).status,
    'active',
  );
  assert.equal(
    state.enrollments.filter((e) => e.studentId === newcomer.id).length,
    0,
  );
  checks++;
  state.enrollments.push({
    studentId: newcomer.id,
    courseId: course.id,
    status: 'active',
  });
  state = await request('/api/demo/state', state);
  const access = state.notifications.find(
    (n) => n.studentId === newcomer.id && n.kind === 'access-granted',
  );
  assert.ok(access);
  state = await request('/api/demo/student', {
    student: newcomer,
    readNotifications: [access.id],
  });
  assert.equal(state.notifications.find((n) => n.id === access.id).read, true);
  response = await fetch(base + '/api/playback/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: newcomer.id,
      courseId: course.id,
      videoId: lesson.id,
    }),
  });
  assert.equal(response.status, 201);
  checks++;
  await api.close();
  await start();
  state = await request('/api/demo/state');
  assert.ok(state.questions.find((q) => q.id === question.id).replies.length);
  assert.equal((await fetch(base + file)).status, 200);
  checks++;
  response = await fetch(base + '/api/demo/pdfjs/pdf.mjs');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /javascript/);
  await response.arrayBuffer();
  checks++;
  console.log(
    `PASS ${checks} demo integration checks: media/ranges, validation, publish, dynamic watermark, questions/replies, progress, quiz results, registration and durable restart`,
  );
} finally {
  if (api) await api.close();
  await rm(directory, { recursive: true, force: true });
}
