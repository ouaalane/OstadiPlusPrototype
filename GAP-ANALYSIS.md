# Ustadi Plus — Gap analysis: product spec vs. this prototype

> Generated from an audit of the working tree (commit `9d0bfc5` + uncommitted changes), October 2026.
> Companion to `CONTEXT.md` (build state). Spec source: *Ustadi Plus — Business & Application Description*,
> *Student Mobile App Specification (MVP) v1.0*, and *Registration and Center Enrollment Workflow*.

**Verdict in one line:** the prototype is a polished *Arabic-only, backend-less demo* of the core
teacher→student content flow; the MVP spec is a *bilingual (FR/AR), role-based, consent-driven enrollment
product*. Roughly 60% of the teacher course-management spec exists, ~40% of the student app spec, and ~10%
of the enrollment/auth/reception spec. Everything typechecks clean (`tsc --noEmit` passes in all three
projects), so the base is sound — but the newest uncommitted work has drifted *away* from the spec in
several places (see §4).

---

## 1. Severity summary

| Severity | Count | Themes |
| --- | --- | --- |
| 🔴 Blocker (spec defines the product; absent) | 6 | QR/consent enrollment lifecycle, auth + roles, reception dashboard, FR/AR i18n + RTL switching, Downloads tab, subscription-expiry enforcement |
| 🟠 Major (spec item exists in name only or is a regression) | 9 | 5-tab structure, announcements deleted in both apps, payment/duration UI, add/invite student, real QR, push/updates feed, student-side center join, exercise/image content, marketplace screens contradict the spec |
| 🟡 Minor (polish / completeness) | 10 | forgot-password, password confirmation, expiration display, search, expand/collapse, prev-lesson, playback speed, delete-course button, recently-uploaded widget, dead shortcuts |

---

## 2. Gap table by spec area

### A. Student mobile app — screens & navigation

| Spec requirement | Status | Evidence |
| --- | --- | --- |
| 5 tabs: Accueil / Cours / Téléchargés / Actualités / Profil | 🔴 **4 tabs, Arabic-only**: الرئيسية / الدروس / الملفات / حسابي — no Downloads, no Updates | `apps/student-app/src/navigation/RootNavigator.tsx:48-53` |
| Labels translated FR + AR; layout adapts to RTL | 🔴 **No i18n system at all** — every string is a hard-coded Arabic literal; the Profile "language" toggle writes to a local `useState` and does nothing | `ProfileScreen.tsx:103,314-319`; repo-wide grep for i18n/locale → 0 |
| Splash → session check → route | 🟢 Present | `SplashScreen.tsx`, `RootNavigator.tsx:129-156` |
| Login / signup / forgot password / language selector / terms | 🟠 UI present (`WelcomeScreen`, `LoginScreen`, `SignupScreen` — new, untracked) but **signup signs you into a hard-coded demo student**, forgot-password is an `Alert` stub, no FR/عربية selector, no password-confirmation field, terms are inert text | `SignupScreen.tsx:102-129`, `LoginScreen.tsx:63-71,162-178` |
| Join a center via code / invitation link, confirm center name, submit request, states pending/approved/rejected/cancelled | 🔴 **Absent on the student side.** No code entry, no invite-link handling, no request states (model has only `active\|pending\|suspended`) | `packages/shared/src/types.ts:13` |
| Home: welcome + center identity, continue card, recent lessons, courses preview, announcements, downloads shortcut, pending state | 🟠 Missing announcements block + downloads shortcut; pending state is generic empty-copy | `HomeScreen.tsx:114-263` |
| My Courses: list, search/filter, availability + subscription status, expiry explanation | 🟠 No search (video/pdf chips only); no expiration concept — "expired" reads «موقوف» | `CoursesScreen.tsx:121-144` |
| Course details: chapters ordered, indicators, completion, expand/collapse | 🟠 No expand/collapse; **no exercise/exam indicators** (`LessonKind = 'video' \| 'pdf'` only) | `CourseDetailScreen.tsx:207-291`, `types.ts:12` |
| Video player: speed, prev/next, related PDFs, download, error/retry, authorized playback | 🟠 Has resume + fullscreen + next; **missing** speed, previous, per-lesson related PDFs, real download (icon is decorative), retry states; playback auth is moot — media is bundled local MP4s | `VideoScreen.tsx`, `media/lookup.ts:15-33` |
| PDF viewer: in-app viewer, offline download, error/retry | 🟡 Works (rasterised PNG pages by design); no download action, no error states | `PdfScreen.tsx`, `README.md:146-147` |
| **Downloads tab**: files, progress, size, storage, delete, controlled offline playback, expired-subscription policy | 🔴 **Nothing implemented.** No tab, no `expo-file-system` dependency. The «محمّل ✓» tag in Library is *lesson completion*, not a downloaded file — actively misleading | `LibraryScreen.tsx:208,240-255`; `package.json` deps |
| Updates/announcements: new lessons, reminders, read/unread, deep-link to lesson, usable without push | 🔴 **Regression** — `AnnouncementsScreen.tsx` was *deleted* in the working tree; replaced by `MessagesScreen.tsx`, a fully hard-coded chat mock that never deep-links. No push, no read/unread model | `git status` shows ` D ...AnnouncementsScreen.tsx` |
| Profile: contact, center, **subscription status + expiration**, language, notifications, help, logout | 🟠 Expiration date is never displayed anywhere (`expiresAt` exists in the model but no UI reads it); language/notification toggles are cosmetic | `ProfileScreen.tsx:233-269,301-319` |

