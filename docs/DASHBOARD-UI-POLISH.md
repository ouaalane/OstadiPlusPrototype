# Teacher dashboard UI refinement

Scope: web teacher dashboard only. The student mobile application, shared data model, routes, navigation sections and authoring workflows are unchanged.

## Identity and findings

The existing identity uses mulberry `#68234F`, peach `#FFCCA9`, lilac `#F1E9F4`, ink `#291E2B` and white `#FFFFFF`, with Bricolage Grotesque and Noto Sans Arabic. The existing logo and font files are retained.

The audit found small supporting text (10–11 px), competing overview actions, inconsistent panel treatment, weak control boundaries, mouse-only table sorting and form messages without explicit programmatic associations. The skip link also conflicted with HashRouter navigation.

## Changes

- `apps/teacher-dashboard/src/styles/theme.css`: central readable typography sizes, consistent surfaces/radii/shadows, clearer input boundaries and focus/selection states, quieter brand-coloured overview surface and shorter entry motion. Existing reduced-motion support is retained.
- `apps/teacher-dashboard/src/components/AppShell.tsx`: skip link focuses main content while preserving the current route; settings destination uses the settings icon.
- `apps/teacher-dashboard/src/components/ui.tsx`: keyboard-operable table sorting with sort direction, partial-selection checkbox state, named scroll regions/progress indicators, and accessible labels/hints/errors for direct native controls in the shared Field component. Reuses existing components and state logic.
- `apps/teacher-dashboard/src/pages/Overview.tsx`: clearer primary/secondary action emphasis and readable course titles; all destinations remain unchanged.
- `apps/teacher-dashboard/src/pages/Analytics.tsx`: reuses the shared named progress indicator.

Only existing brand colours and their opacity/mixes are used. No new fonts, dependencies, screens or alternative mobile-table layouts were introduced.

## Skills

Both requested skill sets were installed before product changes. Pro Max was used with the official ibelick baseline, accessibility and motion rules. Generic palette/font recommendations were rejected in favour of the existing identity. Installer errors, workarounds and upstream version information are recorded in `.agents/UI-SKILLS-INSTALLATION.md`.

## Verification

- Dashboard TypeScript check and production build passed.
- Existing dashboard suite passed: 13 quiz-authoring checks and 17 teacher-workspace journeys, including uploads, publishing, access grants, student questions/replies, search and route coverage.
- Browser visual audit: seven routes at 1440, 768 and 390 pixels (21 captures), with no page overflow or runtime errors. The narrow viewport is the web dashboard, not the student app.
- Targeted Chromium checks passed for keyboard skip navigation, Space/Enter sorting, partial selection, associated announced field errors and reduced-motion preference.
- Before/after captures are stored in `/workspace/dashboard-ux-review/`; these are review artifacts outside the repository.
- Local Graphify AST index refreshed; no model calls used.

The checks cover the demo dashboard workflows and do not establish production backend readiness or a comprehensive assistive-technology audit.
