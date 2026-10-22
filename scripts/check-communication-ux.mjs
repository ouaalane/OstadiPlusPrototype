import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(join(tmpdir(), 'oustadi-communication-ux-'));
let vite, browser;
let checks = 0;
const errors = [];
const done = (name) => {
  checks++;
  console.log('ok - ' + name);
};
try {
  vite = await createServer({
    root: join(root, 'apps/teacher-dashboard'),
    cacheDir: join(temp, 'vite'),
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
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/#/questions');
  await page.locator('h1').waitFor();
  const threads = page.locator('.inbox-thread');
  assert.ok((await threads.count()) > 1);
  await page
    .getByLabel('جوابك للتلميذ', { exact: true })
    .fill('draft per selected question');
  await threads.nth(1).click();
  assert.equal(
    await page.getByLabel('جوابك للتلميذ', { exact: true }).inputValue(),
    '',
  );
  await threads.nth(0).click();
  assert.equal(
    await page.getByLabel('جوابك للتلميذ', { exact: true }).inputValue(),
    'draft per selected question',
  );
  done('per-thread drafts remain scoped when changing conversations');
  let navigationPrompted = false;
  page.once('dialog', async (dialog) => {
    navigationPrompted = true;
    assert.equal(dialog.type(), 'confirm');
    await dialog.dismiss();
  });
  await page
    .getByRole('navigation', { name: 'التنقل الرئيسي' })
    .getByRole('link', { name: 'التقدّم والنتائج', exact: true })
    .click();
  assert.ok(navigationPrompted, 'route navigation warns about an unsent reply');
  assert.equal(new URL(page.url()).hash, '#/questions');
  assert.equal(
    await page.getByLabel('جوابك للتلميذ', { exact: true }).inputValue(),
    'draft per selected question',
  );
  await page.getByLabel('جوابك للتلميذ', { exact: true }).fill('');
  done('cancelling navigation preserves the unsent reply');
  await page
    .getByLabel('البحث في الأسئلة', { exact: true })
    .fill('NO-MATCH-928375');
  await page
    .getByRole('heading', { name: 'لا أسئلة مطابقة', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'عرض كل الأسئلة', exact: true })
    .click();
  assert.ok((await threads.count()) > 1);
  done('inbox no-results recovery clears search and filters');
  await page
    .getByRole('group', { name: 'تصفية الأسئلة' })
    .getByRole('button', { name: /بانتظار جواب/ })
    .click();
  await page
    .getByLabel('جوابك للتلميذ', { exact: true })
    .fill('رد التحقق للطالب');
  const questionBody = await page
    .locator('.inbox-thread[aria-pressed="true"] p')
    .first()
    .textContent();
  const targetQuestion = await page.evaluate(
    (body) =>
      JSON.parse(localStorage.getItem('ostadiplus.demo.v3')).questions.find(
        (q) => q.body === body,
      ),
    questionBody,
  );
  assert.ok(targetQuestion, 'the active thread identifies a stored question');
  await page.getByRole('button', { name: 'إرسال الرد', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: 'تم حفظ ردك على سؤال' })
    .waitFor();
  const savedQuestion = await page.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem('ostadiplus.demo.v3')).questions.find(
        (q) => q.id === id,
      ),
    targetQuestion.id,
  );
  assert.ok(
    savedQuestion.replies.some(
      (r) => r.authorRole === 'teacher' && r.body === 'رد التحقق للطالب',
    ),
  );
  assert.match(
    await page
      .getByRole('status')
      .filter({ hasText: 'تم حفظ ردك على سؤال' })
      .textContent(),
    new RegExp(targetQuestion.authorName),
  );
  done(
    'sending under unanswered filter shows persistent contextual publish confirmation',
  );
  await page.goto(base + '/#/analytics');
  await page.locator('h1').waitFor();
  const count = await page.locator('tbody tr').count();
  assert.ok(count > 0);
  assert.ok(
    (await page.getByText('لا دروس متاحة', { exact: true }).count()) > 0,
  );
  await page.getByLabel('البحث في النتائج', { exact: true }).fill('   ');
  assert.equal(await page.locator('tbody tr').count(), count);
  await page
    .getByLabel('البحث في النتائج', { exact: true })
    .fill('NO-MATCH-2834');
  await page.getByRole('heading', { name: 'لا توجد نتائج مطابقة' }).waitFor();
  await page.getByRole('button', { name: 'مسح البحث', exact: true }).click();
  assert.equal(await page.locator('tbody tr').count(), count);
  done(
    'analytics distinguishes unavailable lessons and restores no-result searches',
  );
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ostadiplus.demo.v3')),
  );
  const student = state.students[0],
    lesson = state.courses[0].semesters[0].chapters[0].lessons[0];
  state.quizAttempts = [
    {
      id: 'late',
      studentId: student.id,
      lessonId: lesson.id,
      correct: 2,
      total: 2,
      elapsedSec: 30,
      submittedAt: '2026-10-23T10:00:00Z',
    },
    {
      id: 'early',
      studentId: student.id,
      lessonId: lesson.id,
      correct: 1,
      total: 2,
      elapsedSec: 10,
      submittedAt: '2026-10-01T10:00:00Z',
    },
  ];
  await page.evaluate(
    (s) => localStorage.setItem('ostadiplus.demo.v3', JSON.stringify(s)),
    state,
  );
  await page.reload();
  await page.locator('time').first().waitFor();
  assert.equal(
    await page.locator('time').first().getAttribute('datetime'),
    '2026-10-23T10:00:00Z',
  );
  done(
    'recent quiz attempts sort by submission date rather than insertion order',
  );
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log(`PASS ${checks} communication and analytics UX journeys`);
} finally {
  await browser?.close();
  await vite?.close();
  await rm(temp, { recursive: true, force: true });
}
