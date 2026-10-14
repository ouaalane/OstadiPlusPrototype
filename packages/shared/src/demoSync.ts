import type { DemoState } from './types';

/**
 * Demo data synchronisation between the teacher dashboard (browser) and the
 * student app (Android).
 *
 * There is no backend in this prototype, so the two apps are kept in step by
 * copying a short, self-describing payload:
 *
 *   dashboard → «نسخ بيانات العرض»  →  app → «لصق ومزامنة»
 *
 * The payload is plain UTF-8 JSON compressed with `CompressionStream` when
 * available and Base64-encoded otherwise, so it survives WhatsApp/e-mail
 * transfer without corruption.
 */

const PREFIX = 'OSTADI1:';

/* ------------------------------------------------------------------ */
/* Base64 (no Buffer / no btoa dependency — works in Hermes too)       */
/* ------------------------------------------------------------------ */

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 0x3f];
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = B64.indexOf(clean[i + 2]);
    const c3 = B64.indexOf(clean[i + 3]);
    out.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) out.push(((c1 & 0x0f) << 4) | (c2 >> 2));
    if (c3 >= 0) out.push(((c2 & 0x03) << 6) | c3);
  }
  return new Uint8Array(out);
}

/** UTF-8 encode without TextEncoder (Hermes-safe). */
function utf8Encode(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return new Uint8Array(out);
}

