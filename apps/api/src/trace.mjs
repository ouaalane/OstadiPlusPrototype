/**
 * `npm run api:trace -- <code>` — trace a leaked watermark code straight
 * from the database (no HTTP server needed), printing the exact report the
 * admin endpoint returns.
 */
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

register('./resolve.mjs', import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const { openDatabase } = await import('./db.mjs');
const { isWatermarkCode } = await import('./codes.mjs');
const { findWatermarkByCode } = await import('./watermarks.mjs');
const { resolveWatermarkRecord } = await import('./validate.mjs');

const code = (process.argv[2] ?? '').trim().toUpperCase();
if (!code) {
  console.error('usage: npm run api:trace -- <code>');
  process.exit(2);
}
if (!isWatermarkCode(code)) {
  console.error(`"${code}" is not a valid watermark code (12 chars, uppercase Base32, no 0/O/1/I/L)`);
  process.exit(2);
}

const dbPath = process.env.WATERMARK_DB ?? join(HERE, '..', 'data', 'watermarks.db');
const db = openDatabase(dbPath);
const record = findWatermarkByCode(db, code);
db.close();

if (!record) {
  console.error(`no watermark found for ${code} in ${dbPath}`);
  process.exit(1);
}
console.log(JSON.stringify(resolveWatermarkRecord(record), null, 2));
