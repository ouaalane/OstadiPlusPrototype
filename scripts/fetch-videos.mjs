#!/usr/bin/env node
/**
 * Fetch the real lesson clips.
 *
 * The bundled lesson videos used to be generated slide decks. They are now
 * short real explanation clips taken from « Khan Academy en français »
 * (CC BY-NC-SA) and described by `scripts/media/ka-video-sources.json`.
 *
 *   download → media/raw/<key>.mp4          (working cache, git-ignored)
 *   cut      → media/source/videos/<key>.mp4 (committed; `npm run media`
 *              prefers it over the slide template, like curated posters)
 *
 * Requirements: python + yt-dlp (`python -m pip install yt-dlp`) and ffmpeg.
 *
 * Usage:
 *   npm run media:fetch                  # everything that is missing
 *   npm run media:fetch -- --force       # re-download and re-cut everything
 *   npm run media:fetch -- limits-intro  # only these keys
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = path.join(ROOT, 'scripts', 'media', 'ka-video-sources.json');
const RAW = path.join(ROOT, 'media', 'raw');
const OUT = path.join(ROOT, 'media', 'source', 'videos');
const CREDITS = path.join(OUT, 'CREDITS.md');

const FORCE = process.argv.includes('--force');
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const CONCURRENCY = 2;
const MAX_WIDTH = 854;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** YouTube throttles parallel sessions with 403s; retry with other clients. */
const DOWNLOAD_ATTEMPTS = [
  [],
  ['--extractor-args', 'youtube:player_client=android_vr,web_safari'],
  ['--extractor-args', 'youtube:player_client=web_embedded,tv'],
];

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (exit ${code})\n${err.slice(-1500)}`));
    });
  });
}

async function sizeOf(file) {
  try {
    return (await fs.stat(file)).size;
  } catch {
    return 0;
  }
}

function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Number.parseFloat(out.trim()));
      else reject(new Error(`ffprobe ${file} failed`));
    });
  });
}

async function fetchOne(entry, index, total) {
  const prefix = `[${String(index + 1).padStart(2)}/${total}] ${entry.key.padEnd(22)}`;
  const raw = path.join(RAW, `${entry.key}.mp4`);
  const out = path.join(OUT, `${entry.key}.mp4`);

  if (!FORCE && (await sizeOf(out)) > 0) {
    const seconds = await probeDuration(out).catch(() => 0);
    if (seconds >= entry.clipSec - 2) {
      console.log(`${prefix} already cut, skipping`);
      return { key: entry.key, status: 'skipped', size: await sizeOf(out), seconds };
    }
    console.log(`${prefix} incomplete clip on disk — re-cutting`);
  }

  if (FORCE || (await sizeOf(raw)) === 0) {
    console.log(`${prefix} downloading « ${entry.title} » (${entry.videoId})`);
    let lastError;
    for (let attempt = 0; attempt < DOWNLOAD_ATTEMPTS.length; attempt++) {
      try {
        await run('python', [
          '-m', 'yt_dlp',
          '--quiet', '--no-warnings', '--no-progress', '--no-playlist',
          ...DOWNLOAD_ATTEMPTS[attempt],
          '-f', 'bv*[height<=720]+ba/b[height<=720]/b',
          '--merge-output-format', 'mp4',
          '-o', raw,
          `https://www.youtube.com/watch?v=${entry.videoId}`,
        ], `yt-dlp ${entry.key}`);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < DOWNLOAD_ATTEMPTS.length - 1) {
          const wait = 8 * (attempt + 1) * (1 + Math.random());
          console.log(`${prefix} attempt ${attempt + 1} failed — retrying in ${Math.round(wait)}s`);
          await sleep(wait * 1000);
        }
      }
    }
    if (lastError) throw lastError;
  }

  console.log(`${prefix} cutting ${entry.clipSec}s from ${entry.startSec}s`);
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-ss', String(entry.startSec),
    '-i', raw,
    '-t', String(entry.clipSec),
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', `scale='min(${MAX_WIDTH},iw)':-2`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '30',
    '-profile:v', 'main', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '1',
    '-movflags', '+faststart',
    '-map_metadata', '-1',
    out,
  ], `ffmpeg ${entry.key}`);

  const seconds = await probeDuration(out);
  const size = await sizeOf(out);
  if (seconds < entry.clipSec - 2) {
    console.log(`${prefix} WARNING: clip is only ${seconds.toFixed(1)}s (source too short?)`);
  }
  console.log(`${prefix} ok — ${seconds.toFixed(1)}s, ${(size / 1048576).toFixed(2)} MB`);
  return { key: entry.key, status: 'fetched', size, seconds };
}

async function writeCredits(entries) {
  const lines = [
    '# Lesson video credits',
    '',
    'The bundled lesson clips in this folder are short excerpts of videos from',
    '**Khan Academy en français** — published by Khan Academy under the',
    '[CC BY-NC-SA license](https://creativecommons.org/licenses/by-nc-sa/4.0/).',
    'They are used here as non-commercial prototype material and can be',
    'regenerated with `npm run media:fetch`.',
    '',
    'Channel: https://www.youtube.com/@KhanAcademyFrancais',
    '',
    '| lesson key | excerpt of | original video |',
    '| --- | --- | --- |',
  ];
  for (const entry of entries) {
    lines.push(
      `| \`${entry.key}\` | ${entry.title} | https://www.youtube.com/watch?v=${entry.videoId} |`,
    );
  }
  lines.push('');
  await fs.writeFile(CREDITS, lines.join('\n'), 'utf8');
}

async function main() {
  const sources = JSON.parse(await fs.readFile(SOURCES, 'utf8'));
  await fs.mkdir(RAW, { recursive: true });
  await fs.mkdir(OUT, { recursive: true });

  let entries = sources.videos;
  if (ONLY.length > 0) {
    entries = entries.filter((entry) => ONLY.includes(entry.key));
    if (entries.length === 0) {
      console.error(`no matching keys. known: ${sources.videos.map((v) => v.key).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(
    `fetching ${entries.length} clip${entries.length === 1 ? '' : 's'} from « Khan Academy en français »` +
      (FORCE ? ' (--force)' : ''),
  );

  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
    while (cursor < entries.length) {
      const index = cursor++;
      try {
        results.push(await fetchOne(entries[index], index, entries.length));
      } catch (error) {
        const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
        console.error(`[${entries[index].key}] FAILED: ${message}`);
        results.push({ key: entries[index].key, status: 'failed', size: 0, seconds: 0 });
      }
    }
  });
  await Promise.all(workers);

  const fetched = results.filter((r) => r.status === 'fetched');
  const failed = results.filter((r) => r.status === 'failed');
  const totalMb = results.reduce((sum, r) => sum + r.size, 0) / 1048576;
  console.log(
    `\ndone — ${fetched.length} fetched, ${results.length - fetched.length - failed.length} skipped, ` +
      `${failed.length} failed, ${totalMb.toFixed(1)} MB in media/source/videos`,
  );

  await writeCredits(sources.videos);
  console.log(`credits → media/source/videos/CREDITS.md`);

  if (failed.length > 0) {
    console.error(`failed keys: ${failed.map((r) => r.key).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
