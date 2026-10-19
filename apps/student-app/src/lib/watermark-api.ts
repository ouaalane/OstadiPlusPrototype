/**
 * Watermark API client — asks the backend for a playback grant (a unique
 * 12-char traceability code + session id) at every playback start.
 *
 * Codes are generated and recorded SERVER-SIDE ONLY (`apps/api`,
 * `POST /api/playback/start` → `video_watermarks` table); the app never
 * derives them from client state. The prototype also ships as a fully
 * standalone demo APK with no server, so an explicitly-marked offline
 * fallback keeps the overlay rendering — those local codes are
 * unregistered and untraceable. Set `WATERMARK_ALLOW_OFFLINE_FALLBACK` to
 * `false` to enforce server-only issuance (no server → no watermark).
 *
 * The API address can be pinned per build:
 *   EXPO_PUBLIC_WATERMARK_API_URL=http://192.168.x.x:8787 npx expo run:android
 */
import { Platform } from 'react-native';

import { isWatermarkCode, localFallbackCode } from './watermark';

declare const process: { env: Record<string, string | undefined> };

/** Android-emulator alias for the host machine running `npm run api`. */
const DEFAULT_API_URL = 'http://10.0.2.2:8787';

export const WATERMARK_API_URL = (
  process.env.EXPO_PUBLIC_WATERMARK_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, '');

/** Demo convenience — see the module note above. Flip for production. */
export const WATERMARK_ALLOW_OFFLINE_FALLBACK = true;

const REQUEST_TIMEOUT_MS = 5_000;
/** One immediate retry absorbs a dropped request without an unregistered code. */
const REQUEST_ATTEMPTS = 2;
const RETRY_DELAY_MS = 800;

export interface PlaybackGrant {
  /** The 12-char code rendered by the overlay. */
  code: string;
  /** Server-side session id this code was issued for. */
  sessionId: string;
  createdAt: string;
  /** 'server' = registry-backed code; 'offline' = unregistered demo code. */
  source: 'server' | 'offline';
}

/** Compact device fingerprint for the trace ledger (no personal data). */
export function deviceInfoString(): string {
  const constants = (Platform.constants ?? {}) as { Brand?: string; Model?: string };
  const model = [constants.Brand, constants.Model].filter(Boolean).join(' ');
  const info = `${Platform.OS} ${String(Platform.Version)}${model ? ` · ${model}` : ''}`;
  return info.slice(0, 160);
}

/**
 * Requests a playback grant. Never throws while the offline fallback is
 * enabled; throws (leaving the overlay unmounted) when it is disabled and
 * the API cannot be reached.
 */
export async function requestPlaybackGrant(input: {
  studentId: string;
  courseId: string;
  videoId: string;
}): Promise<PlaybackGrant> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${WATERMARK_API_URL}/api/playback/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...input, deviceInfo: deviceInfoString() }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`watermark API responded ${response.status}`);

      const payload = (await response.json()) as {
        code?: unknown;
        sessionId?: unknown;
        createdAt?: unknown;
      };
      if (!isWatermarkCode(payload.code)) throw new Error('watermark API returned a malformed code');

      const grant: PlaybackGrant = {
        code: payload.code,
        sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : '',
        createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : '',
        source: 'server',
      };
      console.log(`[watermark] server issued code ${grant.code} (session ${grant.sessionId})`);
      return grant;
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (!WATERMARK_ALLOW_OFFLINE_FALLBACK) throw lastError;
  const offline: PlaybackGrant = {
    code: localFallbackCode(),
    sessionId: '',
    createdAt: new Date().toISOString(),
    source: 'offline',
  };
  console.log(
    `[watermark] API unreachable (${String(lastError)}) — rendering UNREGISTERED offline code ${offline.code}`,
  );
  return offline;
}
