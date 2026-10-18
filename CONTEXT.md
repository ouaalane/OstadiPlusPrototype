# OstadiPlus — handoff context (read before continuing)

> Written by the session that built this prototype (Windows machine, `C:\test2\OtadiPlus`) before it ran out of
> disk space. **Read this file + `README.md` first** — they contain everything needed to continue on a new machine.
>
> Updated by the session that finished §6 on `C:\test2\OstadiPlusPrototype`: standalone APK built, full
> on-device verification (§6.2) and the cross-app demo (§6.3) pass — see §2 for the evidence.

---

## 1. What this repository is

An interactive product prototype of **OstadiPlus** (أوستادي بلس) — a Moroccan Arabic (RTL) ed-tech product —
presented as two apps sharing **one demo dataset**, aimed at investors / teachers:

| App | Path | Stack | Purpose |
| --- | --- | --- | --- |
| Teacher dashboard | `apps/teacher-dashboard` | React + TS + Vite 7 + Tailwind 4 + react-router 7 (HashRouter) + lucide-react | إدارة الدورات، الفصول والدروس، رفع/اختيار الملفات، التلاميذ والوصول، الإعلانات، الإعدادات |
| Student app | `apps/student-app` | React Native / **Expo SDK 54** (RN 0.81.5) + TS + react-navigation + expo-video | Android: splash, اختيار الحساب, الرئيسية, دوراتي, تفاصيل الدورة, مشغل الفيديو, قارئ المستندات, الإعلانات, الملف الشخصي |
| Shared kernel | `packages/shared` | TS (no deps) | types, design tokens, seed dataset, selectors, `OSTADI1:` sync codec, media manifest |

Both apps are **Arabic RTL**; the brand name is always written **OstadiPlus** (Latin script). No backend, no
payments, no accounts — everything is local (`localStorage` / `AsyncStorage`) and can be reset in-app.

### The demo story the prototype must tell

1. Teacher creates a course (draft) → adds chapters/lessons (from the bundled media library or an upload) →
   **نشر الدورة**.
2. Teacher goes to **الطلاب** → expands a student → **تفعيل** on that course (or adds a new student with
   «تفعيل الوصول فوراً»).
3. Teacher copies the **رمز المزامنة** (الإعدادات → نسخ رمز المزامنة) → `OSTADI1:…` string.
4. Student app: pick that student on sign-in (or paste the sync payload) → the published course appears →
   open a video lesson → it resumes where it stopped → mark complete.

---

## 2. Status: what is DONE, what is BLOCKED

### ✅ Done and verified

* `packages/shared` — typechecks clean. Contains `types.ts`, `tokens.ts`, `media.ts`, `mediaLibrary.ts`,
  `seed.ts` (4 courses, 14 students, 19 enrollments, 3 announcements, progress for `st-iman`),
  `selectors.ts`, `demoSync.ts`, `media-manifest.json`.
* **Media pipeline** (`npm run media`) — works end-to-end on this machine: 11 Arabic lesson MP4s
  (Chromium-rendered slides → ffmpeg, ≈1 MB each, with a subtle RTL progress bar), 5 A4 PDF worksheets,
  **25 rasterised page PNGs** for the phone's document reader, posters, and `media-manifest.json`
  (real durations/sizes). Re-run with `OSTADI_MEDIA_RESUME=1` to keep existing videos.
  `scripts/sync-media.mjs` copies assets to `apps/teacher-dashboard/public/media` **and**
  `apps/student-app/src/assets` (+ generates `src/assets/registry.ts`, the Metro `require()` map).
* **Real lesson videos** (`npm run media:fetch`) — the 31 lesson clips are short real explanation videos
  (French, «Khan Academy en français», CC BY-NC-SA — credits in `media/source/videos/CREDITS.md`), cut to
  120 s / ≈1.7–2.5 MB (854×480 H.264 + AAC, `+faststart`). `media/source/videos/<key>.mp4` always wins over
  the slide-deck template in `npm run media` — the same "a real source beats the demo template" rule as
  curated posters and AlloSchool PDFs. Raw downloads cache in git-ignored `media/raw/`. All 31 were eyeballed
  via contact sheets and language-checked (Vosk fr vs en models) — French audio confirmed.
