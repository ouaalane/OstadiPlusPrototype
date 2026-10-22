/**
 * Executable checks for the video-watermark feature.
 *
 *  A. client logic — apps/student-app/src/lib/watermark.ts (pure module)
 *  B. server logic — apps/api (code minting, SQLite ledger, validation,
 *     HTTP endpoints)
 *
 * Requires Node >= 23.6 (native TypeScript type stripping + node:sqlite).
 *
 * Usage: node check-watermark.mjs
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  WATERMARK_CODE_ALPHABET,
  WATERMARK_CODE_LENGTH,
  WATERMARK_MOVE_MAX_MS,
  WATERMARK_MOVE_MIN_MS,
  WATERMARK_OPACITY,
  WATERMARK_OPACITY_MAX,
  WATERMARK_OPACITY_MIN,
  WATERMARK_SECONDARY_OPACITY,
  isWatermarkCode,
  localFallbackCode,
  nextWatermarkSlotIndex,
  nextWatermarkSlotIndexInOtherRow,
  randomInt,
  watermarkSlotColumn,
  watermarkSlotRow,
  randomMoveDelay,
  watermarkSlots,
} from './apps/student-app/src/lib/watermark.ts';

// The server reaches the TypeScript domain model through the shared package;
// register the resolver hook before importing anything that pulls it in.
register('./apps/api/src/resolve.mjs', import.meta.url);

const { openDatabase } = await import('./apps/api/src/db.mjs');
const {
  hmacWatermarkCode,
  isWatermarkCode: isServerCode,
  randomWatermarkCode,
} = await import('./apps/api/src/codes.mjs');
const {
  countWatermarks,
  findWatermarkByCode,
  issueWatermark,
} = await import('./apps/api/src/watermarks.mjs');
const { resolveWatermarkRecord, validateDocument, validatePlayback } = await import('./apps/api/src/validate.mjs');
const { createWatermarkApi } = await import('./apps/api/src/server.mjs');
const { DEMO_STATE, allLessons } = await import('@ostadiplus/shared');

let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
};

/** Keeps migration/HTTP chatter out of the test output. */
const quiet = { log() {}, error() {}, warn() {} };

const PILL = { width: 104, height: 20 };
const CONTAINERS = [
  { width: 390, height: 219, label: 'portrait 16:9 inline player' },
  { width: 844, height: 390, label: 'landscape fullscreen' },
  { width: 320, height: 180, label: 'small phone' },
  { width: 640, height: 360, label: 'tablet inline player' },
];

/* ================================================================== */
/* A. Client logic                                                     */
/* ================================================================== */

await test('slots keep the overlay fully inside every container size', () => {
  for (const c of CONTAINERS) {
    const slots = watermarkSlots(c, PILL);
    assert.equal(slots.length, 6, `${c.label}: expected 6 slots`);
    for (const s of slots) {
      assert.ok(s.x >= 0, `${c.label}: x>=0 (${s.x})`);
      assert.ok(s.y >= 0, `${c.label}: y>=0 (${s.y})`);
      assert.ok(s.x + PILL.width <= c.width, `${c.label}: right edge inside (${s.x + PILL.width} <= ${c.width})`);
      assert.ok(s.y + PILL.height <= c.height, `${c.label}: bottom edge inside (${s.y + PILL.height} <= ${c.height})`);
    }
  }
});

await test('slots avoid the top and bottom control bars on the inline player', () => {
  const c = { width: 390, height: 219 };
  const slots = watermarkSlots(c, PILL);
  const topRow = slots.slice(0, 2);
  const bottomRow = slots.slice(4);
  for (const s of topRow) assert.ok(s.y >= 30, `top row below controls (y=${s.y})`);
  for (const s of bottomRow) {
    assert.ok(s.y + PILL.height <= c.height - 25, `bottom row above scrubber (y=${s.y})`);
  }
});

await test('slots use corners and sides — never dead centre', () => {
  const slots = watermarkSlots({ width: 844, height: 390 }, PILL);
  const xs = new Set(slots.map((s) => s.x));
  const ys = new Set(slots.map((s) => s.y));
  assert.ok(xs.size >= 2, 'at least 2 distinct columns (both edges)');
  assert.ok(ys.size >= 3, 'at least 3 distinct rows');
  const centreX = (844 - PILL.width) / 2;
  const centreY = (390 - PILL.height) / 2;
  const deadCentre = slots.find(
    (s) => Math.abs(s.x - centreX) < 40 && Math.abs(s.y - centreY) < 40,
  );
  assert.equal(deadCentre, undefined, 'no slot in the dead centre (play button)');
});

