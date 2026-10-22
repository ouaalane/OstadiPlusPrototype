import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'oustadi-languages-'));
const storageKey = 'ostadiplus.dashboard.locale';
let vite,
  browser,
  checks = 0;
const done = (name) => {
  checks++;
  console.log('ok - ' + name);
};
try {
  const catalog = JSON.parse(
    await readFile(
      join(root, 'apps/teacher-dashboard/src/i18n/messages.json'),
      'utf8',
    ),
  );
  for (const [source, entry] of Object.entries(catalog)) {
    for (const lang of ['en', 'fr']) {
      assert.ok(entry[lang]?.trim(), `${lang}: missing ${source}`);
      assert.ok(
        !/[\u0600-\u06ff]/.test(entry[lang]),
        `${lang}: untranslated ${source}`,
      );
      assert.deepEqual(
        [...entry[lang].matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort(),
        [...source.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort(),
        `${lang}: invalid placeholders in ${source}`,
      );
    }
  }
  done(
    'all English and French catalog entries retain their interpolation parameters',
  );
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
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base);
  const picker = page.locator('.dashboard-language');
  await picker.waitFor();
  assert.equal(await picker.inputValue(), 'ar');
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  const dataBefore = await page.evaluate(() =>
    localStorage.getItem('ostadiplus.demo.v3'),
  );
  await picker.selectOption('en');
  await page.getByRole('navigation', { name: 'Main navigation' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('ostadiplus.demo.v3')),
    dataBefore,
  );
  done(
    'Arabic remains the default and English switching leaves shared data unchanged',
  );

  const routes = [
    '/courses',
    '/library',
    '/quizzes',
    '/students',
    '/questions',
    '/reception',
    '/analytics',
    '/sync',
    '/settings',
    '/not-found',
  ];
  for (const lang of ['en', 'fr']) {
    await picker.selectOption(lang);
    for (const route of routes) {
      await page.goto(base + '/#' + route);
      await page.locator('.workspace-content h1').waitFor();
      const heading = await page.locator('.workspace-content h1').innerText();
      assert.ok(
        !/[\u0600-\u06ff]/.test(heading),
        `${lang} ${route}: ${heading}`,
      );
      const nav = await page.locator('.sidebar-navigation').innerText();
      assert.ok(!/[\u0600-\u06ff]/.test(nav), `${lang} navigation`);
      assert.equal(await picker.inputValue(), lang);
    }
  }
  done(
    'all main dashboard routes and fallback display translated headings and navigation',
  );

  await page.goto(base + '/#/students');
  const studentBefore = await page.locator('tbody tr').first().innerText();
  await picker.selectOption('en');
  assert.ok((await page.locator('thead').innerText()).includes('Student'));
  await picker.selectOption('fr');
  assert.ok((await page.locator('thead').innerText()).includes('Élève'));
  assert.ok(
    (await page.locator('tbody tr').first().innerText()).includes('إيمان'),
  );
  assert.ok(studentBefore.includes('إيمان'));
  done(
    'memoised table headings switch immediately while student names retain their original text',
  );

  await page.goto(base + '/#/courses/crs-phys-2bac?lesson=lsn-02d');
  const editor = page.locator('.lesson-editor-body textarea').first();
  await editor.waitFor();
  const original = await editor.inputValue();
  const draft = original + '\nDraft preserved across languages.';
  await editor.fill(draft);
  const routeBefore = page.url();
  for (const lang of ['en', 'ar', 'fr']) {
    await picker.selectOption(lang);
    assert.equal(await editor.inputValue(), draft);
    assert.equal(page.url(), routeBefore);
  }
  await page
    .getByRole('button', { name: 'Enregistrer la leçon', exact: true })
    .click();
  await page
    .locator('.lesson-save-status')
    .filter({ hasText: 'Enregistré' })
    .waitFor();
  await page.reload();
  assert.equal(await editor.inputValue(), draft);
  assert.equal(await picker.inputValue(), 'fr');
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
  done(
    'language changes preserve unsaved lesson drafts, existing save behaviour and reload preference',
  );

  await picker.selectOption('en');
  await page
    .locator('.lesson-editor-tabs')
    .getByRole('tab', { name: 'Settings', exact: true })
    .click();
  const toggle = page.getByRole('switch').first();
  const checked = await toggle.getAttribute('aria-checked');
  await toggle.click();
  if (checked === 'true') await toggle.click();
  assert.match(
    await toggle.locator('span').getAttribute('style'),
    /translateX\(20px\)/,
  );
  await picker.selectOption('ar');
  assert.match(
    await toggle.locator('span').getAttribute('style'),
    /translateX\(-20px\)/,
  );
  done('switch controls use the correct direction in both RTL and LTR');
  // Restore the draft before navigating to avoid exercising an unrelated dirty guard.
  await page.getByRole('button', { name: 'حفظ الدرس', exact: true }).click();

  await page.goto(base + '/#/courses');
  await picker.selectOption('en');
  await page
    .getByRole('button', { name: 'Create course', exact: true })
    .first()
    .click();
  await page.getByRole('dialog').waitFor();
  const title = page.getByRole('textbox', {
    name: 'Course title',
    exact: true,
  });
  await title.fill('Course draft');
  await picker.selectOption('fr');
  assert.equal(
    await page.getByRole('dialog').locator('input').first().inputValue(),
    'Course draft',
  );
  assert.ok(
    (await page.getByRole('dialog').innerText()).includes(
      'Créer un nouveau cours',
    ),
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Annuler', exact: true })
    .click();
  done('open creation dialogs translate without resetting entered form values');

  for (const lang of ['ar', 'en', 'fr']) {
    await picker.selectOption(lang);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/courses', '/students', '/sync', '/settings']) {
        await page.goto(base + '/#' + route);
        await page.locator('.workspace-content h1').waitFor();
        assert.ok(await picker.isVisible());
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        assert.ok(!overflow, `${lang} ${route} overflows at ${width}px`);
        if (route === '/students' && width >= 768) {
          const row = await page.locator('tbody tr').first().boundingBox();
          assert.ok(
            row.height < 220,
            `${lang}: student cells collapsed at ${width}px`,
          );
        }
      }
    }
  }
  done(
    'language picker and key routes fit desktop, tablet and narrow dashboard layouts',
  );
  await page.evaluate(
    (key) => localStorage.setItem(key, 'invalid'),
    storageKey,
  );
  await page.reload();
  assert.equal(await picker.inputValue(), 'ar');
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.deepEqual(errors, []);
  done(
    'invalid saved preferences fall back to Arabic with no browser runtime errors',
  );
  console.log(`PASS ${checks} dashboard language checks`);
} finally {
  await browser?.close();
  await vite?.close();
  await rm(temporary, { recursive: true, force: true });
}
