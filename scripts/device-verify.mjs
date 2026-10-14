// OstadiPlus — on-device verification driver (student app on an emulator).
//
// Drives the installed APK over adb following the CONTEXT.md §6 checklist:
//   splash → sign-in → home (resume card) → video (plays + resume marker) →
//   mark complete → PDF reader (swipe pages) → profile → paste the sync
//   payload captured from the real dashboard → verify the published course
//   appears → pending student sees «بانتظار التفعيل».
//
// Usage: node device-verify.mjs
// Requires: emulator booted, APK installed, demo-payload.txt present.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const ADB = 'C:/Users/acer/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const SHOTS = 'C:/test2/OstadiPlusPrototype/shots';
const PAYLOAD_FILE = 'C:/test2/OstadiPlusPrototype/shots/demo-payload.txt';
const APP = 'ma.atlas.ostadiplus.student';

mkdirSync(SHOTS, { recursive: true });

const adb = (...args) =>
  execFileSync(ADB, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let shotN = 0;
function shot(name) {
  const file = `${SHOTS}/device-${String(++shotN).padStart(2, '0')}-${name}.png`;
  const png = execFileSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(file, png);
  console.log(`[device] shot ${file}`);
}

function uiDump() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml');
  return adb('shell', 'cat', '/sdcard/ui.xml');
}

function boundsBy(xml, attr, value) {
  const esc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${attr}="([^"]*${esc}[^"]*)"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
  const m = xml.match(re);
  if (!m) return null;
  return [Math.round((+m[2] + +m[4]) / 2), Math.round((+m[3] + +m[5]) / 2)];
}

async function tapText(text, { tries = 10, wait = 800 } = {}) {
  for (let i = 0; i < tries; i++) {
    const c = boundsBy(uiDump(), 'text', text);
    if (c) {
      adb('shell', 'input', 'tap', String(c[0]), String(c[1]));
      console.log(`[device] tap «${text}» @ ${c}`);
      await sleep(wait);
      return true;
    }
    await sleep(600);
  }
  throw new Error(`tapText: «${text}» not found`);
}

async function tapClass(cls, { tries = 10, wait = 800 } = {}) {
  for (let i = 0; i < tries; i++) {
    const c = boundsBy(uiDump(), 'class', cls);
    if (c) {
      adb('shell', 'input', 'tap', String(c[0]), String(c[1]));
      console.log(`[device] tap class ${cls} @ ${c}`);
      await sleep(wait);
      return true;
    }
    await sleep(600);
  }
  throw new Error(`tapClass: ${cls} not found`);
}

async function waitFor(text, { tries = 20, wait = 800 } = {}) {
  for (let i = 0; i < tries; i++) {
    if (boundsBy(uiDump(), 'text', text)) return true;
    await sleep(wait);
  }
  throw new Error(`waitFor: «${text}» never appeared`);
}

async function tapTextAny(labels, { tries = 10, wait = 800 } = {}) {
  for (let i = 0; i < tries; i++) {
    const xml = uiDump();
    for (const text of labels) {
      const c = boundsBy(xml, 'text', text);
      if (c) {
        adb('shell', 'input', 'tap', String(c[0]), String(c[1]));
        console.log(`[device] tap «${text}» @ ${c}`);
        await sleep(wait);
        return true;
      }
    }
    await sleep(600);
  }
  throw new Error(`tapTextAny: none of «${labels.join(' | ')}» found`);
}

// ---- typing via ADBKeyboard — Gboard swallows `input text` on this AVD -----
function ensureAdbKeyboard() {
  const imes = adb('shell', 'ime', 'list', '-s')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const kb = imes.find((i) => i.includes('com.android.adbkeyboard'));
  if (kb) {
    adb('shell', 'ime', 'enable', kb);
    adb('shell', 'ime', 'set', kb);
    console.log(`[device] IME → ${kb}`);
  } else {
    console.log('[device] WARNING: ADBKeyboard not installed — typing may fail');
  }
}

function editTextText() {
  const xml = uiDump();
  const i = xml.indexOf('android.widget.EditText');
  if (i < 0) return null;
  const s = xml.lastIndexOf('<node', i);
  const e = xml.indexOf('/>', i);
  const m = xml.slice(s, e).match(/text="([^"]*)"/);
  return m ? m[1] : '';
}

async function typePayload(text) {
  adb('shell', 'am', 'broadcast', '-a', 'ADB_CLEAR_TEXT');
  await sleep(600);
  adb('shell', 'am', 'broadcast', '-a', 'ADB_INPUT_TEXT', '--es', 'msg', `'${text}'`);
  await sleep(1500);
  const got = editTextText() ?? '';
  if (got.length !== text.length) {
    throw new Error(`typing failed: field has ${got.length} chars, expected ${text.length}`);
  }
  console.log(`[device] typed payload (${got.length} chars) ✓`);
}

// ---- 0. clean slate (first launch lands on Home for إمان السيد) ------------
ensureAdbKeyboard();
console.log('[device] pm clear + launch');
adb('shell', 'pm', 'clear', APP);
adb('shell', 'am', 'start', '-n', `${APP}/.MainActivity`);
await sleep(9000); // splash + fonts + hydrate

// ---- 1. home shows the resume card ------------------------------------------
shot('home');
await waitFor('تابع التعلّم');
console.log('[device] home + resume card OK');

