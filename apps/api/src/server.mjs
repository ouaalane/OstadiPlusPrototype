/**
 * Watermark API — the prototype backend that issues per-playback
 * traceability codes for protected lesson videos.
 *
 * Endpoints
 *   GET  /health                      → service status
 *   POST /api/playback/start          → validate the playback + issue a code
 *                                       { studentId, courseId, videoId, deviceInfo? }
 *                                       → 201 { code, sessionId, createdAt }
 *   GET  /api/admin/watermarks/:code  → trace a leaked code back to the
 *                                       student/course/video/date
 *                                       (header: X-Admin-Token)
 *
 * `createWatermarkApi()` is exported for tests; `src/main.mjs` is the CLI
 * entry point (`npm run api`).
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { openDatabase } from './db.mjs';
import { CODE_LENGTH, isWatermarkCode } from './codes.mjs';
import { findWatermarkByCode, issueWatermark } from './watermarks.mjs';
import { resolveWatermarkRecord, validatePlayback } from './validate.mjs';

const BODY_LIMIT_BYTES = 16 * 1024;
const DEVICE_INFO_MAX = 160;
const ADMIN_PATH = '/api/admin/watermarks/';

/** Loose id shape check (ids come from the shared seed, e.g. 'st-iman'). */
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;

export function createWatermarkApi(options = {}) {
  const {
    dbPath = ':memory:',
    mode = 'random',
    hmacSecret = '',
    adminToken = 'dev-admin-token',
    logger = console,
  } = options;

  const db = openDatabase(dbPath, { logger });

  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      logger.error('[api] unhandled error', error);
      if (!res.headersSent) sendJson(res, 500, { error: 'internal' });
      else res.end();
    });
  });

  /** Close the HTTP server and the database (used by tests). */
  const close = () =>
    new Promise((resolve) => {
      server.close(() => {
        db.close();
        resolve();
      });
    });

  async function handle(req, res) {
    const startedAt = Date.now();
    const url = new URL(req.url ?? '/', 'http://localhost');
    let status;
    let body;

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        status = 200;
        body = {
          ok: true,
          service: 'ostadiplus-watermark-api',
          mode,
          codeLength: CODE_LENGTH,
          now: new Date().toISOString(),
        };
      } else if (req.method === 'POST' && url.pathname === '/api/playback/start') {
        ({ status, body } = await startPlayback(req));
      } else if (req.method === 'GET' && url.pathname.startsWith(ADMIN_PATH)) {
        ({ status, body } = adminLookup(req, url));
      } else {
        status = 404;
        body = { error: 'not-found' };
      }
    } catch (error) {
      status = 500;
      body = { error: 'internal' };
      logger.error('[api] request failed', error);
    }

    sendJson(res, status, body);
    logger.log(`[api] ${status} ${req.method} ${url.pathname} (${Date.now() - startedAt}ms)`);
  }

  /** POST /api/playback/start — validate, mint, record. */
  async function startPlayback(req) {
    const payload = await readJsonBody(req);
    if (!payload || typeof payload !== 'object') {
      return { status: 400, body: { error: 'invalid-json' } };
    }

    const studentId = cleanId(payload.studentId);
    const courseId = cleanId(payload.courseId);
    const videoId = cleanId(payload.videoId);
    const deviceInfo =
      typeof payload.deviceInfo === 'string'
        ? payload.deviceInfo.replace(/\s+/g, ' ').trim().slice(0, DEVICE_INFO_MAX)
        : '';

    if (!studentId || !courseId || !videoId) {
      return {
        status: 400,
        body: { error: 'invalid-request', message: 'studentId, courseId and videoId are required' },
      };
    }

    const check = validatePlayback({ studentId, courseId, videoId });
    if (!check.ok) return { status: check.status, body: { error: check.error } };

    const record = issueWatermark(db, {
      studentId,
      courseId,
      videoId,
      deviceInfo,
      mode,
      hmacSecret,
    });
    logger.log(
      `[watermark] issued ${record.code} → ${studentId} / ${courseId} / ${videoId} ` +
        `(session ${record.sessionId}${deviceInfo ? `, ${deviceInfo}` : ''})`,
    );

    return {
      status: 201,
      body: { code: record.code, sessionId: record.sessionId, createdAt: record.createdAt },
    };
  }

  /** GET /api/admin/watermarks/:code — trace a leaked code. */
  function adminLookup(req, url) {
    const token = req.headers['x-admin-token'];
    if (typeof token !== 'string' || !sameSecret(token, adminToken)) {
      return { status: 401, body: { error: 'unauthorized' } };
    }

    let raw;
    try {
      raw = decodeURIComponent(url.pathname.slice(ADMIN_PATH.length));
    } catch {
      return { status: 400, body: { error: 'invalid-code' } };
    }
    const code = raw.trim().toUpperCase();
    if (!isWatermarkCode(code)) return { status: 400, body: { error: 'invalid-code' } };

    const record = findWatermarkByCode(db, code);
    if (!record) return { status: 404, body: { error: 'not-found' } };

    return { status: 200, body: resolveWatermarkRecord(record) };
  }

  return {
    server,
    db,
    close,
    dbPath,
    mode,
    adminToken,
    /**
     * Test helper: listen on an ephemeral port and resolve the base URL.
     * (Production listens through `src/main.mjs`.)
     */
    listen: (port = 0, host = '127.0.0.1') =>
      new Promise((resolve) => {
        server.listen(port, host, () => {
          const address = server.address();
          resolve({ url: `http://${host}:${address.port}`, port: address.port });
        });
      }),
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function cleanId(value) {
  return typeof value === 'string' && ID_RE.test(value) ? value : '';
}

/** Constant-time token comparison (length is not secret enough to matter). */
function sameSecret(candidate, expected) {
  const a = Buffer.from(String(candidate));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Reads and parses a JSON body, refusing anything over `BODY_LIMIT_BYTES`. */
function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      size += chunk.length;
      if (size > BODY_LIMIT_BYTES) {
        aborted = true;
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}
