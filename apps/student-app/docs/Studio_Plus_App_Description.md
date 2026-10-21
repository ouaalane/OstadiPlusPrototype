# Studio Plus — App Description & Landing-Page Source

**Product:** OstadiPlus / أوستادي بلس  
**Working title used in this brief:** Studio Plus  
**Prepared:** October 2026  
**Basis:** the current student app build (labelled v2.4.0) and its shared content catalogue  
**Purpose:** one source of truth for the landing page, sales deck and app-store copy

> **Two notes before we start**
>
> **The name.** This brief and the PDF filename use **Studio Plus**. The product in the app, the logo, the package name and the shared content library is **OstadiPlus** (Arabic: **أوستادي بلس**; the Welcome screen also uses **أستاذي بلس**, and the shared dictionary uses **Ustadi Plus**). This document uses **OstadiPlus** for accuracy and keeps “Studio Plus” as the working title on the cover. The final brand name needs one decision — see Open Questions.
>
> **The status.** The app is a high-fidelity, working prototype with a real content catalogue, real playback, real quizzes and real local progress. Some of the surrounding mechanics — accounts, verification codes, payments, push notifications, cloud sync and true over-the-network downloads — are demo scaffolding. They are marked **demo** or **TBC** wherever they appear. Do not turn them into public promises until they ship.

**TBC** = to be confirmed. It marks a product, commercial or legal decision that the current build does not answer.

---

## 1. The product at a glance

| | |
|---|---|
| **Name** | **OstadiPlus** · أوستادي بلس |
| **Category** | Arabic-first mobile learning companion for Moroccan students, built around their teacher or center |
| **What it does** | Brings a teacher's course — video lessons, PDFs, written summaries and quizzes — into one structured app with progress, offline study, Q&A and a digital student card |
| **Who it is for** | 2ème Bac students preparing for the Moroccan national exam, their parents, and the teachers/centers who run the courses |
| **Content today** | 2 published courses (Mathematics and Physics, 2ème Bac), 12 chapters, 50 published lessons: 31 videos, 5 PDFs, 5 text lessons, 9 quizzes |
| **Languages** | Arabic (default, full RTL) and French (full LTR); the interface, layout and typography switch together |
| **Platform** | Android-first native app. iOS is configured in the project but has not been verified as a release. No student web app. |
| **Access model** | The teacher/center activates a student's enrollment per course, with an expiry date. The app shows active, pending, suspended and expired states. |
| **Pricing** | No pricing page, plans, cart or checkout exist in the app. Access is arranged with the teacher/center. **TBC** |
| **Status** | Working prototype with demo data and demo-only account/payment/notification mechanics |

### Tagline

The line already used inside the app, on the first onboarding slide:

> **تعلّم. تابع. انجح.**  
> **Apprendre. Suivre. Réussir.**  
> **Learn. Follow through. Succeed.**

It is short, honest and exam-focused. It can be used as the official tagline, or as the bridge line under a more concrete hero headline.

### Elevator pitch

> **OstadiPlus is the digital arm of your teacher's course.** It puts the lessons, documents, summaries and quizzes your teacher already gives you into one Arabic-first app — in the right order, with your progress saved, and ready to study even when the connection is not. Your center activates your access; the app keeps the course, the practice and the questions in one calm place until exam day.

### One-line description

**Your teacher's course, in your pocket — online or off.**

### Alternative one-liners

- **The whole course. One calm place.**
- **Learn with your teacher, not an algorithm.**
- **From the classroom to your pocket, without losing the thread.**
- **Your lessons, your progress, your bac — in one app.**

### What it is not

Clarity helps a landing page as much as a feature list. OstadiPlus is **not**:

- a live-class or video-conferencing tool;
- a marketplace of thousands of independent courses;
- an AI tutor or a chatbot;
- a social network (Q&A is course-based, not a feed or direct messaging);
- a replacement for the teacher or the center;
- a self-serve checkout product in its current form.

It is a focused companion to a real course, taught by a real teacher, sold through a real center.

---

## 2. The problem it solves

### 2.1 For students: the course is everywhere and nowhere

A typical bac student's material lives in a WhatsApp group, a Google Drive folder, a YouTube link, a printed handout and a notebook. The consequences are predictable:

- **The thread is lost.** Which video came after which chapter? Which sheet belongs to which lesson? Which quiz was supposed to test it?
- **Every break costs time.** A student stops a video, closes the app, and has to find the exact place again.
- **Revision is passive.** Watching is easy; practicing at the right moment is harder. Quizzes are often separate from the lesson.
- **Connectivity is not guaranteed.** Streaming a long video on mobile data is expensive and unreliable, especially outside big cities.
- **Questions wait.** A student stuck at 23:00 has no structured way to ask the teacher; the question disappears in a group chat.
- **Progress is invisible.** Students and parents cannot tell what has actually been completed, only what has been opened.
- **Paper is heavy.** PDFs and photocopies are difficult to search, carry and keep organised.

### 2.2 For parents: paying for something they cannot see

Parents pay for lessons and want reassurance that the content is serious, that it comes from the teacher they trust, and that their child is actually progressing. Scattered links and screenshots do not provide that reassurance. A clear course structure, visible completion and a legitimate teacher/center relationship do.

### 2.3 For teachers and centers: teaching is only half the job

Teachers and center directors deal with the other half: sharing files, answering the same question repeatedly, checking who has paid, renewing access, and protecting their own work from being copied and resold. A generic folder or group chat does none of this well.

### 2.4 Why existing tools fall short

| Tool | What it does well | Where it breaks for this use case |
|---|---|---|
| WhatsApp / Telegram groups | Fast, familiar, everyone has it | Files disappear in the feed; no structure, progress, quizzes or access control |
| Google Drive | Cheap storage and sharing | No learning flow, no completion, no quiz, no student identity |
| YouTube | Reliable video playback | No course order, no enrollment, no offline library, no teacher relationship |
| Global LMS platforms | Powerful course management | English-first, heavy, expensive, poorly adapted to Arabic/RTL and Moroccan center workflows |
| Paper handouts | Works without power or data | Cannot be updated, searched, tracked or practiced |

### 2.5 The job to be done

> **When I sit down to study, help me continue the exact course my teacher gave me — without hunting for links, losing my place, or burning data — and show me what I have actually learned.**

---

## 3. The audience

### 3.1 Primary audience

**2ème Bac students in Morocco, especially SVT and PC streams, preparing for the national exam.** They already have a teacher or center. They study on a phone, often on mobile data, and need structure more than novelty.

What they need:

- one place for the whole course;
- the order the teacher intended;
- the ability to stop and resume;
- practice close to the lesson;
- a way to ask the teacher;
- proof that they are moving forward.

What OstadiPlus gives them:

- a course dashboard, a resume card and a curriculum by semester/chapter;
- video, PDF, text and quiz lessons in the same flow;
- automatic position saving, completion and course progress;
- downloads for offline study;
- course Q&A with a teacher badge on replies;
- a clear "next lesson" path.

### 3.2 Secondary audiences

| Audience | Why they matter | What they need from the product |
|---|---|---|
| **Parents** | Often the ones who pay and encourage | Legitimacy, visible progress, a serious teacher/center relationship |
| **Teachers** | Own the content and the pedagogy | Control over access, protection of their work, a direct channel to students |
| **Centers** | Sell and administer the course | Enrollment/expiry control, less admin, a branded digital touchpoint |
| **Bac libre candidates** | Study outside a traditional class | Structure, exam-focused content, offline access — but the current catalogue is 2ème Bac only |
| **1ère Bac / tronc commun** | The pipeline before 2ème Bac | Level-appropriate content — supported by the signup model, not yet in the catalogue |

### 3.3 Who it is not for (yet)

- Students looking for a free, self-serve MOOC catalogue.
- International learners who need an English interface.
- Teachers who want a fully self-service storefront with instant card payment.
- Institutions that need SSO, SCORM, timetables or a full school information system.

### 3.4 Illustrative personas

These are role sketches, not research findings or real customers.

**The center student.** Studies 2ème Bac SVT, attends a center in Casablanca, commutes, has a mid-range Android phone and a limited data plan. Wants to rewatch the hard parts and not lose her place. Values Arabic, offline video and a teacher she trusts.

**The bac libre candidate.** Studies independently, works part-time, needs a complete structure and exam-oriented practice. More sensitive to price and connectivity; needs to know exactly what to study next.

