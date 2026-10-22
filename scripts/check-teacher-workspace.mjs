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
const directory = await mkdtemp(join(tmpdir(), 'oustadi-workspace-'));
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
  const courseTitle = 'دورة التحقق من تجربة الأستاذ';
  await page.goto(base + '/#/courses');
  await page.getByRole('button', { name: 'إنشاء دورة', exact: true }).click();
  await page
    .getByPlaceholder('عنوان واضح للتلاميذ')
    .pressSequentially(courseTitle, { delay: 15 });
  assert.equal(
    await page.getByPlaceholder('عنوان واضح للتلاميذ').inputValue(),
    courseTitle,
  );
  await page.getByRole('button', { name: 'إنشاء الدورة', exact: true }).click();
  await page.getByRole('heading', { name: courseTitle, exact: true }).waitFor();
  const courseId = (await stored()).courses.find(
    (c) => c.title === courseTitle,
  ).id;
  done('new course and modal typing retain focus');
  await page.getByRole('tab', { name: 'معلومات الدورة', exact: true }).click();
  await page
    .getByLabel('وصف مختصر', { exact: false })
    .fill('وصف محفوظ للدورة التجريبية');
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('tab', { name: 'محتوى الدورة', exact: true }).click();
  assert.equal(
    await page.getByLabel('وصف مختصر', { exact: false }).inputValue(),
    'وصف محفوظ للدورة التجريبية',
  );
  await page
    .getByRole('button', { name: 'حفظ التعديلات', exact: true })
    .click();
  await page.getByRole('tab', { name: 'محتوى الدورة', exact: true }).click();
  done('course information retains unsaved changes and saves explicitly');
  await page.getByRole('button', { name: 'إضافة فصل', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('عنوان الفصل', { exact: true })
    .fill('الفصل التجريبي');
  await page.getByRole('button', { name: 'حفظ الفصل', exact: true }).click();
  await page
    .locator('.course-outline')
    .getByRole('button', { name: 'إضافة درس', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('عنوان الدرس', { exact: true })
    .fill('فيديو تجربة المحرّر');
  await page
    .getByRole('button', { name: 'متابعة إلى المحرّر', exact: true })
    .click();
  await page
    .getByLabel('رفع فيديو', { exact: true })
    .waitFor({ state: 'attached' });
  done('chapter and lesson creation open the editor atomically');
  let releaseUpload;
  const blockedUpload = new Promise((resolve) => {
    releaseUpload = resolve;
  });
  const blockedRoute = async (route) => {
    await blockedUpload;
    await route.abort('aborted').catch(() => {});
  };
  await page.route('**/api/demo/upload', blockedRoute);
  await page
    .getByLabel('رفع فيديو', { exact: true })
    .setInputFiles(
      join(root, 'apps/teacher-dashboard/public/media/videos/limits-intro.mp4'),
    );
  await page
    .getByRole('button', { name: 'إلغاء رفع الملف', exact: true })
    .click();
  releaseUpload();
  await page
    .getByText('تم إلغاء الرفع. يمكنك اختيار الملف من جديد.', { exact: true })
    .waitFor();
  await page.unroute('**/api/demo/upload', blockedRoute);
  done('cancelling an upload preserves the lesson and returns to idle');
  let failNext = true;
  await page.route('**/api/demo/upload', async (route) => {
    if (failNext) {
      failNext = false;
      await route.abort('failed');
    } else await route.continue();
  });
  await page
    .getByLabel('رفع فيديو', { exact: true })
    .setInputFiles(
      join(root, 'apps/teacher-dashboard/public/media/videos/limits-intro.mp4'),
    );
  await page
    .getByRole('button', { name: 'إعادة المحاولة', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'إعادة المحاولة', exact: true })
    .click();
  await page
    .getByText('الملف جاهز. احفظ الدرس لتثبيت التغيير.', { exact: true })
    .waitFor();
  done('real video upload, failure state and retry');
  await page
    .getByLabel('وصف الدرس', { exact: false })
    .fill('وصف جديد من محرّر الأستاذ');
  await page
    .getByLabel('اختيار صورة مصغّرة', { exact: true })
    .setInputFiles(
      join(
        root,
        'apps/teacher-dashboard/public/media/posters/limits-intro.jpg',
      ),
    );
  await page.getByRole('button', { name: 'حفظ ونشر', exact: true }).click();
  await page.waitForFunction(
    (id) =>
      JSON.parse(localStorage.getItem('ostadiplus.demo.v3')).courses.find(
        (c) => c.id === id,
      ).semesters[0].chapters[0].lessons[0].published,
    courseId,
  );
  let local = await stored();
  let course = local.courses.find((c) => c.id === courseId);
  let video = course.semesters[0].chapters[0].lessons[0];
  assert.ok(video.file.startsWith('/api/demo/media/'));
  assert.ok(video.thumbnailUrl.startsWith('data:image/jpeg'));
  assert.equal(video.description, 'وصف جديد من محرّر الأستاذ');
  done('description, thumbnail and published video persist');
  await page.getByLabel('عنوان الدرس', { exact: true }).fill('تغيير لم نحفظه');
  page.once('dialog', (d) => d.dismiss());
  await page
    .getByRole('link', { name: 'الدورات التعليمية', exact: true })
    .click();
  assert.ok(page.url().includes(courseId));
  assert.equal(
    await page.getByLabel('عنوان الدرس', { exact: true }).inputValue(),
    'تغيير لم نحفظه',
  );
  await page.getByLabel('عنوان الدرس', { exact: true }).fill(video.title);
  done('unsaved navigation guard preserves draft on cancellation');
  async function createLesson(kind, title) {
    await page
      .locator('.course-outline')
      .getByRole('button', { name: 'إضافة درس', exact: true })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: kind }).click();
    await page
      .getByRole('dialog')
      .getByLabel('عنوان الدرس', { exact: true })
      .fill(title);
    await page
      .getByRole('button', { name: 'متابعة إلى المحرّر', exact: true })
      .click();
  }
  await createLesson('ملف PDF', 'مستند تجربة المحرّر');
  await page
    .getByLabel('رفع ملف PDF', { exact: true })
    .setInputFiles(
      join(root, 'apps/teacher-dashboard/public/media/docs/limits-sheet.pdf'),
    );
  await page
    .getByText('الملف جاهز. احفظ الدرس لتثبيت التغيير.', { exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'حفظ ونشر', exact: true }).click();
  await page.waitForTimeout(100);
  course = (await stored()).courses.find((c) => c.id === courseId);
  const pdf = course.semesters[0].chapters[0].lessons.find(
    (l) => l.kind === 'pdf',
  );
  assert.equal(pdf.pages, 5);
  assert.ok(pdf.file.startsWith('/api/demo/media/'));
  done('actual PDF.js page count and durable PDF upload');
  await createLesson('اختبار', 'اختبار تجربة المحرّر');
  await page.getByRole('button', { name: 'حفظ ونشر', exact: true }).click();
  await page.getByRole('alert').first().waitFor();
  assert.ok(
    !(await stored()).courses
      .find((c) => c.id === courseId)
      .semesters[0].chapters[0].lessons.find((l) => l.kind === 'quiz')
      .published,
  );
  await page.getByLabel('استيراد أسئلة JSON', { exact: true }).setInputFiles({
    name: 'quiz.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        timeLimitSec: 2,
        questions: [
          {
            prompt: '2 + 2 = ?',
            options: [
              { id: 'a', text: '4' },
              { id: 'b', text: '5' },
            ],
            correctIds: ['a'],
          },
        ],
      }),
    ),
  });
  await page.getByRole('button', { name: 'حفظ ونشر', exact: true }).click();
  await page.waitForTimeout(100);
  course = (await stored()).courses.find((c) => c.id === courseId);
  const quiz = course.semesters[0].chapters[0].lessons.find(
    (l) => l.kind === 'quiz',
  );
  assert.equal(quiz.timeLimitSec, 2);
  assert.equal(quiz.questions.length, 1);
  assert.ok(quiz.published);
  done('quiz validation, JSON import and timed quiz publication');
  await page.getByRole('tab', { name: 'الإعدادات', exact: true }).click();
  await page.getByRole('switch', { name: 'نشر الدرس', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ الدرس', exact: true }).click();
  await page.waitForTimeout(100);
  course = (await stored()).courses.find((c) => c.id === courseId);
  assert.equal(
    course.semesters[0].chapters[0].lessons.find((l) => l.id === quiz.id)
      .published,
    false,
  );
  await page.getByRole('button', { name: 'حفظ ونشر', exact: true }).click();
  done('publication settings keep drafts distinct from live lessons');
  await page.getByRole('button', { name: 'نشر الدورة', exact: true }).click();
  await page
    .getByRole('button', { name: 'تأكيد نشر الدورة', exact: true })
    .click();
  await page.goto(base + '/#/students');
  const studentRow = page
    .locator('tbody tr')
    .filter({ hasText: 'إيمان السيد' });
  await studentRow
    .getByRole('button', { name: 'إدارة الوصول', exact: true })
    .click();
  const grant = page.getByRole('dialog');
  await grant.getByLabel('الأستاذ والمقرر').selectOption(courseId);
  await grant.getByRole('button', { name: 'ثلاثة أشهر', exact: true }).click();
  await grant
    .getByRole('button', { name: 'حفظ الاشتراك', exact: true })
    .click();
  await grant
    .getByRole('status')
    .filter({ hasText: 'تم حفظ الاشتراك' })
    .waitFor();
  const subscription = (await stored()).enrollments.find(
    (e) =>
      e.studentId ===
        state.students.find((s) => s.fullName === 'إيمان السيد').id &&
      e.courseId === courseId,
  );
  assert.equal(subscription.accessPeriods[0].durationMonths, 3);
  assert.equal(
    await grant.getByRole('button', { name: 'إيقاف', exact: true }).count(),
    0,
  );
  await grant
    .getByRole('button', { name: 'إضافة اشتراك', exact: true })
    .click();
  const testCourse = (await stored()).courses.find((c) => c.id === courseId);
  await grant
    .getByRole('button', { name: testCourse.semesters[0].title, exact: true })
    .click();
  await grant.getByLabel('آخر يوم للوصول').fill('2027-06-30');
  await grant
    .getByRole('button', { name: 'حفظ الاشتراك', exact: true })
    .click();
  await grant
    .getByRole('status')
    .filter({ hasText: 'تم حفظ الاشتراك' })
    .waitFor();
  assert.equal(
    (await stored()).enrollments.find((e) => e.id === subscription.id)
      .accessPeriods.length,
    2,
  );
  const termRow = grant
    .locator('li')
    .filter({ hasText: testCourse.semesters[0].title });
  await termRow.getByRole('button', { name: 'تعديل', exact: true }).click();
  await grant.getByLabel('آخر يوم للوصول').fill('2027-07-31');
  await grant
    .getByRole('button', { name: 'حفظ الاشتراك', exact: true })
    .click();
  await grant
    .getByRole('status')
    .filter({ hasText: 'تم حفظ الاشتراك' })
    .waitFor();
  const updatedPeriods = (await stored()).enrollments.find(
    (e) => e.id === subscription.id,
  ).accessPeriods;
  assert.equal(updatedPeriods.length, 2);
  assert.equal(
    updatedPeriods.find((p) => p.kind === 'semester').endsOn,
    '2027-07-31',
  );
  await page.waitForTimeout(4500);
  const screenshots = process.env.OUSTADI_SCREENSHOT_DIR || join(directory, 'screenshots');
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({
    path: join(screenshots, 'subscriptions-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    'subscription dialog fits mobile viewport',
  );
  await page.screenshot({
    path: join(screenshots, 'subscriptions-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await grant.getByRole('button', { name: 'إغلاق', exact: true }).click();
  done(
    'custom monthly and semester subscriptions persist without stop/activate toggles',
  );
  await page.goto(base + '/#/sync');
  await page
    .getByRole('button', { name: 'نشر التحديثات للتطبيق', exact: true })
    .click();
  await page.getByRole('status').filter({ hasText: 'آخر مزامنة' }).waitFor();
  let remote = await (await fetch(endpoint + '/api/demo/state')).json();
  assert.ok(
    remote.courses.find((c) => c.id === courseId).status === 'published',
  );
  assert.ok(
    remote.enrollments.some(
      (e) =>
        e.studentId === 'st-iman' &&
        e.courseId === courseId &&
        e.status === 'active',
    ),
  );
  let response = await fetch(endpoint + '/api/playback/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 'st-iman', courseId, videoId: video.id }),
  });
  assert.equal(response.status, 201);
  done(
    'teacher publish reaches shared state and issues valid student video grant',
  );
  const question = {
    id: 'q-workspace-e2e',
    courseId,
    lessonId: video.id,
    studentId: 'st-iman',
    authorName: 'إيمان السيد',
    body: 'سؤال التحقق من صندوق الأستاذ',
    createdAt: new Date().toISOString(),
    replies: [],
  };
  response = await fetch(endpoint + '/api/demo/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student: remote.students.find((s) => s.id === 'st-iman'),
      questions: [question],
      quizAttempts: [
        {
          id: 'attempt-e2e',
          studentId: 'st-iman',
          lessonId: quiz.id,
          correct: 1,
          total: 1,
          elapsedSec: 2,
          submittedAt: new Date().toISOString(),
        },
      ],
    }),
  });
  assert.equal(response.status, 200);
  await page
    .getByRole('button', { name: 'جلب تحديثات التلاميذ', exact: true })
    .click();
  await page.goto(base + '/#/questions');
  await page.getByRole('button').filter({ hasText: question.body }).click();
  await page
    .getByLabel('جوابك للتلميذ', { exact: true })
    .fill('جواب الأستاذ من المحرّر الجديد');
  await page.getByRole('button', { name: 'إرسال الرد', exact: true }).click();
  await page.goto(base + '/#/sync');
  await page
    .getByRole('button', { name: 'نشر التحديثات للتطبيق', exact: true })
    .click();
  await page.getByRole('status').filter({ hasText: 'آخر مزامنة' }).waitFor();
  remote = await (await fetch(endpoint + '/api/demo/state')).json();
  assert.ok(
    remote.questions
      .find((q) => q.id === question.id)
      .replies.some((r) => r.body === 'جواب الأستاذ من المحرّر الجديد'),
  );
  done('student question → new inbox → teacher reply → published response');
  await page.goto(base + '/#/quizzes');
  await page
    .getByLabel('بحث في المحتوى', { exact: true })
    .fill('اختبار تجربة المحرّر');
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.goto(base + '/#/library');
  await page.getByRole('tab', { name: 'PDF', exact: true }).click();
  assert.ok((await page.locator('tbody tr').count()) > 0);
  done('quiz bank and content library filters');
  await page
    .getByLabel('البحث في الدورات والدروس', { exact: true })
    .fill('فيديو تجربة المحرّر');
  await page
    .getByRole('link')
    .filter({ hasText: 'فيديو تجربة المحرّر' })
    .click();
  await page.getByLabel('عنوان الدرس', { exact: true }).waitFor();
  done('workspace search opens the exact lesson');
  if (process.env.TEACHER_SHOTS_DIR)
    await mkdir(process.env.TEACHER_SHOTS_DIR, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    for (const route of [
      '',
      'courses',
      'library',
      'quizzes',
      'questions',
      'students',
      'reception',
      'analytics',
      'sync',
      'settings',
      `courses/${courseId}?lesson=${video.id}`,
    ]) {
      await page.goto(base + '/#/' + route);
      await page.waitForTimeout(80);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} overflows at ${width}`,
      );
    }
    if (process.env.TEACHER_SHOTS_DIR) {
      await page.goto(base + '/#/');
      await page
        .locator('[aria-live="polite"] button')
        .evaluateAll((buttons) => buttons.forEach((button) => button.click()));
      await page.waitForTimeout(100);
      await page.screenshot({
        path: join(
          process.env.TEACHER_SHOTS_DIR,
          `verified-overview-${width}.png`,
        ),
        fullPage: true,
      });
      await page.goto(base + `/#/courses/${courseId}?lesson=${video.id}`);
      await page.waitForTimeout(100);
      await page.screenshot({
        path: join(
          process.env.TEACHER_SHOTS_DIR,
          `verified-editor-${width}.png`,
        ),
        fullPage: true,
      });
    }
  }
  done('all workspace routes at 1440 px and 390 px without page overflow');
  assert.deepEqual(errors, []);
  done('no browser runtime errors');
  console.log(`PASS ${checks} teacher workspace journeys`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (api) await api.close();
  await rm(directory, { recursive: true, force: true });
}
