/** Real app + real videos + local API/SQLite. Browser-only adapters stub
 * screen-capture and native files; this does not certify Android SurfaceView. */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
register('../apps/api/src/resolve.mjs', import.meta.url);
const { createDemoState, allLessons } = await import('@ostadiplus/shared');
const { createWatermarkApi } = await import('../apps/api/src/server.mjs');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'apps/student-app');
const directory = await mkdtemp(join(tmpdir(), 'oustadi-video-watermarks-'));
const artifacts = process.env.OUSTADI_SCREENSHOT_DIR;
let api, browser, metro;
let metroLog = '';
const errors = [];
const report = [];
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function startPreview() {
  if (process.env.MOBILE_PREVIEW_URL) return process.env.MOBILE_PREVIEW_URL;
  const entry = join(directory, 'entry.ts');
  const capture = join(directory, 'capture.ts');
  const files = join(directory, 'files.ts');
  await writeFile(
    entry,
    `import { registerRootComponent } from ${JSON.stringify(join(app, 'node_modules/expo'))};
import App from ${JSON.stringify(join(app, 'App'))};
import { navigationRef } from ${JSON.stringify(join(app, 'src/navigation/ref'))};
(globalThis as any).__reviewNav = navigationRef;
registerRootComponent(App);`,
  );
  await writeFile(
    capture,
    'export function addScreenshotListener() { return { remove() {} }; }\nexport function usePreventScreenCapture() {}',
  );
  await writeFile(
    files,
    `export class Directory { uri: string; constructor(...parts: any[]) { this.uri = parts.map(p => p?.uri ?? p).join('/'); } async create() {} }
export class File { uri: string; constructor(...parts: any[]) { this.uri = parts.map(p => p?.uri ?? p).join('/'); } async copy() { throw new Error('Native downloads not tested'); } async delete() { throw new Error('Native files not tested'); } async info() { return { exists: false }; } }
export const Paths = { cache: { uri: 'review://cache' }, info: () => ({ exists: true }) };`,
  );
  const preload = join(directory, 'register.cjs');
  await writeFile(
    preload,
    `const Module = require('node:module'); const load = Module._load;
Module._load = function(request) {
 const result = load.apply(this, arguments);
 if (request.endsWith('/apps/student-app/metro.config.js')) {
  result.watchFolders = [...result.watchFolders, ${JSON.stringify(directory)}];
  const old = result.resolver.resolveRequest;
  result.resolver.resolveRequest = (context, name, platform) => {
   if (platform === 'web' && name === 'expo-screen-capture') return { type: 'sourceFile', filePath: ${JSON.stringify(capture)} };
   if (platform === 'web' && name === 'expo-file-system') return { type: 'sourceFile', filePath: ${JSON.stringify(files)} };
   if (platform === 'web' && (name === './index' || name === './index.ts') && context.originModulePath.includes('student-app')) return { type: 'sourceFile', filePath: ${JSON.stringify(entry)} };
   return old ? old(context, name, platform) : context.resolveRequest(context, name, platform);
  };
 }
 return result;
};`,
  );
  const port = await freePort();
  metro = spawn(
    process.execPath,
    [
      '--require',
      preload,
      join(app, 'node_modules/expo/bin/cli'),
      'start',
      '--offline',
      '--web',
      '--port',
      String(port),
      '--max-workers',
      '2',
    ],
    {
      cwd: app,
      env: {
        ...process.env,
        CI: '1',
        EXPO_NO_TELEMETRY: '1',
        __UNSAFE_EXPO_HOME_DIRECTORY: join(directory, 'expo'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  metro.stdout.on('data', (chunk) => (metroLog += chunk));
  metro.stderr.on('data', (chunk) => (metroLog += chunk));
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (metro.exitCode !== null) throw new Error(metroLog);
    try {
      if ((await fetch(url)).ok) return url;
    } catch {
      /* booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Metro startup timeout: ' + metroLog);
}
try {
  api = createWatermarkApi({
    demoDirectory: join(directory, 'demo'),
    dbPath: join(directory, 'ledger.db'),
    logger: { log() {}, error() {} },
  });
  await new Promise((resolve) => api.server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${api.server.address().port}`;
  const preflight = await fetch(endpoint + '/api/playback/start', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:8081',
      'Access-Control-Request-Method': 'POST',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  const state = createDemoState();
  state.activeStudentId = 'st-iman';
  state.lang = 'fr';
  state.progress['st-iman'] = [];
  const videos = [];
  // Publish the test fixture's drafts too, so every bundled video file is exercised.
  for (const course of state.courses) {
    course.status = 'published';
    state.enrollments = state.enrollments.filter(
      (e) => !(e.studentId === 'st-iman' && e.courseId === course.id),
    );
    state.enrollments.push({
      id: 'review-' + course.id,
      studentId: 'st-iman',
      courseId: course.id,
      status: 'active',
      authorizedAt: '2020-01-01T00:00:00Z',
      authorizedBy: 'review',
      expiresAt: '2099-01-01T00:00:00Z',
    });
    for (const lesson of allLessons(course).filter((l) => l.kind === 'video')) {
      lesson.published = true;
      videos.push({
        courseId: course.id,
        lessonId: lesson.id,
        file: lesson.file,
      });
    }
  }
  const bytes = await readFile(join(app, 'src/assets/videos', videos[0].file));
  const upload = await fetch(endpoint + '/api/demo/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'video/mp4',
      'X-File-Name': 'watermark-review.mp4',
    },
    body: bytes,
  });
  assert.equal(upload.status, 201);
  const { file } = await upload.json();
  const uploaded = {
    ...allLessons(state.courses[0]).find((l) => l.kind === 'video'),
    id: 'watermark-upload-review',
    file,
    published: true,
  };
  state.courses[0].semesters[0].chapters[0].lessons.push(uploaded);
  videos.push({ courseId: state.courses[0].id, lessonId: uploaded.id, file });
  assert.equal(
    (
      await fetch(endpoint + '/api/demo/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
    ).status,
    200,
  );
  const base = await startPreview();
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_PATH ||
      (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  page.on('pageerror', (error) => errors.push(error.message));
  if (process.env.DEBUG_WATERMARK) {
    page.on('console', (msg) => {
      if (msg.text().includes('[watermark]')) console.log(msg.text());
    });
    page.on('response', async (res) => {
      if (res.url().endsWith('/api/playback/start'))
        console.log(
          'grant response',
          res.status(),
          res.url(),
          await res.text(),
        );
    });
  }
  const requests = [];
  page.on('request', (request) => {
    if (
      request.url().endsWith('/api/playback/start') &&
      request.method() === 'POST'
    )
      requests.push(request.postDataJSON());
  });
  await page.addInitScript(
    ({ state, endpoint }) => {
      localStorage.setItem(
        'ostadiplus.student.v3',
        JSON.stringify({ data: state }),
      );
      localStorage.setItem('ostadiplus.demo.endpoint', endpoint);
    },
    { state, endpoint },
  );
  await page.goto(base);
  await page.waitForFunction(() => globalThis.__reviewNav?.isReady(), null, {
    timeout: 60000,
  });
  await page.waitForTimeout(300);
  const navigate = async (lessonId) =>
    page.evaluate(
      (lessonId) => globalThis.__reviewNav.navigate('Video', { lessonId }),
      lessonId,
    );
  const codeOf = async () =>
    (await page.getByTestId('video-watermark-primary').innerText()).trim();
  const visibility = async () =>
    page.evaluate(() => {
      const outer = document.querySelector('[data-testid="video-watermark"]');
      if (!outer) return false;
      const box = outer.getBoundingClientRect();
      return ['primary', 'secondary'].some((name) => {
        const node = document.querySelector(
          `[data-testid="video-watermark-${name}"]`,
        );
        if (!node) return false;
        const bounds = node.getBoundingClientRect();
        return (
          Number(getComputedStyle(node).opacity) >= 0.1 &&
          bounds.width > 0 &&
          bounds.left >= box.left - 1 &&
          bounds.right <= box.right + 1 &&
          bounds.top >= box.top - 1 &&
          bounds.bottom <= box.bottom + 1
        );
      });
    });
  const waitVisible = async () => {
    await page.getByTestId('video-watermark-primary').waitFor();
    for (let i = 0; i < 30; i++) {
      if (await visibility()) return;
      await page.waitForTimeout(50);
    }
    assert.fail('neither watermark copy is visible and inside the player');
  };
  for (const video of videos) {
    await page.setViewportSize({ width: 390, height: 844 });
    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/playback/start') &&
        r.request().postDataJSON()?.videoId === video.lessonId &&
        r.status() === 201,
    );
    await navigate(video.lessonId);
    const grant = await (await responsePromise).json();
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return v && !v.paused && v.currentTime > 0.2;
    });
    await waitVisible();
    await page.waitForFunction(
      (code) =>
        document
          .querySelector('[data-testid="video-watermark-primary"]')
          ?.textContent?.trim() === code,
      grant.code,
    );
    assert.equal(await codeOf(), grant.code);
    const trace = await (
      await fetch(endpoint + '/api/admin/watermarks/' + grant.code, {
        headers: { 'X-Admin-Token': 'dev-admin-token' },
      })
    ).json();
    assert.equal(trace.student.id, 'st-iman');
    assert.equal(trace.course.id, video.courseId);
    assert.equal(trace.lesson.id, video.lessonId);
    await page
      .locator('video')
      .evaluate((v) => (v.dataset.reviewIdentity = 'stable'));
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(150);
    await waitVisible();
    assert.equal(
      await page.locator('video').evaluate((v) => v.dataset.reviewIdentity),
      'stable',
    );
    assert.equal(await codeOf(), grant.code);
    report.push({
      ...video,
      code: grant.code,
      portrait: true,
      landscape: true,
      trace: true,
    });
    console.log(
      `ok - ${video.lessonId}: playing + watermark in portrait/landscape + correct registry trace`,
    );
  }
  // Continuous sampling spans random moves, progress saves and the 30 s access clock.
  const first = videos[0];
  const freshGrantPromise = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/playback/start') &&
      r.request().postDataJSON()?.videoId === first.lessonId &&
      r.status() === 201,
  );
  await navigate(first.lessonId);
  const freshGrant = await (await freshGrantPromise).json();
  await page.waitForFunction(
    (code) =>
      document
        .querySelector('[data-testid="video-watermark-primary"]')
        ?.textContent?.trim() === code,
    freshGrant.code,
  );
  await waitVisible();
  await page.locator('video').evaluate((v) => {
    v.currentTime = 0;
    v.loop = true;
  });
  const stableCode = await codeOf();
  const baseline = requests.filter((r) => r.videoId === first.lessonId).length;
  for (let i = 0; i < 330; i++) {
    await page.waitForTimeout(100);
    assert.equal(await visibility(), true, `watermark gap at sample ${i}`);
    assert.equal(
      await codeOf(),
      stableCode,
      'progress saves must not replace the code',
    );
  }
  assert.equal(
    requests.filter((r) => r.videoId === first.lessonId).length,
    baseline,
    'progress/access clock must not reissue the grant',
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Afficher les commandes', exact: true })
      .count(),
    1,
  );
  if (artifacts) {
    await mkdir(artifacts, { recursive: true });
    await page.screenshot({
      path: join(artifacts, 'watermark-fullscreen-controls-hidden.png'),
    });
  }
  console.log(
    'ok - 33 seconds without a watermark gap, code reset or duplicate grant while controls hide and positions move',
  );
  // Rapid pause/resume interrupts fades; resuming must recover immediately.
  for (let i = 0; i < 3; i++) {
    await page.locator('video').evaluate((v) => v.pause());
    await page.waitForTimeout(i ? 350 : 80);
    await page.locator('video').evaluate((v) => v.play());
    await waitVisible();
  }
  console.log(
    'ok - rapid pause/resume and completed pause fade recover the overlay',
  );
  // First request times out; retry completes after a progress save. Old object
  // dependencies repeatedly cancelled this session before its response arrived.
  let attempts = 0;
  await page.route('**/api/playback/start', async (route) => {
    const attempt = ++attempts;
    const response = await route.fetch();
    await new Promise((resolve) =>
      setTimeout(resolve, attempt === 1 ? 6000 : 1200),
    );
    try {
      await route.fulfill({ response });
    } catch {
      /* first request aborted by timeout */
    }
  });
  const second = videos[1];
  await navigate(second.lessonId);
  await waitVisible();
  const provisional = await codeOf();
  await page.waitForTimeout(300);
  assert.equal(await codeOf(), provisional);
  const deadline = Date.now() + 13000;
  let registered = false;
  while (Date.now() < deadline) {
    assert.equal(await visibility(), true);
    if ((await codeOf()) !== provisional) {
      registered = true;
      break;
    }
    await page.waitForTimeout(100);
  }
  assert.ok(
    registered,
    'slow API grant should replace provisional watermark after progress saves',
  );
  assert.equal(attempts, 2);
  console.log(
    'ok - slow API + timeout/retry never blanks the overlay and does not restart on progress',
  );
  await page.unroute('**/api/playback/start');
  await page.route('**/api/playback/start', (route) => route.abort());
  await navigate(videos[2].lessonId);
  await waitVisible();
  const offlineCode = await codeOf();
  await page.waitForTimeout(1400);
  assert.equal(await codeOf(), offlineCode);
  assert.match(offlineCode, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$/);
  console.log(
    'ok - offline demo keeps its immediate unregistered watermark through retries',
  );
  assert.deepEqual(errors, []);
  if (artifacts)
    await writeFile(
      join(artifacts, 'video-watermark-report.json'),
      JSON.stringify({ videos: report, browserRuntimeErrors: errors }, null, 2),
    );
  console.log(
    `PASS ${videos.length} videos (every bundled lesson + one actual upload), tracing, rotation, continuous visibility, pause/resume, slow API and offline demo`,
  );
} catch (error) {
  if (metroLog) console.error(metroLog.slice(-3000));
  throw error;
} finally {
  if (browser) await browser.close();
  if (metro) {
    metro.kill('SIGTERM');
    await new Promise((resolve) => {
      if (metro.exitCode !== null) resolve();
      else metro.once('exit', resolve);
    });
  }
  if (api) await api.close();
  await rm(directory, { recursive: true, force: true });
}