await test('secondary copy lands on a different row and opposite edge', () => {
  const count = 6;
  for (let primary = 0; primary < count; primary++) {
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const secondary = nextWatermarkSlotIndexInOtherRow(count, primary);
      assert.ok(secondary >= 0 && secondary < count, `index in range (${secondary})`);
      assert.notEqual(secondary, primary, 'not the primary slot');
      assert.notEqual(
        watermarkSlotRow(secondary),
        watermarkSlotRow(primary),
        'different row',
      );
      assert.notEqual(
        watermarkSlotColumn(secondary),
        watermarkSlotColumn(primary),
        'opposite edge',
      );
      seen.add(secondary);
    }
    // Every opposite-edge slot on another row must be reachable.
    const expected = new Set(
      [0, 1, 2, 3, 4, 5].filter(
        (i) =>
          watermarkSlotRow(i) !== watermarkSlotRow(primary) &&
          watermarkSlotColumn(i) !== watermarkSlotColumn(primary),
      ),
    );
    assert.equal(seen.size, expected.size, `primary ${primary}: every diagonal slot reachable`);
    for (const value of expected) {
      assert.ok(seen.has(value), `primary ${primary} can reach ${value}`);
    }
  }
});

await test('randomised move delay stays inside the 8-15 s range', () => {
  assert.equal(WATERMARK_MOVE_MIN_MS, 8_000);
  assert.equal(WATERMARK_MOVE_MAX_MS, 15_000);
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const d = randomMoveDelay();
    assert.ok(d >= WATERMARK_MOVE_MIN_MS, `delay >= min (${d})`);
    assert.ok(d < WATERMARK_MOVE_MAX_MS, `delay < max (${d})`);
    seen.add(d);
  }
  assert.ok(seen.size > 100, `delay is not a fixed value (${seen.size} distinct)`);
});

await test('slot choice never repeats consecutively and covers every alternative', () => {
  const count = 8;
  let previous = nextWatermarkSlotIndex(count, -1);
  assert.ok(previous >= 0 && previous < count, 'initial pick in range');
  const hits = new Set([previous]);
  for (let i = 0; i < 10000; i++) {
    const next = nextWatermarkSlotIndex(count, previous);
    assert.ok(next >= 0 && next < count, `index in range (${next})`);
    assert.notEqual(next, previous, 'no immediate repetition');
    hits.add(next);
    previous = next;
  }
  assert.equal(hits.size, count, 'every slot eventually used');
});

await test('slot choice edge cases', () => {
  assert.equal(nextWatermarkSlotIndex(0, 3), -1, 'no slots -> -1');
  assert.equal(nextWatermarkSlotIndex(1, 0), 0, 'single slot -> itself');
  for (let i = 0; i < 100; i++) {
    const a = nextWatermarkSlotIndex(8, -5); // stale/invalid previous
    const b = nextWatermarkSlotIndex(8, 99);
    assert.ok(a >= 0 && a < 8, 'invalid previous (-5) handled');
    assert.ok(b >= 0 && b < 8, 'invalid previous (99) handled');
  }
});

await test('randomInt respects bounds', () => {
  for (let i = 0; i < 1000; i++) {
    const v = randomInt(3, 7);
    assert.ok(v >= 3 && v <= 6, `randomInt(3,7) in [3,6] (${v})`);
  }
  assert.equal(randomInt(5, 5), 5, 'degenerate range returns min');
});

await test('code validator accepts the spec example and issued codes', () => {
  assert.ok(isWatermarkCode('K7M2QX9TPA4W'), 'spec example accepted');
  assert.equal(WATERMARK_CODE_LENGTH, 12);
  for (let i = 0; i < 2000; i++) {
    assert.ok(isWatermarkCode(localFallbackCode()), 'fallback code accepted');
  }
});

await test('code validator rejects malformed or confusing values', () => {
  const rejected = [
    '',
    'k7m2qx9tpa4w', // lowercase
    'K7M2QX9TPA4WX', // 13 chars
    'K7M2QX9TPA4', // 11 chars (implemented format is exactly 12)
    'K7M2 QX9TPA4W', // space
    'K7M2QX9TPA4W · crs-math-2bac', // extra text
    'K0M2QX9TPA4W', // 0 forbidden
    'KOM2QX9TPA4W', // O forbidden
    'K1M2QX9TPA4W', // 1 forbidden
    'KIM2QX9TPA4W', // I forbidden
    'KLM2QX9TPA4W', // L forbidden
    null,
    42,
  ];
  for (const value of rejected) {
    assert.equal(isWatermarkCode(value), false, `rejected: ${String(value)}`);
  }
});

