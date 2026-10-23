/** Browser acceptance of real student UI ↔ API ↔ dashboard, with isolated data.
 * Native file downloads, camera, OS capture protection and device rotation are
 * deliberately outside this harness; see the verification report. */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { startStudentPreview } from './lib/student-preview.mjs';
register('../apps/api/src/resolve.mjs', import.meta.url);
const { createWatermarkApi } = await import('../apps/api/src/server.mjs');
const { allLessons, createAccessPeriod } = await import('@ostadiplus/shared');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'oustadi-journeys-'));
const artifacts = process.env.OUSTADI_SCREENSHOT_DIR || join(directory, 'screenshots');
await mkdir(artifacts, { recursive: true });
let api, preview, vite, browser, student, dashboard, failure;
const checks = [], errors = [];
const done = (name) => { checks.push(name); console.log('ok - ' + name); };
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('ostadiplus.student.v3')).data);
const teacherState = page => page.evaluate(() => JSON.parse(localStorage.getItem('ostadiplus.demo.v3')));
const button = (page, name) => page.getByRole('button', { name, exact: true });
const field = (page, name) => page.getByRole('textbox', { name, exact: true });
async function navigate(name, params) {
  await student.evaluate(({ name, params }) => globalThis.__reviewNav.navigate(name, params), { name, params });
  await student.waitForTimeout(100);
}
async function shot(page, name) {
  await page.screenshot({ path: join(artifacts, name + '.png'), fullPage: true });
}
async function noOverflow(page, label) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page overflow');
}
let endpoint, dashboardBase;
async function mobileSync() {
  await navigate('Sync');
  await field(student, 'Adresse du serveur du centre').fill(endpoint);
  const response = student.waitForResponse(r => r.url() === endpoint + '/api/demo/student' && r.request().method() === 'POST');
  await button(student, 'Synchroniser maintenant').click();
  assert.equal((await response).status(), 200);
  await student.getByText('Synchronisation terminée : cours, réponses et accès à jour.', { exact: true }).filter({ visible: true }).waitFor();
}
async function teacherSync(direction) {
  await dashboard.goto(dashboardBase + '/#/sync');
  await button(dashboard, direction === 'pull' ? 'جلب تحديثات التلاميذ' : 'نشر التحديثات للتطبيق').click();
  if (direction === 'pull') await dashboard.getByRole('alertdialog').getByRole('button', { name: 'جلب نسخة الخادم', exact: true }).click();
  await dashboard.getByRole('status').filter({ hasText: 'آخر مزامنة' }).waitFor();
}
async function welcome() {
  await button(student, 'Passer').click();
}
try {
  api = createWatermarkApi({ demoDirectory: join(directory, 'demo'), dbPath: join(directory, 'ledger.db'), logger: { log() {}, error() {} } });
  await new Promise(resolve => api.server.listen(0, '127.0.0.1', resolve));
  endpoint = `http://127.0.0.1:${api.server.address().port}`;
  const initial = await (await fetch(endpoint + '/api/demo/state')).json();
  preview = await startStudentPreview({ root, directory });
  vite = await createServer({ root: join(root, 'apps/teacher-dashboard'), cacheDir: join(directory, 'vite'), server: { host: '127.0.0.1', port: 0 } });
  await vite.listen();
  dashboardBase = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  student = await context.newPage();
  student.setDefaultTimeout(20000);
  student.on('pageerror', e => errors.push('student: ' + e.message));
  await student.addInitScript(({ endpoint }) => localStorage.setItem('ostadiplus.demo.endpoint', endpoint), { endpoint });
  await student.goto(preview.url);
  await student.waitForFunction(() => globalThis.__reviewNav?.isReady(), null, { timeout: 60000 });
  await button(student, 'الشريحة 2').click();
  await student.getByText('شاهد دروسك بدون إنترنت', { exact: true }).filter({ visible: true }).waitFor();
  await button(student, 'الشريحة 3').click();
  await student.getByText('تابع تقدّمك واختبر نفسك', { exact: true }).filter({ visible: true }).waitFor();
  await shot(student, 'onboarding-ar');
  await button(student, 'تخطّي').click();
  await button(student, 'التبديل إلى الفرنسية').click();
  await shot(student, 'welcome-fr');
  await button(student, "S'inscrire").click();
  await button(student, 'Suivant').click();
  await student.getByText('Entrez votre nom complet.', { exact: true }).filter({ visible: true }).waitFor();
  await field(student, 'Nom complet').fill('Test Learner');
  await field(student, 'Adresse e-mail').fill('invalid-email');
  await student.getByLabel('Mot de passe', { exact: true }).fill('Valid123!');
  await button(student, 'Suivant').click();
  await student.getByText('Entrez une adresse e-mail valide.', { exact: true }).filter({ visible: true }).waitFor();
  await field(student, 'Adresse e-mail').fill(' IMAN@EXAMPLE.MA ');
  await button(student, 'Suivant').click();
  await student.getByText('Cette adresse appartient à un autre compte.', { exact: true }).filter({ visible: true }).waitFor();
  await field(student, 'Adresse e-mail').fill('journey@example.ma');
  await student.getByLabel('Mot de passe', { exact: true }).fill('short');
  await button(student, 'Suivant').click();
  await student.getByText('Utilisez au moins 8 caractères.', { exact: true }).filter({ visible: true }).waitFor();
  await student.getByLabel('Mot de passe', { exact: true }).fill('Valid123!');
  await field(student, "Numéro de téléphone de l'élève").fill('abc');
  await button(student, 'Suivant').click();
  await student.getByText('Entrez un numéro de téléphone valide.', { exact: true }).filter({ visible: true }).waitFor();
  await field(student, "Numéro de téléphone de l'élève").fill('');
  await shot(student, 'signup-validation-fr');
  done('signup rejects empty fields, invalid/duplicate email, short password and invalid phone');
  await button(student, 'Suivant').click();
  await button(student, 'Suivant').click();
  await button(student, 'Créer le compte').click();
  await student.getByText('Vous devez accepter les conditions et la politique de confidentialité.', { exact: true }).filter({ visible: true }).waitFor();
  await student.getByRole('checkbox').click();
  await button(student, 'Créer le compte').click();
  await student.getByText('Votre code personnel', { exact: true }).filter({ visible: true }).waitFor();
  await student.waitForTimeout(450);
  let state = await stored(student);
  const newId = state.activeStudentId;
  const newStudent = state.students.find(s => s.id === newId);
  await student.waitForFunction(async ({ endpoint, newId }) => {
    const data = await (await fetch(endpoint + '/api/demo/state')).json();
    return data.students.some(s => s.id === newId);
  }, { endpoint, newId });
  done('new account registers with the centre server automatically without manual data sync');
  assert.equal(newStudent.email, 'journey@example.ma');
  assert.ok(!state.enrollments.some(e => e.studentId === newId));
  await shot(student, 'new-student-pending');
  await button(student, 'Afficher ma carte').click();
  await student.getByText(newStudent.studentCode, { exact: true }).filter({ visible: true }).first().waitFor();
  await shot(student, 'student-card');
  done('new account has its own identity and empty course access; QR illustration retains its student code');
  await navigate('Tabs', { screen: 'Profile' });
  const photoChooser = student.waitForEvent('filechooser');
  await button(student, 'Ajouter une photo de profil').click();
  await (await photoChooser).setFiles(join(root, 'apps/student-app/src/assets/student-avatar.jpg'));
  await button(student, 'Modifier la photo de profil').waitFor();
  await student.waitForTimeout(450);
  assert.ok((await stored(student)).students.find(s => s.id === newId).profilePhoto.startsWith('data:image/jpeg;base64,'));
  done('browser profile image picker saves a durable processed JPEG thumbnail');
  await button(student, 'Mon profil').click();
  await field(student, 'Adresse e-mail').fill('iman@example.ma');
  await button(student, 'Enregistrer les modifications').click();
  await student.getByText('Cette adresse appartient à un autre compte.', { exact: true }).filter({ visible: true }).waitFor();
  await field(student, 'Adresse e-mail').fill('journey@example.ma');
  await field(student, 'Nom complet').fill('Test Learner Updated');
  await field(student, 'Âge (facultatif)').fill('18');
  await field(student, 'Numéro de téléphone').fill('0611223399');
  await button(student, 'Enregistrer les modifications').click();
  await student.getByText('Test Learner Updated', { exact: true }).filter({ visible: true }).first().waitFor();
  await button(student, 'Mon profil').click();
  await student.getByLabel('Mot de passe actuel', { exact: true }).fill('wrong-password');
  await student.getByLabel('Nouveau mot de passe', { exact: true }).fill('Changed123!');
  await student.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Changed123!');
  await button(student, 'Enregistrer les modifications').click();
  await student.getByText('Le mot de passe actuel est incorrect.', { exact: true }).filter({ visible: true }).waitFor();
  await student.getByLabel('Mot de passe actuel', { exact: true }).fill('Valid123!');
  await button(student, 'Enregistrer les modifications').click();
  await button(student, 'Se déconnecter').waitFor();
  await button(student, 'Se déconnecter').click();
  await welcome();
  await button(student, 'Se connecter').click();
  await field(student, 'Adresse e-mail ou numéro de téléphone').fill('journey@example.ma');
  await student.getByLabel('Mot de passe', { exact: true }).fill('Valid123!');
  await button(student, 'Se connecter').click();
  await student.getByText('Adresse, téléphone ou mot de passe incorrect.', { exact: true }).filter({ visible: true }).waitFor();
  await student.getByLabel('Mot de passe', { exact: true }).fill('Changed123!');
  await button(student, 'Se connecter').click();
  await student.getByLabel('Code de vérification à 6 chiffres', { exact: true }).fill('123456');
  await button(student, 'Vérifier').click();
  await student.getByText('Votre code personnel', { exact: true }).filter({ visible: true }).waitFor();
  await student.reload();
  await student.waitForFunction(() => globalThis.__reviewNav?.isReady());
  await student.getByText('Votre code personnel', { exact: true }).filter({ visible: true }).waitFor();
  assert.equal((await stored(student)).activeStudentId, newId);
  done('profile validation, name/age/phone, password change, old-password denial, login and reload preserve identity');
  await navigate('Sync');
  await field(student, 'Adresse du serveur du centre').fill('not-a-url');
  await button(student, 'Synchroniser maintenant').click();
  await student.getByText('Connexion impossible. Vérifiez le serveur, son adresse et le réseau.', { exact: true }).filter({ visible: true }).waitFor();
  await mobileSync();
  const remoteRegistered = await (await fetch(endpoint + '/api/demo/state')).json();
  assert.ok(remoteRegistered.students.some(s => s.id === newId));
  assert.ok(!remoteRegistered.enrollments.some(e => e.studentId === newId));
  done('sync rejects invalid server address, recovers, registers the learner without granting courses');

  const teacherContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  dashboard = await teacherContext.newPage();
  dashboard.setDefaultTimeout(20000);
  dashboard.on('pageerror', e => errors.push('dashboard: ' + e.message));
  await dashboard.addInitScript(({ state, endpoint }) => {
    if (!localStorage.getItem('ostadiplus.demo.v3')) localStorage.setItem('ostadiplus.demo.v3', JSON.stringify(state));
    localStorage.setItem('ostadiplus.demo.endpoint', endpoint);
  }, { state: initial, endpoint });
  await teacherSync('pull');
  const invitedProfile = remoteRegistered.students.find(s => s.id === newId);
  await dashboard.goto(dashboardBase + '/#/students');
  assert.equal(await dashboard.locator('tbody').getByText(invitedProfile.fullName, { exact: true }).count(), 0);
  await dashboard.goto(dashboardBase + '/#/reception');
  await field(dashboard, 'رمز الطالب').fill(newStudent.studentCode);
  await button(dashboard, 'بحث').click();
  await dashboard.route('**/api/demo/connections/invite', route => route.abort());
  await button(dashboard, 'ربط بالمركز').click();
  await dashboard.getByRole('alert').filter({ hasText: 'تعذّر إرسال الدعوة' }).waitFor();
  await dashboard.unroute('**/api/demo/connections/invite');
  await button(dashboard, 'ربط بالمركز').click();
  await dashboard.getByText('تم إرسال الطلب؛ تبقى موافقة التلميذ مطلوبة في التطبيق.', { exact: true }).waitFor();
  assert.equal(await button(dashboard, 'تخصيص الاشتراك').count(), 0);
  await navigate('Tabs', { screen: 'Home' });
  await student.getByRole('button', { name: /^Notifications/ }).click();
  const accept = button(student, 'Accepter l’invitation');
  await accept.waitFor();
  // A failed answer must keep the invitation pending and offer a real retry.
  await student.route('**/api/demo/connections/respond', route => route.abort());
  await accept.click();
  await student.getByText('Réponse non envoyée. Vérifiez la connexion et réessayez.', { exact: true }).waitFor();
  assert.ok(!(await (await fetch(endpoint + '/api/demo/state')).json()).memberships.some(m => m.studentId === newId && m.status === 'active'));
  await student.unroute('**/api/demo/connections/respond');
  await accept.click();
  await student.getByText('Invitation acceptée', { exact: true }).waitFor();
  await dashboard.getByText(invitedProfile.phone, { exact: true }).first().waitFor();
  await dashboard.goto(dashboardBase + '/#/students');
  await dashboard.locator('tbody').getByText(invitedProfile.fullName, { exact: true }).waitFor();
  const acceptedRemote = await (await fetch(endpoint + '/api/demo/state')).json();
  assert.ok(acceptedRemote.memberships.some(m => m.studentId === newId && m.status === 'active'));
  assert.ok(!acceptedRemote.enrollments.some(e => e.studentId === newId));
  await button(student, 'Fermer').click();
  await student.getByText(/Votre compte est lié à/).filter({ visible: true }).waitFor();
  await shot(student, 'centre-connected');
  done('centre invitation → waiting-screen notifications → failed response and retry → acceptance → automatic dashboard profile, without course access');
  await dashboard.goto(dashboardBase + '/#/courses');
  await button(dashboard, 'إنشاء دورة').click();
  await dashboard.getByPlaceholder('عنوان واضح للتلاميذ').fill('دورة التحقق الشامل');
  await button(dashboard, 'إنشاء الدورة').click();
  await dashboard.getByRole('heading', { name: 'دورة التحقق الشامل', exact: true }).waitFor();
  const course = (await teacherState(dashboard)).courses.find(c => c.title === 'دورة التحقق الشامل');
  await button(dashboard, 'إضافة فصل').click();
  await dashboard.getByRole('dialog').getByLabel('عنوان الفصل', { exact: true }).fill('فصل التحقق');
  await button(dashboard, 'حفظ الفصل').click();
  async function addLesson(kind, title) {
    await dashboard.locator('.course-outline').getByRole('button', { name: 'إضافة درس', exact: true }).click();
    if (kind) await dashboard.getByRole('dialog').getByRole('button', { name: kind }).click();
    await dashboard.getByRole('dialog').getByLabel('عنوان الدرس', { exact: true }).fill(title);
    await button(dashboard, 'متابعة إلى المحرّر').click();
    await dashboard.getByRole('heading', { name: title, exact: true }).waitFor();
  }
  await addLesson(null, 'فيديو التحقق الشامل');
  await dashboard.getByLabel('رفع فيديو', { exact: true }).setInputFiles(join(root, 'apps/teacher-dashboard/public/media/videos/limits-intro.mp4'));
  await dashboard.getByText('الملف جاهز. احفظ الدرس لتثبيت التغيير.', { exact: true }).filter({ visible: true }).waitFor();
  await dashboard.locator('.lesson-optional-details > summary').click();
  await dashboard.getByLabel('وصف الدرس', { exact: false }).fill('وصف الفيديو من الأستاذ للتحقق');
  await dashboard.getByLabel('اختيار صورة مصغّرة', { exact: true }).setInputFiles(join(root, 'apps/teacher-dashboard/public/media/posters/limits-intro.jpg'));
  await button(dashboard, 'حفظ ونشر').click();
  await addLesson('ملف PDF', 'مستند التحقق الشامل');
  await dashboard.getByLabel('رفع ملف PDF', { exact: true }).setInputFiles(join(root, 'apps/teacher-dashboard/public/media/docs/limits-sheet.pdf'));
  await dashboard.getByText('الملف جاهز. احفظ الدرس لتثبيت التغيير.', { exact: true }).filter({ visible: true }).waitFor();
  await button(dashboard, 'حفظ ونشر').click();
  const quizFixture = {
    timeLimitSec: 120,
    questions: [
      { prompt: 'Single answer check', options: [{ id: 'a', text: 'Correct single' }, { id: 'b', text: 'Wrong single' }], correctIds: ['a'] },
      { prompt: 'Multiple answer check', options: [{ id: 'a', text: 'Correct multi A' }, { id: 'b', text: 'Correct multi B' }, { id: 'c', text: 'Wrong multi' }], correctIds: ['a', 'b'] },
    ],
  };
  await addLesson('اختبار', 'اختبار التحقق الشامل');
  await dashboard.getByLabel('استيراد أسئلة JSON', { exact: true }).setInputFiles({ name: 'journey.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(quizFixture)) });
  await dashboard.waitForFunction(() => document.querySelector('#quiz-time')?.value === '120' && document.querySelector('textarea[placeholder="اكتب السؤال هنا…"]')?.value === 'Single answer check');
  await button(dashboard, 'حفظ ونشر').click();
  await addLesson('اختبار', 'اختبار التوقيت');
  await dashboard.getByLabel('استيراد أسئلة JSON', { exact: true }).setInputFiles({ name: 'timer.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...quizFixture, timeLimitSec: 2 })) });
  await dashboard.waitForFunction(() => document.querySelector('#quiz-time')?.value === '2' && document.querySelector('textarea[placeholder="اكتب السؤال هنا…"]')?.value === 'Single answer check');
  await button(dashboard, 'حفظ ونشر').click();
  await button(dashboard, 'نشر الدورة').click();
  await button(dashboard, 'تأكيد نشر الدورة').click();
  await dashboard.goto(dashboardBase + '/#/students');
  await dashboard.getByPlaceholder('بحث بالاسم أو الرمز…').fill('Test Learner Updated');
  const row = dashboard.locator('tbody tr').filter({ hasText: 'Test Learner Updated' });
  await row.getByRole('button', { name: 'إدارة الوصول', exact: true }).click();
  const grant = dashboard.getByRole('dialog');
  await grant.getByLabel('الأستاذ والمقرر').selectOption(course.id);
  await grant.getByRole('button', { name: course.semesters[0].title, exact: true }).click();
  await grant.getByLabel('آخر يوم للوصول').fill('2027-06-30');
  await grant.getByRole('button', { name: 'حفظ الاشتراك', exact: true }).click();
  await grant.getByRole('status').filter({ hasText: 'تم حفظ الاشتراك' }).waitFor();
  await shot(dashboard, 'teacher-access');
  await grant.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await teacherSync('publish');
  await mobileSync();
  await navigate('Tabs', { screen: 'Home' });
  await student.getByRole('button', { name: course.title, exact: true }).first().waitFor();
  await student.getByRole('button', { name: course.title, exact: true }).first().click();
  await student.getByText('فيديو التحقق الشامل', { exact: true }).filter({ visible: true }).first().waitFor();
  await shot(student, 'course-content-types');
  const remote = await (await fetch(endpoint + '/api/demo/state')).json();
  const currentCourse = remote.courses.find(c => c.id === course.id);
  const lessons = allLessons(currentCourse);
  const video = lessons.find(l => l.kind === 'video');
  const pdf = lessons.find(l => l.kind === 'pdf');
  const quiz = lessons.find(l => l.kind === 'quiz');
  assert.equal(pdf.pages, 5);
  assert.ok(lessons.filter(l => l.kind === 'quiz').every(l => l.published), 'both quizzes published after import finishes');
  assert.equal(video.description, 'وصف الفيديو من الأستاذ للتحقق');
  assert.ok(video.thumbnailUrl.startsWith('data:image/'));
  done('dashboard creates/uploads/publishes video, thumbnail, PDF and quiz; term subscription unlocks the same course on student UI');
  await navigate('Video', { lessonId: video.id });
  await student.waitForFunction(() => { const v = document.querySelector('video'); return v && !v.paused && v.currentTime > 0.1; });
  await student.getByTestId('video-watermark-primary').filter({ visible: true }).waitFor();
  await student.waitForTimeout(4500);
  await shot(student, 'uploaded-video-playing');
  await navigate('Qna', { courseId: course.id, lessonId: video.id });
  await field(student, 'Écrire votre question').fill('Question from real student UI');
  await button(student, 'Publier la question').click();
  await student.getByText('Question from real student UI', { exact: true }).filter({ visible: true }).waitFor();
  await mobileSync();
  await teacherSync('pull');
  await dashboard.goto(dashboardBase + '/#/questions');
  await dashboard.getByRole('button').filter({ hasText: 'Question from real student UI' }).click();
  await dashboard.getByLabel('جوابك للتلميذ', { exact: true }).fill('Teacher reply through dashboard UI');
  await button(dashboard, 'إرسال الرد').click();
  await teacherSync('publish');
  await mobileSync();
  await navigate('Qna', { courseId: course.id, lessonId: video.id });
  await student.getByText('Teacher reply through dashboard UI', { exact: true }).filter({ visible: true }).waitFor();
  await shot(student, 'question-and-teacher-reply');
  done('actual uploaded video plays with watermark; student UI question → teacher UI reply → student UI');
  await navigate('Pdf', { lessonId: pdf.id });
  const frame = student.frameLocator('iframe[title="PDF"]');
  await frame.locator('canvas').first().waitFor({ timeout: 30000 });
  await frame.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await frame.getByText('125%', { exact: true }).filter({ visible: true }).waitFor();
  await student.getByTestId('video-watermark-primary').filter({ visible: true }).waitFor();
  await shot(student, 'uploaded-pdf-zoom-watermark');
  await button(student, 'Document lu').click();
  await navigate('Quiz', { lessonId: quiz.id });
  await button(student, 'Commencer le quiz').click();
  await student.getByRole('radio', { name: 'Wrong single', exact: true }).click();
  await student.getByRole('radio', { name: 'Correct single', exact: true }).click();
  assert.equal(await student.getByRole('radio', { checked: true }).count(), 1);
  assert.equal(await student.getByRole('radio', { name: 'Correct single', checked: true }).count(), 1);
  await shot(student, 'single-answer-selected');
  await button(student, 'Continuer').click();
  await student.getByRole('checkbox', { name: 'Correct multi A', exact: true }).click();
  await student.getByRole('checkbox', { name: 'Correct multi B', exact: true }).click();
  assert.equal(await student.getByRole('checkbox', { checked: true }).count(), 2);
  await button(student, 'Terminer le quiz').click();
  await student.waitForTimeout(450);
  state = await stored(student);
  const attempt = state.quizAttempts.find(a => a.studentId === newId && a.lessonId === quiz.id);
  assert.equal(attempt.correct, 2);
  assert.equal(attempt.total, 2);
  assert.equal(state.quizAttempts.filter(a => a.studentId === newId && a.lessonId === quiz.id).length, 1);
  await shot(student, 'quiz-result');
  await navigate('Tabs', { screen: 'Home' });
  const timedQuiz = lessons.find(l => l.title === 'اختبار التوقيت');
  await navigate('Quiz', { lessonId: timedQuiz.id });
  await button(student, 'Commencer le quiz').click();
  await button(student, 'Réessayer').waitFor({ timeout: 10000 });
  await student.waitForTimeout(450);
  let attempts = (await stored(student)).quizAttempts.filter(a => a.lessonId === timedQuiz.id && a.studentId === newId);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].elapsedSec, 2);
  await button(student, 'Réessayer').click();
  await student.getByRole('radio', { name: 'Correct single', exact: true }).waitFor();
  await button(student, 'Réessayer').waitFor({ timeout: 10000 });
  await student.waitForTimeout(450);
  attempts = (await stored(student)).quizAttempts.filter(a => a.lessonId === timedQuiz.id && a.studentId === newId);
  assert.equal(attempts.length, 2);
  done('timed quiz expires automatically and records exactly one result per attempt, including retry');
  await mobileSync();
  await teacherSync('pull');
  const teacher = await teacherState(dashboard);
  assert.ok(teacher.quizAttempts.some(a => a.id === attempt.id && a.correct === 2));
  assert.ok(teacher.progress[newId].some(p => p.lessonId === pdf.id && p.completed));
  done('uploaded PDF renders, zooms and has watermark; single/multiple quiz answers score correctly and results/progress reach dashboard');
  await navigate('Tabs', { screen: 'Profile' });
  await button(student, 'Se déconnecter').click();
  await welcome();
  await student.getByRole('link', { name: 'Continuer en invité', exact: true }).click();
  assert.equal(await student.getByRole('button', { name: /^Se connecter en tant que/ }).count(), 2);
  await student.getByRole('button', { name: /^Se connecter en tant que إيمان/ }).click();
  await navigate('Tabs', { screen: 'Learning' });
  await button(student, 'Ajouter aux favoris').first().click();
  await button(student, 'Archiver le cours').first().click();
  await navigate('Tabs', { screen: 'Profile' });
  await button(student, 'Se déconnecter').click();
  await welcome();
  await student.getByRole('link', { name: 'Continuer en invité', exact: true }).click();
  await student.getByRole('button', { name: /^Se connecter en tant que ياسين/ }).click();
  await navigate('Tabs', { screen: 'Learning' });
  assert.equal(await button(student, 'Retirer des favoris').count(), 0);
  assert.equal(await student.getByRole('tab', { name: /Archivés \(0\)/ }).count(), 1);
  assert.equal(await button(student, 'Désarchiver le cours').count(), 0);
  await student.reload();
  await student.waitForFunction(() => globalThis.__reviewNav?.isReady());
  await navigate('Tabs', { screen: 'Learning' });
  assert.equal((await stored(student)).activeStudentId, 'st-yassine', 'reload immediately after switching must not restore the previous user');
  assert.equal(await button(student, 'Retirer des favoris').count(), 0);
  assert.equal(await student.getByRole('tab', { name: /Archivés \(0\)/ }).count(), 1);
  await navigate('Tabs', { screen: 'Profile' });
  await button(student, 'Se déconnecter').click();
  await welcome();
  await student.getByRole('link', { name: 'Continuer en invité', exact: true }).click();
  await student.getByRole('button', { name: /^Se connecter en tant que إيمان/ }).click();
  await navigate('Tabs', { screen: 'Learning' });
  await student.getByRole('tab', { name: /Archivés/ }).click();
  assert.equal(await button(student, 'Retirer des favoris').count(), 1);
  done('two populated guest accounts remain available; favorites/archive are isolated across accounts and reloads');
  await navigate('Tabs', { screen: 'Search' });
  await field(student, 'Rechercher dans les cours').fill('no-such-course-abcdef');
  await shot(student, 'search-no-results');
  await button(student, 'Effacer la recherche').first().click();
  await field(student, 'Rechercher dans les cours').fill('الرياضيات');
  await student.getByRole('button', { name: /الرياضيات · 2ème Bac/ }).first().waitFor();
  done('search clears empty results and finds the enrolled mathematics course');
  const math = initial.courses.find(c => c.id === 'crs-math-2bac');
  const mathLessons = allLessons(math);
  const bundledPdf = mathLessons.find(l => l.kind === 'pdf' && l.published);
  await navigate('Pdf', { lessonId: bundledPdf.id });
  await button(student, 'Agrandir le PDF').click();
  await student.getByText('125%', { exact: true }).filter({ visible: true }).waitFor();
  await button(student, 'Rétablir le zoom à 100%').click();
  await student.getByText('100%', { exact: true }).filter({ visible: true }).waitFor();
  done('bundled PDF zoom and reset work independently of uploaded PDF viewer');
  const reader = mathLessons.find(l => l.kind === 'text' && l.published);
  const routes = [['Tabs', { screen: 'Home' }, 'home'], ['Tabs', { screen: 'Search' }, 'search'], ['Tabs', { screen: 'Learning' }, 'learning'], ['Tabs', { screen: 'Profile' }, 'profile'], ['CourseDetail', { courseId: math.id }, 'course'], ['Qna', { courseId: math.id }, 'qna'], ['Pdf', { lessonId: bundledPdf.id }, 'pdf'], ['Quiz', { lessonId: mathLessons.find(l => l.kind === 'quiz' && l.published).id }, 'quiz'], ['StudentCard', undefined, 'card'], ['Sync', undefined, 'sync'], ['EditProfile', undefined, 'edit-profile'], ['Library', undefined, 'library']];
  if (reader) routes.push(['Reader', { lessonId: reader.id }, 'reader']);
  for (const lang of ['fr', 'ar']) {
    if (lang === 'ar') {
      await navigate('Tabs', { screen: 'Profile' });
      await student.getByRole('button', { name: /^Langue/ }).click();
    }
    for (const width of [320, 390, 768]) {
      await student.setViewportSize({ width, height: 844 });
      for (const [route, params, slug] of routes) {
        await navigate(route, params);
        await noOverflow(student, `${slug}/${lang}/${width}`);
        assert.ok((await student.locator('body').innerText()).trim().length > 10, `${slug}: blank screen`);
        await shot(student, `${slug}-${lang}-${width}`);
      }
    }
  }
  done(`${routes.length} student screens in Arabic/French at 320/390/768 px: render and no page overflow`);
  for (const width of [320, 390, 1440]) {
    await dashboard.setViewportSize({ width, height: 1050 });
    for (const route of ['', 'courses', 'students', 'reception', 'questions', 'library', 'quizzes', 'analytics', 'settings', 'sync']) {
      await dashboard.goto(dashboardBase + '/#/' + route);
      await dashboard.waitForTimeout(100);
      await noOverflow(dashboard, `dashboard/${route}/${width}`);
      await shot(dashboard, `dashboard-${route || 'overview'}-${width}`);
    }
  }
  done('all 10 dashboard pages render at 320/390/1440 px without page overflow');
  const protectedLessons = ['video', 'pdf', 'text', 'quiz'].map(kind => ({ kind, lesson: math.semesters[0].chapters.flatMap(c => c.lessons).find(l => l.kind === kind && l.published) }));
  const screenOf = { video: 'Video', pdf: 'Pdf', text: 'Reader', quiz: 'Quiz' };
  for (const scenario of ['expired', 'no-enrollment', 'other-term', 'draft-course', 'draft-lessons']) {
    const fixture = structuredClone(initial);
    fixture.activeStudentId = 'st-iman'; fixture.lang = 'fr';
    const fixtureCourse = fixture.courses.find(c => c.id === math.id);
    const enrollment = fixture.enrollments.find(e => e.studentId === 'st-iman' && e.courseId === math.id);
    if (scenario === 'expired') { delete enrollment.accessPeriods; enrollment.expiresAt = '2020-01-01T00:00:00Z'; }
    if (scenario === 'no-enrollment') fixture.enrollments = fixture.enrollments.filter(e => e.studentId !== 'st-iman');
    if (scenario === 'other-term') enrollment.accessPeriods = [createAccessPeriod({ kind: 'semester', semesterId: math.semesters[1].id, startsOn: '2026-01-01', endsOn: '2027-06-30' }, math, 'other-term')];
    if (scenario === 'draft-course') fixtureCourse.status = 'draft';
    if (scenario === 'draft-lessons') for (const l of allLessons(fixtureCourse)) l.published = false;
    const deniedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await deniedContext.newPage();
    page.on('pageerror', e => errors.push(scenario + ': ' + e.message));
    await page.addInitScript(({ fixture, endpoint }) => {
      if (!localStorage.getItem('ostadiplus.student.v3')) localStorage.setItem('ostadiplus.student.v3', JSON.stringify({ data: fixture }));
      localStorage.setItem('ostadiplus.demo.endpoint', endpoint);
    }, { fixture, endpoint });
    await page.goto(preview.url);
    await page.waitForFunction(() => globalThis.__reviewNav?.isReady(), null, { timeout: 30000 });
    for (const { kind, lesson } of protectedLessons) {
      assert.ok(lesson, kind + ' fixture exists');
      await page.evaluate(({ name, id }) => globalThis.__reviewNav.navigate(name, { lessonId: id }), { name: screenOf[kind], id: lesson.id });
      if (kind === 'video') {
        await button(page, 'Retour').waitFor();
        assert.equal(await page.locator('video').count(), 0);
      } else await page.getByTestId('lesson-unavailable').filter({ visible: true }).waitFor();
      assert.equal(await page.getByTestId('video-watermark-primary').filter({ visible: true }).count(), 0);
    }
    await shot(page, 'denied-' + scenario);
    await deniedContext.close();
  }
  done('direct lesson routes deny expired/missing subscription, unpurchased term and draft course/lessons for all four content types');
  assert.deepEqual(errors, []);
  done('no uncaught browser runtime errors in either app');
  console.log(`PASS ${checks.length} cross-app acceptance journeys`);
} catch (error) {
  failure = String(error);
  if (student) await shot(student, 'FAIL-student').catch(() => {});
  if (dashboard) await shot(dashboard, 'FAIL-dashboard').catch(() => {});
  throw error;
} finally {
  await writeFile(join(artifacts, 'app-journeys-report.json'), JSON.stringify({ passed: !failure, failure, checks, errors, nativeDeviceCoverage: false }, null, 2));
  await browser?.close();
  await preview?.close();
  await vite?.close();
  if (api) await api.close();
  await rm(directory, { recursive: true, force: true });
}
