/**
 * Watermark codes — SERVER-SIDE generation only.
 *
 * Format: 12 uppercase Base32 characters with the visually confusable ones
 * removed (no 0/O, no 1/I/L) — e.g. "K7M2QX9TPA4W". The code is the only
 * thing the player renders; the mapping code → (student, course, video,
 * session, device, date) lives in the `video_watermarks` table.
 *
 * Two modes:
 *  - random (default): a cryptographically random code per playback start —
 *    every session is individually traceable;
 *  - hmac: a stable code per (student, course) derived from a server-side
 *    secret — the API refreshes that row on every playback
 *    (see `watermarks.mjs`).
 */
import { createHmac, randomBytes } from 'node:crypto';

/** Uppercase Base32 without 0/O and 1/I/L (28 symbols). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Code length in characters (the user-facing format is 10-12). */
export const CODE_LENGTH = 12;

/** Bytes at or above this reject (252 = 9 × 28) keep the symbol draw uniform. */
const MAX_UNBIASED_BYTE = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;

/** Strict shape check — used before any code is stored, returned or looked up. */
export function isWatermarkCode(value) {
  if (typeof value !== 'string' || value.length !== CODE_LENGTH) return false;
  for (const ch of value) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * Cryptographically secure random code (CSPRNG + rejection sampling, so
 * every symbol is equally likely by construction — no modulo bias).
 */
export function randomWatermarkCode() {
  const chars = [];
  while (chars.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH * 2)) {
      if (byte >= MAX_UNBIASED_BYTE) continue; // keep the draw uniform
      chars.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
      if (chars.length === CODE_LENGTH) break;
    }
  }
  return chars.join('');
}

/**
 * Stable code for a (student, course) pair: HMAC-SHA256(secret, id+":"+id)
 * packed 5 bits per symbol into the same alphabet. Deterministic for a
 * given secret — two students or two courses never collide in practice.
 */
export function hmacWatermarkCode(secret, studentId, courseId) {
  const digest = createHmac('sha256', String(secret)).update(`${studentId}:${courseId}`).digest();
  let acc = 0;
  let bits = 0;
  let out = '';
  for (const byte of digest) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CODE_ALPHABET[(acc >>> bits) % CODE_ALPHABET.length];
      if (out.length === CODE_LENGTH) return out;
    }
    acc &= (1 << bits) - 1; // keep only the unconsumed low bits
  }
  return out;
}
