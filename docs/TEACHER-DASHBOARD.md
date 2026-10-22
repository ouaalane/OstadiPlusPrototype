# Teacher dashboard — connected prototype

The dashboard uses the supplied oustadi plus wordmark, Bricolage Grotesque (Latin/digits) and Noto Sans Arabic (Arabic). Its existing theme remains the source for colors: mulberry `#68234F`, peach `#FFCCA9`, lilac `#F1E9F4`, white `#FFFFFF`, ink `#291E2B`, with opacity variants for borders and secondary text. No external dashboard template or replacement logo was introduced.

## Run

Requires Node 24 (the API uses built-in SQLite and TypeScript stripping).

```sh
npm ci
npm ci --prefix apps/student-app
# Three terminals, from the repository root:
npm run demo
npm run dashboard
npm run start --prefix apps/student-app -- --go --clear
```

The dashboard opens on http://localhost:5173. `npm run demo` starts the shared demo hub and watermark API on port 8787. Allow that port on your computer's local firewall for a physical phone.

1. In the dashboard, open **مزامنة التطبيق**, enter `http://<computer-LAN-IP>:8787`, then publish. When using the dashboard on the same computer, `http://localhost:8787` also works there.
2. In the student app, open **الملف الشخصي → مزامنة المركز**, enter `http://<computer-LAN-IP>:8787`, and sync. Android emulator only: use `http://10.0.2.2:8787`.
3. Teacher edits and replies reach the phone after teacher **publish**, then student **sync**. Student questions, profile, course requests, progress and quiz attempts reach the dashboard after student **sync**, then teacher **pull**. This is explicit synchronization, not realtime push.
4. Pull student updates before editing access requests; publish again after approving access. Newly registered students have no automatic enrollments. The two existing guest demo accounts keep their seeded courses.

Changing the server URL does not copy media between servers. Keep the original server running and reachable while viewing uploaded files.

## Workspace design

The workspace was rebuilt around a persistent course outline, inline lesson editors, a content library, a quiz bank and a discussion inbox. See [research and design decisions](DASHBOARD-DESIGN-RESEARCH.md) for the inspected sources, decisions and before/after audit. Existing media, enrollments and synchronization payloads remain compatible.

## Controls and student behavior

| Teacher control | Student result |
| --- | --- |
| Create/edit courses, semesters, chapters, order and publish status | Same curriculum hierarchy; only published accessible content is available |
| Upload/replace video; edit title, description and thumbnail | Actual uploaded video plays; custom cover and description appear |
| Allow/disallow offline video download | Download affordance and download action follow teacher setting |
| Upload/replace PDF; preview in dashboard | Uploaded PDF rendered with zoom controls and student watermark |
| Author multiple-choice quizzes; import JSON; set time limit | Quiz answers, countdown and automatic submission on expiry |
| Questions inbox and replies | Shared course discussions and visible teacher replies |
| Student lookup/code, activation, renewal and suspension | Access status changes on sync; access notification on activation |
| Progress and results | Actual synchronized completions, saved playback positions and quiz attempts |
| Existing teacher/center settings and payload export | Existing settings and manual dataset export remain available |

The mobile video controls (header, playback buttons, timeline and timestamps) hide together after four idle seconds of playback, in portrait and fullscreen. Tapping the picture toggles the controls without pausing. Pausing, buffering, errors and dragging the timeline keep controls available; interacting with a control restarts the idle window. The video surface and ownership watermark stay mounted. Verify timer behavior and rotation guards with `node --test apps/student-app/scripts/test-player-controls.cjs apps/student-app/scripts/test-video-rotation.cjs`.

Uploads: MP4/WebM/MOV and PDF, maximum 100 MB per file. MP4/H.264 is recommended for device compatibility; uploads are not transcoded. Thumbnails: JPG/PNG/WebP up to 8 MB, cropped to 16:9 and compressed in the browser. Uploaded media and demo state survive API restart under `apps/api/data/demo/`; watermark records remain in SQLite. Back up that directory to retain the demo. Clearing browser storage alone does not delete server files.

The analytics “recorded viewing minutes” sums saved playback positions, not total engagement time. Quiz attempts are recorded locally when completed or timed out, and uploaded during sync. Seed metrics are demonstration data, not business traction.

## Quiz import

Use [sample-quiz.json](./sample-quiz.json) in the quiz editor's **استيراد JSON** control. Review and save after importing. Maximum 100 questions, 1 MB; option IDs must be unique within a question, and each correct ID must identify an option. Several correct answers are supported. `timeLimitSec: 0` means untimed.