* **Ownership watermark + custom player controls** — a moving student-code/course-id pill over the video
  (`src/lib/watermark.ts` pure logic with 8 executable checks in root `check-watermark.mjs` +
  `src/components/VideoWatermark.tsx` overlay), plus a custom control overlay in `VideoScreen.tsx`
  (back/mute/fullscreen/play/time). Fullscreen is rendered **in-app** on purpose: the platform's native
  fullscreen surface cannot host RN overlays and would silently drop the watermark from fullscreen
  recordings. Device-verified: the pill appears, tracks the course (`crs-math-2bac` → `crs-phys-2bac`) and
  moves between positions during playback (`shots/video-*.png`).
* **Teacher dashboard** — `npx tsc --noEmit` ✅, `npx vite build` ✅. Pages: Overview, Courses,
  CourseEditor (chapters/lessons/publish/preview/info), Students (access control), Announcements, Settings
  (profile edit + sync payload + reset), NotFound. Verified in Chromium at 1440×900 and 390×844 —
  screenshots in `shots/` (`overview-desktop.png`, `students-desktop.png`, `students-expanded.png`,
  `announcements-desktop.png`, `settings-desktop.png`, `editor-desktop.png`, `overview-mobile.png`,
  `editor-mobile.png`). An interactive run-through (create course → editor) was also verified.
* **Student app source** — all screens written and `npx tsc --noEmit` ✅ (see §5 for the file map).
  `android/` was generated with `npx expo prebuild --platform android --no-install`.
* **Standalone APK built and installed** — `scripts\verify-android.ps1 -Install -Launch` produces
  `app-debug.apk` (≈209 MB — the real lesson videos alone are ≈57 MB) with the JS bundle + assets embedded
  (`debuggableVariants = []` in
  `android/app/build.gradle` — re-applied automatically by the script after every prebuild). The app runs
  with Metro stopped and no `adb reverse` (verified: Metro killed, still fine).
* **On-device verification (old §6.2) — ALL PASS** on the Pixel_9a emulator (API 36, `emulator-5554`).
  Automated by `scripts/device-verify.mjs` (Node + adb; uses ADBKeyboard to type — see §3). Screenshots:
  `shots/device-01-home.png` … `device-08-hiba-profile-pending.png` (home + resume card, video player,
  PDF reader pages 1→2, profile before/after sync, discoverable course, pending student).
* **Cross-app demo (old §6.3) — VERIFIED end-to-end**: dashboard publishes `crs-exam` + activates
  هبة الرامي → payload `shots/demo-payload.txt` (4,845 chars, marker `Z`) → pasted on-device →
  «تمت المزامنة مع بيانات الأستاذ ✓» → «تحضير الامتحان الوطني» appears in دوراتي → hiba shows
  «بانتظار التفعيل» on `crs-diff` and «نشط» on `crs-exam`.
* **Three Hermes web-API gaps fixed** (each crashed/broke the app on-device only, not in the browser —
  details in §5): `Intl.RelativeTimeFormat` in `selectors.ts`, `DecompressionStream` in `demoSync.ts`
  (pure-JS raw-DEFLATE fallback, byte-identical to zlib), and an unbounded multiline `TextInput` in
  `ProfileScreen.tsx` (a pasted payload grew past the sync button; now capped with `maxHeight`).

### ✅ Resolved (historical)

* The old "APK never built" blocker (C: drive hit 0 bytes mid-build, missing NDK) is **resolved** — the NDK
  `27.1.12297006` is installed, the build completes in ≈1 min warm, and §2 above records the verification.
* Safe cleanups already performed on this machine (freed ≈7.7 GB, consumed again by Gradle): npm cache, pip
  cache, Yarn cache, browser caches, Temp files older than 48 h. Still on disk and **user-owned** (do not
  delete without asking): `~/.nuget` 7.3 GB, `%LOCALAPPDATA%\Docker` 9.4 GB, `~/.cache/huggingface` 1.85 GB,
  `~/.android/avd` 5.07 GB (the Pixel_9a AVD — required to run the emulator),
  `Android\Sdk\system-images` 7 GB (required), `%APPDATA%\Code` 4.6 GB (VS Code extensions),
  Chrome/Edge profiles.

---

## 3. Machine facts (this build machine — likely different on the next one)

* **Node 24.0.x, npm 11.x**, `ffmpeg`/`ffprobe` on PATH, Playwright 1.64 with Chromium installed
  (`npx playwright install chromium` was needed once after a `chromium_headless_shell-1248` miss).
  Note: Node ≥22.7 can import the shared `.ts` sources directly in scratch scripts (type stripping) — useful
  for testing shared codecs off-device; avoid TS parameter properties (`constructor(private x)`) in shared
  code, strip-only mode rejects them.