await test('offline fallback codes are well-formed and varied', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const code = localFallbackCode();
    assert.ok(isWatermarkCode(code), `well-formed (${code})`);
    seen.add(code);
  }
  assert.ok(seen.size > 1900, `varied (${seen.size} distinct of 2000)`);
});

await test('opacity constants sit inside the 0.15-0.25 band', () => {
  assert.ok(WATERMARK_OPACITY_MIN >= 0.15 && WATERMARK_OPACITY_MAX <= 0.25);
  assert.ok(WATERMARK_OPACITY >= WATERMARK_OPACITY_MIN && WATERMARK_OPACITY <= WATERMARK_OPACITY_MAX);
  assert.ok(
    WATERMARK_SECONDARY_OPACITY >= WATERMARK_OPACITY_MIN &&
      WATERMARK_SECONDARY_OPACITY <= WATERMARK_OPACITY,
    'secondary copy is dimmer but still inside the band',
  );
});

/* ================================================================== */
/* B. Server logic                                                     */
/* ================================================================== */

const mathCourse = DEMO_STATE.courses.find((c) => c.id === 'crs-math-2bac');
const mathVideo = allLessons(mathCourse).find((l) => l.kind === 'video' && l.published);
const nonVideoLesson = allLessons(mathCourse).find((l) => l.kind !== 'video');
const iman = DEMO_STATE.students.find((s) => s.id === 'st-iman');
assert.ok(mathCourse && mathVideo && nonVideoLesson && iman, 'seed fixture present');

await test('server code generator mints valid, unique codes', () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const code = randomWatermarkCode();
    assert.ok(isServerCode(code), `valid (${code})`);
    seen.add(code);
  }
  assert.equal(seen.size, 20000, 'no duplicate in 20k draws');
});

await test('server codes use every symbol of the alphabet', () => {
  const used = new Set();
  for (let i = 0; i < 2000; i++) {
    for (const ch of randomWatermarkCode()) used.add(ch);
  }
  for (const ch of WATERMARK_CODE_ALPHABET) {
    assert.ok(used.has(ch), `symbol ${ch} appears`);
  }
});

await test('hmac mode is deterministic and input-sensitive', () => {
  const a = hmacWatermarkCode('secret', 'st-iman', 'crs-math-2bac');
  const b = hmacWatermarkCode('secret', 'st-iman', 'crs-math-2bac');
  const otherStudent = hmacWatermarkCode('secret', 'st-yassine', 'crs-math-2bac');
  const otherSecret = hmacWatermarkCode('different', 'st-iman', 'crs-math-2bac');
  assert.ok(isServerCode(a), `valid (${a})`);
  assert.equal(a, b, 'stable per student+course');
  assert.notEqual(a, otherStudent, 'changes with the student');
  assert.notEqual(a, otherSecret, 'changes with the secret');
});