**The teacher/center owner.** Teaches mathematics, has 12 years of experience, manages several groups, shares files on WhatsApp and spends too much time re-sending links and checking access. Wants a professional digital layer without becoming a software administrator.

---

## 4. The product: what it is and how it works

### 4.1 The core idea

OstadiPlus does not try to replace the teacher with an algorithm. It takes the course the teacher already teaches and gives it a clean digital shape:

1. **The teacher/center owns the course and the access.**
2. **The student gets a structured, bilingual, offline-ready version of that course.**
3. **Every lesson feeds the same loop:** learn → practice → ask → track → return.

That is the product in one paragraph. Everything else is execution.

### 4.2 The learning loop

| Step | What happens | Where it lives |
|---|---|---|
| **1. Learn** | Watch a video, read a PDF or read a written summary | Video, PDF, Reader |
| **2. Practice** | Take a short quiz on the chapter | Quiz |
| **3. Ask** | Post a question on the course, optionally attached to a lesson | Q&A |
| **4. Track** | See completion, watch time, course percentage and the next lesson | Home, Course Detail, Profile |
| **5. Return** | Reopen the app and resume exactly where the last session stopped | Continue card, resume playback |

The loop is deliberately small. It is the minimum needed for a student to feel that the course is moving, not just a folder of files.

### 4.3 The access model: the center is the front door

OstadiPlus is built around a simple Moroccan workflow:

1. The student joins a teacher's course at a center (or through the teacher's own arrangement).
2. The center/teacher activates the student's access for that course, for a fixed duration.
3. The student signs in and sees only the courses they can open.
4. When access expires, is suspended or is still pending, the app says so clearly and tells the student to contact the center.

This is why the app has no public checkout. The commercial relationship already exists offline; the app is the delivery and study layer. The student card — a QR-style card with a human-readable `UST-XXXXX` code — is the visual bridge for that activation conversation.

**TBC:** whether the final product will also sell directly to students, and whether the center or the platform collects payment.

### 4.4 Three product promises

**One place.** Video, documents, summaries, quizzes, questions and progress are in the same course, in the teacher's order.

**Works when the connection doesn't.** Video lessons can be saved for offline study; PDFs and written lessons are available on the device; progress is stored locally.

**Your teacher is still your teacher.** The course is credited to a named teacher and center. Questions go to the course Q&A, not to a random forum. Access is activated by the people who know the student.

### 4.5 Product principles

- **Teacher-led, not marketplace-led.** The course belongs to a teacher; the app does not flatten every teacher into an anonymous catalogue.
- **Arabic first, not Arabic as an afterthought.** RTL is the default layout, not a mirrored patch.
- **Offline is a feature, not an error state.** A student should be able to plan around a weak connection.
- **Progress over gamification.** Completion and the next lesson matter more than badges, streaks or leaderboards.
- **Calm, focused screens.** No ads, no autoplay feed, no notification noise. The app should feel like a good study desk.

---

## 5. Feature catalogue

Each feature below is described from the student's point of view: what they can do, and why it is worth caring about. The status of prototype-only mechanics is summarised in section 14.

### 5.1 Getting started and access

| Feature | What the student can do | Why it matters |
|---|---|---|
| **Three-slide onboarding** | Swipe or tap through three short slides: learn/track/succeed, offline lessons, and progress/quizzes. Skip at any time. | Sets expectations in under a minute and shows the three pillars before asking for an account. |
| **Arabic/French first run** | Switch the interface language on the Welcome screen or later in Profile. The entire layout flips between RTL and LTR. | Meets students in the language they think in, without a second-class translation. |
| **Teacher/center activation** | See only the courses the teacher/center has activated; see pending, suspended and expired states with a clear explanation. | Matches how Moroccan centers actually sell and renew access. |
| **Login + verification code** | Enter an email or phone number and password, then a 6-digit code with a 5-minute countdown and resend. | A familiar, low-friction sign-in that works on a phone. **Demo in the current build.** |
| **Three-step registration** | Enter name, email, phone and password; choose one of five education cycles and one of 94 Moroccan cities; confirm and accept the terms. | Captures the minimum needed to place a student in the right course and center. **Demo in the current build.** |
| **Demo account picker** | Choose one of 14 demo students with different access states to explore the app. | Lets a teacher, investor or parent see the product without creating an account. **Demo only.** |
| **Digital student card** | Show a QR-style card with the student's name, level, access status and a copyable `UST-XXXXX` code; share the code. | Gives the center a simple, human-readable way to identify and activate a student. **QR scanning TBC.** |
| **Center membership status** | See the associated center and the membership state in the profile/subscription area. | Makes the teacher/center relationship visible, not hidden behind a login. |

### 5.2 Learning experience

| Feature | What the student can do | Why it matters |
|---|---|---|
| **Student dashboard** | See the date, a personal greeting, completed lessons, minutes watched, active courses, a resume card, course cards, subject shortcuts and the latest lessons. | Answers “what should I do now?” in one screen. |
| **Course search and discovery** | Search by course title, subject, level, summary or teacher; browse subject/level categories and popular searches. Search ignores accents, case and common Arabic letter variants. | Finds the right course quickly, even when the student types “fes” for “Fès” or uses a different Arabic spelling. |
| **Structured curriculum** | Open a course and see its semesters, chapters, lesson counts, duration, progress and lesson types. | Turns a pile of files into a programme with a beginning, middle and end. |
| **Video lessons** | Watch with custom controls: play/pause, scrubber, ±10 seconds, previous/next lesson, fullscreen, poster, loading and retry. Playback resumes at the saved position. | Keeps attention on the explanation, not on fighting the player. |
| **PDF documents** | Read a document page by page with a page counter, horizontal swiping and a “document read” action that advances to the next lesson. | Makes worksheets and summaries usable on a phone without a separate PDF app. |
| **Written lessons** | Read a formatted summary with paragraphs, bold text, bullet lists and quotes; mark it read. | Captures the short, high-value explanations that do not need a video. |
| **Quizzes** | Start a short quiz, answer one question per screen (some allow multiple answers), see progress, finish, get a correct/missed/time result, open a per-question breakdown, retry or move to the next lesson. | Converts passive watching into active recall at the right moment. |
| **Course Q&A** | Read all threads in a course, filter all/unanswered, open a thread, see the teacher's badge on replies, and post a question (optionally attached to a lesson). | Gives questions a home and lets the whole class benefit from the answer. |
| **File library** | Browse every PDF across enrolled courses, search by title/course/subject, filter summaries, exercise series and national exams, and see page count and size. | A single revision shelf instead of a folder hunt. |
| **Offline downloads** | Save a single video, a section or all videos in a course; see progress, cancel, delete, and see device storage and app download size. | Makes study possible on a bus, in a low-signal area or without spending data. |
| **Progress and resume** | Every lesson saves its position; course cards show a percentage; the home screen offers the next lesson; completed lessons are marked. | Eliminates the “where was I?” tax and makes progress visible. |
| **Favourites and archive** | Bookmark courses, archive completed ones, and filter the learning library by all/downloaded/archived/favourites. | Keeps a long course list manageable without deleting anything. |
| **Notifications** | See an in-app notification sheet for new lessons, access grants and center requests; receive a device notification for a new lesson and tap it to open the lesson; manage the system permission from Profile. | Brings the student back to the right lesson at the right time. **Push delivery TBC.** |
| **Profile and subscriptions** | See identity, level, center, progress stats, active/pending/suspended subscriptions with expiry dates, language, help, sign-out and the student card. | One place to understand access and account state. |
| **Content protection** | Video playback carries a moving traceability code; screen capture is blocked on physical Android devices while the player is open; playback and downloads are gated by active access. | Protects the teacher's work and makes casual copying harder. **See limits in section 14.** |

### 5.3 Teacher/center side (companion prototype)

The repository also contains a teacher dashboard. It is not the subject of this brief, but it explains where the student app's content and access come from.

- Create courses, semesters, chapters and lessons.
- Add video, PDF, text and quiz lessons; publish or keep as draft.
- Activate, suspend or renew a student's access for a course, with a duration.
- Add students and manage center membership requests.
- Post announcements.
- Copy a sync code that transfers the teacher's dataset to the student app.

**TBC:** whether the dashboard ships as a separate product, is bundled with the center offer, or is replaced by another admin tool.

### 5.4 What the student does not have to do

- Create a course.
- Choose a payment method.
- Build a study plan from scratch.
- Remember where a file was saved.
- Search a group chat for the link.
- Explain to the teacher which lesson they mean.