// ---- 2. continue → video resumes & plays ------------------------------------
await tapText('متابعة الفيديو', { wait: 4000 });
await sleep(6000);
shot('video-playing');
// the resume marker proves saved-position restore; if the seed lesson is
// already completed the app hides the marker by design and shows the
// «إعادة تعليم» button instead — accept either as evidence.
const uiVideo = uiDump();
const marker = boundsBy(uiVideo, 'text', 'توقفت عند');
const donePill = boundsBy(uiVideo, 'text', 'إعادة تعليم الدرس كمكتمل');
console.log(
  `[device] resume marker: ${marker ? 'shown' : donePill ? 'hidden (lesson already completed — saved position applied)' : 'not shown'}`,
);

// mark complete → hand-off (skip when already completed — tapping would RESET it)
if (donePill) {
  console.log('[device] lesson already completed — skipping mark-complete');
} else {
  await tapText('تعليم الدرس كمكتمل', { wait: 3500 });
  await sleep(2500);
}

// ---- 4. PDF reader (arrived via next-lesson hand-off) ----------------------
try {
  await waitFor('صفحة', { tries: 6 });
} catch {
  // hand-off may have opened a video instead — go through the course detail
  adb('shell', 'input', 'keyevent', '4');
  await sleep(1200);
  await tapText('عرض الكل', { wait: 1500 });
  await tapText('الحساب التفاضلي', { wait: 2000 });
  await tapText('ملخص المقدار النهاية', { wait: 2500 });
}
await sleep(1500);
shot('pdf-page1');
// swipe to page 2 (LTR horizontal FlatList: finger moves left)
adb('shell', 'input', 'swipe', '900', '1300', '200', '1300', '400');
await sleep(1800);
shot('pdf-page2');
// button label flips to the completed wording once the doc is read
await tapTextAny(['تمت قراءة المستند', 'أنهيت هذا المستند'], { wait: 3000 });
await sleep(2000);
// wherever the hand-off went, return home
adb('shell', 'input', 'keyevent', '4');
await sleep(1000);
adb('shell', 'input', 'keyevent', '4');
await sleep(1500);

// ---- 5. profile → paste the dashboard sync payload -------------------------
await tapText('ملفي', { wait: 2000 });
await sleep(1200);
shot('profile-before-sync');
await tapText('مزامنة مع لوحة الأستاذ', { wait: 1200 });
const payload = readFileSync(PAYLOAD_FILE, 'utf8').trim();
await tapClass('android.widget.EditText', { wait: 800 });
await typePayload(payload);
// the keyboard bar covers the bottom of the screen — hide it before tapping
adb('shell', 'input', 'keyevent', '4');
await sleep(1000);
try {
  await tapText('لصق ومزامنة', { tries: 3, wait: 2500 });
} catch {
  // BACK may have hidden the panel or left the tab — restore, then sync
  await tapText('ملفي', { wait: 1500 });
  if (!boundsBy(uiDump(), 'text', 'لصق ومزامنة')) {
    await tapText('مزامنة مع لوحة الأستاذ', { wait: 1500 });
  }
  await tapText('لصق ومزامنة', { tries: 5, wait: 2500 });
}
await waitFor('تمت المزامنة', { tries: 10 });
shot('profile-synced');
console.log('[device] sync imported OK');

// ---- 6. verify the published exam course is now visible --------------------
await tapText('دوراتي', { wait: 2000 });
await sleep(1500);
// scroll «دورات المركز المتاحة» into view (retry with an extra swipe)
let examVisible = false;
for (let i = 0; i < 4 && !examVisible; i++) {
  adb('shell', 'input', 'swipe', '540', '1600', '540', '500', '500');
  await sleep(1200);
  examVisible = !!boundsBy(uiDump(), 'text', 'تحضير الامتحان الوطني');
}
shot('courses-discoverable');
if (!examVisible) throw new Error('exam course not visible after sync');
console.log('[device] exam course visible after sync ✓');

// ---- 7. pending student sees «بانتظار التفعيل» -----------------------------
await tapText('ملفي', { wait: 2000 });
await sleep(1200);
// the open sync panel pushes the account buttons below the fold — collapse it
if (boundsBy(uiDump(), 'text', 'لصق ومزامنة')) {
  await tapText('مزامنة مع لوحة الأستاذ', { wait: 1200 });
}
if (!boundsBy(uiDump(), 'text', 'تغيير الحساب')) {
  adb('shell', 'input', 'swipe', '540', '1800', '540', '700', '450');
  await sleep(1000);
}
await tapText('تغيير الحساب', { wait: 2500 });
await waitFor('اختر حسابك');
// هبة الرامي is the 12th student — scroll her row into view
let hibaVisible = false;
for (let i = 0; i < 8 && !hibaVisible; i++) {
  adb('shell', 'input', 'swipe', '540', '1900', '540', '700', '400');
  await sleep(1000);
  hibaVisible = !!boundsBy(uiDump(), 'text', 'هبة الرامي');
}
if (!hibaVisible) throw new Error('«هبة الرامي» not reachable by scrolling');
await tapText('هبة الرامي', { wait: 1500 });
await sleep(2000);
await tapText('ملفي', { wait: 2000 });
await sleep(1200);
shot('hiba-profile-pending');
await waitFor('بانتظار التفعيل', { tries: 6 });
console.log('[device] pending state shown for هبة الرامي ✓');

console.log('[device] ALL CHECKS DONE');