/** UTF-8 decode without TextDecoder (Hermes-safe). */
function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    let code: number;
    if (b0 < 0x80) code = b0;
    else if (b0 >= 0xf0)
      code =
        ((b0 & 0x07) << 18) |
        ((bytes[i++] & 0x3f) << 12) |
        ((bytes[i++] & 0x3f) << 6) |
        (bytes[i++] & 0x3f);
    else if (b0 >= 0xe0)
      code =
        ((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else code = ((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f);

    if (code > 0xffff) {
      code -= 0x10000;
      out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    } else {
      out += String.fromCharCode(code);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Optional compression (browser only)                                 */
/* ------------------------------------------------------------------ */

type Ctor<T> = new (...args: any[]) => T;

/** Minimal structural type — avoids depending on DOM lib for `CompressionStream`. */
interface ByteTransformStream {
  readable: {
    getReader(): {
      read(): Promise<{ value?: ArrayBuffer | Uint8Array; done: boolean }>;
    };
  };
  writable: {
    getWriter(): {
      write(chunk: Uint8Array): Promise<void>;
      close(): Promise<void>;
    };
  };
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  const CS = (globalThis as any).CompressionStream as
    | Ctor<ByteTransformStream>
    | undefined;
  if (!CS) return null;
  try {
    const stream = new CS('deflate-raw');
    const writer = stream.writable.getWriter();
    void writer.write(bytes);
    void writer.close();
    const chunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(new Uint8Array(value));
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Pure-JS raw-DEFLATE (RFC 1951) decoder.
 *
 * Hermes (React Native) has no `DecompressionStream`, so the browser-compressed
 * `Z` payloads could not be read on-device. This is the same "Hermes lacks a
 * web API" gap as the hand-rolled Base64/UTF-8 above; it is only used when the
 * platform cannot inflate natively.
 */
class BitReader {
  private pos = 0;
  private bit = 0;
  private readonly data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  readBit(): number {
    if (this.pos >= this.data.length) throw new Error('unexpected end of data');
    const b = (this.data[this.pos] >> this.bit) & 1;
    if (++this.bit === 8) {
      this.bit = 0;
      this.pos++;
    }
    return b;
  }

  readBits(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) v |= this.readBit() << i;
    return v;
  }

  align(): void {
    if (this.bit) {
      this.bit = 0;
      this.pos++;
    }
  }

  get bytePos(): number {
    return this.pos;
  }

  seek(pos: number): void {
    this.pos = pos;
    this.bit = 0;
  }
}

interface Huffman {
  counts: number[]; // counts[len] = symbols with that length (count[0] forced 0)
  symbols: number[]; // symbols sorted by (length, symbol)
  starts: number[]; // starts[len] = index into symbols of first symbol of len
  codeStarts: number[]; // codeStarts[len] = first canonical code value of len
}

function buildHuffman(lengths: number[]): Huffman {
  const MAX = 15;
  const counts = new Array<number>(MAX + 1).fill(0);
  for (const l of lengths) if (l > 0) counts[l]++;
  const codeStarts = new Array<number>(MAX + 1).fill(0);
  let code = 0;
  for (let bits = 1; bits <= MAX; bits++) {
    code = (code + counts[bits - 1]) << 1;
    codeStarts[bits] = code;
  }
  const total = counts.reduce((a, b) => a + b, 0);
  const starts = new Array<number>(MAX + 1).fill(0);
  let off = 0;
  for (let bits = 1; bits <= MAX; bits++) {
    starts[bits] = off;
    off += counts[bits];
  }
  const symbols = new Array<number>(total);
  const fill = starts.slice();
  for (let sym = 0; sym < lengths.length; sym++) {
    const l = lengths[sym];
    if (l > 0) symbols[fill[l]++] = sym;
  }
  return { counts, symbols, starts, codeStarts };
}

function decodeSymbol(r: BitReader, h: Huffman): number {
  let code = 0;
  for (let len = 1; len <= 15; len++) {
    code = (code << 1) | r.readBit();
    const cnt = h.counts[len];
    if (cnt) {
      const idx = code - h.codeStarts[len];
      if (idx >= 0 && idx < cnt) return h.symbols[h.starts[len] + idx];
    }
  }
  throw new Error('invalid Huffman code');
}

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67,
  83, 99, 115, 131, 163, 195, 227, 258,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
  5, 5, 0,
];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
  769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
  11, 12, 12, 13, 13,
];

export function inflateRawSync(data: Uint8Array): Uint8Array {
  const r = new BitReader(data);
  const out: number[] = [];
  let fixed: { lit: Huffman; dist: Huffman } | null = null;
  let final = false;

  while (!final) {
    final = r.readBit() === 1;
    const type = r.readBits(2);

    if (type === 0) {
      // stored (uncompressed) block
      r.align();
      const p = r.bytePos;
      const len = data[p] | (data[p + 1] << 8);
      const start = p + 4;
      if (start + len > data.length) throw new Error('stored block overrun');
      for (let i = 0; i < len; i++) out.push(data[start + i]);
      r.seek(start + len);
      continue;
    }
    if (type === 3) throw new Error('invalid block type');

    let lit: Huffman;
    let dist: Huffman;
    if (type === 1) {
      // fixed Huffman codes
      if (!fixed) {
        const lengths = new Array<number>(288).fill(8);
        for (let i = 144; i < 256; i++) lengths[i] = 9;
        for (let i = 256; i < 280; i++) lengths[i] = 7;
        fixed = {
          lit: buildHuffman(lengths),
          dist: buildHuffman(new Array<number>(32).fill(5)),
        };
      }
      lit = fixed.lit;
      dist = fixed.dist;
    } else {
      // dynamic Huffman codes
      const hlit = r.readBits(5) + 257;
      const hdist = r.readBits(5) + 1;
      const hclen = r.readBits(4) + 4;
      const order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      const clLengths = new Array<number>(19).fill(0);
      for (let i = 0; i < hclen; i++) clLengths[order[i]] = r.readBits(3);
      const clHuff = buildHuffman(clLengths);

      const all = new Array<number>(hlit + hdist).fill(0);
      let i = 0;
      while (i < all.length) {
        const sym = decodeSymbol(r, clHuff);
        if (sym < 16) {
          all[i++] = sym;
        } else if (sym === 16) {
          if (i === 0) throw new Error('no previous code length');
          let repeat = 3 + r.readBits(2);
          if (i + repeat > all.length) throw new Error('repeat overrun');
          const prev = all[i - 1];
          while (repeat-- > 0) all[i++] = prev;
        } else if (sym === 17) {
          let repeat = 3 + r.readBits(3);
          if (i + repeat > all.length) throw new Error('repeat overrun');
          while (repeat-- > 0) all[i++] = 0;
        } else {
          let repeat = 11 + r.readBits(7);
          if (i + repeat > all.length) throw new Error('repeat overrun');
          while (repeat-- > 0) all[i++] = 0;
        }
      }
      lit = buildHuffman(all.slice(0, hlit));
      dist = buildHuffman(all.slice(hlit));
    }

    for (;;) {
      const sym = decodeSymbol(r, lit);
      if (sym < 256) {
        out.push(sym);
      } else if (sym === 256) {
        break;
      } else {
        const li = sym - 257;
        if (li >= LENGTH_BASE.length) throw new Error('invalid length symbol');
        const length = LENGTH_BASE[li] + r.readBits(LENGTH_EXTRA[li]);
        const ds = decodeSymbol(r, dist);
        if (ds >= DIST_BASE.length) throw new Error('invalid distance symbol');
        const distance = DIST_BASE[ds] + r.readBits(DIST_EXTRA[ds]);
        const start = out.length - distance;
        if (start < 0) throw new Error('distance too far back');
        for (let k = 0; k < length; k++) out.push(out[start + k]);
      }
    }
  }
  return Uint8Array.from(out);
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  const DS = (globalThis as any).DecompressionStream as
    | Ctor<ByteTransformStream>
    | undefined;
  if (!DS) {
    // Hermes has no DecompressionStream — decode with the pure-JS fallback.
    try {
      return inflateRawSync(bytes);
    } catch {
      return null;
    }
  }
  try {
    const stream = new DS('deflate-raw');
    const writer = stream.writable.getWriter();
    void writer.write(bytes);
    void writer.close();
    const chunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(new Uint8Array(value));
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** `true` when the payload was compressed (`Z` marker). */
export const PAYLOAD_PREFIX = PREFIX;

export async function encodeDemoState(state: DemoState): Promise<string> {
  const json = JSON.stringify(state);
  const raw = utf8Encode(json);
  const compressed = await deflate(raw);
  if (compressed && compressed.length < raw.length) {
    return `${PREFIX}Z${bytesToBase64(compressed)}`;
  }
  return `${PREFIX}B${bytesToBase64(raw)}`;
}

export async function decodeDemoState(payload: string): Promise<DemoState> {
  const text = payload.trim().replace(/\s+/g, '');
  if (!text.startsWith(PREFIX)) {
    throw new Error('ليس بيانات OstadiPlus صالحة');
  }
  const marker = text.slice(PREFIX.length, PREFIX.length + 1);
  const body = text.slice(PREFIX.length + 1);
  const bytes = base64ToBytes(body);
  let json: string;
  if (marker === 'Z') {
    const inflated = await inflate(bytes);
    if (!inflated) throw new Error('تعذّرت قراءة البيانات في هذا الجهاز');
    json = utf8Decode(inflated);
  } else {
    json = utf8Decode(bytes);
  }
  const parsed = JSON.parse(json) as DemoState;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.courses)) {
    throw new Error('ملف بيانات غير مكتمل');
  }
  return parsed;
}

/** Rough human-readable size of a payload, e.g. `18 KB`. */
export function payloadSizeLabel(payload: string): string {
  const kb = payload.length / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