That absence of work is part of the product.

---

## 6. Step-by-step user journey

### 6.1 First five minutes

1. **Launch.** The splash screen holds the logo while the local session and fonts load.
2. **Onboarding.** Three slides explain the promise: learn/track/succeed, offline lessons, progress and quizzes. The student can skip.
3. **Welcome.** The student sees the brand, the three subject streams (Sciences expérimentales, Sciences mathématiques, Lettres et économie), the language switch and three paths: log in, create an account, or continue as a guest/demo.
4. **Log in.** The student enters an email or phone number and password. A 6-digit code screen follows, with a 5-minute countdown and resend.
5. **Land on Home.** The dashboard greets the student by name and shows the date, their level and center, three metrics (completed lessons, minutes watched, active courses), a search bar and — if they have progress — a “continue where you left off” card.
6. **Open a course.** The course detail page shows the teacher, lesson count, total duration, level, progress and the full curriculum by semester and chapter.
7. **Start a lesson.** The first lesson or the next incomplete lesson is one tap away. Video resumes; PDF opens at page one; text opens as a readable summary; quiz opens with a short intro.
8. **Finish and move on.** The lesson is marked complete and the app offers the next one. Progress updates on Home, Course Detail and Profile.

**Time to first value:** under two minutes if the student already has access; longer if the center still has to activate the account.

### 6.2 A study session

1. Open the app and tap the resume card.
2. Watch a video, pause, rewind 10 seconds, or switch to fullscreen.
3. Leave the video; the position is saved.
4. Open the chapter's PDF or written summary for the formula or rule.
5. Take the chapter quiz; see the score, the time and the questions missed.
6. Retry the quiz or move to the next lesson.
7. Post a question in the course Q&A if something is still unclear.
8. Close the app. The next session starts at the same place.

### 6.3 Getting access through a center

1. The student creates an account or receives a center invitation.
2. The student opens the digital student card and shows the `UST-XXXXX` code (or shares it).
3. The center/teacher finds the student and activates the course for a duration.
4. The student signs in again or refreshes access.
5. The course moves from “pending/locked” to “active” and its lessons become playable.
6. The profile shows the subscription status and expiry date.

**Prototype note:** in the current build, the demo account picker and local demo data stand in for a real center activation; the teacher dashboard and sync payload demonstrate the flow. **Production activation is TBC.**

### 6.4 Returning after a break

- Home shows the last incomplete lesson and the course percentage.
- The player resumes at the saved second; a completed lesson restarts from the beginning.
- Downloaded lessons remain in the learning library.
- The notification sheet shows new lessons or access changes.
- If access expired while away, the course is visible but lessons are locked with a renewal message.

### 6.5 When access is pending, suspended or expired

| State | What the student sees | What they can do | What to do next |
|---|---|---|---|
| **Active** | Course is open; lessons, downloads and Q&A are available | Study, download, ask, track progress | Continue |
| **Pending** | “Access awaiting activation” notice on the course | View the course outline and student card; cannot play or download lessons | Contact the center; show the student code |
| **Suspended** | “Access suspended” notice | View the outline; lessons are locked | Contact the center to restore access |
| **Expired** | Subscription expired / renewal message | Browse the outline; lessons are locked | Renew with the center |
| **No enrollment** | Course appears in search/discovery with an access notice | View the public outline | Request access through the teacher/center |
| **Guest/demo** | Demo account picker with 14 personas | Explore different states (active, pending, no course) | Use a real account for actual study |

### 6.6 A week in the life

- **Sunday:** the teacher publishes a new lesson; the student gets a notification and opens it directly.
- **Monday:** a 20-minute commute becomes a video lesson downloaded the night before.
- **Tuesday:** the student takes the chapter quiz and misses two questions; the breakdown shows which ones.
- **Wednesday:** a question about a limit goes into the course Q&A; the teacher replies; the whole class sees it.
- **Thursday:** the student opens the PDF summary before class.
- **Friday:** the parent sees the completed-lesson count and the course percentage.
- **Saturday:** the student archives a finished course and starts the next chapter.

---

## 7. Why OstadiPlus: the USPs

### 1. It is built around a real teacher, not an anonymous catalogue

Every course carries a named teacher and center. The student knows whose course they are taking, and the teacher keeps the relationship. This is the opposite of a global marketplace where the teacher disappears behind a thumbnail.

**Landing proof:** teacher name, center name, course ownership and the “access activated by your center” flow.

### 2. Arabic-first, with genuine French parity

The default experience is Arabic RTL: the layout, navigation, cards, progress bars, chevrons and typography all mirror correctly. French is not a bolted-on translation; it switches the font family to Inter and the layout to LTR. Most ed-tech tools in the region treat Arabic as a translated afterthought.

**Landing proof:** side-by-side Arabic and French screens, not a language toggle screenshot alone.

### 3. Offline study that fits Moroccan connectivity

Video lessons can be saved for offline use; PDF pages and written lessons are available on the device; progress is local. A student can plan a study session without betting on the network.

**Landing proof:** the download state, the storage card and the “available offline” notice.

### 4. One continuous loop instead of five apps

Video, PDF, text, quiz, Q&A and progress are in the same course. The student does not jump from WhatsApp to Drive to YouTube to a quiz site. The next action is always one tap away.

**Landing proof:** the course page with mixed lesson types and the “continue” card.

### 5. Access control that centers already understand

Active, pending, suspended and expired are first-class states, not error messages. The student card, the expiry date and the center relationship make access legible to everyone.

**Landing proof:** the subscription block and the access-state screens.

### 6. Content protection for the teacher

Each playback requests a 12-character traceability code; the code moves across the video, disappears when paused, and is designed to be traced back to a session. Screen capture is blocked on physical Android devices while the player is open.

**Landing proof:** “your lessons stay yours” — with careful, non-absolute wording.

### 7. Exam-shaped, not content-shaped

The catalogue is organised by semester, chapter and lesson, with national-exam preparation, summaries and short quizzes. The product is designed around the bac calendar, not around an infinite feed.

**Landing proof:** the curriculum structure and the exam-prep chapter.

### 8. Calm by design

No ads, no autoplay feed, no streak guilt, no leaderboard. The interface is white, blue and quiet; the type is readable; the next step is obvious. For a stressed bac student, calm is a feature.

**Landing proof:** the uncluttered Home and Course Detail screens.

---

## 8. Screen-by-screen overview

The app has **19 screens** in four groups: launch/onboarding, access, the four main tabs, and the course/lesson/support stack. The four tabs are **Home / Search / Learning / Profile** (mirrored for Arabic).

### 8.1 Launch and onboarding

#### 1. Launch splash

- **Purpose:** cover the gap while fonts and the local session load.
- **On screen:** brand mark on a soft background.
- **Behaviour:** waits for hydration, then hands over to onboarding or the signed-in app.
- **Why it matters:** no blank flash, no half-drawn first screen.

#### 2. Onboarding

- **Purpose:** explain the product in three slides before asking for anything.
- **Slides:** “Learn. Follow through. Succeed.” (video/documents/resume); “Watch your lessons offline” (download once, watch anywhere); “Track your progress and test yourself” (short quizzes, instant result).
- **Actions:** skip, tap page dots, next, start.
- **Design:** a collage of real course covers, a play glyph and a single primary button.

#### 3. Welcome

- **Purpose:** the front door after onboarding.
- **On screen:** language switch, logo, wordmark, three stream pills, welcome title, subtitle, “Log in”, “Create an account”, “Continue as guest”, terms notice.
- **Why it matters:** a clear choice between an existing account, a new account and a demo, without a wall of fields.

### 8.2 Access

#### 4. Login

- **Purpose:** sign in with an email/phone and password.
- **On screen:** back button, shield medallion, title, subtitle, identifier field, password field with show/hide, “Forgot password?”, primary button, “Create an account”.
- **Behaviour:** inline validation; a locally resolved demo account; a 6-digit code step. The forgot-password message tells the student the password is issued by the center.
- **Prototype note:** any credentials lead to the demo code step.

#### 5. Verify code

- **Purpose:** confirm the sign-in with a 6-digit code.
- **On screen:** six code boxes, the destination email, a live 5:00 countdown, “Verify”, “Resend”, expired-code message.
- **Behaviour:** resend resets the countdown; any six digits complete the demo sign-in.
- **Prototype note:** no code is generated or sent.

#### 6. Create account (3 steps)

