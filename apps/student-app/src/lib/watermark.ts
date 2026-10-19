/**
 * Video watermark — pure logic: code format, positioning, scheduling.
 *
 * The displayed text is ONE short code (12 uppercase Base32 characters
 * without the confusable 0/O/1/I/L — e.g. "K7M2QX9TPA4W") issued by the
 * watermark API on every playback start. It never contains names, e-mails,
 * student codes, course titles or spaces; the mapping
 * code → (student, course, video, session, device, date) lives server-side
 * in the `video_watermarks` table, so a leaked recording can be traced
 * through `GET /api/admin/watermarks/:code` (see `apps/api`).
 *
 * This module stays free of React / React Native imports so the maths and
 * the code format are verifiable standalone — see `check-watermark.mjs`.
 */

/* ------------------------------------------------------------------ */
/* Code format (mirrors apps/api/src/codes.mjs)                        */
/* ------------------------------------------------------------------ */

/** Uppercase Base32 without the confusable 0/O and 1/I/L (28 symbols). */
export const WATERMARK_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Server-issued codes are exactly this long (the spec allows 10-12). */
export const WATERMARK_CODE_LENGTH = 12;

const CODE_RE = new RegExp(`^[${WATERMARK_CODE_ALPHABET}]{${WATERMARK_CODE_LENGTH}}$`);

/** Strict shape check — nothing but a well-formed server code is rendered. */
export function isWatermarkCode(value: unknown): value is string {
  return typeof value === 'string' && CODE_RE.test(value);
}

/**
 * DEMO-ONLY fallback for the standalone offline demo: when the watermark API
 * cannot be reached the player still needs a code to render (see
 * `WATERMARK_ALLOW_OFFLINE_FALLBACK` in `watermark-api.ts`). Codes minted
 * here are NOT registered in `video_watermarks` and carry NO traceability —
 * production builds must run with the fallback disabled.
 */
export function localFallbackCode(): string {
  let code = '';
  for (let i = 0; i < WATERMARK_CODE_LENGTH; i += 1) {
    code += WATERMARK_CODE_ALPHABET[Math.floor(Math.random() * WATERMARK_CODE_ALPHABET.length)];
  }
  return code;
}

/* ------------------------------------------------------------------ */
/* Movement schedule & appearance                                      */
/* ------------------------------------------------------------------ */

/** Earliest possible wait between two watermark moves (ms). */
export const WATERMARK_MOVE_MIN_MS = 8_000;

/** Latest possible wait between two watermark moves (ms). */
export const WATERMARK_MOVE_MAX_MS = 15_000;

/** Fade-out leg of a move (ms) — short, so scrubbing rarely catches it. */
export const WATERMARK_FADE_OUT_MS = 220;

/** Fade-in leg after landing on the new position (ms). */
export const WATERMARK_FADE_IN_MS = 450;

/** Fade when the video pauses (the overlay then unmounts entirely). */
export const WATERMARK_HIDE_FADE_MS = 260;

/** Watchdog cadence — recovers a wedged/lost overlay (ms). */
export const WATERMARK_WATCHDOG_MS = 5_000;

/** Lower bound of the requested translucency band. */
export const WATERMARK_OPACITY_MIN = 0.15;

/** Upper bound of the requested translucency band. */
export const WATERMARK_OPACITY_MAX = 0.25;

/** Peak opacity of the primary copy — inside the required band. */
export const WATERMARK_OPACITY = 0.22;

/** The optional second copy is dimmer still (same band, lower end). */
export const WATERMARK_SECONDARY_OPACITY = 0.15;

/**
 * Insets that keep the overlay clear of the player chrome: the top control
 * row (back · offline badge · mute · fullscreen) and the bottom scrubber /
 * subtitle strip. Each is additionally capped to a fraction of the
 * container height so the overlay stays usable in short landscape or
 * fullscreen surfaces.
 */
export const WATERMARK_SAFE_TOP = 100;
export const WATERMARK_SAFE_BOTTOM = 72;

/** Horizontal margin from the left/right edges of the video area. */
export const WATERMARK_EDGE = 8;

export interface WatermarkSize {
  width: number;
  height: number;
}

