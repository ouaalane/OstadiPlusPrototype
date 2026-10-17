import { chromium } from 'playwright';

const base = 'http://localhost:5173';
const routes = ['#/courses', '#/overview'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failed = [];
const covers = [];
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('response', (r) => {
  if (r.url().includes('/media/covers/')) covers.push(`${r.status()} ${r.url().split('/').pop()}`);
});

for (const route of routes) {
  await page.goto(base + '/' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

// Screenshot the courses page (cover-heavy).
await page.goto(base + '/#/courses', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'check-covers.png', fullPage: false });

const coverImgs = await page.$$eval('img[src*="/media/covers/"]', (els) =>
  els.map((e) => ({ src: e.getAttribute('src'), w: e.naturalWidth, h: e.naturalHeight })),
);

console.log('COVER RESPONSES:', covers.length ? covers.join(' | ') : 'NONE');
console.log('COVER <img> COUNT:', coverImgs.length);
console.log(
  'COVER <img> SIZES:',
  coverImgs.map((c) => `${c.src.split('/').pop()}=${c.w}x${c.h}`).join(', ') || 'none',
);
console.log('FAILED REQUESTS:', failed.length ? failed.join(' | ') : 'none');

await browser.close();