- **Step 1 — personal information:** full name, email, student phone, password with strength meter, show/hide.
- **Step 2 — school path:** five cycles (Primary, Collège, Lycée/BAC, Bac libre, University & vocational training) and a searchable city picker with 94 Moroccan cities.
- **Step 3 — confirmation:** summary of name, email, phone, level and city; terms checkbox; “Create account”.
- **Why it matters:** it covers the full Moroccan education ladder, not just 2ème Bac, and it respects the city/academy structure.
- **Prototype note:** the form is real, but finishing signs into the first active demo student rather than creating a persistent account.

#### 7. Demo account picker (guest path)

- **Purpose:** let a visitor explore the app with a realistic student identity.
- **On screen:** 14 student cards with monogram, name, level and a status pill (ready / pending / no course), a sync-payload panel and a reset-demo link.
- **Why it matters:** a teacher or investor can see active, pending and empty states without setup.
- **Prototype note:** demo only; not a production feature.

### 8.3 Main tabs

#### 8. Home

- **Purpose:** the daily dashboard.
- **On screen:** date, greeting, student name, level and center; bell with unread dot; avatar; three metrics (completed lessons, minutes watched, active courses); search bar; “continue where you left off”; “my courses” with progress bars; subject rail; latest lessons; access-needed empty state.
- **Actions:** resume, open a course, open a lesson, search, open notifications, go to profile.
- **Notification sheet:** new lesson, access granted, center request; a new-lesson row deep-links to the lesson.
- **Why it matters:** it answers “what now?” before the student has to think.

#### 9. Search

- **Purpose:** discovery across the published catalogue.
- **On screen:** search field, clear button, popular searches, categories with counts, live results (cover, title, teacher).
- **Behaviour:** case-, accent- and diacritic-insensitive; Arabic letter normalisation (أ/إ/آ → ا, ى → ي, ة → ه, ؤ → و, ئ → ي); matches title, subject, level, summary and teacher.
- **Empty states:** no query shows categories; no results shows a clear message.

#### 10. My Learning

- **Purpose:** the student's course library and offline centre.
- **On screen:** storage card with real device used/free space and app download size; four filters (All / Downloaded / Archived / Favourites) with counts; course rows with cover, teacher, progress, offline stats and actions.
- **Actions:** open a course, continue the next lesson, favourite/unfavourite, archive/unarchive, delete all downloads for a course.
- **Why it matters:** it separates “what I am studying” from “what I have saved” without a settings maze.

#### 11. Profile

- **Purpose:** identity, access and settings.
- **On screen:** avatar, name, level; stats (completed, watch hours, active courses); student-card entry; menu: my information (level, center, phone), subscriptions, my learning, notifications, language, teacher sync, help, sign out; reset demo at the bottom.
- **Subscription panel:** course title, activation date, expiry date, status pill (active/pending/suspended).
- **Why it matters:** one place to understand why a course is or is not available.

### 8.4 Course and lessons

#### 12. Course Detail

- **Purpose:** the course home.
- **Hero:** teacher/course image, session number, resume lesson title, “Continue” or “First steps” button; access pill if locked.
- **Body:** title, teacher, subject/center, lesson count, duration, level, progress bar, access notice.
- **Tabs:** Sessions / More.
- **Sessions:** semesters → chapters → lesson rows with type icon, duration/pages, completion tick, current-lesson marker, download control; “download section” and “download course” actions.
- **More:** about the course, share, Q&A, library, refresh access.
- **Why it matters:** it is the single page a student needs to understand the whole course.

#### 13. Video lesson

- **Purpose:** watch and complete a video lesson.
- **Player:** custom controls, scrubber, ±10 seconds, previous/next, fullscreen, poster, loading, retry, resume, pause on background/blur.
- **Below the player:** level pill, completion pill, title, teacher, lesson number/duration/size, last-updated date, save/Q&A chips, offline notice if downloaded, tabs (Overview / Chapters / Resources).
- **Bottom bar:** previous lesson, “Complete & next”.
- **Protection:** moving traceability code; screen-capture guard on physical Android devices; enrollment gate.
- **Why it matters:** the video is the heaviest part of the course; the player has to be boringly reliable.

#### 14. PDF lesson

- **Purpose:** read a document without leaving the course.
- **On screen:** title, page counter, horizontally paged images, page count, completion pill, “Document read” button that advances to the next lesson.
- **Why it matters:** worksheets and summaries are part of the course, not an attachment.

#### 15. Text lesson

- **Purpose:** read a short written lesson.
- **On screen:** title, completion pill, formatted body (bold, italic, bullets, quotes), “I read it — done” button.
- **Why it matters:** some ideas are faster to read than to watch, and text is light on data.

#### 16. Quiz

- **Purpose:** active recall.
- **Intro:** question count, estimated time (~30 seconds per question), start button, completed pill if already done.
- **Running:** one question per screen, progress bar, single- or multi-select options, next/finish.
- **Result:** correct/missed/time stats, a message (“Bravo”, “Review the wrong answers”, “Go back and retry”), next lesson, retry, expandable per-question breakdown.
- **Why it matters:** it turns a finished video into evidence of understanding.
- **Prototype note:** finishing marks the lesson complete; the score is shown but not stored as a grade.

#### 17. Course Q&A

- **Purpose:** a shared question space for the course.
- **On screen:** course title, teacher, lesson context if opened from a lesson, question count, unanswered count, filters (All / Unanswered), thread cards with student, time, body and teacher-badged replies, composer at the bottom.
- **Behaviour:** only students with active access can post; all enrolled students see the threads; a question can be attached to a lesson.
- **Why it matters:** one answer helps the whole class, and the teacher does not repeat themselves in five private chats.

### 8.5 Support and identity

#### 18. Library

- **Purpose:** the revision shelf.
- **On screen:** title “Files & summaries”, subtitle “Study Files · Baccalauréat Maroc 2025”, search, category chips (All / Summaries / Exercise series / National exams), count/sort row, file cards with icon, title, subject, teacher, page count, size, downloaded tick and open/download action.
- **Why it matters:** students can find the right worksheet without remembering which chapter it belonged to.

#### 19. Student card

- **Purpose:** identify the student at the center and show access state.
- **On screen:** brand header, avatar, name, level, active/pending pill, QR-style matrix, `UST-XXXXX` code, copy button, “show this to your teacher” note, refresh status, share code, enrollment summary.
- **Why it matters:** it turns an abstract account into something a center can recognize at the desk.
- **Prototype note:** the matrix is a deterministic visual, not a standards-compliant scannable QR; the human-readable code is the reliable identifier. Real QR generation/scanner is **TBC**.

---

## 9. Pricing, free vs paid

### 9.1 What exists in the app today

There is **no pricing page, plan catalogue, cart, checkout, free trial, coupon or in-app subscription management** in the student app.

What exists:

- Enrollment records with a status, an activation date and an expiry date.
- A profile subscription panel that shows the course, status and expiry.
- Demo payment records of **300–350 MAD** for **3- or 6-month** access in the seed data. These are illustrative records, not a public price list.
- A teacher dashboard with duration options of 1, 3, 6 and 12 months.
- Access gating: a student cannot play or download lessons without an active, unexpired enrollment.

What does not exist:

- A way to pay inside the app.
- A way to choose a plan.
- A receipt, invoice or refund flow.
- A free tier or sample lesson.
- A family or multi-course discount.

### 9.2 Free vs paid: the current reality

| Area | Free? | Notes |
|---|---|---|
| Downloading the app | **TBC** | No store listing or price has been set in this build. |
| Creating an account | **TBC** | The signup form exists, but production registration is not implemented. |
| Browsing the catalogue | Not a public storefront | Search and discovery are inside the signed-in app; there is no public web catalogue. |
| Watching lessons | Paid/activated | Requires an active enrollment. |
| Downloading lessons | Paid/activated | Requires an active enrollment; downloads are tied to access. |
| PDFs and text lessons | Paid/activated | Available inside an active course. |
| Quizzes | Paid/activated | Available inside an active course. |
| Q&A | Paid/activated | Posting requires active access; reading is part of the course. |
| Student card | Account feature | Available to signed-in students; activation still depends on the center. |
| Demo accounts | Free evaluation | 14 demo personas; not a production free plan. |

### 9.3 What the landing page can say now

Safe copy:

> **Access is arranged with your teacher or center.**  
> OstadiPlus is not sold through the app. Your center sets the price and the duration; once your access is activated, your courses appear in the app with their lessons, documents, quizzes and progress.