* **JDK 17** = Temurin at `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot` (the system `java` is
  newer — Gradle needs `JAVA_HOME` on 17; `scripts/verify-android.ps1` finds 17–21 automatically).
* **Android SDK** at `%LOCALAPPDATA%\Android\Sdk` — platforms `android-34/35/36`, build-tools `34.0.0/35.0.0`,
  NDK `27.1.12297006`, emulator, platform-tools, AVD **`Pixel_9a`** (API 36; adb serial `emulator-5554`).
* **ADBKeyboard** (`com.android.adbkeyboard/.AdbIME`) is installed and set as the emulator's default IME:
  Gboard's handwriting/stylus mode swallows `adb input text` (commits 1 char), so the test driver types via
  `am broadcast -a ADB_INPUT_TEXT --es msg '<text>'` (+ `ADB_CLEAR_TEXT`). To type manually, switch back with
  `adb shell ime set com.google.android.inputmethod.latin/...LatinIME`.
* **16 GB RAM** — kill Gradle daemons (`.\gradlew.bat --stop`) before big builds; don't run Metro + Gradle
  concurrently when tight. ~8 GB free disk was enough for a full rebuild.
* Gradle **8.14.3** is cached in `%USERPROFILE%\.gradle\wrapper\dists\gradle-8.14.3-all`.
  ⚠️ `android/gradle/wrapper/gradle-wrapper.properties` was edited to use the **`-all`** distribution URL
  (the `-bin` download times out here). If you re-run `expo prebuild`, that file is regenerated — re-apply
  the change or let Gradle download.
* Project root: `C:\test2\OstadiPlusPrototype` (HTTPS clone of the GitHub remote — SSH was not set up here).
* Windows PowerShell 5.1 reads `.ps1` files as ANSI — keep `.ps1` files **pure ASCII** (a UTF-8 em-dash in a
  string literal becomes a curly quote and breaks parsing).

---

## 4. Commands (copy-paste, PowerShell)

```powershell
# workspace install (root = shared + dashboard; the Expo app has its OWN lockfile)
npm install
npm --prefix apps/student-app install

# media pipeline (offline: Chromium + ffmpeg) and asset distribution
npm run media                 # ≈1 min when cached (use $env:OSTADI_MEDIA_RESUME='1' to skip existing)
npm run media:fetch           # (re)download + cut the real lesson clips (needs python+yt-dlp, ffmpeg)
npm run media:sync            # copy into both apps + regenerate apps/student-app/src/assets/registry.ts

# teacher dashboard  → http://localhost:5173
npm run dashboard             # vite dev server (HashRouter, so any static host works for the build)

# student app — Metro dev server
npm run app                   # then press "a" for Android, or use an emulator already booted

# native Android build + install + launch (one shot; auto-finds JDK 17 + SDK)
.\scripts\verify-android.ps1 -Install -Launch     # add -SkipBuild to only install+launch
# produces apps\student-app\android\app\build\outputs\apk\debug\app-debug.apk (~209 MB,
# JS bundle + assets embedded via debuggableVariants = [] — the script re-applies that
# patch after every `expo prebuild`). The APK runs standalone: no Metro, no adb reverse.

# on-device verification driver (emulator booted, APK installed, ADBKeyboard installed —
# it types payloads over `am broadcast` because Gboard swallows `adb input text`)
node scripts\device-verify.mjs                   # writes shots/device-01..08-*.png
```

Type-check both apps:

```powershell
npx tsc --noEmit            # in apps/teacher-dashboard
npx tsc --noEmit            # in apps/student-app
```

---

## 5. Architecture notes (things a new session must know)

### Shared kernel

* `packages/shared` is consumed by the dashboard via the npm workspace, and by the Expo app via
  `metro.config.js` (`watchFolders: [workspaceRoot]`, `extraNodeModules['@ostadiplus/shared']`). Its
  `package.json#main` points at `src/index.ts` — Metro transpiles it, `tsc` typechecks it.
* `seed.ts` is the single source of truth for the demo story. Personas:
  * Teacher: **أ. جواد العلمي / Jawad Alami**, مركز الأطلس للدروس, الدار البيضاء.
  * Demo student: **إمان السيد** (`st-iman`) — has progress + saved resume positions.
  * Students **بانتظار التفعيل** (pending enrollments): `st-hiba`, `st-zakaria`, `st-fatima`
    (use these to demo «teacher activates → student sees the course»).
  * Courses: `crs-diff` (الحساب التفاضلي, published, 3 chapters/8 lessons), `crs-vectors`,
    `crs-functions`, `crs-exam` (**draft** — used for the publish demo).
