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
    throw new Error('رابط الخادم غير صالح');
  localStorage.setItem(KEY, url.origin);
  return url.origin;
}
export function demoMediaUrl(file: string) {
  return file.startsWith('/api/demo/') ? demoEndpoint() + file : file;
}
async function responseJson(response: Response) {
  if (!response.ok)
    throw new Error(`تعذّر الاتصال بالخادم (${response.status})`);
  return response.json();
}
export async function publishDemo(state: DemoState): Promise<DemoState> {
  return responseJson(
    await fetch(demoEndpoint() + '/api/demo/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }),
  );
}
export async function pullDemo(): Promise<DemoState> {
  return responseJson(await fetch(demoEndpoint() + '/api/demo/state'));
}
export async function uploadDemo(file: File): Promise<{ file: string }> {
  if (file.size > 100 * 1024 * 1024)
    throw new Error('الحد الأقصى للملف 100 MB');
  return responseJson(
    await fetch(demoEndpoint() + '/api/demo/upload', {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
      },
      body: file,
    }),
  );
}
