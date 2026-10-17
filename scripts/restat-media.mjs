/**
 * restat-media.mjs
 *
 * Re-reads every file under `media/generated` with ffprobe and rewrites the
 * stats in `packages/shared/src/media-manifest.json`:
 *
 *   videos -> durationSec + sizeMb
 *   pdfs   -> pages (counted from rendered doc-pages) + sizeMb
 *
 * Use this after replacing media by hand (e.g. real downloaded videos/PDFs)
 * and before `npm run media:sync`. Arabic titles and file names are kept
 * untouched; only the measured numbers are updated.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = path.join(ROOT, 'media', 'generated');
const MANIFEST = path.join(ROOT, 'packages', 'shared', 'src', 'media-manifest.json');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function run(bin, args, label) {
  const result = spawnSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status})\n${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
}

function probeDuration(file) {
  const out = run(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    `ffprobe ${path.basename(file)}`,
  );
  return Math.round(Number(out.trim()));
}

const mb = (bytes) => Number((bytes / (1024 * 1024)).toFixed(2));

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

for (const [key, entry] of Object.entries(manifest.videos)) {
  const file = path.join(GEN, 'videos', entry.file);
  const stat = fs.statSync(file);
  entry.durationSec = probeDuration(file);
  entry.sizeMb = mb(stat.size);
  const m = Math.floor(entry.durationSec / 60);
  const s = String(entry.durationSec % 60).padStart(2, '0');
  log(`video ${key}: ${m}:${s}  ${entry.sizeMb} MB`);
}

const pageRe = (key) => new RegExp(`^${key}-\\d+\\.png$`);
const docPages = fs.readdirSync(path.join(GEN, 'doc-pages'));

for (const [key, entry] of Object.entries(manifest.pdfs)) {
  const file = path.join(GEN, 'docs', entry.file);
  const stat = fs.statSync(file);
  entry.pages = docPages.filter((f) => pageRe(key).test(f)).length;
  entry.sizeMb = mb(stat.size);
  log(`pdf   ${key}: ${entry.pages} pages  ${entry.sizeMb} MB`);
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
log('media-manifest.json updated');
