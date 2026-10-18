/**
 * Dynamic video watermark — pure positioning & scheduling logic.
 *
 * Kept free of any React / React Native import so the maths can be verified
 * standalone (see the report's test section) and reused by any player surface.
 *
 * The watermark identifies the watching student and the course being played
 * (`studentCode · courseId`) so that a leaked screen recording can be traced
 * back to the account it came from. It is a deterrent + investigative aid,
 * NOT copy protection — see `VideoWatermark.tsx` for the security notes.
 */

/** Earliest possible wait between two watermark moves (ms). */
export const WATERMARK_MOVE_MIN_MS = 9_000;

/** Latest possible wait between two watermark moves (ms). */
export const WATERMARK_MOVE_MAX_MS = 20_000;

/** Transition duration when the watermark glides to its next slot (ms). */
export const WATERMARK_TRANSITION_MS = 650;

/**
 * Insets that keep the pill clear of the player chrome: the top control row
 * (back · offline badge · mute · fullscreen) and the bottom scrubber. Each is
 * additionally capped to a fraction of the container height so the pill stays
 * usable inside short landscape / fullscreen surfaces.
 */
export const WATERMARK_SAFE_TOP = 64;
export const WATERMARK_SAFE_BOTTOM = 56;

/** Horizontal margin from the left/right edges of the video area. */
export const WATERMARK_EDGE = 10;

export interface WatermarkSize {
  width: number;
  height: number;
}

export interface WatermarkSlot {
  /** Left edge of the pill, in container pixels. */
  x: number;
  /** Top edge of the pill, in container pixels. */
  y: number;
}

/**
 * Anchor points as fractions of the free area (container minus pill minus
 * safe insets). Corners, left/right sides and top/bottom centre are used —
 * the dead centre is deliberately avoided so the pill never sits on the big
 * play/pause button or the middle of the board.
 */
const SLOT_ANCHORS: readonly (readonly [number, number])[] = [
  [0, 0], [0.5, 0], [1, 0], // top row (below the control bar)
  [0, 0.5], [1, 0.5], // middle sides
  [0, 1], [0.5, 1], [1, 1], // bottom row (above the scrubber)
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
 * Every valid on-screen position for a pill of `pill` size inside a container
 * of `container` size. All returned slots are guaranteed to keep the pill
 * fully inside the container and outside the control-bar insets.
 */
export function watermarkSlots(
  container: WatermarkSize,
  pill: WatermarkSize,
): WatermarkSlot[] {
  const width = Math.max(0, container.width);
  const height = Math.max(0, container.height);

  // Scale the insets down on short surfaces so a usable area always remains.
  const topInset = Math.max(4, Math.min(WATERMARK_SAFE_TOP, height * 0.18));
  const bottomInset = Math.max(4, Math.min(WATERMARK_SAFE_BOTTOM, height * 0.16));
  const availX = Math.max(0, width - pill.width - WATERMARK_EDGE * 2);
  const availY = Math.max(0, height - pill.height - topInset - bottomInset);

  return SLOT_ANCHORS.map(([fx, fy]) => ({
    x: Math.round(WATERMARK_EDGE + fx * availX),
    y: Math.round(topInset + fy * availY),
  }));
}

/**
 * Picks the next slot index at random while avoiding immediate repetition —
 * an attacker scrubbing frame-by-frame should not be able to guess where the
 * pill lands next. Falls back to the same index when only one slot exists,
 * and to a plain random pick when no previous slot is known.
 */
export function nextWatermarkSlotIndex(count: number, previousIndex: number): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  if (previousIndex < 0 || previousIndex >= count) return randomInt(0, count);
  let next = randomInt(0, count - 1);
  if (next >= previousIndex) next += 1; // shift past the previous slot
  return next;
}

/** Text shown on the pill — opaque identifiers only, never personal data. */
export function watermarkText(studentCode: string, courseCode: string): string {
  return `${studentCode} · ${courseCode}`;
}
