# OstadiPlus — handoff context (read before continuing)

> Written by the session that built this prototype (Windows machine, `C:\test2\OtadiPlus`) before it ran out of
> disk space. **Read this file + `README.md` first** — they contain everything needed to continue on a new machine.

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
* **Teacher dashboard** — `npx tsc --noEmit` ✅, `npx vite build` ✅. Pages: Overview, Courses,
  CourseEditor (chapters/lessons/publish/preview/info), Students (access control), Announcements, Settings
  (profile edit + sync payload + reset), NotFound. Verified in Chromium at 1440×900 and 390×844 —
  screenshots in `shots/` (`overview-desktop.png`, `students-desktop.png`, `students-expanded.png`,
  `announcements-desktop.png`, `settings-desktop.png`, `editor-desktop.png`, `overview-mobile.png`,
  `editor-mobile.png`). An interactive run-through (create course → editor) was also verified.
* **Student app source** — all screens written and `npx tsc --noEmit` ✅ (see §5 for the file map).
  `android/` was generated with `npx expo prebuild --platform android --no-install`.

### ⚠️ Blocked / unfinished

* **APK build never completed**: the machine's C: drive hit **0 bytes free** mid-build.
  * The failing run reported two things: (a) missing **NDK 27.1.12297006** — which has since been installed
    into `%LOCALAPPDATA%\Android\Sdk\ndk\27.1.12297006`, and (b) `java.io.IOException: There is not enough
    space on the disk`.
  * Remaining work needs roughly **2–3 GB free**: finish NDK install, compile, link, package
    (`app-debug.apk` ≈ 20–30 MB with bundled media).
  * Safe cleanups already performed (freed ≈7.7 GB, consumed again by Gradle): npm cache, pip cache, Yarn
    cache, browser caches, Temp files older than 48 h. Still on disk and **user-owned** (do not delete
    without asking): `~/.nuget` 7.3 GB, `%LOCALAPPDATA%\Docker` 9.4 GB, `~/.cache/huggingface` 1.85 GB,
    `~/.android/avd` 5.07 GB (the Pixel_9a AVD — required to run the emulator),
    `Android\Sdk\system-images` 7 GB (required), `%APPDATA%\Code` 4.6 GB (VS Code extensions),
    Chrome/Edge profiles.
* **The app was never launched on a device/emulator** — so all on-device verification (RTL layout, expo-video
  playback, resume, document reader, sync paste, storage) is still to do.
* Emulator boot was attempted (`emulator -avd Pixel_9a -no-snapshot-save -gpu auto`) but not verified.
* No end-to-end cross-app demo run (teacher publish → student sees it) has been executed yet.

---

## 3. Machine facts (this build machine — likely different on the next one)

* **Node 24.0.x, npm 11.x**, `ffmpeg`/`ffprobe` on PATH, Playwright 1.64 with Chromium installed
  (`npx playwright install chromium` was needed once after a `chromium_headless_shell-1248` miss).
* **JDK 17** at `C:\Program Files\Android\Android Studio\jbr` (the system default `java` is 24 — Gradle needs
  `JAVA_HOME` pointed at the JBR).
* **Android SDK** at `%LOCALAPPDATA%\Android\Sdk` — platforms `android-34/35/36`, build-tools `34.0.0/35.0.0`,
  NDK `27.1.12297006`, emulator, platform-tools, AVD **`Pixel_9a`**.
* Gradle **8.14.3** is cached in `%USERPROFILE%\.gradle\wrapper\dists\gradle-8.14.3-all`.
  ⚠️ `android/gradle/wrapper/gradle-wrapper.properties` was edited to use the **`-all`** distribution URL
  (the `-bin` download times out here). If you re-run `expo prebuild`, that file is regenerated — re-apply
  the change or let Gradle download.
* Project root: `C:\test2\OtadiPlus` (not a git repo until this session initialised it).

---

## 4. Commands (copy-paste, PowerShell)

