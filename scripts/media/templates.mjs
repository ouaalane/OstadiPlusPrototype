/**
 * HTML templates used by `npm run media`.
 *
 * Slide → PNG (1280×720) → MP4, and page → A4 PDF.
 * All copy comes from `./content.mjs`; this file only styles it.
 */

const FONTS = [
  ['IBMPlexSansArabic', 400, 'ibm-plex-sans-arabic-arabic-400-normal.woff2', 'ibm-plex-sans-arabic-latin-400-normal.woff2'],
  ['IBMPlexSansArabic', 500, 'ibm-plex-sans-arabic-arabic-500-normal.woff2', 'ibm-plex-sans-arabic-latin-500-normal.woff2'],
  ['IBMPlexSansArabic', 600, 'ibm-plex-sans-arabic-arabic-600-normal.woff2', 'ibm-plex-sans-arabic-latin-600-normal.woff2'],
  ['IBMPlexSansArabic', 700, 'ibm-plex-sans-arabic-arabic-700-normal.woff2', 'ibm-plex-sans-arabic-latin-700-normal.woff2'],
];

function fontFaces() {
  return FONTS.map(
    ([family, weight, arabic, latin]) => `
@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url('../fonts/${arabic}') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC;}
@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url('../fonts/${latin}') format('woff2');}`,
  ).join('\n');
}

const BASE_CSS = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --brand:#2F5BFF;--brand-dark:#1E3FCC;--brand-from:#2E7BFF;--brand-to:#4B2FE0;
  --ink:#0F1B33;--body:#33415C;--muted:#5B6882;--line:#E3E8F2;--canvas:#F5F7FC;
}
html,body{background:#fff}
body{font-family:'IBMPlexSansArabic','Segoe UI',sans-serif;color:var(--body);-webkit-font-smoothing:antialiased}
.brandmark{display:flex;align-items:center;gap:10px}
.brandmark img{width:34px;height:34px;object-fit:contain}
.brandmark span{font-weight:700;letter-spacing:-.01em;color:var(--ink);font-size:19px;direction:ltr}
`;

const logoFile = '../logo.png';

/* ------------------------------------------------------------------ */
/* Video slides                                                        */
/* ------------------------------------------------------------------ */

export function coverSlide({ title, badge, lines, total }) {
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>${fontFaces()}${BASE_CSS}
html,body{width:1280px;height:720px;overflow:hidden}
body{background:linear-gradient(135deg,var(--brand-from) 0%,#3B5BF0 52%,var(--brand-to) 100%);color:#fff;position:relative;display:flex;flex-direction:column;justify-content:center;padding:0 96px}
body::before{content:'';position:absolute;inset:auto -140px -220px auto;width:520px;height:520px;border-radius:50%;background:rgba(255,255,255,.09)}
body::after{content:'';position:absolute;inset:-180px auto auto -120px;width:360px;height:360px;border-radius:50%;background:rgba(255,255,255,.07)}
.top{position:absolute;top:56px;right:96px;left:96px;display:flex;align-items:center;justify-content:space-between}
.badge{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);padding:9px 20px;border-radius:999px;font-size:19px;font-weight:600}
.brandmark span{color:#fff}
h1{font-size:66px;line-height:1.25;font-weight:700;letter-spacing:-.01em;position:relative;z-index:1}
.rule{width:120px;height:6px;background:rgba(255,255,255,.85);border-radius:99px;margin:34px 0 30px}
.lines{font-size:27px;line-height:1.75;color:rgba(255,255,255,.92);position:relative;z-index:1}
.bottom{position:absolute;bottom:52px;right:96px;left:96px;display:flex;align-items:center;justify-content:space-between;font-size:17px;color:rgba(255,255,255,.8)}
.counter{direction:ltr}
</style></head>
<body>
  <div class="top">
    <div class="brandmark"><img src="${logoFile}" alt=""><span>OstadiPlus</span></div>
    <div class="badge">${badge}</div>
  </div>
  <h1>${title}</h1>
  <div class="rule"></div>
  <div class="lines">${lines.map((l) => `<div>${l}</div>`).join('')}</div>
  <div class="bottom"><div>أ. جواد العلمي · مركز الأطلس للدروس</div><div class="counter">${total} شرائح</div></div>
</body></html>`;
}

