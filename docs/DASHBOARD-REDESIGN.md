# Teacher workspace redesign

Scope: the web teacher dashboard only. The mobile application, shared data model, backend, routes and existing authoring/enrolment workflows are unchanged.

## Direction

The previous iteration improved readability but retained a uniform collection of panels with little separation between navigation, primary actions and daily work. This iteration changes the visual composition:

- Persistent ink sidebar with the supplied white wordmark, clearly separated navigation groups, peach active destination, and the existing workspace/account links.
- Quieter header with current location, global search, questions and publishing destinations.
- Four separate overview metric cards linked to their relevant workspace sections. All values come from the current store; no illustrative growth figures or charts are added.
- Three direct action cards for uploading content, creating quizzes and managing subscriptions.
- Recent course cards with existing cover images, one subject label, publication status, lesson count and an explicit management link.
- A separate attention panel for questions and access requests, a content distribution summary with exact counts, and recent activity.
- Course catalogue summaries, clearer list/grid treatments, and separate first-course/no-search-results guidance. Clearing search and filters restores the catalogue without creating data.
- Shared headers and table presentation aligned with the workspace, retaining keyboard sorting, selection, field error associations and reduced-motion support from the prior pass.

Desktop, tablet and narrow web layouts adapt within the dashboard stylesheet. This does not change the student mobile application.

## Identity

| Role | Existing identity token |
| --- | --- |
| Navigation background and primary text | Ink `#291E2B` |
| Primary actions, links and content bars | Mulberry `#68234F` |
| Active navigation and attention count | Peach `#FFCCA9` |
| Supporting surfaces and icon tiles | Lilac `#F1E9F4` |
| Content surfaces and inverse wordmark | White `#FFFFFF` |
| Fonts | Existing Bricolage Grotesque / Noto Sans Arabic files |

Canvas and muted colours are derived from these existing tokens. No new palette, font or generated brand imagery was introduced.

## Files

- `apps/teacher-dashboard/src/components/AppShell.tsx`
- `apps/teacher-dashboard/src/components/ui.tsx`
- `apps/teacher-dashboard/src/pages/Overview.tsx`
- `apps/teacher-dashboard/src/pages/Courses.tsx`
- `apps/teacher-dashboard/src/styles/theme.css`
- This report.

The installed UI/UX Pro Max and ibelick baseline/accessibility/motion instructions were used. Pro Max's generic generated design-system results proposed unrelated marketing patterns, palettes and fonts; a narrower retry was also unsuitable, so neither result was adopted or persisted. The implementation follows verified general guidance on hierarchy, semantic tokens, keyboard access, real data and readable controls within the existing brand.

## Verification

- TypeScript and production build pass.
- Existing suite: 13 quiz-authoring checks and 17 browser workspace journeys pass, including uploads, publishing, subscriptions, questions/replies, search and route coverage.
- Visual review: seven routes at 1440, 768 and 390 px, with no page overflow or browser runtime errors. Additional overview check at the 1024 px sidebar breakpoint.
- Targeted browser checks pass for real metric values, create/upload/quiz shortcuts, clearing empty searches, list/grid course consistency, the responsive overview, drawer focus restoration and a genuinely empty workspace.
- Additional keyboard/accessibility checks pass for the skip link, Space/Enter sorting, partial selection, field errors and reduced motion.
- Review captures: `/workspace/dashboard-ux-review/redesign/` (outside the repository).

These checks cover the demo dashboard. They are not a production backend or comprehensive assistive-technology certification.