* `demoSync.ts` payload: `OSTADI1:` + marker (`Z` = deflate-raw via `CompressionStream` when available,
  `B` = plain base64) + base64(JSON). Encoding happens in the browser (dashboard); **decoding works
  everywhere**: hand-rolled UTF-8/base64 for Hermes (no `Buffer`/`TextEncoder`), and when
  `DecompressionStream` is missing (Hermes) a pure-JS raw-DEFLATE decoder (`inflateRawSync`) takes over —
  it is byte-identical to zlib (verified off-device against `node:zlib` with the real payload).

### Media

* Every lesson references a bundled file by name (`limits-intro.mp4`, `limits-sheet.pdf`, …). The manifest
  (`packages/shared/src/media-manifest.json`) supplies `durationSec` / `sizeMb` / `pages`, which is why the
  dashboard and the app show real durations.
* The 31 lesson **videos** are real French clips fetched by `npm run media:fetch` (sources in
  `scripts/media/ka-video-sources.json`, yt-dlp + ffmpeg in `scripts/fetch-videos.mjs`, credits auto-written
  to `media/source/videos/CREDITS.md`). `scripts/generate-media.mjs` copies
  `media/source/videos/<key>.mp4` over the slide-deck template whenever it exists.
* The phone's «PDF viewer» is a **page-image reader**: `npm run media` rasterises each A4 page to PNG
  (`media/generated/doc-pages/<key>-<n>.png`), and `sync-media.mjs` writes
  `apps/student-app/src/assets/registry.ts` with literal `require()` calls
  (`docPageAssets['limits-sheet.pdf'] = [require(...), …]`). Metro cannot `require()` dynamically — that file
  is generated on purpose.
* Uploads in the dashboard go to IndexedDB via `src/lib/media.ts` (per browser; reset with the in-app reset).

### Student app specifics

* Explicit RTL: no `I18nManager` forcing — rows use `flex-direction: row-reverse`, text
  `textAlign: right / writingDirection: rtl` (`src/theme.ts` → `rtl.*`). This makes the first launch correct.
