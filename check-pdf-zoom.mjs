import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampPdfTransform, scalePdfTransform, PDF_INITIAL_TRANSFORM } from './apps/student-app/src/lib/pdf-zoom.ts';

test('zoom and pan never reveal space beyond a page edge', () => {
  for (const frame of [{ width: 328, height: 600 }, { width: 720, height: 300 }, { width: 0, height: 0 }]) {
    for (const scale of [-5, 0, 1, 1.25, 2.7, 4, 99, NaN, Infinity]) {
      for (const position of [-10000, -50, 0, 50, 10000]) {
        const value = clampPdfTransform({ scale, x: position, y: -position }, frame);
        assert.ok(value.scale >= 1 && value.scale <= 4);
        assert.ok(Math.abs(value.x) <= frame.width * (value.scale - 1) / 2);
        assert.ok(Math.abs(value.y) <= frame.height * (value.scale - 1) / 2);
      }
    }
  }
});

test('pinch keeps the content under the fingers and follows their movement', () => {
  const frame = { width: 500, height: 700 };
  const start = { scale: 2, x: 25, y: -30 };
  const focal = { x: 80, y: 60 };
  const movement = { x: 12, y: -8 };
  const next = scalePdfTransform(start, 3, frame, focal, movement);
  assert.ok(Math.abs((focal.x - start.x) / start.scale - (focal.x + movement.x - next.x) / next.scale) < 1e-10);
  assert.ok(Math.abs((focal.y - start.y) / start.scale - (focal.y + movement.y - next.y) / next.scale) < 1e-10);
});

test('returning to 100% removes every pan offset', () => {
  assert.deepEqual(scalePdfTransform({ scale: 4, x: -300, y: 700 }, 1, { width: 328, height: 600 }), PDF_INITIAL_TRANSFORM);
});

test('zooming at the limit uses the clamped scale for focal geometry', () => {
  const frame = { width: 1000, height: 1000 };
  const start = { scale: 3, x: 0, y: 0 };
  const focal = { x: 30, y: 40 };
  assert.deepEqual(scalePdfTransform(start, 999, frame, focal), scalePdfTransform(start, 4, frame, focal));
});