await test('migrations create the ledger and are idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ostadi-watermark-'));
  const dbFile = join(dir, 'watermarks.db');
  try {
    let db = openDatabase(dbFile, { logger: quiet });
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
    assert.ok(tables.includes('video_watermarks'), 'video_watermarks table exists');
    assert.ok(tables.includes('schema_migrations'), 'schema_migrations table exists');
    const applied = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n;
    assert.equal(applied, 1, 'one migration applied');
    db.close();

    db = openDatabase(dbFile, { logger: quiet }); // second open must not re-run it
    const again = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n;
    assert.equal(again, 1, 're-open is idempotent');
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('random mode records one fresh traceable row per playback start', () => {
  const db = openDatabase(':memory:', { logger: quiet });
  try {
    const input = { studentId: 'st-iman', courseId: 'crs-math-2bac', videoId: mathVideo.id, deviceInfo: 'Android 15 · test' };
    const first = issueWatermark(db, input);
    const second = issueWatermark(db, input);
    assert.ok(isServerCode(first.code) && isServerCode(second.code));
    assert.notEqual(first.code, second.code, 'fresh code per session');
    assert.notEqual(first.sessionId, second.sessionId, 'fresh session id per session');
    assert.equal(countWatermarks(db), 2, 'one row per playback start');

    const found = findWatermarkByCode(db, first.code);
    assert.equal(found.studentId, 'st-iman');
    assert.equal(found.courseId, 'crs-math-2bac');
    assert.equal(found.videoId, mathVideo.id);
    assert.equal(found.deviceInfo, 'Android 15 · test');
    assert.ok(found.createdAt, 'created_at is filled');
  } finally {
    db.close();
  }
});

await test('hmac mode keeps one stable row per student+course, refreshed', () => {
  const db = openDatabase(':memory:', { logger: quiet });
  try {
    const base = { studentId: 'st-iman', courseId: 'crs-math-2bac', videoId: mathVideo.id, mode: 'hmac', hmacSecret: 'test-secret' };
    const first = issueWatermark(db, { ...base, deviceInfo: 'first device' });
    const second = issueWatermark(db, { ...base, deviceInfo: 'second device' });
    assert.equal(first.code, second.code, 'stable code');
    assert.notEqual(first.sessionId, second.sessionId, 'session refreshed');
    assert.equal(second.deviceInfo, 'second device', 'device refreshed');
    assert.equal(countWatermarks(db), 1, 'a single row per student+course');
  } finally {
    db.close();
  }
});

await test('the ledger enforces code uniqueness', () => {
  const db = openDatabase(':memory:', { logger: quiet });
  try {
    const row = issueWatermark(db, { studentId: 'st-iman', courseId: 'crs-math-2bac', videoId: mathVideo.id });
    assert.throws(
      () =>
        db
          .prepare('INSERT INTO video_watermarks (code, student_id, course_id, video_id, session_id) VALUES (?, ?, ?, ?, ?)')
          .run(row.code, 'st-x', 'crs-x', 'lsn-x', 'sess-x'),
      /UNIQUE/,
      'duplicate code rejected by the UNIQUE constraint',
    );
  } finally {
    db.close();
  }
});

await test('playback validation follows the enrollment rules', () => {
  assert.equal(validatePlayback({ studentId: 'st-iman', courseId: 'crs-math-2bac', videoId: mathVideo.id }).ok, true);

  const unknownStudent = validatePlayback({ studentId: 'st-nobody', courseId: 'crs-math-2bac', videoId: mathVideo.id });
  assert.deepEqual({ error: unknownStudent.error, status: unknownStudent.status }, { error: 'unknown-student', status: 403 });

  const notEnrolled = validatePlayback({ studentId: 'st-omar', courseId: 'crs-math-2bac', videoId: mathVideo.id });
  assert.deepEqual({ error: notEnrolled.error, status: notEnrolled.status }, { error: 'not-enrolled', status: 403 });

  const unknownCourse = validatePlayback({ studentId: 'st-iman', courseId: 'crs-nope', videoId: mathVideo.id });
  assert.deepEqual({ error: unknownCourse.error, status: unknownCourse.status }, { error: 'unknown-course', status: 404 });

  // A lesson that exists but is not a video of that course is refused too.
  const nonVideo = validatePlayback({ studentId: 'st-iman', courseId: 'crs-math-2bac', videoId: nonVideoLesson.id });
  assert.equal(nonVideo.error, 'unknown-video');
  const foreignVideo = validatePlayback({ studentId: 'st-iman', courseId: 'crs-phys-2bac', videoId: mathVideo.id });
  assert.equal(foreignVideo.error, 'unknown-video');
});

await test('the trace report resolves student, course and lesson', () => {
  const report = resolveWatermarkRecord({
    code: 'K7M2QX9TPA4W',
    sessionId: 'sess-1',
    deviceInfo: 'Android 15 · Pixel',
    createdAt: '2026-10-19T10:00:00.000Z',
    studentId: 'st-iman',
    courseId: 'crs-math-2bac',
    videoId: mathVideo.id,
  });
  assert.equal(report.student.id, 'st-iman');
  assert.equal(report.student.fullName, iman.fullName);
  assert.equal(report.course.title, mathCourse.title);
  assert.equal(report.lesson.title, mathVideo.title);
  assert.equal(report.createdAt, '2026-10-19T10:00:00.000Z');
  assert.equal(resolveWatermarkRecord(null), null, 'null record stays null');
});

await test('HTTP: issuance, admin trace, auth and error paths end-to-end', async () => {
  const api = createWatermarkApi({ dbPath: ':memory:', adminToken: 'test-token', logger: quiet });
  const { url } = await api.listen(0);
  try {
    const health = await (await fetch(`${url}/health`)).json();
    assert.equal(health.ok, true);
    assert.equal(health.mode, 'random');

    const start = await fetch(`${url}/api/playback/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: 'st-iman', courseId: 'crs-math-2bac', videoId: mathVideo.id, deviceInfo: 'HTTP test' }),
    });
    assert.equal(start.status, 201);
    const grant = await start.json();
    assert.ok(isServerCode(grant.code), `granted a valid code (${grant.code})`);
    assert.ok(grant.sessionId && grant.createdAt);

    const noToken = await fetch(`${url}/api/admin/watermarks/${grant.code}`);
    assert.equal(noToken.status, 401, 'trace endpoint requires the admin token');

    const trace = await fetch(`${url}/api/admin/watermarks/${grant.code}`, {
      headers: { 'x-admin-token': 'test-token' },
    });
    assert.equal(trace.status, 200);
    const report = await trace.json();
    assert.equal(report.student.id, 'st-iman');
    assert.equal(report.course.id, 'crs-math-2bac');
    assert.equal(report.lesson.id, mathVideo.id);
    assert.equal(report.deviceInfo, 'HTTP test');

    const unknownCode = await fetch(`${url}/api/admin/watermarks/ABCDEFGHJKMN`, {
      headers: { 'x-admin-token': 'test-token' },
    });
    assert.equal(unknownCode.status, 404);

    const malformedCode = await fetch(`${url}/api/admin/watermarks/nope`, {
      headers: { 'x-admin-token': 'test-token' },
    });
    assert.equal(malformedCode.status, 400);

    const rejected = await fetch(`${url}/api/playback/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: 'st-nobody', courseId: 'crs-math-2bac', videoId: mathVideo.id }),
    });
    assert.equal(rejected.status, 403);

    const badBody = await fetch(`${url}/api/playback/start`, { method: 'POST', body: 'not-json' });
    assert.equal(badBody.status, 400);
  } finally {
    await api.close();
  }
});

