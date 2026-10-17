import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const routes = [
  { path: '/', name: 'overview' },
  { path: '/courses', name: 'courses' },
  { path: '/students', name: 'students' },
  { path: '/settings', name: 'settings' },
];

const consoleErrors = [];
const pageErrors = [];
const results = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`[${BASE}] ${msg.text()}`);
});
page.on('pageerror', (err) => pageErrors.push(`[pageerror] ${err.message}`));

for (const r of routes) {
  const resp = await page.goto(BASE + r.path, { waitUntil: 'networkidle', timeout: 30000 });
  const status = resp ? resp.status() : 'no-response';
  await page.waitForTimeout(400);
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  await page.screenshot({ path: `C:/Users/acer/AppData/Local/Temp/opencode/dash-${r.name}.png`, fullPage: true });
  results.push({ route: r.path, status, textLen: bodyText.length });
}

// Deep check on Overview: is the gradient hero present & populated?
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const heroCheck = await page.evaluate(() => {
  const hero = document.querySelector('.hero-gradient');
  const h1 = hero ? hero.querySelector('h1') : null;
  const bg = hero ? getComputedStyle(hero).backgroundImage : '';
  return {
    heroPresent: !!hero,
    heroHeading: h1 ? h1.innerText.trim() : null,
    gradientHasStops: bg.includes('linear-gradient'),
    statCards: document.querySelectorAll('.card').length,
  };
});

await browser.close();

console.log('=== ROUTES ===');
for (const r of results) console.log(`${r.status}  ${r.route}  (text ${r.textLen} chars)`);
console.log('\n=== OVERVIEW HERO ===');
console.log(JSON.stringify(heroCheck, null, 2));
console.log('\n=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
consoleErrors.forEach((e) => console.log(e));
console.log('\n=== PAGE ERRORS (' + pageErrors.length + ') ===');
pageErrors.forEach((e) => console.log(e));

const ok = results.every((r) => String(r.status) === '200') && heroCheck.heroPresent && pageErrors.length === 0 && consoleErrors.length === 0;
console.log('\nRESULT: ' + (ok ? 'PASS' : 'FAIL'));