> **Already enrolled?** Sign in with the account your center gave you.  
> **Not yet?** Contact your center to activate your course.

Do **not** publish a price, a “free forever” claim or a “start free trial” button until the commercial model is confirmed.

### 9.4 A proposed pricing section (proposal only — not current app data)

If the client wants a pricing block on the landing page, this is a clean structure that does not invent numbers:

| Plan | Who it is for | What it includes | Price |
|---|---|---|---|
| **Discovery** | Students evaluating the app | Browse the course outline, view a sample lesson, try a quiz | **Free — TBC** |
| **Course access** | Students enrolled in one course | Full course, video/PDF/text/quiz, offline downloads, Q&A, progress | **[price] / [duration] — TBC** |
| **Center programme** | Teachers and centers | Student seats, teacher dashboard, activation/renewal, content protection | **[price] / [seats] — TBC** |

Recommended presentation: two cards (Student / Center), not three, and a line under them: “Final plans and prices are being confirmed. Contact your center for the current offer.”

### 9.5 Questions to settle before publishing prices

1. Is the app free to download, and is there a free sample lesson?
2. Is access sold per course, per semester, per year, or as a center-wide package?
3. Who collects payment: the center, the teacher, or the platform?
4. What is the currency and the accepted payment method (cash at the center, bank transfer, card, mobile wallet)?
5. What happens at expiry: automatic lock, grace period, renewal reminder?
6. What is the refund/cancellation policy?
7. Are there discounts for bac libre candidates, siblings, or full-year payment?
8. Does the teacher dashboard carry a separate price?

---

## 10. Platforms, languages and technical highlights

### 10.1 Platforms and devices

- **Android-first native app.** The current build is verified on an Android emulator (API 36) and has a standalone APK. Package: `ma.atlas.ostadiplus.student`.
- **iOS:** the Expo project includes an iOS bundle identifier and tablet support, but no iOS release has been built or verified. **TBC.**
- **No student web app.** The project can run in a browser for development, but the product is designed for a phone.
- **Portrait, light mode.** The interface is optimised for one-handed phone use; dark mode is not part of the current design.
- **Tablets:** configured, not optimised or verified. **TBC.**
- **Minimum OS version:** not specified in the current build. **TBC.**

### 10.2 Languages and localisation

- **Arabic (default):** full RTL layout, IBM Plex Sans Arabic, mirrored navigation, right-aligned fields, Arabic date/month names, Arabic search normalisation.
- **French:** full LTR layout, Inter, French date/month names, French course labels.
- **All core screens are bilingual**, including onboarding, auth, dashboard, search, course detail, player, PDF/text/quiz, Q&A, library, student card and profile.
- **City picker:** 94 Moroccan cities with Arabic and French labels.
- **Education cycles:** Primary, Collège, Lycée/BAC, Bac libre, University and vocational training.
- **Content language:** the interface is AR/FR; the catalogue's written content is primarily Arabic, and some sample video resources are in French. The language mix of production lessons is **TBC**.

### 10.3 Offline and performance

- **Video:** lessons play from bundled media in the prototype; the download action copies a video to local storage with progress, cancel, delete and real disk statistics. In production this should become a true selective download from a CDN. **TBC.**
- **PDF:** pages are rasterised at build time and bundled, so the reader works without a connection.
- **Text and quizzes:** local data; no network needed.
- **Progress, favourites and archive:** persisted locally with AsyncStorage.
- **Notifications:** local device notifications; no remote push service is connected.
- **First launch:** the splash waits for fonts and the local session, so the first real screen is fully drawn.

### 10.4 Video and document experience

- Custom player, not the stock system player: resume, ±10 seconds, draggable scrubber, previous/next, in-app fullscreen, poster, loading and retry states.
- Pause on app background/blur; position saved continuously.
- Completed lessons restart from the beginning; incomplete lessons resume.
- PDF reader is page-by-page, not a PDF engine: reliable, offline, but no text selection, search or zoom.
- Quiz has no countdown; it records elapsed time and shows it in the result. This is a deliberate low-pressure choice.

### 10.5 Access, privacy and content protection

- **Enrollment gate:** playback and downloads require an active, unexpired enrollment for a published course.
- **Watermark:** each playback requests a 12-character Base32 code from a small local API; the code moves across the video every 8–15 seconds, fades, and unmounts when paused. The code maps to a student/course/video/session record on the server.
- **Screen capture:** blocked on physical Android devices while the player is open (FLAG_SECURE); emulators are excluded because the secure surface would render black. iOS behaviour is **TBC**.
- **Offline fallback:** if the watermark API is unreachable, the prototype can render an unregistered local code; those codes are not traceable. Production should decide whether to allow offline playback without a registered code.
- **Local data:** the prototype stores the demo dataset, progress, downloads metadata and preferences on the device. There is no cloud account, analytics SDK or advertising SDK in the app.
- **Minors:** a production launch needs a privacy policy, terms, data-retention rules and parent/guardian consent where required. **TBC.**

### 10.6 Under the hood, in plain language

| Technical fact | Why the student should care |
|---|---|
| Expo SDK 57 / React Native 0.86 / React 19 | A current, maintained mobile stack with native video and file APIs |
| Expo Video + custom controls | Reliable playback with the controls a course needs |
| Expo Notifications | Lesson alerts in the phone's notification shade |
| Expo Screen Capture | Blocks screenshots/recording during video on supported devices |
| AsyncStorage | Progress and preferences survive closing the app |
| Bundled media + local file system | Works offline; large prototype app size |
| Optional watermark API (Node + SQLite) | Issues and traces per-playback codes without a full backend |
| Teacher sync payload | Transfers the teacher's demo dataset to a student device |
| No ads / no analytics SDK | A quieter, more private study experience |

### 10.7 Claims we should not make yet

- “Works on iOS” — configured, not verified.
- “Download any lesson over the air” — prototype downloads are local copies of bundled media.
- “Push notifications” — current alerts are local/demo, not FCM/APNs.
- “Sync across devices” — progress is local; the teacher sync payload is a demo bridge.
- “Scan the QR code” — the matrix is decorative; the human-readable code works.
- “Every leaked video is traceable” — offline fallback codes are unregistered.
- “Thousands of lessons” — the catalogue has 50 published lessons.
- “Free” — no pricing model is set.
- “Guaranteed bac success” — never make an outcome promise.

---

## 11. Design, brand and tone

### 11.1 Visual identity

The app's design system is white, blue and quiet: white surfaces, hairline borders, one vivid brand blue, soft shadows and generous corner radii. It feels closer to a well-made study app than to a gamified social product.

| Token | Value | Use |
|---|---|---|
| Brand blue | `#0B5CFF` | Primary buttons, links, active states, progress |
| Deep blue | `#0546C8` | Gradients, pressed states, header depth |
| Ink | `#0B1220` | Headlines and primary text |
| Body | `#4B5563` | Paragraphs |
| Muted | `#6B7280` | Secondary labels |
| Faint | `#9CA3AF` | Hints and metadata |
| Canvas | `#FFFFFF` | Page background |
| Soft blue | `#F2F6FF` | Pills, inset panels, selected rows |
| Hairline | `#E5E7EB` | Card borders and dividers |
| Amber | `#FFB400` | Accent, pending states, highlights |
| Green | `#12B76A` | Success, completion, active access |
| Red | `#E5484D` | Errors, suspended access, destructive actions |

**Typography:**

- Arabic: **IBM Plex Sans Arabic** (400/500/600/700).
- French: **Inter** (400/500/600/700).
- Scale: 11 px eyebrow, 12.5 px meta, 14.5 px body, 16 px card title, 20–24 px section title, 28 px display.
- Uppercase eyebrows with wide tracking; tight, confident headlines; generous line height in Arabic.

**Shape and surface:**

- Radii: 10/12/16/20/24 px and full pills.
- Cards: white, 1 px border, very soft shadow; border-first, shadow-second.
- Course cards: full-width 16:9 cover, play glyph, subject chip, lesson count.
- Buttons: solid blue primary; white outline secondary; amber accent for “continue” moments; soft blue for tertiary actions.

### 11.2 Logo and brand assets

