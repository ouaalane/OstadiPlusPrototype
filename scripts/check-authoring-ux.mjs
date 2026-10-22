import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'oustadi-authoring-ux-'));
let vite, browser;
let checks = 0;
const done = (name) => {
  checks++;
  console.log('ok - ' + name);
};
try {
  vite = await createServer({
    root: join(root, 'apps/teacher-dashboard'),
    cacheDir: join(directory, 'vite'),
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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/#/library');
  await page.locator('tbody input[type=checkbox]').first().waitFor();
  const original = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ostadiplus.demo.v3')),
  );
  const typeFilters = page.getByRole('group', {
    name: 'نوع المحتوى',
    exact: true,
  });
  await typeFilters.getByRole('button', { name: 'PDF', exact: true }).click();
  assert.equal(
    await typeFilters
      .getByRole('button', { name: 'PDF', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await typeFilters
    .getByRole('button', { name: 'كل المحتوى', exact: true })
    .click();
  await page.locator('tbody input[type=checkbox]').first().check();
  assert.equal(
    await page
      .getByLabel('تحديد كل المحتوى المعروض', { exact: true })
      .evaluate((e) => e.indeterminate),
    true,
  );
  await page
    .getByLabel('بحث في المحتوى', { exact: true })
    .fill('NO-MATCH-98302');
  assert.equal(
    await page
      .getByRole('button', { name: 'نشر المحدّد', exact: true })
      .count(),
    0,
  );
  await page
    .getByRole('button', { name: 'مسح البحث والتصفية', exact: true })
    .click();
  assert.equal(
    await page.getByLabel('بحث في المحتوى', { exact: true }).inputValue(),
    '',
  );
  assert.ok((await page.locator('tbody tr').count()) > 0);
  done('search clears hidden selections and empty recovery restores content');

  const draftState = structuredClone(original),
    course = draftState.courses[0],
    chapter = course.semesters.flatMap((s) => s.chapters)[0],
    lesson = chapter.lessons.find((l) => l.kind === 'video');
  lesson.title = 'فيديو يحتاج إرفاق الملف';
  lesson.file = '';
  lesson.published = false;
  await page.evaluate(
    (s) => localStorage.setItem('ostadiplus.demo.v3', JSON.stringify(s)),
    draftState,
  );
  await page.reload();
  await page.getByLabel('بحث في المحتوى', { exact: true }).fill(lesson.title);
  await page.locator('tbody input[type=checkbox]').first().check();
  await page.getByRole('button', { name: 'نشر المحدّد', exact: true }).click();
  const feedback = page
    .getByRole('alert')
    .filter({ hasText: 'لم يتم نشر أي عنصر' });
  await feedback.waitFor();
  assert.match(await feedback.textContent(), /أرفق ملف الدرس/);
  assert.ok(
    await page.locator('tbody input[type=checkbox]').first().isChecked(),
  );
  assert.equal(
    await feedback
      .getByRole('link', { name: lesson.title, exact: true })
      .getAttribute('href'),
    `#/courses/${course.id}?lesson=${lesson.id}`,
  );
  done(
    'blocked bulk publication retains selection and links to exact corrective editor',
  );

  await page.goto(base + '/#/library?action=upload');
  await page.getByRole('dialog', { name: 'محتوى جديد', exact: true }).waitFor();
  await page
    .getByRole('button', { name: 'متابعة إلى المحرّر', exact: true })
    .click();
  const title = page
    .getByRole('dialog')
    .getByLabel('عنوان الدرس', { exact: true });
  assert.equal(await title.getAttribute('aria-invalid'), 'true');
  assert.ok(await title.getAttribute('aria-describedby'));
  await page.keyboard.press('Escape');
  done('new lesson title errors are associated with their control');

  await page.goto(base + `/#/courses/${course.id}`);
  await page.getByRole('tab', { name: 'معلومات الدورة', exact: true }).click();
  await page
    .getByLabel('عنوان الدورة', { exact: true })
    .fill('عنوان غير محفوظ');
  let dialogs = 0;
  const reject = (d) => {
    dialogs++;
    void d.dismiss();
  };
  page.on('dialog', reject);
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  assert.equal(dialogs, 0);
  assert.equal(
    await page.locator(':focus').getAttribute('id'),
    'workspace-content',
  );
  await page.locator('.workspace-sidebar a[href="#/courses"]').click();
  assert.equal(dialogs, 1);
  assert.equal(
    await page.getByLabel('عنوان الدورة', { exact: true }).inputValue(),
    'عنوان غير محفوظ',
  );
  page.off('dialog', reject);
  await page.getByRole('button', { name: 'تراجع', exact: true }).click();
  done(
    'skip anchor does not warn while real navigation protects a dirty editor',
  );

  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    window.__failLibrary = true;
    Object.defineProperty(indexedDB, 'open', {
      value(...args) {
        if (!window.__failLibrary) return open(...args);
        const request = { error: new DOMException('Test failure') };
        setTimeout(() => request.onerror?.(), 0);
        return request;
      },
    });
  });
  await page.goto(base + `/#/courses/${course.id}?lesson=${lesson.id}`);
  await page.reload();
  await page
    .getByRole('button', { name: 'اختيار من المكتبة', exact: true })
    .click();
  const library = page.getByRole('dialog', {
    name: 'مكتبة الفيديو',
    exact: true,
  });
  await library.getByRole('alert').waitFor();
  assert.ok((await library.getByRole('button').count()) > 1);
  await page.evaluate(() => (window.__failLibrary = false));
  await library
    .getByRole('button', { name: 'إعادة تحميل المكتبة', exact: true })
    .click();
  await library.getByRole('alert').waitFor({ state: 'detached' });
  await page.keyboard.press('Escape');
  done(
    'failed media library exposes recovery while bundled assets stay available',
  );

  const empty = { ...original, courses: [], enrollments: [] };
  const emptyContext = await browser.newContext();
  await emptyContext.addInitScript(
    (s) => localStorage.setItem('ostadiplus.demo.v3', JSON.stringify(s)),
    empty,
  );
  const fresh = await emptyContext.newPage();
  await fresh.goto(base + '/#/library');
  await fresh
    .getByRole('button', { name: 'إضافة محتوى', exact: true })
    .first()
    .click();
  await fresh
    .getByRole('dialog', { name: 'محتوى جديد', exact: true })
    .getByRole('link', { name: 'إنشاء دورة', exact: true })
    .click();
  await fresh
    .getByRole('dialog', { name: 'إنشاء دورة جديدة', exact: true })
    .waitFor();
  await emptyContext.close();
  done('empty library creation recovers into course creation');
  assert.deepEqual(errors, []);
  done('no browser runtime errors');
  console.log(`PASS ${checks} authoring UX journeys`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await rm(directory, { recursive: true, force: true });
}