export interface WatermarkSlot {
  /** Left edge of the overlay, in container pixels. */
  x: number;
  /** Top edge of the overlay, in container pixels. */
  y: number;
}

/**
 * Anchor points as fractions of the free area (container minus copy minus
 * safe insets). Only corners and the middle sides are used: an inline 16:9
 * player is short, and top/bottom-centre anchors collide with the title row
 * and the large centre play button. The dead centre is never used.
 */
const SLOT_ANCHORS: readonly (readonly [number, number])[] = [
  [0, 0], [1, 0], // top row (below the control bar)
  [0, 0.5], [1, 0.5], // middle sides
  [0, 1], [1, 1], // bottom row (above the scrubber)
];

/** Uniform integer in [min, max). `max` is clamped above `min`. */
export function randomInt(min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  if (hi <= lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo));
}

/** Randomised wait until the next move — never a fixed, predictable rhythm. */
export function randomMoveDelay(): number {
  return randomInt(WATERMARK_MOVE_MIN_MS, WATERMARK_MOVE_MAX_MS);
}

/**
 * Every valid on-screen position for a copy of `copy` size inside a
 * container of `container` size. All returned slots are guaranteed to keep
 * the copy fully inside the container and outside the control-bar insets.
 */
export function watermarkSlots(
  container: WatermarkSize,
  copy: WatermarkSize,
): WatermarkSlot[] {
  const width = Math.max(0, container.width);
  const height = Math.max(0, container.height);

  // Scale the insets down on short surfaces so a usable area always remains.
  // The caps are deliberately generous here: the player chrome (status bar +
  // top controls, and the scrubber strip) occupies a large share of an inline
  // 16:9 player, and a watermark must never sit on top of those controls.
  const topInset = Math.max(4, Math.min(WATERMARK_SAFE_TOP, height * 0.6));
  const bottomInset = Math.max(4, Math.min(WATERMARK_SAFE_BOTTOM, height * 0.22));
  const availX = Math.max(0, width - copy.width - WATERMARK_EDGE * 2);
  const availY = Math.max(0, height - copy.height - topInset - bottomInset);

  return SLOT_ANCHORS.map(([fx, fy]) => ({
    x: Math.round(WATERMARK_EDGE + fx * availX),
    y: Math.round(topInset + fy * availY),
  }));
}

/**
 * Picks the next slot index at random while avoiding immediate repetition —
 * an attacker scrubbing frame-by-frame should not be able to guess where the
 * overlay lands next. Falls back to the same index when only one slot
 * exists, and to a plain random pick when no previous slot is known.
 */
export function nextWatermarkSlotIndex(count: number, previousIndex: number): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  if (previousIndex < 0 || previousIndex >= count) return randomInt(0, count);
  let next = randomInt(0, count - 1);
  if (next >= previousIndex) next += 1; // shift past the previous slot
  return next;
}

/** Row of a slot index: 0 = top, 1 = middle, 2 = bottom. */
export function watermarkSlotRow(index: number): number {
  if (index <= 1) return 0;
  if (index <= 3) return 1;
  return 2;
}

/** Column of a slot index: 0 = left edge, 1 = right edge. */
export function watermarkSlotColumn(index: number): number {
  return index % 2;
}

/**
 * Picks a secondary-copy slot on a different row than the primary copy.
 * Two codes on the same row look like a header/subtitle rather than a
 * watermark; keeping them on separate rows also prevents them from being
 * read as one long code. The opposite column is preferred so the two copies
 * sit diagonally instead of stacking on one edge. Falls back to any
 * different slot when the slot set is too small.
 */
export function nextWatermarkSlotIndexInOtherRow(
  count: number,
  primaryIndex: number,
): number {
  if (count <= 0) return -1;
  const differentRow: number[] = [];
  for (let index = 0; index < count; index += 1) {
    if (watermarkSlotRow(index) !== watermarkSlotRow(primaryIndex)) differentRow.push(index);
  }
  if (differentRow.length === 0) return nextWatermarkSlotIndex(count, primaryIndex);
  const oppositeColumn = differentRow.filter(
    (index) => watermarkSlotColumn(index) !== watermarkSlotColumn(primaryIndex),
  );
  const pool = oppositeColumn.length > 0 ? oppositeColumn : differentRow;
  return pool[randomInt(0, pool.length)];
}