- The mark combines a graduation cap with a play button, in a blue-to-violet gradient.
- The wordmark appears as **OstadiPlus** in Latin and **أوستادي بلس** in Arabic.
- The app uses a light, airy palette; the logo is the most saturated element on the Welcome screen.
- Existing assets: app icon, adaptive icon, splash icon, logo, logo lockup, course cover art, teacher/student photography.
- **TBC:** official logo files, clear space, minimum size, colour variants and Arabic lockup guidelines.

### 11.3 UI principles

1. **One primary action per screen.** Continue, start, verify, finish.
2. **Show the next step.** The course page and player always offer “next”.
3. **Never hide access state.** Pending, suspended and expired are explained in plain language.
4. **Respect the reading direction.** RTL is a full mirror, not a text alignment.
5. **Use real content as decoration.** Course covers and lesson titles, not generic illustrations.
6. **Keep the chrome quiet.** White space, hairlines and one blue accent.

### 11.4 Tone of voice

**In one sentence:** like a good teacher — clear, calm, direct and encouraging, never hyped and never childish.

Do:

- Use short, concrete sentences.
- Name the action: “Continue the lesson”, “Download for offline”, “Ask your teacher”.
- Respect the student's time and intelligence.
- Use “you” and the student's language; in French, use “vous”.
- In Arabic, use simple Modern Standard Arabic, not dialect, and keep the product name in Latin script where the brand does.
- Be precise about access: “Your access is awaiting activation” is better than “Error”.

Don't:

- Promise a bac result, a grade or a rank.
- Use “revolutionary”, “AI-powered”, “world-class”, “game-changing”.
- Use babyish gamification language (streaks, coins, leaderboards) that the product does not have.
- Use fear (“Your friends are ahead of you”).
- Overuse exclamation marks.
- Mix Arabic and French inside one sentence unless the brand name requires it.

### 11.5 Landing-page art direction

- **Mirror the app.** White canvas, brand blue, IBM Plex Sans Arabic for Arabic headlines, Inter for Latin.
- **Show real UI.** Use actual screens (Home, Course Detail, Video, Quiz, Q&A) rather than abstract dashboard illustrations.
- **One hero image, one idea.** A phone with the course screen, a calm blue field, a short headline. No collage of five devices.
- **Bilingual by design.** If the page is Arabic, make RTL the default; do not put Arabic in a left-aligned box.
- **Use teacher/center imagery with permission.** A real teacher portrait is stronger than stock photography, but only with a signed release.
- **Keep the palette disciplined.** Blue for action, amber for attention, green for success, red only for errors.
- **Leave room.** The product is about focus; the landing page should not feel busier than the app.

### 11.6 Accessibility

The app includes accessibility roles, labels, hints and live-region announcements on key controls; touch targets are generally 40–44 px; the layout mirrors for RTL; text uses scalable font sizes. It has **not** been through a formal WCAG audit.

For the landing page:

- maintain 4.5:1 contrast for body text;
- do not put essential text in images;
- caption video/animated demos;
- make the language switch keyboard-accessible;
- test with a screen reader in Arabic and French;
- avoid autoplay with sound.

### 11.7 What to avoid visually

- Dark, “gamer” gradients or neon.
- Generic stock photos of smiling students with laptops.
- Fake dashboards with numbers the product cannot produce.
- Dense feature grids with 20 icons.
- Arabic text in a Latin font or with broken letter joining.
- A pricing table with invented prices.
- Testimonials or logos without permission.

### 11.8 Landing-page review checklist

Use this list in the final review, before the page is handed to development.

| Area | Check | Pass condition |
|---|---|---|
| Copy | The H1 names the student's gain, not the technology. | A 2ème Bac student understands it in one read. |
| Copy | Every number matches the app catalogue. | 2 courses, 50 lessons, 31 videos, 36 PDF pages. |
| Copy | Access is described as coming through the teacher or center. | No "buy now", no invented price, no "free forever". |
| Copy | Arabic is written by a native editor. | RTL alignment, letter joining and punctuation are correct. |
| Visual | Every device frame contains a real app screen. | No invented dashboard, chart or metric. |
| Visual | Colour, type and spacing match the app. | Placed side by side, page and app look related. |
| Visual | Arabic uses IBM Plex Sans Arabic; Latin uses Inter. | No Arabic text in a Latin face. |
| Visual | The page has one hero idea. | One phone, one headline, one action above the fold. |
| Build | The page works at 360 px wide. | No horizontal scroll; tap targets are 44 px. |
| Build | The language switch is keyboard-accessible. | Focus is visible and the order is logical. |
| Build | Images and fonts are compressed. | Hero loads in under 2.5 s on a 4G test (target). |
| Legal | Privacy, terms and media permissions are ready. | Footer links resolve; no unlicensed content. |

---

## 12. Suggested landing-page content

This section is a copy-ready draft. It assumes the landing page is primarily **English** for the client review, with Arabic and French hero variants for the real market. The final language mix is **TBC**.

### 12.1 Page architecture

1. **Hero** — promise, product shot, primary/secondary CTA, trust microline.
2. **Problem → solution** — three short columns.
3. **Feature grid** — six cards, each with a verb and a benefit.
4. **Product proof** — three real screens: course, player, quiz/Q&A.
5. **How it works** — four steps, center-led access.
6. **Benefits by audience** — students / parents / teachers & centers.
7. **Testimonials** — only if real; otherwise omit.
8. **Pricing/access** — “through your center”, no invented numbers.
9. **FAQ** — eight questions.
10. **Final CTA** — one clear action.
11. **Footer** — product, contact, language, legal.

### 12.2 Meta copy

**Title:** OstadiPlus — Your teacher's lessons, in your pocket  
**Meta description:** Arabic-first video lessons, documents, quizzes and offline study for Moroccan bac students. Access through your teacher or center.  
**OG title:** The whole course. One calm place.  
**OG description:** OstadiPlus brings your teacher's lessons, documents, quizzes and progress into one app — in Arabic and French, online or off.

### 12.3 Hero copy (English)

**Eyebrow:** FOR MOROCCAN BAC STUDENTS

**H1:** Your teacher's lessons, in your pocket.

**Subhead:** Video lessons, documents, quizzes and your progress in one Arabic-first app — built to keep working when the connection doesn't.

**Primary CTA:** See how it works  
**Secondary CTA:** Get access through your center

**Microline:** Arabic & French · Android · Offline-ready

**Alternative headlines:**

- The whole course. One calm place.
- Learn with your teacher. Not an algorithm.
- From the classroom to your pocket, without losing the thread.

### 12.4 Hero copy (Arabic)

**Eyebrow:** مصمّم لتلاميذ الباكالوريا في المغرب

**H1:** دروس أستاذك، في جيبك.

**Subhead:** فيديوهات وملفات واختبارات وتقدّمك الدراسي، في تطبيق واحد بالعربية والفرنسية، يواصل العمل حتى دون اتصال.

**Primary CTA:** اكتشف كيف يعمل  
**Secondary CTA:** احصل على وصولك عبر مركزك

**Microline:** بالعربية والفرنسية · أندرويد · يعمل دون إنترنت

**Alternative headlines:**

- الدور كامل. مكان واحد هادئ.
- تعلّم مع أستاذك، لا مع خوارزمية.
- من القسم إلى جيبك، دون أن تفقد الخيط.

### 12.5 Hero copy (French)

**Eyebrow:** CONÇU POUR LE BACCALAURÉAT MAROCAIN

**H1:** Les cours de votre professeur, dans votre poche.

**Subhead:** Vidéos, documents, quiz et progression — dans une seule application, en arabe et en français, qui continue même sans connexion.

**Primary CTA:** Voir comment ça marche  
**Secondary CTA:** Obtenir l'accès via votre centre

**Microline:** Arabe et français · Android · Fonctionne hors ligne

**Alternative headlines:**

- Tout le cours. Un seul endroit, au calme.
- Apprenez avec votre professeur, pas avec un algorithme.
- De la salle de classe à votre poche, sans perdre le fil.

### 12.6 Problem → solution section

**Heading:** School material is scattered. Attention is too.

**Body:** A video in a WhatsApp group. A PDF in Drive. A correction on a sheet. A question that waits until the next class. OstadiPlus puts the course back in one place — in the order your teacher intended.

**Three columns:**

**One place.**  
Video, documents, summaries and quizzes live in the same course, not in five different apps.

**At your pace.**  
Stop a lesson, close the app, come back weeks later — it opens where you stopped.

**With your teacher.**  
The course is credited to a real teacher and center. Questions go to the course Q&A, not to a random forum.

### 12.7 Feature grid (six cards)

