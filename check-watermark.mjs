/**
 * Executable checks for the dynamic video-watermark logic
 * (apps/student-app/src/lib/watermark.ts — pure, dependency-free module).
 *
 * Verifies that: every slot keeps the pill inside the video area and clear of
 * the player controls; positions span corners/sides/centres but never the
 * dead centre; the move delay is randomised inside the configured range; and
 * the slot chooser never repeats consecutively while covering every option.
 *
 * Requires Node >= 23.6 (native TypeScript type stripping).
 *
 * Usage: node check-watermark.mjs
 */
import assert from 'node:assert/strict';
import {
  WATERMARK_MOVE_MIN_MS,
  WATERMARK_MOVE_MAX_MS,
  nextWatermarkSlotIndex,
  randomInt,
  randomMoveDelay,
  watermarkSlots,
  watermarkText,
} from './apps/student-app/src/lib/watermark.ts';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
};

const PILL = { width: 130, height: 24 };
const CONTAINERS = [
  { width: 390, height: 219, label: 'portrait 16:9 inline player' },
  { width: 844, height: 390, label: 'landscape fullscreen' },
  { width: 320, height: 180, label: 'small phone' },
  { width: 640, height: 360, label: 'tablet inline player' },
];

test('slots keep the pill fully inside every container size', () => {
  for (const c of CONTAINERS) {
    const slots = watermarkSlots(c, PILL);
    assert.equal(slots.length, 8, `${c.label}: expected 8 slots`);
    for (const s of slots) {
      assert.ok(s.x >= 0, `${c.label}: x>=0 (${s.x})`);
      assert.ok(s.y >= 0, `${c.label}: y>=0 (${s.y})`);
      assert.ok(s.x + PILL.width <= c.width, `${c.label}: right edge inside (${s.x + PILL.width} <= ${c.width})`);
      assert.ok(s.y + PILL.height <= c.height, `${c.label}: bottom edge inside (${s.y + PILL.height} <= ${c.height})`);
    }
  }
});

test('slots avoid the top and bottom control bars on the inline player', () => {
  const c = { width: 390, height: 219 };
  const slots = watermarkSlots(c, PILL);
  const topRow = slots.slice(0, 3);
  const bottomRow = slots.slice(5);
  for (const s of topRow) assert.ok(s.y >= 30, `top row below controls (y=${s.y})`);
  for (const s of bottomRow) {
    assert.ok(s.y + PILL.height <= c.height - 25, `bottom row above scrubber (y=${s.y})`);
  }
});

test('slots use corners, sides and top/bottom centre — never dead centre', () => {
  const slots = watermarkSlots({ width: 844, height: 390 }, PILL);
  const xs = new Set(slots.map((s) => s.x));
  const ys = new Set(slots.map((s) => s.y));
  assert.ok(xs.size >= 3, 'at least 3 distinct columns');
  assert.ok(ys.size >= 3, 'at least 3 distinct rows');
  const centreX = (844 - PILL.width) / 2;
  const centreY = (390 - PILL.height) / 2;
  const deadCentre = slots.find(
    (s) => Math.abs(s.x - centreX) < 40 && Math.abs(s.y - centreY) < 40,
  );
  assert.equal(deadCentre, undefined, 'no slot in the dead centre (play button)');
});

test('randomised delay stays inside the configured range', () => {
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const d = randomMoveDelay();
    assert.ok(d >= WATERMARK_MOVE_MIN_MS, `delay >= min (${d})`);
    assert.ok(d < WATERMARK_MOVE_MAX_MS, `delay < max (${d})`);
    seen.add(d);
  }
  assert.ok(seen.size > 100, `delay is not a fixed value (${seen.size} distinct)`);
});

test('slot choice never repeats consecutively and covers every alternative', () => {
  const count = 8;
  let previous = nextWatermarkSlotIndex(count, -1);
  assert.ok(previous >= 0 && previous < count, 'initial pick in range');
  const hits = new Set([previous]);
  for (let i = 0; i < 10000; i++) {
    const next = nextWatermarkSlotIndex(count, previous);
    assert.ok(next >= 0 && next < count, `index in range (${next})`);
    assert.notEqual(next, previous, 'no immediate repetition');
    hits.add(next);
    previous = next;
  }
  assert.equal(hits.size, count, 'every slot eventually used');
});

test('slot choice edge cases', () => {
  assert.equal(nextWatermarkSlotIndex(0, 3), -1, 'no slots -> -1');
  assert.equal(nextWatermarkSlotIndex(1, 0), 0, 'single slot -> itself');
  for (let i = 0; i < 100; i++) {
    const a = nextWatermarkSlotIndex(8, -5); // stale/invalid previous
    const b = nextWatermarkSlotIndex(8, 99);
    assert.ok(a >= 0 && a < 8, 'invalid previous (-5) handled');
    assert.ok(b >= 0 && b < 8, 'invalid previous (99) handled');
  }
});

test('randomInt respects bounds', () => {
  for (let i = 0; i < 1000; i++) {
    const v = randomInt(3, 7);
    assert.ok(v >= 3 && v <= 6, `randomInt(3,7) in [3,6] (${v})`);
  }
  assert.equal(randomInt(5, 5), 5, 'degenerate range returns min');
});

test('watermark text formats identifiers only', () => {
  assert.equal(watermarkText('UST-7F3K2', 'crs-math-2bac'), 'UST-7F3K2 · crs-math-2bac');
});

console.log(`\n${passed} checks passed`);