await test('PDF grants require enrollment and a published PDF in the requested course', () => {
  const pdf = allLessons(mathCourse).find((lesson) => lesson.kind === 'pdf' && lesson.published);
  assert.ok(pdf, 'seed provides a published PDF');
  const request = { studentId: 'st-iman', courseId: mathCourse.id, documentId: pdf.id };
  assert.equal(validateDocument(request).ok, true);
  assert.equal(validateDocument({ ...request, studentId: 'st-omar' }).error, 'not-enrolled');
  assert.equal(validateDocument({ ...request, studentId: 'st-nobody' }).error, 'unknown-student');
  assert.equal(validateDocument({ ...request, documentId: mathVideo.id }).error, 'unknown-document');
  assert.equal(validateDocument({ ...request, courseId: 'crs-phys-2bac' }).error, 'unknown-document');
});

await test('HTTP: PDF opens issue fresh traceable codes without changing video issuance', async () => {
  const api = createWatermarkApi({ dbPath: ':memory:', adminToken: 'test-token', logger: quiet });
  const { url } = await api.listen(0);
  const pdf = allLessons(mathCourse).find((lesson) => lesson.kind === 'pdf' && lesson.published);
  const post = (body) => fetch(`${url}/api/documents/open`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const request = { studentId: 'st-iman', courseId: mathCourse.id, documentId: pdf.id, deviceInfo: 'PDF test' };
  try {
    const first = await post(request);
    assert.equal(first.status, 201);
    const grant = await first.json();
    assert.ok(isServerCode(grant.code));
    const second = await post(request);
    assert.equal(second.status, 201);
    const reopened = await second.json();
    assert.notEqual(reopened.code, grant.code);
    assert.notEqual(reopened.sessionId, grant.sessionId);
    const trace = await fetch(`${url}/api/admin/watermarks/${grant.code}`, {
      headers: { 'x-admin-token': 'test-token' },
    });
    assert.equal(trace.status, 200);
    const report = await trace.json();
    assert.equal(report.student.id, request.studentId);
    assert.equal(report.lesson.id, pdf.id);
    assert.equal(report.lesson.kind, 'pdf');
    assert.equal(report.deviceInfo, 'PDF test');
    const denied = await post({ ...request, studentId: 'st-omar' });
    assert.equal(denied.status, 403);
    const wrongKind = await post({ ...request, documentId: mathVideo.id });
    assert.equal(wrongKind.status, 404);
    const missingId = await post({ ...request, documentId: undefined });
    assert.equal(missingId.status, 400);
    const noToken = await fetch(`${url}/api/admin/watermarks/${grant.code}`);
    assert.equal(noToken.status, 401);
  } finally { await api.close(); }
});

console.log(`\n${passed} checks passed`);