**1. Lessons that pick up where you stopped**  
Your position is saved automatically. No scrubbing, no guessing, no starting over.

**2. Video, paper and practice together**  
Watch the explanation, open the worksheet, then test yourself — without leaving the course.

**3. Built for real connections**  
Save video lessons for offline study. Open PDFs and summaries on the device. Keep going when the signal drops.

**4. Practice while it's fresh**  
Short quizzes after the lesson, instant correction and a per-question breakdown so you know what to review.

**5. Ask your teacher, not a forum**  
A course Q&A where the teacher's reply is clearly marked — and the whole class can learn from it.

**6. Arabic first. French too.**  
A true RTL interface and a real French version, with the same course and the same progress.

**Optional seventh card:** **Know you're on track.** Completed lessons, watch time and course percentage, without streak guilt.

### 12.8 How it works (four steps)

**1. Your center activates your access.**  
OstadiPlus is sold through your teacher or center, not through a faceless checkout. Once activated, your courses appear in the app.

**2. Open your course.**  
Find the semester, chapter and lesson in the order your teacher built. Start with the next incomplete lesson or jump to a topic.

**3. Learn your way.**  
Watch, read, download for offline, and take the chapter quiz. Your progress is saved as you go.

**4. Come back to where you left off.**  
The home screen remembers your last lesson, your course percentage and your next step.

### 12.9 Benefits by audience

**For students**

- Stop hunting for links; the whole course is in one place.
- Study on a weak connection with downloaded videos and on-device documents.
- Practice with short quizzes and see exactly what you missed.
- Ask your teacher in a structured Q&A, not a disappearing group chat.
- Always know the next lesson.

**For parents**

- The course comes from a named teacher and center, not an anonymous feed.
- Progress is visible: completed lessons, watch time and course percentage.
- One legitimate app instead of a folder of forwarded files.
- Clear access status and expiry, so there is no ambiguity about what was paid for.

**For teachers and centers**

- Activate, suspend and renew access per student and per course.
- Keep the course structure, the teacher's name and the center's identity.
- Reduce repeated questions with a shared course Q&A.
- Protect video lessons with a traceability watermark and screen-capture blocking.
- Give students a professional digital touchpoint without building an app.

### 12.10 Product proof section

Use three real screens, each with a one-line caption:

1. **Home** — “The next lesson is always one tap away.”
2. **Course Detail** — “The whole programme, in your teacher's order.”
3. **Quiz or Q&A** — “Practice, then ask. The loop closes.”

If screenshots are not approved yet, use a phone frame with the course structure and a text-only caption; do not fabricate a UI.

### 12.11 Testimonials and social proof

There are **no real testimonials, ratings, user counts or partner logos** in the current app. Do not invent them.

If the client can provide them, use this format:
> “One sentence about what changed for the student.”  
> — First name, level, center/city

For a teacher:
> “One sentence about access control, content protection or student questions.”  
> — Teacher name, subject, center

If no testimonials are available, replace the section with **product facts**: “50 published lessons”, “31 videos”, “36 PDF pages”, “Arabic & French”, “Android”, “offline-ready”. Facts are stronger than fake praise.

### 12.12 Pricing/access section

**Heading:** Access comes through your center.

**Body:** OstadiPlus is not sold through the app. Your teacher or center sets the price and the duration. Once your access is activated, your courses appear with their lessons, documents, quizzes and progress.

**Two cards:**

**For students**  
Already enrolled? Sign in with the account your center gave you.  
Not yet? Contact your center to activate your course.  
**CTA:** Contact your center

**For teachers and centers**  
Bring your course into a structured, bilingual, offline-ready app.  
**CTA:** Book a walkthrough

**Footnote:** Plans and prices are being confirmed. Contact your center for the current offer.

### 12.13 FAQ

**Is OstadiPlus free?**  
There is no in-app purchase. Access is arranged with your teacher or center, who sets the price and duration. The app itself is free to explore with a demo account. **TBC** for the final commercial model.

**Do I need internet?**  
You can study downloaded videos and on-device documents without a connection. Q&A, new notifications and access changes need a connection.

**Which devices does it work on?**  
Android today. An iOS version is configured but not yet released. **TBC.**

**Which subjects and levels are available?**  
Today: Mathematics and Physics for 2ème Bac (SVT and PC). The account model covers five education cycles, from primary to university; the catalogue will grow. **Roadmap TBC.**

**Does it replace my teacher?**  
No. It is the digital layer of your teacher's course. The teacher and center still own the course, the explanation and the access.

**Can I ask questions?**  
Yes — in the course Q&A. Your teacher's replies carry a teacher badge, and the whole class can see the answer.

**Is my progress saved?**  
Yes, on your device. Closing the app does not lose your place. Multi-device sync is not part of the current prototype. **TBC.**

**Can I share my account or download videos?**  
Access is personal. Video lessons carry a traceability code, and screen capture is blocked on supported Android devices. Downloads are for your own offline study.

**How do I get access?**  
Through your teacher or center. Show them your student card/code; they activate the course; it appears in your app.

**Is the content in Arabic?**  
The interface is Arabic and French. The written course content is primarily Arabic; some sample videos are in French. The production language mix is **TBC.**

### 12.14 Final CTA

**Heading:** Put the course back in one place.

**Body:** If you teach in Morocco and want your course to feel as serious on a phone as it does in the classroom, let's talk.

**Primary CTA:** Book a walkthrough  
**Secondary CTA:** See the student app

**Arabic:**
> **العنوان:** أعد الدورة إلى مكان واحد.  
> **النص:** إذا كنت تُدرّس في المغرب وتريد أن يبدو درسك على الهاتف بجدية القسم، لنتحدث.  
> **الإجراء:** احجز عرضاً توضيحياً

**French:**
> **Titre:** Remettez le cours à sa place.  
> **Texte:** Si vous enseignez au Maroc et souhaitez que votre cours garde sa rigueur jusque sur un téléphone, parlons-en.  
> **CTA:** Réserver une démonstration

### 12.15 CTA and microcopy bank

**English**

- Get access through your center
- See how it works
- Explore the student app
- Book a walkthrough
- Talk to us about your center
- Continue where you left off
- Download for offline
- Ask your teacher
- Your access is awaiting activation
- Contact your center to renew

**Arabic**

- احصل على وصولك عبر مركزك
- اكتشف كيف يعمل
- جرّب تطبيق الطالب
- احجز عرضاً توضيحياً
- تواصل معنا بخصوص مركزك
- تابع من حيث توقفت
- حمّل للمشاهدة دون إنترنت
- اسأل أستاذك
- وصولك بانتظار التفعيل
- تواصل مع مركزك للتجديد

**French**

- Obtenir l'accès via votre centre
- Voir comment ça marche
- Découvrir l'application élève
- Réserver une démonstration
- Parler de votre centre
- Reprendre où vous vous êtes arrêté
- Télécharger pour le hors-ligne
- Demander à votre professeur
- Votre accès est en attente d'activation
- Contactez votre centre pour renouveler

### 12.16 Footer

- Product: OstadiPlus / أوستادي بلس
- For: students, parents, teachers and centers in Morocco
- Contact: **TBC**
- Language: العربية · Français · English (landing only — **TBC**)
- Legal: Terms · Privacy · Cookies (if used)
- Store badges: only when the listings exist

---

## 13. The content catalogue: what is inside today

### 13.1 Courses

| Course | Teacher | Level | Chapters | Lessons | Composition |
|---|---|---|---|---|---|
| **الرياضيات · 2ème Bac** | أ. جواد العلمي (Jawad Alami) | 2ème Bac — SVT & PC | 6 | 31 | 22 videos, 5 PDFs, 1 text, 3 quizzes |
| **الفيزياء · 2ème Bac** | أ. أحمد التازي | 2ème Bac — SVT & PC | 6 | 19 | 9 videos, 0 PDFs, 4 texts, 6 quizzes |
| **Total** | 2 teachers | 2ème Bac | 12 | 50 | 31 videos, 5 PDFs, 5 texts, 9 quizzes |

The mathematics course is associated with **مركز الأطلس للدروس** (Center Atlas), Casablanca. The teacher profile mentions 12 years of experience preparing science-stream students for the national exam.

### 13.2 Mathematics: chapter map

