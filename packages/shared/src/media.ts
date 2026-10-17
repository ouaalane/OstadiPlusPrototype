/**
 * Media resolution.
 *
 * The exact same media files are shipped with both applications:
 *  - web dashboard  → `public/media/...`           (served from `/media/...`)
 *  - Android app    → `android/app/src/main/assets/media/...`
 *                     (addressable as `file:///android_asset/media/...`)
 *
 * `npm run media` generates them once; `scripts/sync-media.mjs` copies them
 * into both applications so neither one can drift.
 */

export type MediaKind = 'video' | 'poster' | 'doc';

export type Platform = 'web' | 'native';

export const MEDIA_ROOT = 'media';

export function mediaUrl(kind: MediaKind, file: string, platform: Platform): string {
  const folder = kind === 'video' ? 'videos' : kind === 'poster' ? 'posters' : 'docs';
  const path = `${MEDIA_ROOT}/${folder}/${file}`;
  return platform === 'web' ? `/${path}` : `file:///android_asset/${path}`;
}

/** Human friendly size label, e.g. `2.4 MB`. */
export function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  if (mb > 0) return `${Math.max(1, Math.round(mb * 1024))} KB`;
  return '0 KB';
}

/** `12:05` / `1:02:40` */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function totalDuration(lessons: { durationSec: number }[]): number {
  return lessons.reduce((sum, l) => sum + l.durationSec, 0);
}
