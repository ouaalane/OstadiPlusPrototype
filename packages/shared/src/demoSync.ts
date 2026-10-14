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

async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  const DS = (globalThis as any).DecompressionStream as
    | Ctor<ByteTransformStream>
    | undefined;
  if (!DS) return null;
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
