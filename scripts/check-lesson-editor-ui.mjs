import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'oustadi-lesson-ui-'));
let vite, browser;
let checks = 0;
const done = (name) => {
  checks++;
  console.log('ok - ' + name);
};
try {
  vite = await createServer({
    root: join(root, 'apps/teacher-dashboard'),
    cacheDir: join(temporary, 'vite'),
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
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const route = '/#/courses/crs-phys-2bac?lesson=lsn-02d';
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('ostadiplus.demo.v3')));
  const selected = async () =>
    (await stored()).courses
      .find((c) => c.id === 'crs-phys-2bac')
      .semesters.flatMap((s) => s.chapters)
      .flatMap((c) => c.lessons)
      .find((l) => l.id === 'lsn-02d');
  await page.goto(base + route);
  const body = page.getByRole('textbox', {
    name: 'محتوى الدرس المكتوب',
    exact: true,
  });
  await body.waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.getByRole('button', { name: 'حفظ الدرس', exact: true }).count(),
    1,
  );
  assert.equal(await page.locator('.lesson-editor-footer').count(), 0);
  assert.equal(
    await page
      .getByRole('textbox', { name: 'وصف الدرس', exact: true })
      .isVisible(),
    false,
  );
  assert.ok((await body.boundingBox()).y < 700);
  done('requested lesson opens directly into content with one save area');

  const updated =
    (await body.inputValue()) + '\n\nنص محفوظ للتحقق من المحرّر المبسّط.';
  await body.fill(updated);
  await page
    .locator('.lesson-save-status')
    .filter({ hasText: 'غير محفوظ' })
    .waitFor();
  await page.getByRole('button', { name: 'حفظ الدرس', exact: true }).click();
  await page
    .locator('.lesson-save-status')
    .filter({ hasText: /^محفوظ$/ })
    .waitFor();
  assert.equal((await selected()).body, updated);
  await page
    .locator('.lesson-editor-tabs')
    .getByRole('tab', { name: 'معاينة', exact: true })
    .click();
  assert.ok(
    (await page.locator('.lesson-editor-body').innerText()).includes(
      'نص محفوظ للتحقق',
    ),
  );
  done('text edits save and render in the existing preview');

  await page
    .locator('.lesson-editor-tabs')
    .getByRole('tab', { name: 'محتوى الدرس', exact: true })
    .click();
  await page.locator('.lesson-optional-details > summary').click();
  await page
    .getByRole('textbox', { name: 'وصف الدرس', exact: true })
    .fill('وصف اختياري محفوظ من التفاصيل الإضافية');
  await page.getByRole('button', { name: 'حفظ الدرس', exact: true }).click();
  assert.equal(
    (await selected()).description,
    'وصف اختياري محفوظ من التفاصيل الإضافية',
  );
  await page
    .locator('.lesson-editor-tabs')
    .getByRole('tab', { name: 'الإعدادات', exact: true })
    .click();
  await page.getByRole('switch', { name: 'نشر الدرس', exact: true }).waitFor();
  await page.getByRole('button', { name: 'حذف الدرس', exact: true }).waitFor();
  done('optional description and lesson settings remain available');

  await page
    .locator('.lesson-editor-tabs')
    .getByRole('tab', { name: 'محتوى الدرس', exact: true })
    .click();
  const title = page.getByRole('textbox', { name: 'عنوان الدرس', exact: true });
  const originalTitle = await title.inputValue();
  await title.fill('x');
  await page.getByRole('button', { name: 'حفظ الدرس', exact: true }).click();
  assert.equal(await title.getAttribute('aria-invalid'), 'true');
  assert.equal((await selected()).title, originalTitle);
  await title.fill(originalTitle);
  await page.getByRole('button', { name: 'حفظ الدرس', exact: true }).click();
  done('inline title validation prevents an invalid save');

  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + route);
    await body.waitFor();
    const toggle = page.getByRole('button', {
      name: 'دروس الدورة',
      exact: true,
    });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.course-outline').isVisible(), false);
    assert.ok((await body.boundingBox()).y < 900);
    await toggle.click();
    assert.equal(await page.locator('.course-outline').isVisible(), true);
    await page.locator('.course-outline button[aria-current="page"]').click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  done(
    'narrow web layouts prioritise the editor and preserve lesson selection',
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await body.fill(updated + '\nمسودة');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page
    .getByRole('link', { name: 'الدورات التعليمية', exact: true })
    .click();
  assert.ok(page.url().endsWith('?lesson=lsn-02d'));
  assert.ok((await body.inputValue()).endsWith('مسودة'));
  assert.deepEqual(errors, []);
  done('cancelled navigation retains draft and no browser errors occur');
  console.log(`PASS ${checks} focused lesson editor journeys`);
} finally {
  await browser?.close();
  await vite?.close();
  await rm(temporary, { recursive: true, force: true });
}
