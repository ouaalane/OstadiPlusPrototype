# Dashboard visual UI fixes

Scope: web dashboard presentation only. The existing brand palette, supplied font files, logo, routes, data and workflows are preserved. No student mobile app, shared package or backend files changed.

This pass uses the installed UI/UX Pro Max, baseline UI and accessibility guidance to correct observed display problems. It follows the preceding dashboard redesign and workflow audit.

## Findings and fixes

| Finding | Visual correction |
| --- | --- |
| Arabic RTL rendering reversed progress fractions, such as 4/50 appearing as 50/4. | Numerators, denominators, percentages and related values use the existing isolated numeric text style. |
| Arabic page counts and Latin file sizes became visually scrambled in the library. | Page labels and numeric duration/size tokens are separate runs with correct text direction. |
| Student course names were sliced to 14 characters. Some names, contacts and catalogue titles also relied on truncation. | Complete course names and filenames are visible; unpredictable text wraps within its column/card. Contact tokens remain individually readable. |
| Wrapped Analytics metric labels moved one value about 20 px below its neighbours. | Shared metric header space keeps the values aligned. |
| Table actions could sit outside the visible area with no indication that more columns exist. | A shared table wrapper displays an explanatory hint only when actual horizontal overflow exists, and names the keyboard-focusable scrolling region. Existing columns are retained. |
| Cards mixed 12 px/shadowed and 16 px/flat treatments; table headers used different fills. | Existing shared tokens now give cards consistent radii/elevation and table headers a common supporting surface. Modal elevation remains distinct. |
| Course-cover choices wrapped into uneven rows and the selected swatch changed size. | Both creation and course settings use a four-column grid, original 5:3 image proportions, and a stable brand outline. |
| Subscription presets wrapped into a 4+1 arrangement at narrow widths. | Months and semesters occupy intentional balanced rows. |
| Some media actions were only 20 px high, and picker titles/filenames hid distinguishing endings. | Existing 36 px button styles, aligned picker rows, and full wrapped names. |
| Cover subject labels stretched across the image and relied on translucent white text. | Compact, readable ink-on-white labels using existing brand tokens. |
| Dialog treatment varied at small browser widths. | Shared modal corners/footer spacing use the same theme and account for browser safe areas. |

## Changed files

- `apps/teacher-dashboard/src/components/ui.tsx`
- `apps/teacher-dashboard/src/components/SubscriptionManager.tsx`
- `apps/teacher-dashboard/src/components/authoring/CourseInfo.tsx`
- `apps/teacher-dashboard/src/components/authoring/MediaUpload.tsx`
- `apps/teacher-dashboard/src/pages/Analytics.tsx`
- `apps/teacher-dashboard/src/pages/ContentLibrary.tsx`
- `apps/teacher-dashboard/src/pages/Courses.tsx`
- `apps/teacher-dashboard/src/pages/Students.tsx`
- `apps/teacher-dashboard/src/styles/theme.css`
- This report.

## Verification

- Production build and TypeScript pass.
- Existing dashboard suite: all 58 checks/journeys pass.
- Browser review: nine routes at 1440, 1024, 768 and 390 px (36 views), with no page overflow or runtime errors.
- Six focused visual checks pass: actual rendered fraction order, metric value alignment, overflow-only scroll hints, complete course names, PDF directionality, four-column cover choices and balanced subscription rows (fraction/alignment share one check).
- Additional media/editor review at three widths confirms actions have the intended size and content does not overflow.
- Review images: `/workspace/dashboard-ux-review/visual-fixes/`. Separate audit captures: `visual-ui-audit/` and `forms-visual/` under the same parent directory. These artifacts are outside Git.
- Local Graphify AST index updated.

Checks use the current Chromium-based demo dashboard; they are not a comprehensive browser or screen-reader certification.
