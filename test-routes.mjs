import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
// HashRouter: real URLs live under the #. Each route: unique body text that
// only appears once that page (not the sidebar) has rendered.
const routes = [
  { path: '#/', name: 'overview', expect: ['آخر النشاط'] },
  { path: '#/courses', name: 'courses', expect: ['إنشاء دورة', 'مسودة', 'منشورة'] },
  { path: '#/students', name: 'students', expect: ['تفعيل', 'تلميذ'] },
  { path: '#/settings', name: 'settings', expect: ['الملف', 'المركز'] },
];

const consoleErrors = [];
const pageErrors = [];
const results = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();

page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));

for (const r of routes) {
  // First entry is a real document load (has a response); later hash-only
  // navigations are same-document fragment changes (response === null), which
  // is expected under HashRouter.
  const resp = await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const status = r.path === '#/' ? (resp ? resp.status() : 'no-response') : 'client-nav';
  // Wait for the first expected marker to be present in the DOM.
  let found = false;
  for (const marker of r.expect) {
    try {
      await page.getByText(marker, { exact: false }).first().waitFor({ state: 'visible', timeout: 8000 });
      found = true;
      break;
    } catch { /* try next marker */ }
  }
  const h1 = await page.evaluate(() => {
    const el = document.querySelector('main h1, main h2, h1, h2');
    return el ? el.innerText.trim() : null;
  });
  await page.screenshot({ path: `C:/Users/acer/AppData/Local/Temp/opencode/dash2-${r.name}.png`, fullPage: true });
  results.push({ route: r.path, status, markerFound: found, heading: h1 });
}

// The announcements feature must be fully removed from the sidebar nav.
const navAnnouncementLinks = await page.evaluate(() =>
  Array.from(document.querySelectorAll('a')).filter((a) =>
    (a.getAttribute('href') || '').includes('announcement'),
  ).length,
);

await browser.close();

console.log('=== ROUTE RENDER CHECK ===');
for (const r of results) {
  console.log(`${r.status}  ${r.route.padEnd(16)} marker=${r.markerFound ? 'OK' : 'MISSING'}  heading="${r.heading}"`);
}
console.log('\nANNOUNCEMENT NAV LINKS (must be 0): ' + navAnnouncementLinks);
console.log('CONSOLE ERRORS: ' + consoleErrors.length);
consoleErrors.forEach((e) => console.log('  ' + e));
console.log('PAGE ERRORS: ' + pageErrors.length);
pageErrors.forEach((e) => console.log('  ' + e));

const ok =
  results.every((r) => (r.route === '#/' ? String(r.status) === '200' : r.status === 'client-nav') && r.markerFound) &&
  navAnnouncementLinks === 0 &&
  pageErrors.length === 0 &&
  consoleErrors.length === 0;
console.log('\nRESULT: ' + (ok ? 'PASS' : 'FAIL'));