### B. Registration & center enrollment workflow (the spec's core loop)

| Step | Status | Evidence |
| --- | --- | --- |
| 1. Student signs up (first/last name, email, phone, **student type: Bac Libre / Moutamadris**, password) | 🟠 Signup UI exists but is non-persistent; "level" (5 options incl. باك حر) ≠ spec's student-type field; account creation creates nothing | `SignupScreen.tsx:147-330` |
| 2. App shows **personal QR code + unique student ID** + instruction + status | 🔴 `StudentCardScreen.tsx` renders a **decorative fake QR** (self-admitted, xorshift pattern that encodes nothing). Unique ID `OST-2025-<level>-00000` is derived client-side and **cannot be looked up** by the dashboard, which matches raw ids like `st-iman` | `StudentCardScreen.tsx:8-84` vs `Students.tsx:83-85` |
| 3. Center scans QR / enters ID → sends connection request | 🟠 Dashboard has manual ID entry + a **simulated** "scan" (`simulateScan` just fills the ID field). No camera/QR decoding anywhere. No request entity — a teacher can already see all student names/phones before any consent | `Students.tsx:45-237` |
| 4. Student accepts / rejects (notification identifies the center) | 🔴 **No accept/reject UI or state on the student app**; no `accepted`/`rejected` states in the model | `types.ts:13`, `StudentStore.tsx` |
| 5. Only after acceptance: center sees permitted fields, assigns courses, sets subscription period, records cash payment, activates | 🔴 Permission scoping absent; subscription period hardcoded `now + 214 days` in two places; **payment data model is correct (`Enrollment.payment`, PRD ENR-03) but no UI anywhere records one**; add/invite student reducer exists but is never dispatched | `DemoStore.tsx:375,416`, `types.ts:86-91` |
| 6. Student accesses assigned courses | 🟢 Works — via sync payload paste (prototype's substitute for a backend) | `ProfileScreen.tsx:323-384` |
| Duplicate-request / multi-center business rules | 🔴 No center entity at all (center = 2 free-text strings on the teacher profile); no invitation codes; multi-center membership unmodelled | `types.ts:23-24,78-92` |

### C. Teacher dashboard

| Spec requirement | Status | Evidence |
| --- | --- | --- |
| Overview: students, **active + expired** subscriptions, published courses, recently uploaded lessons, activity | 🟡 Has published/active-student/lessons cards + activity feed; **no expired metric**, no recently-uploaded list, "تفعيل طالب" shortcut is a dead link (search param never read) | `Overview.tsx:111-150,254` |
| Create/edit/publish/delete courses; chapters; lessons; reorder; per-lesson visibility | 🟢 Mostly complete: create/edit/publish, add/rename/delete chapters + lessons, up/down reorder, per-lesson publish toggle, preview tab. **Missing: delete-course button** (reducer only) and lesson **description/supporting materials** | `CourseEditor.tsx`, `DemoStore.tsx:194-345` |
| Upload videos, PDFs, **images**, **exercises, exams** | 🟠 Upload accepts `video/*` and `.pdf` only, stored in IndexedDB (per-browser, invisible to the student app). No image/exercise/exam content types | `LessonDialog.tsx:323-333`, `lib/media.ts:10-29` |
| Student management: list, **add/invite**, assign, activate/**renew**/**deactivate**, **subscription status + expiration** | 🟠 Activate/pending/suspend per course ✅ + duplicate protection ✅. **Missing**: add/invite UI (reducer never called), renew (activating an active enrollment is disabled and only refreshes `authorizedAt`, never `expiresAt`), any expiration display, expired filter, student detail view, teacher view of progress | `Students.tsx:323-412`, `DemoStore.tsx:349-391` |
| **Reception dashboard** (register students, activate/renew, view active/expired, see accessible courses; no content/settings access) | 🔴 **Absent** — 0 matches for reception/استقبال/staff in the repo; no roles to gate with | — |
| **Auth + role-based permissions** | 🔴 **Absent** — no login, no session, no `User`/`Role`/permission types; `DemoState` has one hard-coded teacher profile | `main.tsx:18-26`, `types.ts:121` |
| Announcements publishing | 🔴 **Regression** — `pages/Announcements.tsx` deleted, route replaced by `/exercises`; store actions + seed data now orphaned. Teacher can no longer publish announcements (and the student app can no longer read them) | `App.tsx:13-23`, `git status` |
| (New, untracked) `pages/ExercisesBank.tsx` | 🟠 28 KB of static mock: hardcoded rows, fake metrics, dead buttons, never touches the store. Presents itself in the nav as a real feature | `ExercisesBank.tsx:27,209-217` |

### D. Data model (`packages/shared/src/types.ts`)

Present and correct: `Enrollment.expiresAt`, `Enrollment.payment` (ENR-03), `EnrollmentStatus`, `Announcement`,
`LessonProgress`, gating rule `accessibleCourses` (ENR-06).

Missing for the spec:
1. `expired` status — and nothing derives it from `expiresAt` (the value is written, never read).
2. Request lifecycle states (`requested` / `accepted` / `rejected` / `cancelled`) — `pending` is overloaded.
3. Persisted student unique ID / QR token (the `OST-2025-…` code exists nowhere in the model).
4. Center entity + invitation codes (center is 2 strings on the teacher profile).
5. `User` / `Role` / permission types (teacher, receptionist, student).
6. Multi-center membership (enrollment links only student ↔ course).
7. Payment records as separate, repeatable entities (currently ≤1 inline object per enrollment, no status).
8. `Lesson.description` + attachments array (currently one `file`), `LessonKind` for images/exercises/exams.
9. Notification/read-unread entity (announcements exist but no per-student read state).

---

## 3. What already matches the spec (don't rebuild it)

* Course → chapter → lesson hierarchy with reorder and per-lesson visibility — solid.
* Enrollment gating (`published` + `active`) and duplicate-enrollment protection — solid.
* Splash, welcome/login/signup UI shells, course detail, video resume/complete, rasterised PDF reader, profile.
* Offline-first Arabic RTL layout implemented explicitly (correct-first-launch behaviour to preserve when adding FR/LTR).
* Payment & expiry *fields* already exist in the model with the right semantics (PRD ENR-03/ENR-06).
* Sync payload (`OSTADI1:`) as the backend substitute; typecheck green across shared/dashboard/app.

---

## 4. Conflicts: current uncommitted work vs. the spec

These new screens actively contradict the MVP and need a decision before further building:

| File | Conflict |
| --- | --- |
| `apps/student-app/src/screens/TutorsScreen.tsx` (24 KB) | **Public tutor marketplace** with prices, ratings, «احجز حصة», «الحصة الأولى مجاناً» — spec says explicitly *"not a marketplace for discovering teachers"* |
| `.../SessionsScreen.tsx` (25 KB) | Booking/session scheduling — out of MVP scope, marketplace-adjacent |
| `.../MessagesScreen.tsx` (21 KB) | Hard-coded chat mock; replaces the deleted Announcements screen but satisfies neither the spec's Updates tab nor announcements |
| `.../QuizScreen.tsx` (21 KB) | Quiz engine — spec places interactive exams outside the MVP |
| `.../LibraryScreen.tsx` | Replaced the Announcements tab; labels completion as "downloaded" |
| `apps/teacher-dashboard/src/pages/ExercisesBank.tsx` (28 KB) | Static fake analytics page for a feature the spec defers |
| Deletion of `AnnouncementsScreen.tsx` + `pages/Announcements.tsx` | **Regression** — spec *requires* teacher announcements → student Updates |

Good news inside the same batch: `WelcomeScreen`, `LoginScreen`, `SignupScreen`, `StudentCardScreen`,
`covers.ts`, `useScrollToTopOnTabPress.ts` are all on-spec starting points (UI-complete, logic stubbed).

---

## 5. Prioritized action plan

**Phase 0 — Decisions: ✅ RESOLVED (Oct 2026)**

| # | Question | Decision |
| --- | --- | --- |
| 1 | Conflicting screens | **Remove** `Tutors`/`Sessions`/`Quiz`/`Messages`/`ExercisesBank`; **restore announcements** in both apps (becomes the base of the Actualités tab). |
| 2 | Student-type field | Exactly **Bac Libre / Moutamadris** — «باك حر» / «متمدرس» (AR), "Bac Libre" / "Moutamadris" (FR). A dedicated field, distinct from school level. |
| 3 | Multi-center rule | **Multiple centers allowed** per student (model: student ↔ center membership ↔ course enrollment). Demo seed keeps one center. |
| 4 | QR approach | **Real QR encoding** of a non-sensitive short student code (e.g. `UST-7F3K2`), stored in the model; dashboard supports manual code entry + simulated scan; authorization is verified in the store, never implied by the QR. |
| 5 | i18n timing | **Full i18n layer first** (Phase 1): dictionaries + RTL/LTR switching before new screens, then migrate all strings. |
| 6 | Cross-app flow | **Reuse the `OSTADI1:` sync payload**: center creates request → student imports → accepts → acceptance returns on next sync. No server. |

**Phase 1 — Foundations (unblocks everything else)**
6. Extend the shared model: center entity + invitation code, student unique ID, request states, `expired` derivation from `expiresAt`, roles, notification/read state, lesson description/attachments, `LessonKind` extension.
7. Build the i18n layer (FR/AR dictionaries, RTL/LTR switching) — the one change with the widest blast radius; do it before adding more screens.
8. Introduce auth + roles in both apps (even demo-grade: role switcher → permission gating), which is the precondition for the reception dashboard.

**Phase 2 — The spec's core loop (highest demo value)**
9. Real QR/student code in `StudentCardScreen` + center-side entry/scan in the dashboard → creates an enrollment *request*.
10. Student-side Accept/Reject notification (restores a real Updates feed — kill the Messages mock).
11. Post-acceptance flow in the dashboard: scoped profile visibility, assign courses, set subscription period, record cash payment (separate state), activate.
12. Enforce `expiresAt` everywhere (dashboard expired metric/filter, student app expiry messaging, download policy decision).

**Phase 3 — App structure**
13. Rebuild navigation to the 5 spec tabs (Accueil / Cours / Téléchargés / Actualités / Profil) with FR labels.
14. Downloads tab: `expo-file-system`, progress/size/delete/storage, controlled offline playback, expired-subscription policy (spec leaves the policy to us — propose: downloads stay playable until `expiresAt`, then lock on next launch with network).
15. Restore announcements as the Actualités tab (deep-link to course/lesson, read/unread) — reuse the deleted screens as a base.

**Phase 4 — Reception dashboard + dashboard completion**
16. `/reception` route: student search/ID entry, register, activate/renew, active/expired views, accessible-courses check — no course-content/settings access.
17. Dashboard gaps: add/invite student UI, renew + duration picker, expiration display/filter, delete-course button, lesson description/supporting materials, image/exercise upload types, overview metrics.

**Phase 5 — Polish**: forgot-password, password confirmation, search, expand/collapse, playback speed + previous-lesson, exercise/exam indicators, error/retry states.

---

## 6. Effort sanity check

The single most expensive item is **Phase 1.7 (i18n)** — every Arabic literal in ~30 screens must move into
dictionaries. The second is the **enrollment lifecycle** (Phase 2), which touches the shared model, both
stores, and ~8 screens. Everything else is incremental. If you want maximum spec coverage per unit of
effort, do Phases 1–2 first: they turn the prototype from "content demo" into "the product the spec
describes."