* Fonts: `@expo-google-fonts/ibm-plex-sans-arabic`, loaded in `App.tsx` under `expo-splash-screen`
  (`preventAutoHideAsync` → `hideAsync` after fonts load). Font family keys are `IBMPlexArabic_400Regular` …
  (mapped in `App.tsx` to the package's `IBMPlexSansArabic_*` exports).
* Store: `src/store/StudentStore.tsx` (context + `useReducer` + AsyncStorage, debounced 350 ms writes).
  Student-side actions only: `signIn/signOut`, `saveProgress`, `markCompleted`, `importPayload`,
  `exportPayload`, `resetDemo`.
* Navigation: `Auth` (sign-in) when nobody is signed in, otherwise `Tabs` (Home / Courses / Announcements /
  Profile) + `CourseDetail`, `Video`, `Pdf` (`src/navigation/RootNavigator.tsx`, param types in `types.ts`).
* Video: `expo-video` (`useVideoPlayer` + `VideoView`) with a **custom control overlay** in
  `VideoScreen.tsx` (back, mute, big play/pause, time labels, in-app fullscreen), `timeUpdate` → progress,
  `playToEnd` → completed, resume by setting `player.currentTime` in the setup callback. A moving ownership
  watermark (`VideoWatermark.tsx` + `lib/watermark.ts`) shows the student code + course id at randomised
  positions (9–20 s interval, 650 ms glide, never repeating the previous slot).
* App id: `ma.atlas.ostadiplus.student` (see `app.json`).

### Hermes gaps (break on-device only — browsers never show these)

Hermes ships a small `Intl` and lacks some web APIs. Three real bugs were found on-device and fixed:

* `Intl.RelativeTimeFormat` — **missing** (`DateTimeFormat`/`NumberFormat` exist and support `ar-MA`).
  `selectors.ts#relativeTime` feature-detects and falls back to «قبل/خلال …» + «أمس/غداً» phrasing.
* `DecompressionStream`/`CompressionStream` — **missing** → `demoSync.ts` uses the pure-JS
  `inflateRawSync` fallback for `Z` payloads (see above).
* Unbounded multiline `TextInput`: a full payload (~4.8 KB pasted as one string) expands a `multiline`
  field past the screen, hiding «لصق ومزامنة» below the fold. `ProfileScreen` caps it (`maxHeight: 132`).

Debugging aids that worked: `console.error`'s real JS stack can be printed to logcat via
`nativeLoggingHook` (a temporary patch in `index.ts`); Hermes stack frames in component errors are
function-entry positions (`1:bytecodeOffset`) and symbolicate against
`android/app/build/generated/sourcemaps/react/debug/index.android.bundle.map`.

### Build/runtime gotchas

* `metro.config.js` must start from `expo/metro-config`'s `getDefaultConfig` and merge with `mergeConfig`
  from `@react-native/metro-config` (**expo does not export `mergeConfig`**; a bare-RN config causes a
  serializer mismatch). `@react-native/metro-config` and `babel-preset-expo` are required devDependencies
  of `apps/student-app` (they were missing from the lockfile — Metro/babel fail without them).
* Debug APKs skip JS bundling by default; `debuggableVariants = []` embeds it (patch in `scripts/verify-android.ps1`
  step 3b — re-apply after every `expo prebuild`).
* A debug APK still prefers a reachable Metro (`10.0.2.2:8081` on emulators) and only falls back to the
  embedded bundle — kill Metro when you want to prove standalone behaviour.
* Seed quirk (do not "fix" silently — see §8): `st-iman`'s saved `positionSec` (214 s) exceeds the seed
  lesson's duration (162 s), so the resume marker is hidden by design (lesson already completed) and the
  player seeks to the end.

### Dashboard specifics

* Store: `src/store/DemoStore.tsx` — one reducer with granular actions (`course/create`,
  `chapter/add`, `lesson/setPublished`, `enrollment/setStatus`, `announcement/create`, `teacher/update`,
  `reset`, …), localStorage key `ostadiplus.demo.v1`, toast helper `useAction()` = dispatch + toast.
* Design tokens live in `src/styles/theme.css` (Tailwind 4 `@theme`) and mirror `packages/shared/tokens.ts`.

---

## 6. Suggested next steps (in order)

All of the original next steps are **done** (see §2 for evidence): standalone APK, on-device verification
checklist, cross-app demo. What remains, in order of usefulness:

1. **Demo at 1080p**: the emulator window can be re-centred with `powershell -File scripts\center-emulator.ps1`;
   screenshots land in `shots/` (the real-video checks wrote `shots/video-*.png`). Re-run
   `node scripts\device-verify.mjs` any time — it resets the app (`pm clear`) and walks the whole story,
   writing `shots/device-01..08-*.png`.
2. **Refresh the payload before a live demo**: the committed `shots/demo-payload.txt` is a snapshot; the
   quickest way to regenerate is the dashboard (الإعدادات → نسخ رمز المزامنة) — or re-run the Playwright
   cross-app flow that produced it.
3. Nice-to-haves if there is appetite (not required by the brief): reduce APK size (bundle fewer posters),
   ship the document reader with a real PDF engine, or add a release build (`assembleRelease` + signing).

---

## 7. Repo / GitHub

* Remote: `git@github.com:ouaalane/OstadiPlusPrototype.git`, branch `main`.
* Included in git: all source, plus the **synced media copies** that make the apps run right after a clone —
  `apps/teacher-dashboard/public/media` (≈72 MB) and `apps/student-app/src/assets` (≈72 MB), including the
  real lesson videos and their originals in `media/source/videos/` (≈57 MB).
  `apps/student-app/android/` is **not** committed — it is generated with `npx expo prebuild --platform
  android --no-install` (or automatically by `scripts/verify-android.ps1` when missing).
* Excluded (`.gitignore`): `node_modules/`, `dist/`, `media/generated/` (regenerate with `npm run media`),
  `media/raw/` (raw yt-dlp downloads — regenerate with `npm run media:fetch`), Gradle build outputs,
  `*.apk`, editor folders.
* Screenshots in `shots/` are committed as verification evidence: dashboard (`*-desktop/mobile.png`),
  on-device (`device-01..08-*.png`) and the real-video checks (`video-*.png`). `shots/demo-payload.txt` is
  the captured cross-app sync payload; `scripts/device-verify.mjs` is the adb driver that produced the
  device screenshots.

## 8. Deliberate scope cuts (do not "fix" these without asking)

No backend/cloud/accounts (auth = «pick your name»), no payments (PRD ENR-03: cash recorded at the centre),
no quizzes/certificates/analytics/multi-teacher/licences, no anti-sharing. The phone document reader shows
rasterised pages rather than a native PDF engine. Uploaded dashboard files live in IndexedDB only.
