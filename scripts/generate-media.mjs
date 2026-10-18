#!/usr/bin/env node
/**
 * OstadiPlus — demo media generator.
 *
 *   1. renders every lesson slide to a 1280×720 PNG (Chromium)
 *   2. encodes the PNGs into an MP4 with RTL progress bar (ffmpeg)
 *   3. prints every PDF document (Chromium)
 *   4. probes the real duration / size and writes
 *      packages/shared/src/media-manifest.json
 *
 * A lesson poster is the first frame of its video, unless a curated 1280×720
 * image sits in `media/source/posters/<key>.jpg` — that one always wins.
 *
 * Usage: npm run media
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { videos, pdfs } from './media/content.mjs';
import { contentSlide, coverSlide, pdfDocument } from './media/templates.mjs';
import { importRealPdfs } from './media/import-pdfs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = path.join(ROOT, 'media', 'generated');
const HTML = path.join(GEN, 'html');
const FONTS = path.join(GEN, 'fonts');
const VIDEO_DIR = path.join(GEN, 'videos');
const POSTER_DIR = path.join(GEN, 'posters');
const DOC_DIR = path.join(GEN, 'docs');
const DOC_PAGES = path.join(GEN, 'doc-pages');
const BUILD = path.join(GEN, 'video-build');
const SOURCE_POSTERS = path.join(ROOT, 'media', 'source', 'posters');
const MANIFEST = path.join(ROOT, 'packages', 'shared', 'src', 'media-manifest.json');

const FONT_DIR = path.join(
  ROOT,
  'node_modules',
  '@fontsource',
  'ibm-plex-sans-arabic',
  'files',
);

/** Seconds per slide, by video index — keeps lesson lengths varied. */
const SLIDE_SEC = [
  34, 38, 33, 42, 44, 35, 39, 32, 37, 34, 48, 36, 41, 34, 38, 36, 33, 39, 35,
  42, 34, 37, 36, 40, 35, 38, 34, 41, 37, 39, 36,
];
const XFADE = 0.8;
const W = 1280;
const H = 720;

const FONT_FILES = [
  'ibm-plex-sans-arabic-arabic-400-normal.woff2',
  'ibm-plex-sans-arabic-arabic-500-normal.woff2',
  'ibm-plex-sans-arabic-arabic-600-normal.woff2',
  'ibm-plex-sans-arabic-arabic-700-normal.woff2',
  'ibm-plex-sans-arabic-latin-400-normal.woff2',
  'ibm-plex-sans-arabic-latin-500-normal.woff2',
  'ibm-plex-sans-arabic-latin-600-normal.woff2',
  'ibm-plex-sans-arabic-latin-700-normal.woff2',
];

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

function log(message) {
  process.stdout.write(`${message}\n`);
}

