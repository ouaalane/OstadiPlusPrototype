import { translate as t } from '@/i18n/locale';
import type { DemoState } from '@ostadiplus/shared';
const KEY = 'ostadiplus.demo.endpoint';
export function demoEndpoint() {
  return (localStorage.getItem(KEY) || 'http://localhost:8787').replace(
    /\/+$/,
    '',
  );
}
export function saveDemoEndpoint(value: string) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error(t('رابط الخادم غير صالح'));
  localStorage.setItem(KEY, url.origin);
  return url.origin;
}
export function demoMediaUrl(file: string) {
  return file.startsWith('/api/demo/') ? demoEndpoint() + file : file;
}
async function responseJson(response: Response) {
  if (!response.ok)
    throw new Error(t('تعذّر الاتصال بالخادم ({0})', [response.status]));
  return response.json();
}
async function fetchState(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await responseJson(
      await fetch(demoEndpoint() + path, {
        ...init,
        signal: controller.signal,
      }),
    );
  } finally {
    clearTimeout(timeout);
  }
}
export async function publishDemo(state: DemoState): Promise<DemoState> {
  return fetchState('/api/demo/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}
export async function pullDemo(): Promise<DemoState> {
  return fetchState('/api/demo/state');
}
export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}
export async function uploadDemo(
  file: File,
  options: UploadOptions = {},
): Promise<{ file: string }> {
  if (file.size > 100 * 1024 * 1024)
    throw new Error(t('الحد الأقصى للملف 100 MB'));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cleanup = () => options.signal?.removeEventListener('abort', abort);
    const abort = () => xhr.abort();
    if (options.signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }
    xhr.open('POST', demoEndpoint() + '/api/demo/upload');
    xhr.timeout = 180000;
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream',
    );
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        options.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            t('تعذّر رفع الملف ({0}). تحقق من خادم المركز.', [xhr.status]),
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error(t('جواب الخادم غير صالح')));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(
        new Error(
          t(
            'تعذّر الاتصال بخادم المركز. تحقق من الرابط في صفحة النشر والمزامنة.',
          ),
        ),
      );
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new Error(t('انتهت مهلة الرفع. تحقق من الاتصال وحاول مجدداً.')));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.send(file);
  });
}

export type ConnectionUpdate = Pick<
  DemoState,
  'students' | 'memberships' | 'notifications' | 'centers'
>;
export async function connectionRequest(
  path: string,
  body?: unknown,
): Promise<ConnectionUpdate> {
  return fetchState(
    '/api/demo/connections' + path,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
}
export async function lookupConnection(
  studentCode: string,
  centerId: string,
): Promise<DemoState['students'][number] | undefined> {
  const response = await fetch(
    demoEndpoint() + '/api/demo/connections/lookup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCode, centerId }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (response.status === 404) return undefined;
  return (await responseJson(response)).student;
}