```powershell
# workspace install (root = shared + dashboard; the Expo app has its OWN lockfile)
npm install
npm --prefix apps/student-app install

# media pipeline (offline: Chromium + ffmpeg) and asset distribution
npm run media                 # ≈1 min when cached (use $env:OSTADI_MEDIA_RESUME='1' to skip existing)
npm run media:sync            # copy into both apps + regenerate apps/student-app/src/assets/registry.ts

# teacher dashboard  → http://localhost:5173
npm run dashboard             # vite dev server (HashRouter, so any static host works for the build)

# student app — Metro dev server
npm run app                   # then press "a" for Android, or use an emulator already booted

# native Android build (this is where the previous session stopped)
$env:JAVA_HOME    = 'C:\Program Files\Android\Android Studio\jbr'      # JDK 17
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
Set-Location apps\student-app\android
.\gradlew.bat :app:assembleDebug
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am start -n ma.atlas.ostadiplus.student/.MainActivity
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
* `demoSync.ts` payload: `OSTADI1:` + marker (`Z` = deflate-raw, only when `CompressionStream` exists i.e.
  browsers; `B` = plain base64, which is what Hermes/RN produces and also accepts) + base64(JSON).
  Hand-rolled UTF-8/base64 so it works in Hermes without `Buffer`/`TextEncoder`.

### Media

* Every lesson references a bundled file by name (`limits-intro.mp4`, `limits-sheet.pdf`, …). The manifest
  (`packages/shared/src/media-manifest.json`) supplies `durationSec` / `sizeMb` / `pages`, which is why the
  dashboard and the app show real durations.
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
* Video: `expo-video` (`useVideoPlayer` + `VideoView`, native controls), `timeUpdate` → progress,
  `playToEnd` → completed, resume by setting `player.currentTime` in the setup callback.
* App id: `ma.atlas.ostadiplus.student` (see `app.json`).

### Dashboard specifics

* Store: `src/store/DemoStore.tsx` — one reducer with granular actions (`course/create`,
  `chapter/add`, `lesson/setPublished`, `enrollment/setStatus`, `announcement/create`, `teacher/update`,
  `reset`, …), localStorage key `ostadiplus.demo.v1`, toast helper `useAction()` = dispatch + toast.
* Design tokens live in `src/styles/theme.css` (Tailwind 4 `@theme`) and mirror `packages/shared/tokens.ts`.

---

## 6. Suggested next steps (in order)

1. **Free ~3 GB** on the working drive (ask the user before deleting anything), or run on a machine with
   space. Then finish the build (`.\gradlew.bat :app:assembleDebug`) and install on the AVD
   (`Pixel_9a`, API 36 image) or any connected device.
2. **On-device verification checklist** (screenshots to save into `shots/`):
   * splash → sign-in (RTL correct on first launch, Arabic shaping fine),
   * pick **إمان السيد** → Home shows «تابع التعلّم» with a real resume position,
   * open the video lesson → plays offline, close & reopen → resumes, «تعليم كمتمل» updates progress,
   * open a PDF lesson → page-images swipe, page counter, «تمت قراءة المستند»,
   * announcements tab respects course filtering, profile shows enrollments with status pills,
   * paste an `OSTADI1:` payload generated by the dashboard → dataset updates,
   * sign out → switch to a pending student → courses visible but lessons locked with the review banner.
3. **Cross-app demo run**: dashboard → publish `crs-exam` → activate a pending student → copy payload →
   paste in the app → verify the course appears and unlocks.
4. Nice-to-haves if there is appetite (not required by the brief): keep `android/` in sync with `expo
   prebuild`, add a small `scripts/verify-android.ps1`, reduce APK size (bundle fewer posters), or ship the
   document reader with a real PDF engine.

---

## 7. Repo / GitHub

* Remote: `git@github.com:ouaalane/OstadiPlusPrototype.git`, branch `main`.
* Included in git: all source, plus the **synced media copies** that make the apps run right after a clone —
  `apps/teacher-dashboard/public/media` (13.4 MB) and `apps/student-app/src/assets` (12.8 MB), plus
  `apps/student-app/android/` (Expo-generated native project, minus build outputs).
* Excluded (`.gitignore`): `node_modules/`, `dist/`, `media/generated/` (regenerate with `npm run media`),
  Gradle build outputs, `*.apk`, editor folders.
* Screenshots in `shots/` are committed as verification evidence.

## 8. Deliberate scope cuts (do not "fix" these without asking)

No backend/cloud/accounts (auth = «pick your name»), no payments (PRD ENR-03: cash recorded at the centre),
no quizzes/certificates/analytics/multi-teacher/licences, no anti-sharing. The phone document reader shows
rasterised pages rather than a native PDF engine. Uploaded dashboard files live in IndexedDB only.