function run(bin, args, label) {
  const result = spawnSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const tail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').slice(-30).join('\n');
    throw new Error(`${label} failed (exit ${result.status})\n${tail}`);
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

async function probeSize(file) {
  const stat = await fs.stat(file);
  return Number((stat.size / (1024 * 1024)).toFixed(1));
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function prepareDirs(resume) {
  if (!resume) await fs.rm(GEN, { recursive: true, force: true });
  for (const dir of [HTML, FONTS, VIDEO_DIR, POSTER_DIR, DOC_DIR, DOC_PAGES, BUILD]) {
    await fs.mkdir(dir, { recursive: true });
  }
  for (const font of FONT_FILES) {
    await fs.copyFile(path.join(FONT_DIR, font), path.join(FONTS, font));
  }
  await fs.copyFile(
    path.join(ROOT, 'assets', 'logo.png'),
    path.join(GEN, 'logo.png'),
  );
}

async function writeHtml(name, html) {
  const file = path.join(HTML, `${name}.html`);
  await fs.writeFile(file, html, 'utf8');
  return file;
}

/* ------------------------------------------------------------------ */
/* Video pipeline                                                      */
/* ------------------------------------------------------------------ */

/** ffmpeg occasionally dies under memory pressure — retry once before failing. */
function buildWithRetry(fn, label) {
  try {
    return fn();
  } catch (first) {
    log(`  retrying ${label} after a failed first attempt…`);
    return fn();
  }
}

function buildVideo(key, slideCount, slideSec, total) {
  const inputs = [];
  for (let i = 0; i < slideCount; i++) {
    inputs.push('-loop', '1', '-t', String(slideSec), '-framerate', '25', '-i', path.join(BUILD, `${key}-${i}.png`));
  }
  inputs.push('-f', 'lavfi', '-i', `color=c=0x2F5BFF:s=${W}x6:r=25`);
  const barIndex = slideCount;

  const filters = [];
  for (let i = 0; i < slideCount; i++) {
    filters.push(`[${i}:v]scale=${W}:${H},setsar=1,format=yuv420p[v${i}]`);
  }
  let current = 'v0';
  for (let i = 1; i < slideCount; i++) {
    const offset = (i * (slideSec - XFADE)).toFixed(2);
    const out = i === 1 ? 'x1' : `x${i}`;
    filters.push(
      `[${current}][v${i}]xfade=transition=fade:duration=${XFADE}:offset=${offset}[${out}]`,
    );
    current = out;
  }
  filters.push(
    `[${current}][${barIndex}:v]overlay=x='${W}-${W}*t/${total.toFixed(2)}':y=${H - 6}[vout]`,
  );

  const out = path.join(VIDEO_DIR, `${key}.mp4`);
  run(
    'ffmpeg',
    [
      '-y',
      ...inputs,
      '-filter_complex', filters.join(';'),
      '-map', '[vout]',
      '-t', String(total),
      '-r', '25',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '30',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-an',
      out,
    ],
    `ffmpeg ${key}`,
  );
  return out;
}

function buildPoster(key) {
  const out = path.join(POSTER_DIR, `${key}.jpg`);
  run(
    'ffmpeg',
    [
      '-y',
      '-ss', '0.6',
      '-i', path.join(VIDEO_DIR, `${key}.mp4`),
      '-frames:v', '1',
      '-q:v', '4',
      `-vf`, `scale=${W}:${H}`,
      out,
    ],
    `poster ${key}`,
  );
  return out;
}

/**
 * Poster for a lesson video. A curated image in `media/source/posters/<key>.jpg`
 * always wins — the same "a real source beats the demo template" rule the
 * AlloSchool PDFs follow — and only otherwise is the first frame of the demo
 * video grabbed (once; a resumed run keeps what is already there).
 */
async function resolvePoster(key, rebuilt) {
  const out = path.join(POSTER_DIR, `${key}.jpg`);
  if (await exists(path.join(SOURCE_POSTERS, `${key}.jpg`))) {
    await fs.copyFile(path.join(SOURCE_POSTERS, `${key}.jpg`), out);
    return 'curated';
  }
  if (!rebuilt && (await exists(out))) return 'cached';
  buildPoster(key);
  return 'frame';
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const started = Date.now();
  const resume = process.env.OSTADI_MEDIA_RESUME === '1';
  await prepareDirs(resume);

  /* Real course documents (media/source/alloschool) are rasterised from their
     actual PDFs; the demo HTML templates only cover keys without a source. */
  const realDocs = await importRealPdfs({ log });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  /* ---- videos ---- */
  const videoManifest = {};
  for (let index = 0; index < videos.length; index++) {
    const video = videos[index];
    const slideSec = SLIDE_SEC[index] ?? 36;
    const total = video.slides.length * slideSec - (video.slides.length - 1) * XFADE;

    const videoFile = path.join(VIDEO_DIR, `${video.key}.mp4`);
    const existing = resume ? await fs.stat(videoFile).catch(() => null) : null;
    const cached = Boolean(existing && existing.size > 0);
    if (cached) {
      log(`  cached ${video.key}`);
    } else {
      for (let i = 0; i < video.slides.length; i++) {
        const slide = video.slides[i];
        const html =
          i === 0
            ? coverSlide({
                title: slide.h,
                badge: video.badge,
                lines: slide.b,
                total: video.slides.length,
              })
            : contentSlide({
                h: slide.h,
                b: slide.b,
                note: slide.note,
                index: i,
                total: video.slides.length,
                badge: video.badge,
              });
        const file = await writeHtml(`${video.key}-${i}`, html);
        await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
        await page.evaluate(async () => {
          await document.fonts.ready;
          return true;
        });
        await page.screenshot({
          path: path.join(BUILD, `${video.key}-${i}.png`),
          clip: { x: 0, y: 0, width: W, height: H },
        });
      }

      log(`  encoding ${video.key} (${video.slides.length} slides, ${Math.round(total)}s)`);
      buildWithRetry(() => {
        buildVideo(video.key, video.slides.length, slideSec, total);
      }, video.key);
    }

    const poster = await resolvePoster(video.key, !cached);
    if (poster === 'curated') log(`  poster ${video.key} (curated)`);

    const file = `${video.key}.mp4`;
    videoManifest[video.key] = {
      file,
      poster: `${video.key}.jpg`,
      title: video.title,
      durationSec: probeDuration(path.join(VIDEO_DIR, file)),
      sizeMb: await probeSize(path.join(VIDEO_DIR, file)),
    };
  }

  /* ---- pdfs ---- */
  const pdfManifest = {};
  for (const doc of pdfs) {
    /* A real PDF is already on disk and rasterised — never overwrite it with
       the demo template. */
    if (realDocs[doc.key]) {
      pdfManifest[doc.key] = realDocs[doc.key];
      log(
        `  kept real document ${doc.key} (${realDocs[doc.key].pages} pages)`,
      );
      continue;
    }

    const html = pdfDocument(doc);
    const file = await writeHtml(doc.key, html);
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      return true;
    });
    const out = path.join(DOC_DIR, `${doc.key}.pdf`);
    await page.pdf({
      path: out,
      width: '210mm',
      height: '297mm',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    pdfManifest[doc.key] = {
      file: `${doc.key}.pdf`,
      title: doc.title,
      pages: doc.pages.length,
      sizeMb: await probeSize(out),
    };
    log(`  printed ${doc.key} (${doc.pages.length} pages)`);

    /* Rasterise every page — the Android app shows these images in its
       document reader (no PDF engine shipped with the prototype). */
    const sections = page.locator('section.page');
    for (let i = 0; i < doc.pages.length; i++) {
      await sections.nth(i).screenshot({
        path: path.join(DOC_PAGES, `${doc.key}-${i + 1}.png`),
      });
    }
    log(`  rasterised ${doc.key} (${doc.pages.length} page images)`);
  }

  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    note: 'Generated by `npm run media`. Never edit by hand.',
    videos: videoManifest,
    pdfs: pdfManifest,
  };
  await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  log(`\nwrote ${path.relative(ROOT, MANIFEST)}`);

  const sync = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'sync-media.mjs')], {
    stdio: 'inherit',
  });
  if (sync.status !== 0) process.exit(sync.status ?? 1);

  log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