export function contentSlide({ h, b, note, index, total, badge }) {
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>${fontFaces()}${BASE_CSS}
html,body{width:1280px;height:720px;overflow:hidden}
body{position:relative;background:var(--canvas);display:flex;flex-direction:column;padding:64px 84px 0}
body::before{content:'';position:absolute;top:0;right:0;left:0;height:8px;background:linear-gradient(90deg,var(--brand-from),var(--brand-to))}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px}
.badge{background:#E8EEFF;color:var(--brand-dark);padding:8px 18px;border-radius:999px;font-size:17px;font-weight:600}
h1{font-size:46px;line-height:1.3;color:var(--ink);font-weight:700}
.rule{width:88px;height:5px;background:var(--brand);border-radius:99px;margin:22px 0 34px}
ul{list-style:none;display:flex;flex-direction:column;gap:24px}
li{position:relative;padding-inline-start:44px;font-size:29px;line-height:1.65;color:var(--body)}
li::before{content:'';position:absolute;inset-inline-start:0;top:16px;width:16px;height:16px;border-radius:5px;background:linear-gradient(135deg,var(--brand-from),var(--brand-to))}
li strong{color:var(--ink);font-weight:700}
.note{position:absolute;inset-inline:84px;bottom:76px;background:#fff;border:1px solid var(--line);border-inline-start:6px solid var(--brand);border-radius:14px;padding:18px 24px;font-size:22px;line-height:1.6;color:var(--muted)}
.footer{position:absolute;inset-inline:84px;bottom:26px;display:flex;align-items:center;justify-content:space-between;font-size:16px;color:#8A94AC}
.counter{direction:ltr}
</style></head>
<body>
  <div class="top">
    <div class="brandmark"><img src="${logoFile}" alt=""><span>OstadiPlus</span></div>
    <div class="badge">${badge}</div>
  </div>
  <h1>${h}</h1>
  <div class="rule"></div>
  <ul>${b.map((item) => `<li>${item}</li>`).join('')}</ul>
  ${note ? `<div class="note">${note}</div>` : ''}
  <div class="footer"><span>أ. جواد العلمي · مركز الأطلس للدروس</span><span class="counter">${index + 1} / ${total}</span></div>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* PDF pages                                                           */
/* ------------------------------------------------------------------ */

export function pdfDocument({ title, badge, pages }) {
  const body = pages
    .map((page, index) => {
      const isFirst = index === 0;
      if (isFirst) {
        return `<section class="page cover">
      <div class="top">
        <div class="brandmark light"><img src="${logoFile}" alt=""><span>OstadiPlus</span></div>
        <div class="badge ghost">${badge}</div>
      </div>
      <div class="cover-body">
        <h1>${page.h}</h1>
        <div class="rule"></div>
        <div class="lines">${page.b.map((l) => `<div>${l}</div>`).join('')}</div>
      </div>
      <div class="cover-foot">أ. جواد العلمي · مركز الأطلس للدروس · الدار البيضاء</div>
    </section>`;
      }
      return `<section class="page">
      <div class="top">
        <div class="brandmark"><img src="${logoFile}" alt=""><span>OstadiPlus</span></div>
        <div class="doc-title">${title}</div>
      </div>
      <h2>${page.h}</h2>
      <div class="rule"></div>
      <ul>${page.b.map((item) => `<li>${item}</li>`).join('')}</ul>
      ${page.note ? `<div class="note">${page.note}</div>` : ''}
      <div class="foot"><span>أ. جواد العلمي · ${badge}</span><span class="counter">${index + 1} / ${pages.length}</span></div>
    </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>${fontFaces()}${BASE_CSS}
@page{size:A4;margin:0}
html,body{width:210mm;background:#fff}
.page{position:relative;width:210mm;height:297mm;padding:22mm 20mm 18mm;background:#fff;page-break-after:always;overflow:hidden;display:flex;flex-direction:column}
.page:last-child{page-break-after:auto}
.page::before{content:'';position:absolute;top:0;right:0;left:0;height:3mm;background:linear-gradient(90deg,var(--brand-from),var(--brand-to))}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10mm}
.brandmark img{width:9mm;height:9mm}
.brandmark span{font-size:5mm}
.brandmark.light span{color:#fff}
.badge{background:#E8EEFF;color:var(--brand-dark);padding:2mm 5mm;border-radius:999px;font-size:4mm;font-weight:600}
.badge.ghost{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff}
.doc-title{font-size:4mm;color:var(--muted);font-weight:600}
h2{font-size:8.5mm;line-height:1.35;color:var(--ink);font-weight:700}
.rule{width:22mm;height:1.4mm;background:var(--brand);border-radius:99px;margin:5mm 0 8mm}
ul{list-style:none;display:flex;flex-direction:column;gap:5mm}
li{position:relative;padding-inline-start:10mm;font-size:4.6mm;line-height:1.75;color:var(--body)}
li::before{content:'';position:absolute;inset-inline-start:0;top:2.4mm;width:3.4mm;height:3.4mm;border-radius:1mm;background:linear-gradient(135deg,var(--brand-from),var(--brand-to))}
li strong{color:var(--ink);font-weight:700}
.note{margin-top:auto;background:#F5F7FC;border-inline-start:2mm solid var(--brand);border-radius:3mm;padding:5mm 6mm;font-size:4.2mm;line-height:1.7;color:var(--muted)}
.foot{position:absolute;right:20mm;left:20mm;bottom:8mm;display:flex;justify-content:space-between;font-size:3.6mm;color:#8A94AC}
.counter{direction:ltr}
.cover{background:linear-gradient(135deg,var(--brand-from) 0%,#3B5BF0 52%,var(--brand-to) 100%);color:#fff}
.cover::before{display:none}
.cover .cover-body{margin:auto 0}
.cover h1{font-size:14mm;line-height:1.3;font-weight:700;color:#fff}
.cover .rule{background:rgba(255,255,255,.85);margin:8mm 0 7mm}
.cover .lines{font-size:6mm;line-height:1.8;color:rgba(255,255,255,.92)}
.cover .cover-foot{position:absolute;right:20mm;left:20mm;bottom:12mm;font-size:4mm;color:rgba(255,255,255,.8)}
</style></head>
<body>
${body}
</body></html>`;
}
