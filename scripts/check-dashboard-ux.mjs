import { register } from 'node:module';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
register('../apps/api/src/resolve.mjs', import.meta.url);
const { createWatermarkApi } = await import('../apps/api/src/server.mjs');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'oustadi-dashboard-ux-'));
let api, vite, browser;
let checks = 0;
const errors = [];
const done = (name) => {
  checks++;
  console.log('ok - ' + name);
};
try {
  api = createWatermarkApi({
    demoDirectory: join(directory, 'demo'),
    dbPath: join(directory, 'watermarks.db'),
    logger: { log() {}, error() {} },
  });
  await new Promise((r) => api.server.listen(0, '127.0.0.1', r));
  const endpoint = `http://127.0.0.1:${api.server.address().port}`;
  vite = await createServer({
    root: join(root, 'apps/teacher-dashboard'),
    cacheDir: join(directory, 'vite-cache'),
    server: { host: '127.0.0.1', port: 0 },
  });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_PATH ||
      (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.setDefaultTimeout(18000);
  const state = await (await fetch(endpoint + '/api/demo/state')).json();
  await page.addInitScript(
    ({ state, endpoint }) => {
      if (!localStorage.getItem('ostadiplus.demo.v3'))
        localStorage.setItem('ostadiplus.demo.v3', JSON.stringify(state));
      localStorage.setItem('ostadiplus.demo.endpoint', endpoint);
    },
    { state, endpoint },
  );
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('ostadiplus.demo.v3')));

  await page.goto(base + '/#/settings');
  const name = page.getByRole('textbox', { name: 'الاسم', exact: true });
  const email = page.getByRole('textbox', {
    name: 'البريد الإلكتروني',
    exact: true,
  });
  await name.fill('أستاذ تجربة الاستخدام');
  await email.fill('bad@');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  assert.equal(await email.getAttribute('aria-invalid'), 'true');
  assert.equal(await email.evaluate((e) => document.activeElement === e), true);
  assert.equal((await stored()).teacher.name, state.teacher.name);
  done('invalid settings identify the field and do not save');

  page.once('dialog', (dialog) => dialog.dismiss());
  await page
    .locator('nav[aria-label="التنقل الرئيسي"] a[href="#/courses"]')
    .click();
  assert.ok(page.url().endsWith('#/settings'));
  assert.equal(await name.inputValue(), 'أستاذ تجربة الاستخدام');
  const globalSearch = page.getByRole('textbox', {
    name: 'البحث في الدورات والدروس',
    exact: true,
  });
  await globalSearch.fill(state.courses[0].title);
  page.once('dialog', (dialog) => dialog.dismiss());
  await globalSearch.press('Enter');
  assert.ok(page.url().endsWith('#/settings'));
  assert.equal(await name.inputValue(), 'أستاذ تجربة الاستخدام');
  await globalSearch.press('Escape');
  await email.fill('teacher@example.com');
  await email.press('Enter');
  await page
    .getByRole('status')
    .filter({ hasText: 'تم حفظ تغييرات الملف الشخصي.' })
    .waitFor();
  assert.equal((await stored()).teacher.email, 'teacher@example.com');
  done('settings retain drafts on cancelled navigation and save with Enter');

  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('Permission denied')),
      },
    }),
  );
  await page
    .getByRole('button', { name: 'نسخ رمز المزامنة', exact: true })
    .click();
  const manual = page.getByRole('textbox', {
    name: 'رمز المزامنة للنسخ اليدوي',
    exact: true,
  });
  await manual.waitFor();
  assert.ok((await manual.inputValue()).length > 100);
  await manual.focus();
  assert.equal(
    await manual.evaluate((e) => e.selectionEnd - e.selectionStart),
    (await manual.inputValue()).length,
  );
  done('clipboard denial has a usable manual export fallback');

  await page.goto(base + '/#/sync');
  const url = page.getByRole('textbox', {
    name: 'رابط خادم العرض التجريبي',
    exact: true,
  });
  await url.fill('not-a-url');
  await page
    .getByRole('button', { name: 'نشر التحديثات للتطبيق', exact: true })
    .click();
  assert.equal(await url.getAttribute('aria-invalid'), 'true');
  assert.equal(await url.evaluate((e) => document.activeElement === e), true);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('ostadiplus.demo.endpoint')),
    endpoint,
  );
  done(
    'invalid sync address remains inline and does not replace saved connection',
  );

  await url.fill(endpoint);
  await page.route('**/api/demo/state', (route) => route.abort('failed'));
  await page
    .getByRole('button', { name: 'نشر التحديثات للتطبيق', exact: true })
    .click();
  await page
    .getByRole('alert')
    .filter({ hasText: 'تعذّر الاتصال بخادم المركز' })
    .waitFor();
  await page.unroute('**/api/demo/state');
  await page
    .getByRole('button', { name: 'نشر التحديثات للتطبيق', exact: true })
    .click();
  await page.getByRole('status').filter({ hasText: 'آخر مزامنة:' }).waitFor();
  done('sync failure preserves retry and successful publish recovers');

  const remote = await (await fetch(endpoint + '/api/demo/state')).json();
  await fetch(endpoint + '/api/demo/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...remote,
      teacher: { ...remote.teacher, name: 'اسم من نسخة الخادم' },
    }),
  });
  const pull = page.getByRole('button', {
    name: 'جلب تحديثات التلاميذ',
    exact: true,
  });
  await pull.click();
  let confirmation = page.getByRole('alertdialog', {
    name: 'جلب نسخة الخادم؟',
  });
  await confirmation.waitFor();
  await page.waitForTimeout(50);
  assert.equal(
    await confirmation
      .getByRole('button', { name: 'تراجع', exact: true })
      .evaluate((e) => document.activeElement === e),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal((await stored()).teacher.name, 'أستاذ تجربة الاستخدام');
  await pull.click();
  await confirmation
    .getByRole('button', { name: 'جلب نسخة الخادم', exact: true })
    .click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('ostadiplus.demo.v3')).teacher.name ===
      'اسم من نسخة الخادم',
  );
  done(
    'pull explicitly confirms full replacement and cancel preserves local data',
  );

  await page.goto(base + '/#/');
  const firstCourse = (await stored()).courses[0];
  await page
    .getByRole('textbox', { name: 'البحث في الدورات والدروس', exact: true })
    .fill(firstCourse.title);
  await page
    .getByRole('textbox', { name: 'البحث في الدورات والدروس', exact: true })
    .press('Enter');
  await page.waitForURL('**/#/courses/' + firstCourse.id);
  assert.equal(
    await page
      .getByRole('textbox', { name: 'البحث في الدورات والدروس', exact: true })
      .inputValue(),
    '',
  );
  done('global search Enter opens first real result and clears stale results');

  await page.goto(base + '/#/students');
  const search = page.getByRole('searchbox', {
    name: 'بحث بالاسم أو الرمز…',
    exact: true,
  });
  const firstStudent = (await stored()).students[0];
  await search.fill('  ' + firstStudent.fullName + '  ');
  assert.equal(await page.locator('tbody tr').count(), 1);
  done('table search tolerates surrounding whitespace');

  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('ostadiplus.demo.v3'));
    const student = value.students[0];
    value.students.push(
      ...Array.from({ length: 65 }, (_, index) => ({
        ...student,
        id: `ux-student-${index}`,
        studentCode: `UST-UX${index}`,
        fullName: `تلميذ اختبار ${index}`,
      })),
    );
    localStorage.setItem('ostadiplus.demo.v3', JSON.stringify(value));
  });
  await page.reload();
  await page
    .getByRole('button', { name: 'الصفحة التالية', exact: true })
    .waitFor();
  assert.ok((await page.locator('.data-table-card').innerText()).includes('…'));
  done('large tables expose omitted pagination ranges');

  await page.goto(base + '/#/missing-page');
  await page
    .getByRole('heading', { level: 1, name: 'الصفحة غير موجودة' })
    .waitFor();
  assert.deepEqual(errors, []);
  done('fallback has an accessible page heading and no runtime errors');
  console.log(`PASS ${checks} dashboard UX journeys`);
} finally {
  await browser?.close();
  await vite?.close();
  api?.server.closeAllConnections();
  if (api) await new Promise((resolve) => api.server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
