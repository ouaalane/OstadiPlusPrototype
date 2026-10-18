/**
 * SQLite access for the watermark API — `node:sqlite`, no native deps.
 *
 * `openDatabase()` also runs the (idempotent) migrations in
 * `apps/api/migrations` and records them in `schema_migrations`, so both the
 * server and the CLI always see an up-to-date schema.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = join(HERE, '..', 'migrations');

/**
 * Opens (creating if needed) the watermark database and applies every
 * pending `.sql` migration in filename order.
 */
export function openDatabase(dbPath = ':memory:', { logger = console } = {}) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrate(db, logger);
  return db;
}

function migrate(db, logger) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );`);

  const applied = new Set(
    db.prepare('SELECT filename FROM schema_migrations').all().map((row) => row.filename),
  );
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
      db.exec('COMMIT');
      logger.log(`[db] applied migration ${file}`);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`migration ${file} failed: ${error.message}`, { cause: error });
    }
  }
}
