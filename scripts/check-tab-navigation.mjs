/** Actual tab button presses against the Expo web app. Verifies navigation,
 * interruption, reduced motion and remembered scroll; not native frame rate. */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStudentPreview } from './lib/student-preview.mjs';
register('../apps/api/src/resolve.mjs', import.meta.url);
const { createDemoState } = await import('@ostadiplus/shared');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'oustadi-tabs-'));
const artifacts = process.env.OUSTADI_SCREENSHOT_DIR;
let browser, preview;
const errors = [], checks = [], latencies = [];
const done = name => { checks.push(name); console.log('ok - ' + name); };
try {
  preview = await startStudentPreview({ root, directory });
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  for (const lang of ['fr', 'ar']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const state = createDemoState(); state.activeStudentId = 'st-iman'; state.lang = lang;
    await page.addInitScript(state => {
      if (!localStorage.getItem('ostadiplus.student.v3')) localStorage.setItem('ostadiplus.student.v3', JSON.stringify({ data: state }));
    }, state);
    await page.goto(preview.url);
    await page.waitForFunction(() => globalThis.__reviewNav?.isReady(), null, { timeout: 60000 });
    const tab = name => page.getByTestId('bottom-tab-' + name);
    const focused = name => page.waitForFunction(name => globalThis.__reviewNav.getCurrentRoute()?.name === name, name);
    const scale = name => tab(name).evaluate(el => {
      const transform = getComputedStyle(el).transform;
      return transform === 'none' ? 1 : Number(transform.match(/matrix\(([^,]+)/)?.[1]);
    });
    assert.equal(await page.locator('[data-testid^="bottom-tab-"]').count(), 4);
    assert.equal(await tab('Home').getAttribute('aria-selected'), 'true');
    const box = await tab('Profile').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(110);
    assert.ok(await scale('Profile') < 0.99, 'press feedback starts before release/navigation');
    if (artifacts) { await mkdir(artifacts, { recursive: true }); await page.screenshot({ path: join(artifacts, `tab-press-${lang}.png`) }); }
    await page.mouse.up();
    await focused('Profile');
    await page.waitForTimeout(220);
    assert.ok(Math.abs(await scale('Profile') - 1) < 0.002);
    done(`${lang}: immediate press feedback, navigation on release and scale recovers`);
    await tab('Home').click(); await focused('Home'); await page.waitForTimeout(220);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find(el => el.clientHeight > 150 && el.scrollHeight > el.clientHeight + 300 && /auto|scroll/.test(getComputedStyle(el).overflowY) && !el.closest('[aria-hidden="true"]'));
      if (!el) throw new Error('home scroller missing');
      el.dataset.tabReviewScroll = 'home'; el.scrollTop = 300;
    });
    await tab('Search').click(); await focused('Search'); await page.waitForTimeout(220);
    await page.getByRole('textbox', { name: lang === 'fr' ? 'Rechercher dans les cours' : 'البحث في الدورات', exact: true }).fill('الرياضيات');
    await tab('Home').click(); await focused('Home'); await page.waitForTimeout(220);
    assert.ok(await page.locator('[data-tab-review-scroll="home"]').evaluate(el => el.scrollTop) >= 290, 'switching preserves scroll');
    await tab('Home').click();
    await page.waitForFunction(() => document.querySelector('[data-tab-review-scroll="home"]').scrollTop < 1);
    await tab('Search').click(); await focused('Search'); await page.waitForTimeout(220);
    assert.equal(await page.getByRole('textbox', { name: lang === 'fr' ? 'Rechercher dans les cours' : 'البحث في الدورات', exact: true }).inputValue(), 'الرياضيات');
    done(`${lang}: scroll and search survive switching; re-tapping Home still scrolls to top`);
    for (const name of ['Learning', 'Profile', 'Search', 'Home', 'Profile', 'Learning', 'Home', 'Search']) {
      const start = performance.now(); await tab(name).click(); await focused(name); latencies.push(performance.now() - start);
    }
    await page.waitForTimeout(250);
    for (const name of ['Home', 'Search', 'Learning', 'Profile']) assert.ok(Math.abs(await scale(name) - 1) < 0.002);
    assert.equal(await page.getByTestId('bottom-tab-Search').getAttribute('aria-selected'), 'true');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    done(`${lang}: rapid interrupted transitions reach final tab without stuck button or page overflow`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
    const reducedBox = await tab('Home').boundingBox();
    await page.mouse.move(reducedBox.x + reducedBox.width / 2, reducedBox.y + reducedBox.height / 2); await page.mouse.down(); await page.waitForTimeout(100);
    assert.equal(await scale('Home'), 1);
    await page.mouse.up(); await focused('Home');
    done(`${lang}: live reduced-motion preference suppresses press motion and keeps navigation working`);
    if (artifacts) await page.screenshot({ path: join(artifacts, `tabs-final-${lang}.png`) });
    await context.close();
  }
  assert.deepEqual(errors, []);
  done('no browser runtime errors');
  console.log(`PASS ${checks.length} tab checks; browser click-to-selected median ${Math.round([...latencies].sort((a,b)=>a-b)[Math.floor(latencies.length/2)])} ms`);
  if (artifacts) await writeFile(join(artifacts, 'tab-navigation-report.json'), JSON.stringify({ checks, errors, browserClickToSelectedMs: latencies, nativeFrameRateTested: false }, null, 2));
} finally { await browser?.close(); await preview?.close(); await rm(directory, { recursive: true, force: true }); }
