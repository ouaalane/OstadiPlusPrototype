/**
 * Watermark ledger — issuing, refreshing and looking up traceability codes.
 *
 * `issueWatermark()` is called on every playback start. In the default
 * "random" mode it mints a fresh CSPRNG code per session (full audit trail:
 * one row per playback). In "hmac" mode the code is stable per
 * (student, course), so the row is upserted and refreshed with the latest
 * session/device/timestamp — exactly one row per student+course.
 */
import { randomUUID } from 'node:crypto';
import { hmacWatermarkCode, randomWatermarkCode } from './codes.mjs';

const COLUMNS = `
  id, code,
  student_id  AS studentId,
  course_id   AS courseId,
  video_id    AS videoId,
  session_id  AS sessionId,
  device_info AS deviceInfo,
  created_at  AS createdAt
`;

const INSERT_SQL = `
  INSERT INTO video_watermarks (code, student_id, course_id, video_id, session_id, device_info)
  VALUES (?, ?, ?, ?, ?, ?)
`;

/** HMAC mode: one row per (student, course), refreshed on each playback. */
const UPSERT_SQL = `
  INSERT INTO video_watermarks (code, student_id, course_id, video_id, session_id, device_info)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(code) DO UPDATE SET
    video_id    = excluded.video_id,
    session_id  = excluded.session_id,
    device_info = excluded.device_info,
    created_at  = excluded.created_at
`;

const MAX_INSERT_ATTEMPTS = 5;

/**
 * Mints a code for a validated playback start and records it.
 * Returns the stored row (code, sessionId, createdAt, …).
 */
export function issueWatermark(db, input) {
  const { studentId, courseId, videoId, deviceInfo = '', mode = 'random', hmacSecret = '' } = input;
  const sessionId = randomUUID();

  if (mode === 'hmac') {
    const code = hmacWatermarkCode(hmacSecret, studentId, courseId);
    db.prepare(UPSERT_SQL).run(code, studentId, courseId, videoId, sessionId, deviceInfo);
    return findWatermarkByCode(db, code);
  }

  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
    const code = randomWatermarkCode();
    try {
      db.prepare(INSERT_SQL).run(code, studentId, courseId, videoId, sessionId, deviceInfo);
      return findWatermarkByCode(db, code);
    } catch (error) {
      // A UNIQUE clash on `code` means an (astronomically rare) collision —
      // mint another one. Anything else is a real problem.
      if (!String(error?.message ?? '').includes('UNIQUE')) throw error;
    }
  }
  throw new Error(`could not mint a unique watermark code after ${MAX_INSERT_ATTEMPTS} attempts`);
}

/** The admin lookup behind `GET /api/admin/watermarks/:code` and `api:trace`. */
export function findWatermarkByCode(db, code) {
  return db.prepare(`SELECT ${COLUMNS} FROM video_watermarks WHERE code = ?`).get(code) ?? null;
}

/** Row count — used by tests and health checks. */
export function countWatermarks(db) {
  return db.prepare('SELECT COUNT(*) AS total FROM video_watermarks').get().total;
}
