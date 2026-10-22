# Platform dashboard UX audit and fixes

Scope: the existing web dashboard, including overview, courses, content library, quizzes, course editor, students/access, reception, Q&A, analytics, sync, settings and the fallback route. The student mobile app, shared data model, backend and brand assets are unchanged. The supplied palette, typography and preceding dashboard redesign are preserved.

The installed UI/UX Pro Max, ibelick baseline and accessibility guidance were applied to error recovery, explicit feedback, native controls, keyboard access and readable layouts. This pass addresses observed usability defects rather than introducing additional product features.

## Findings and resolutions

| Area | Observed problem | Resolution |
| --- | --- | --- |
| Content library | Hidden selected items could survive searching; partial selection was unclear. | Searching/filter changes clear stale selections; the checkbox exposes partial selection. |
| Publishing | Rejected bulk publication cleared selection and relied on a brief generic toast. | Blocked items remain selected with persistent explanations and links to their editors. |
| Content creation | An empty course/chapter list left the user at a disabled action. | Explicit first-course/chapter guidance links to the existing creation workflow. Title validation is associated with its field. |
| Media picker | Loading failures looked like an empty uploaded library. | Loading, failure and retry feedback, while bundled assets remain usable. |
| Student access | Zero-result filters removed the controls needed to recover. | Table/search/filter controls stay available, with reset guidance. Students with no enrolment records appear in the appropriate access state. |
| Student verification | Editing a verified code could leave another student's identity/actions active. | Code changes clear identity and actions in both student linking and reception. |
| Memberships | Request success could block a later independent request; QR demo had no equivalent request action. | Current membership determines each student's actionable/status state; demo QR uses the same verification panel. Existing consent and separate course activation rules are preserved. |
| Subscriptions | Editing the form after a successful save could inadvertently create a second period. | A saved form requires an explicit Add or Edit action. Missing-course and no-period states have guidance. Monthly and semester expiry calculations are unchanged. |
| Q&A | Filtered empty states implied missing sync data; replies could disappear from an unanswered view with only a toast. | Clear filters, distinct empty states, persistent contextual saved/publish feedback, draft indicators and preserved line breaks. |
| Drafts | Settings had no navigation warning; ordinary page anchors caused false warnings in authoring. | Settings and reply drafts reuse the existing link/page-close guard; same-page anchors, downloads and modified/new-context clicks do not falsely warn. Search Enter activates the actual result link so this guard also applies. |
| Analytics | Playback position was described as actual watch time; unavailable lessons showed 0/0; attempts depended on insertion order. | Accurate position labels/disclaimer, unavailable-data text, search recovery and chronological submission ordering. No synthetic watch-duration metric is calculated. |
| Settings | Invalid fields and clipboard failures lacked durable recovery; Enter did not submit the form. | Native form submission, focused/associated field errors, saved/unsaved status, and a selectable manual export fallback when clipboard access fails. |
| Sync | Invalid connection details were shown only as a general failure; pulling could silently replace local data. | Inline URL validation, readable connection/retry feedback, busy action labels, and an explicit replacement warning/confirmation with cancel focused. Existing full-state replacement semantics remain unchanged. |
| Shared controls | Simple filters claimed incomplete tab semantics; search mishandled surrounding whitespace; pagination omitted gap markers. | Native filter groups with pressed states, trimmed search, readable student selection labels and correct pagination gaps. |
| Dialogs and navigation | Nested dialog key handlers could compete; destructive confirmation did not identify itself as an alert dialog. | Only the top dialog handles trapping/Escape; confirmations use alertdialog and focus cancel. Search results announce their state, close when focus leaves and clear on navigation. Page navigation resets scroll. |
| Responsive editor | At 1024 px, the course outline left only 89 px for lesson rows. | The stacked outline now provides a 280 px scroll region, with several lesson rows visible. |
| Fallback | Missing page-level heading. | Added an h1 and retained the existing return action. |

The QR remains a demo, as previously requested. This pass does not add centre spaces, change enrolment permissions, merge server data differently or modify student-app screens.

## Changed files

Dashboard source:

- `apps/teacher-dashboard/src/components/AppShell.tsx`
- `apps/teacher-dashboard/src/components/SubscriptionManager.tsx`
- `apps/teacher-dashboard/src/components/authoring/MediaUpload.tsx`
- `apps/teacher-dashboard/src/components/authoring/NewLessonDialog.tsx`
- `apps/teacher-dashboard/src/components/authoring/useUnsavedChanges.ts`
- `apps/teacher-dashboard/src/components/ui.tsx`
- `apps/teacher-dashboard/src/pages/Analytics.tsx`
- `apps/teacher-dashboard/src/pages/ContentLibrary.tsx`
- `apps/teacher-dashboard/src/pages/NotFound.tsx`
- `apps/teacher-dashboard/src/pages/Questions.tsx`
- `apps/teacher-dashboard/src/pages/Reception.tsx`
- `apps/teacher-dashboard/src/pages/Settings.tsx`
- `apps/teacher-dashboard/src/pages/Students.tsx`
- `apps/teacher-dashboard/src/pages/Sync.tsx`
- `apps/teacher-dashboard/src/styles/theme.css`

Verification and documentation:

- `package.json`: extends only the dashboard test command.
- `scripts/check-teacher-workspace.mjs`: exercises the explicit pull confirmation and native PDF filter.
- `scripts/check-authoring-ux.mjs`
- `scripts/check-dashboard-ux.mjs`
- `scripts/check-student-access-ux.mjs`
- `scripts/check-communication-ux.mjs`
- This report.

## Verification

- `npm run dashboard:build`: TypeScript and production bundle.
- `npm run dashboard:test`: 58 checks/journeys across six suites (13 quiz validation, 17 workspace integration, 7 authoring recovery, 10 shared/settings/sync, 5 student/access, 6 Q&A/analytics).
- Independent Chromium audit: 12 routes × 1440/1024/768/390 px = 48 views. No page overflow, browser runtime errors, clipped main actions or unnamed main controls were detected in that scan.
- Dialog review at three widths: named controls, Tab containment, Escape dismissal and focus restoration. Final targeted captures verify the corrected 1024 px lesson outline, fallback heading, and settings/sync controls at 390 px.
- Screenshots and measurements are review artifacts outside Git: `/workspace/dashboard-ux-review/full-audit/` and `full-audit/final/`.
- Local Graphify AST index refreshed; no semantic model calls.

The automated checks exercise the current local/demo platform in Chromium. This is not a comprehensive browser/screen-reader certification or production backend assessment.
