import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'),
  tmp = await mkdtemp(join(tmpdir(), 'oustadi-student-access-ux-'));
let vite, browser;
let checks = 0;
const done = (name) => {
  checks++;
  console.log('ok - ' + name);
};
try {
  vite = await createServer({
    root: join(root, 'apps/teacher-dashboard'),
    cacheDir: join(tmp, 'vite'),
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
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '/#/students');
  await page.locator('h1').waitFor();
  const seed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ostadiplus.demo.v3')),
  );
  const code = seed.students[0].studentCode;
  // An isolated fixture guarantees a genuinely empty active filter independently of dates.
  await page.evaluate(
    (s) =>
      localStorage.setItem(
        'ostadiplus.demo.v3',
        JSON.stringify({ ...s, enrollments: [] }),
      ),
    seed,
  );
  await page.reload();
  await page.locator('h1').waitFor();
  await page
    .getByRole('group', { name: 'تصفية حسب حالة الوصول', exact: true })
    .getByRole('button', { name: 'نشط', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'عرض كل الحالات', exact: true })
    .click();
  assert.equal((await page.locator('tbody tr').count()) > 0, true);
  done('zero-result student filter retains recovery');
  await page
    .getByRole('button', { name: 'ربط تلميذ بالمركز', exact: true })
    .click();
  const input = page.getByRole('textbox', { name: 'رمز الطالب', exact: true });
  await input.fill(code);
  await page.getByRole('button', { name: 'تحقق', exact: true }).click();
  await page
    .locator('#student-link-panel')
    .getByRole('paragraph')
    .filter({ hasText: seed.students[0].fullName })
    .waitFor();
  await input.fill('INVALID');
  assert.equal(
    await page
      .locator('#student-link-panel')
      .getByRole('paragraph')
      .filter({ hasText: seed.students[0].fullName })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'إرسال طلب انضمام', exact: true })
      .count(),
    0,
  );
  await page.getByRole('button', { name: 'تحقق', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'لم يتم العثور' }).waitFor();
  done(
    'changed/invalid student code clears verified identity and request action',
  );
  await page.getByRole('button', { name: 'تجربة QR', exact: true }).click();
  await page
    .getByRole('button', { name: 'تجربة رمز من بيانات العرض', exact: true })
    .click();
  assert.equal(
    await page
      .locator('#student-link-panel button')
      .filter({ hasText: /إرسال طلب انضمام|مرتبط بالمركز|طلب قيد الانتظار/ })
      .count(),
    1,
  );
  done('demo QR exposes the shared membership action/status');
  await page.goto(base + '/#/reception');
  await page
    .getByRole('heading', { name: 'استقبال التلاميذ', exact: true })
    .waitFor();
  const receptionCode = page.getByRole('textbox', {
    name: 'رمز الطالب',
    exact: true,
  });
  await receptionCode.fill(code);
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await page
    .getByRole('button', { name: 'تخصيص الاشتراك', exact: true })
    .first()
    .waitFor();
  await receptionCode.fill('');
  assert.equal(
    await page
      .getByRole('button', { name: 'تخصيص الاشتراك', exact: true })
      .count(),
    0,
  );
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: 'أدخل رمز الطالب' })
    .waitFor();
  done(
    'reception clears prior identity and subscription actions on code changes',
  );
  await receptionCode.fill(code);
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await page
    .getByRole('button', { name: 'تخصيص الاشتراك', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  const courseId = await dialog
    .getByLabel('الأستاذ والمقرر', { exact: true })
    .inputValue();
  const savedPeriods = () =>
    page.evaluate(
      ({ studentId, courseId }) =>
        JSON.parse(localStorage.getItem('ostadiplus.demo.v3')).enrollments.find(
          (enrollment) =>
            enrollment.studentId === studentId &&
            enrollment.courseId === courseId,
        )?.accessPeriods ?? [],
      { studentId: seed.students[0].id, courseId },
    );
  await dialog.getByLabel('عدد الشهور', { exact: true }).fill('4');
  await dialog
    .getByRole('button', { name: 'حفظ الاشتراك', exact: true })
    .click();
  await dialog
    .getByRole('status')
    .filter({ hasText: 'تم حفظ الاشتراك' })
    .waitFor();
  assert.deepEqual(
    (await savedPeriods()).map((period) => period.durationMonths),
    [4],
  );
  assert.equal(
    await dialog.getByLabel('عدد الشهور', { exact: true }).isDisabled(),
    true,
  );
  await dialog
    .getByRole('button', { name: 'إضافة اشتراك', exact: true })
    .click();
  assert.equal(
    await dialog.getByLabel('عدد الشهور', { exact: true }).isEnabled(),
    true,
  );
  await dialog.getByLabel('عدد الشهور', { exact: true }).fill('2');
  await dialog
    .getByRole('button', { name: 'حفظ الاشتراك', exact: true })
    .click();
  await dialog
    .getByRole('status')
    .filter({ hasText: 'تم حفظ الاشتراك' })
    .waitFor();
  assert.deepEqual(
    (await savedPeriods()).map((period) => period.durationMonths),
    [4, 2],
  );
  done('saved subscription requires explicit Add/Edit before another grant');
  console.log(`PASS ${checks} student access UX journeys`);
  assert.deepEqual(errors, [], 'browser runtime errors');
} finally {
  await browser?.close();
  await vite?.close();
  await rm(tmp, { recursive: true, force: true });
}