## Validation

```sh
npm run dashboard:build
npm run dashboard:test
node scripts/check-demo-sync.mjs
node scripts/check-quiz-authoring.mjs
node scripts/check-teacher-workspace.mjs
node check-watermark.mjs
cd apps/student-app
npx tsc --noEmit
npm run lint
```

Browser verification covered a real teacher video upload with description/thumbnail, publish → student sync, automatic timed quiz submission → dashboard results, real PDF upload → student rendering/zoom, and student question → teacher reply → student display. The dashboard was reviewed at 1440 px and 390 px. The mobile browser review used external preview adapters for native-only facilities; it does not establish Android/iOS runtime behavior. Native bundle generation is a separate check; device testing is still necessary for downloads, WebView rendering and rotation.

The browser workspace test needs Chromium. It uses `/usr/bin/chromium` when available, accepts `PLAYWRIGHT_CHROMIUM_PATH`, or uses Playwright's installed browser. Install that browser with `npx playwright install chromium` if needed. Set `TEACHER_SHOTS_DIR` to capture review screenshots. It creates isolated temporary state and uploads and cleans them on completion.

## Prototype scope

The hub is opt-in (`npm run demo` or `--demo`); `npm run api` alone retains the existing watermark-only API. This is a trusted local investor demo: no server authentication, tenant isolation, production cloud storage, payments, virus scanning, transcoding or production authorization. Do not expose the unauthenticated demo hub as a public production service. Passwords remain in the existing local password store and are not part of sync.

Teacher content/access is authoritative; server student profiles/progress survive stale teacher publishes. Questions and replies merge by ID, so stale student sync does not erase teacher replies. Existing memberships are resolved by teacher publish; new student requests cannot grant course access themselves. The server returns the shared demo dataset, matching the existing prototype model rather than a production per-user API.

Research sources and access limits are recorded in [the redesign research report](DASHBOARD-DESIGN-RESEARCH.md).

## اشتراكات المركز: مدة أو دورة دراسية

من «التلاميذ ← إدارة الوصول» أو «الاستقبال ← إدارة الاشتراك»، اختر الأستاذ والمقرر ثم:

- شهر، شهرين، ثلاثة أشهر، أو مدة مخصصة من 1 إلى 24 شهراً: تتيح جميع دروس المقرر خلال المدة المختارة.
- الدورة الأولى أو الثانية: تتيح محتوى الدورة المختارة فقط، مع تاريخ بداية وآخر يوم للوصول يحددهما المركز. تاريخ النهاية إلزامي؛ لا توجد نهاية مدرسية مفترضة.
- «إضافة اشتراك» تحتفظ بالاشتراكات السابقة؛ «تعديل» يغير الاشتراك المحدد دون إضافة نسخة. يمكن الجمع بين اشتراكي الدورتين أو تسجيل مدة لاحقة مقدماً.

الحساب بتوقيت `Africa/Casablanca`. بداية الاشتراك منتصف ليل يوم البداية. نهاية الدورة تشمل اليوم المحدد كاملاً؛ الاشتراك الشهري ينتهي عند منتصف ليل تاريخ الذكرى الشهرية، مع ضبط يوم 29/30/31 إلى آخر يوم متاح في الشهر الهدف. تعرض الواجهة آخر يوم وصول، وليس حد الانتهاء الحصري.

الاشتراكات القديمة التجريبية تحتفظ بصلاحياتها حتى تخصيصها لأول مرة؛ أول حفظ يستبدل الوصول القديم الكامل بالاشتراك المختار، وتوضح الواجهة ذلك قبل الحفظ. لا توجد أزرار تفعيل/إيقاف في مدير الاشتراكات الجديد.

انشر التعديلات من صفحة «المزامنة»، ثم حدّث بيانات تطبيق التلميذ. يطبق التطبيق نطاق الدورة على الدروس والتقدم والتحميلات، ويعيد تقييم العرض كل 30 ثانية. يتحقق خادم النموذج من الصلاحية فور كل طلب فتح فيديو/PDF ومن تقدم التلميذ ومحاولاته وأسئلته عند المزامنة. هذا امتداد للنموذج التجريبي المحلي؛ رابط ملفات الوسائط التجريبي ليس تخزيناً خاصاً للإنتاج.

التحقق: `npm run access:test` لقواعد المدة والدورات وحدود التواريخ، و`node scripts/check-demo-sync.mjs` للمزامنة ورفض محتوى دورة أخرى، و`npm run dashboard:test` لتسجيل الاشتراكات عبر المتصفح.
