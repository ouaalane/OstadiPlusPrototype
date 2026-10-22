/**
 * `npm run api` — starts the watermark API.
 *
 *   node src/main.mjs [--port 8787] [--host 0.0.0.0] [--db <path>]
 *                     [--mode random|hmac]
 *
 * Environment variables (flags win):
 *   WATERMARK_API_PORT      default 8787
 *   WATERMARK_API_HOST      default 0.0.0.0 (reachable from the emulator/LAN)
 *   WATERMARK_DB            default apps/api/data/watermarks.db
 *   WATERMARK_CODE_MODE     'random' (default) | 'hmac'
 *   WATERMARK_HMAC_SECRET   required for hmac mode
 *   WATERMARK_ADMIN_TOKEN   protects GET /api/admin/watermarks/:code
 */
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Plain Node cannot resolve the shared package's extensionless TS imports by
// itself — the hook below teaches it how, before anything imports them.
register('./resolve.mjs', import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const { createWatermarkApi } = await import('./server.mjs');

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const port = toPort(args.port ?? process.env.WATERMARK_API_PORT ?? '8787');
const host = String(args.host ?? process.env.WATERMARK_API_HOST ?? '0.0.0.0');
const dbPath = resolve(
  String(args.db ?? process.env.WATERMARK_DB ?? join(HERE, '..', 'data', 'watermarks.db')),
);
const mode = String(args.mode ?? process.env.WATERMARK_CODE_MODE ?? 'random');
const hmacSecret = process.env.WATERMARK_HMAC_SECRET ?? '';
const adminToken = String(args['admin-token'] ?? process.env.WATERMARK_ADMIN_TOKEN ?? 'dev-admin-token');

if (mode !== 'random' && mode !== 'hmac') {
  fail(`unknown mode "${mode}" — use "random" or "hmac"`);
}
if (mode === 'hmac' && !hmacSecret) {
  fail('WATERMARK_CODE_MODE=hmac requires WATERMARK_HMAC_SECRET to be set');
}
if (adminToken === 'dev-admin-token') {
  console.warn(
    '[api] WARNING: the default dev admin token is active — set WATERMARK_ADMIN_TOKEN before exposing this server.',
  );
}

const api = createWatermarkApi({ dbPath, mode, hmacSecret, adminToken });

api.server.listen(port, host, () => {
  console.log(`[api] watermark API listening on http://${host}:${port} (mode=${mode})`);
  console.log(`[api] database: ${dbPath}`);
  if (host === '0.0.0.0') {
    console.log(`[api] Android emulator reaches this server as http://10.0.2.2:${port}`);
  }
  console.log('[api] trace endpoint: GET /api/admin/watermarks/:code (X-Admin-Token header)');
});

/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(2, eq)] = token.slice(eq + 1);
    } else {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[key] = value;
    }
  }
  return out;
}

function toPort(value) {
  const port = Number.parseInt(String(value), 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) fail(`invalid port "${value}"`);
  return port;
}

function fail(message) {
  console.error(`[api] ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`OstadiPlus watermark API

  node src/main.mjs [--port 8787] [--host 0.0.0.0] [--db <path>]
                    [--mode random|hmac] [--admin-token <token>]

Endpoints:
  GET  /health
  POST /api/playback/start              { studentId, courseId, videoId, deviceInfo? }
  POST /api/documents/open              { studentId, courseId, documentId, deviceInfo? }
  GET  /api/admin/watermarks/:code      (X-Admin-Token header)

CLI:
  npm run api:trace -- <code>           same lookup, straight from the database`);
}