| Semester | Chapter | Lessons | What is inside |
|---|---|---|---|
| الدورة الأولى | النهايات والاتصال | 5 | Limits intro, rules summary, limits rules video, limits worksheet, quiz |
| الدورة الأولى | الاشتقاق ودراسة الدوال | 4 | Derivative concept, derivative rules, exercises PDF, curve study |
| الدورة الثانية | الهندسة الفضائية والمتجهات | 4 | Vectors, vectors worksheet, dot product, geometry problems |
| الدورة الثانية | الدوال اللوغاريتمية والأسية | 4 | Logarithm, exponential, functions worksheet, quiz |
| الدورة الثانية | الأعداد العقدية | 12 | 11 videos (affix, collinearity, argument, locus, Moivre, angles, triangle, equations, trigonometry, quadrilateral, trig form) + quiz |
| الدورة الثانية | تحضير الامتحان الوطني | 2 | Exam strategy video, national exam 2021 PDF |

### 13.3 Physics: chapter map

| Semester | Chapter | Lessons | What is inside |
|---|---|---|---|
| الدورة الأولى | الموجات الميكانيكية المتوالية | 2 | Written summary + quiz |
| الدورة الأولى | الموجات الميكانيكية والضوئية | 9 | 8 videos (progressive waves, examples, periodic waves, light waves) + quiz |
| الدورة الأولى | التحولات البطيئة والسريعة | 2 | Video + quiz |
| الدورة الأولى | التحولات النووية | 2 | Written summary (radioactivity, decay law, half-life) + quiz |
| الدورة الثانية | الكهرباء: ثنائي القطب RC | 2 | Written summary (charging/discharging, time constant) + quiz |
| الدورة الثانية | الميكانيك: قوانين نيوتن | 2 | Written summary (Newton's laws, energy) + quiz |

### 13.4 PDF library

| Document | Pages | Size |
|---|---|---|
| ملخص: النهايات والاشتقاق (تذكير) | 5 | 1.3 MB |
| الاشتقاق ودراسة الدوال — الجزء الأول | 8 | 2.6 MB |
| الامتحان الوطني 2021 — الدورة العادية | 3 | 0.9 MB |
| الهندسة الفضائية: الجداء السلمي | 12 | 3.5 MB |
| الدالة اللوغاريتمية — ملخص وتمارين | 8 | 2.7 MB |
| **Total** | **36** | **11.0 MB** |

### 13.5 Video and quiz facts

- **31 videos**, each about **2 minutes** in the prototype, for a total of **62 minutes**.
- **57.1 MB** of bundled video; **11.0 MB** of PDF pages; 31 posters and 36 page images.
- **9 quizzes**, **3 questions each** (27 questions total).
- **5 text lessons** with short summaries, formulas and exam reminders.
- **4 Q&A threads** in the demo data: 2 answered by the teacher, 2 awaiting a reply.
- **14 demo students**, **19 enrollments** (14 active, 3 pending, 2 suspended), **2 center memberships**.

### 13.6 What this catalogue means for the landing page

The catalogue is a **proof of product**, not a claim of scale. Say:

- “50 published lessons across Mathematics and Physics” — true.
- “31 video lessons” — true.
- “36 pages of PDF summaries and exam papers” — true.
- “2ème Bac SVT & PC” — true.
- “More subjects and levels coming” — only if the roadmap is confirmed.

Do not say:

- “Hundreds of courses.”
- “All Moroccan subjects.”
- “Full bac programme in every stream.”
- “Hours of video per course” — the current clips are ~2 minutes each.
- “Taught by Morocco's best teachers” — an unverifiable superlative.

### 13.7 Content rights

The prototype's media includes externally sourced sample educational material (including openly licensed French-language video lessons and worksheet PDFs). Before a public launch, the client must confirm:

- ownership or licence for every video, PDF, image and quiz;
- attribution requirements;
- permission to use teacher names, portraits, center names and logos;
- the production content plan and who authors it.

**This is a launch blocker, not a detail.**

---

## 14. What is real vs demo: the honest status

This table is the most important one for anyone writing public copy. “Working” means a student can actually do it in the current build. “Demo” means the screen is real but the underlying service is not.

| Capability | Status in the current prototype | What production needs | Can it appear on the landing page? |
|---|---|---|---|
| Arabic/French UI, RTL/LTR | **Working** | Maintain localisation | Yes |
| 19 screens, navigation, design system | **Working** | QA on more devices | Yes, with real screenshots |
| 2 courses, 50 lessons, 12 chapters | **Working** (bundled content) | Licensed/owned production content | Yes, with exact numbers |
| Video playback, resume, fullscreen | **Working** | CDN/streaming, rights | Yes |
| PDF reader, text lessons | **Working** | Production documents | Yes |
| Quizzes, scoring, breakdown, retry | **Working** | Question bank, score persistence | Yes, but not “grades saved” |
| Progress, completion, course % | **Working locally** | Cloud sync if multi-device | Yes, with “on your device” |
| Search, categories | **Working locally** | Larger catalogue | Yes |
| Favourites, archive | **Working locally** | Account sync | Yes |
| Q&A threads and teacher replies | **Working locally** (seeded replies) | Real teacher accounts, moderation, notifications | Yes, carefully |
| Downloads | **Demo** — copies bundled media, simulated progress | CDN downloads, DRM, storage policy | Only as “offline study”, not “download from the internet” |
| Login + 6-digit code | **Demo** — any credentials/any 6 digits | Real auth, SMS/email, sessions | No, not as a security claim |
| Signup | **Demo** — form is real, session falls back to a demo student | Real account creation, activation | No, until shipped |
| Teacher/center activation | **Demo data** + local state logic | Backend, roles, audit trail | Yes as a model, not as a live integration |
| Payments | **Not implemented** — seed records only | Checkout/ledger/receipts or offline process | No prices, no “buy” button |
| Push notifications | **Demo/local** — local alerts, demo publish after 4 s | FCM/APNs, preferences, backend | Only “lesson alerts” as a concept |
| Teacher sync | **Demo** — `OSTADI1:` payload between apps | Cloud sync/API | No “sync across devices” claim |
| Student QR | **Decorative matrix** + readable `UST` code | Real QR encoder + scanner | “Student card with a code”, not “scan the QR” |
| Watermark | **Working** with local API; offline fallback unregistered | Production API, key management, enforcement | Yes, with careful wording |
| Screen capture block | **Working on physical Android**; emulator excluded | iOS/OS coverage, policy | Yes, “supported Android devices” |
| iOS build | **Configured, not verified** | Build, test, release | No “available on iOS” |
| Analytics | **None** | Privacy-first analytics if needed | No user numbers |
| Terms/privacy | **Not implemented** | Legal review, minors' consent | Required before launch |

### 14.1 What this means for the brief

- The **learning experience** is real enough to demo and to show on a landing page.
- The **commercial and account layer** is not. Do not describe the app as a finished self-serve product.
- The strongest honest story is: **“a working student app built around a teacher's course, with access managed by the center.”**
- The weakest story is: **“a platform with thousands of courses, instant signup and in-app payment.”** It is not that.

---

## 15. Open questions

A short list for the next conversation. Each answer changes either the copy, the pricing section or the legal footer.

1. **Name.** Is “Studio Plus” intentional, or should the product and the landing page use **OstadiPlus** everywhere? Which Arabic spelling is official: **أوستادي بلس** or **أستاذي بلس**? Is “Ustadi Plus” ever allowed?
2. **Pricing.** What are the real plans, prices, durations and currency? Is there a free tier or sample lesson? Who collects payment — the center, the teacher or the platform? What is the refund policy?
3. **Demo vs live.** Which prototype mechanics may be presented as live on the landing page: accounts, downloads, notifications, QR, sync, watermark? Which must be described as “coming soon”?
4. **Platforms.** Is launch Android-only, or is iOS required? What is the minimum Android version? Is tablet support in scope?
5. **Audience and CTA.** Is the page primarily for students, parents, or teachers/centers? Should the main CTA be “contact your center”, “book a walkthrough”, or “download the app”?
6. **Language.** Is the landing page Arabic, French, English, or multilingual? Which language is primary? Should the page mirror the app's RTL layout?
7. **Content.** Which subjects and levels launch next? Who authors the lessons? Are videos in Arabic, French or both? Can we use the current teacher/center names and portraits?
8. **Proof and legal.** Are there real testimonials, user numbers or partner logos we may use? Do we have screenshot/brand permission, a privacy policy for minors, and licences for every video/PDF?

---

*Prepared as a working document, not a legal or commercial offer. All product facts are drawn from the current build; all forward-looking statements are marked TBC.*
