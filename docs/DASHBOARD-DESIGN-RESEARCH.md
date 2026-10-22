# Teacher workspace: research and redesign decisions

Reviewed 22 October 2026. This is a workflow and interface review, not a market-size study or a claim that the prototype has production infrastructure.

## Sources actually inspected

### Open edX Studio

The official [authoring application's README](https://github.com/openedx/frontend-app-authoring) documents separate visual editors for HTML/text, video and problems, plus Files & Uploads. Its [official problem-editor screenshot](https://github.com/openedx/frontend-app-authoring/blob/master/docs/readme-images/feature-problem-editor.png) shows explicit single/multiple-choice selection and a content preview.

The official documentation was inspected through its Git repository, at revision `1d281ba`, because the rendered documentation domain was inaccessible:

- [About the course outline](https://github.com/openedx/docs.openedx.org/blob/main/source/educators/concepts/open_edx_platform/about_course_outline.rst): sections, subsections and units, with learner progress aligned to the course structure.
- [Manage video components](https://github.com/openedx/docs.openedx.org/blob/main/source/educators/how-tos/course_development/manage_videos.rst): display name, video source, thumbnail, video-download permission and explicit save. It recommends MP4 for broad compatibility.
- [Publish from the outline](https://github.com/openedx/docs.openedx.org/blob/main/source/educators/how-tos/course_development/publish_from_outline.rst): unpublished content is distinct from published content, with publication actions at different levels.

**Application here:** retain the existing course → semester → chapter → lesson model, keep an outline visible next to editing, separate authoring/settings/preview, and review publication explicitly. Open edX's extra hierarchy, licensing, transcript and proctoring features were not added to a mobile app that does not support them.

### Frappe Learning

The official [repository overview](https://github.com/frappe/lms) describes the course/chapter/lesson hierarchy and single- or multiple-choice quizzes. Its published [course screenshot](https://github.com/frappe/lms/blob/develop/.github/hero.png) and [quiz screenshot](https://github.com/frappe/lms/blob/develop/.github/quiz.png) show content next to a persistent outline and clearly structured question/answer blocks. These screenshots show the **learner** view; they were used as hierarchy/readability references, not presented as screenshots of an instructor dashboard.

The actual [LessonForm authoring implementation](https://github.com/frappe/lms/blob/develop/frontend/src/pages/LessonForm.vue) was also inspected: explicit lesson title labeling, upload contexts, dirty-state handling and responsive lesson details.

**Application here:** contextual creation inside a chosen course/chapter, a predictable editor for each supported lesson type, a dedicated quiz bank, clear question navigation and responsive details. No source code, proprietary UI assets, or competitor branding was copied.

### Access limitations

The Teachable, Thinkific, Udemy, Coursera, Moodle Docs and rendered Open edX documentation hosts returned proxy HTTP 403. Their logged-in dashboards were not inspected, and no findings are attributed to those inaccessible pages. GitHub-hosted official documentation/source and screenshots above were readable. The Canvas repository README was reachable but contained no meaningful authoring UX evidence, so it did not inform the redesign.

## Before → after

| Observed problem | New decision | Evidence / constraint |
| --- | --- | --- |
| Oversized colored navigation and repeated page controls | White grouped navigation, compact header and exact supplied wordmark; brand color reserved for actions and selection | Oustadi identity + reducing navigation noise |
| Opening/closing several editing dialogs to change one lesson | Persistent outline and one lesson editor, with content/settings/preview tabs | Open edX authoring; Frappe hierarchy |
| Similar-looking content types and scattered actions | Type icons/labels in outline, library and creation dialog; explicit destination before editing | Existing mobile video/PDF/text/quiz model |
| Upload percentage was simulated and failure recovery was generic | Real XMLHttpRequest upload progress; validation, cancel, timeout, failure and retry; save disabled during processing | Actual local demo upload endpoint |
| PDF page totals relied on text matching | Parse the actual PDF document with PDF.js, using a locally bundled worker | Compressed PDFs cannot be reliably counted with regex |
| Quiz authoring was one long modal | Inline question navigator; correct-answer checkboxes; timing, reorder, delete, JSON import and preview | Frappe single/multiple-choice support; Open edX problem editor |
| Drafts/publication could be confused | Explicit save vs save-and-publish, lesson settings and course publication review; one shared readiness validator | Open edX draft/publish separation |
| Entire course needed navigating to locate an item | Search across courses/lessons; filterable media library and quiz bank | Existing datasets and IDs retained |
| Replies were a long feed with repeated composers | Inbox list plus selected discussion and one contextual reply composer | Existing shared course Q&A model |
| Access manager kept a stale snapshot after activation | Read live enrollment state so the status and disabled button update immediately | Reproduced in existing code; verified in browser |
| Modal focus restarted on each parent render | Stable close callback reference, focus containment and labeled dialogs | Keyboard accessibility; verified by sequential typing |
| Horizontal RTL table overflow affected the page | Constrain hidden labels within positioned table scroll containers | Reproduced at 390 px and fixed |

## Identity and interaction rules

Only the supplied colors are used: `#68234F`, `#FFCCA9`, `#F1E9F4`, `#FFFFFF`, `#291E2B`, plus transparency/mixes of those colors. The existing theme owns these values. The original Latin wordmark preserves the raised “plus”. Supplied Bricolage Grotesque and Noto Sans Arabic files remain unchanged.

White work surfaces, quieter lilac canvas, modest borders, compact controls and readable supporting text replace the previous heavy surfaces. Empty, error, busy, success, unpublished and selected states have distinct copy and visual treatment. Numbers come from the actual prototype dataset; there are no invented revenue or engagement charts.

The student app's screen layout and flows are unchanged by this redesign. Teacher mutations still use the same store/actions and shared domain model; the existing explicit bidirectional demo synchronization remains the integration contract.

## Validation and production boundary

`node scripts/check-teacher-workspace.mjs` starts an isolated API and Vite server, creates real content through the browser, retries a failed upload, checks actual PDF parsing, quiz authoring, access activation, publication, replies and search, and visits every workspace route at desktop/mobile widths. `node scripts/check-quiz-authoring.mjs` checks malformed inputs, answer ownership and publish readiness. The existing demo integration and watermark checks remain relevant.

The interface is implemented and functionally tested. The backend remains the authorized **local connected prototype**: production authentication/roles, per-center authorization, S3-compatible storage, durable queues/transcoding, monitoring, backups, and production deployment have not been implemented by this visual/workflow redesign. QR examples remain clearly labeled demonstration controls; the existing code-lookup activation flow is usable. A browser test does not establish native Android/iOS runtime behavior.
