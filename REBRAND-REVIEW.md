# Rebrand correction review

Baseline: **bf823c7**, immediately before the first rebrand. First rebrand: **b2fb4c0**. This document describes the corrective working-tree changes and supersedes the earlier rebrand report.

## Findings and corrections

| Finding | Correction |
| --- | --- |
| Mobile Arabic regular used the supplied Noto subset, while medium/semibold/bold used IBM Plex. Latin body used Inter and only bold used Bricolage. | One complete family per language, four genuine weights: Noto Sans Arabic and Bricolage Grotesque. No IBM Plex or Inter is loaded by the app. |
| The original Noto brand file lacks Latin letters and ASCII digits. It says Regular in its naming metadata but is internally weight 700. | Complete upstream Noto includes Arabic, French/Latin and digits. Distinct Expo aliases prevent weight substitution. |
| Noto's default ascender/descender produces much taller automatic line boxes than the original font, making unchanged components appear resized/repositioned. | Static brand-face instances retain their glyph outlines/advances, but their vertical line-box metadata matches the original corresponding face. Component text sizes, line-height settings and geometry remain unchanged. |
| The white mobile canvas became lilac because mobile colors spread the shared palette. | White canvas and cards restored; lilac is limited to secondary/inset/soft surfaces and the matching splash backdrop. |
| Opaque custom muted/border shades were invented outside the five-color source; borders became too prominent. | Muted text, dividers and borders use the supplied ink with opacity. No invented hue or opaque shade remains. |
| Several player/thumbnail scrims, glass effects, text shadows and transparent values still bypassed the theme. | Central `overlays` and `colors.transparent` references replace those literals, retaining the original opacity levels. |
| React Navigation only overrode its background, leaving its default primary blue and default font families available. | All navigation color roles and font roles explicitly use brand tokens. Tab active tint uses primary. No route/order/transition changes. |
| Text selections/cursors could still use platform blue. | Existing TextInputs receive theme selection/cursor colors only. No input logic, size or flow changed. |
| Shared/web mirrored typography retained Inter/IBM fallbacks and incomplete faces. | Dashboard CSS loads the same complete eight brand faces; shared/web semantic colors remain aligned. Layout is unchanged. |
| Existing correct launcher, adaptive, notification and in-app logo assets could have been needlessly modified. | Kept the supplied, already-correct artwork. No new image manipulation, asset distortion or element resizing was performed in this correction. |

## UI/UX regression audit

The first rebrand diff did **not** show a moved/added/deleted screen, altered route, changed handler, spacing value, element width/height, radius, animation duration or navigation flow. Its typography/line metrics, background replacement and stronger borders were real visual regressions even though JSX/layout numbers were unchanged. We did not invent structural regressions or reset unrelated application code.

A TypeScript AST comparison against bf823c7 covers **all 43 mobile TS/TSX source files**. JSX tag sequences, non-visual JSX props, all layout/spacing/shape properties, text sizes/line heights/letter spacing, and motion settings match the baseline. Color references, font selection and the equivalent transparent-token sentinel are the allowed presentation differences. Existing input/button states, callbacks, labels, media/security logic, data persistence and navigation remain in place.

Geometry snapshots and source equality are not a claim of pixel-identical native glyph rendering: the chosen typefaces have different glyph widths, and text wrapping can differ. Native device review is still required.

## Source of truth and typography choice

Re-read colors.json, colors.css, START-HERE.md, PHILOSOPHY.md, the font licenses, the mobile preview, logo/mark variants and launcher resources in the uploaded identity. The five supplied colors are the authority.

During this review the user explicitly authorized choosing suitable fonts. Complete versions of the **same two families used in the supplied identity** were downloaded from the official Google Fonts repository; no third typeface was introduced. Real static instances cover 400/500/600/700. Bricolage uses width 100 and optical size 14 for consistent UI text. Font names are unique Expo aliases; metadata alignment preserves original native auto line-box measurements without changing glyph outlines.

The detailed source URLs, SHA-256 checksums, licenses and metric adaptation are recorded in `apps/student-app/assets/fonts/SOURCES.md` and mirrored with dashboard fonts.

| Role | Arabic | French / Latin |
| --- | --- | --- |
| Regular/body/input | NotoSansArabic_400Regular | BricolageGrotesque_400Regular |
| Medium/label | NotoSansArabic_500Medium | BricolageGrotesque_500Medium |
| Semibold/button | NotoSansArabic_600SemiBold | BricolageGrotesque_600SemiBold |
| Bold/title | NotoSansArabic_700Bold | BricolageGrotesque_700Bold |

Sizes, line heights, tracking and all existing per-component weight requests are preserved. Full Noto includes Latin/digit coverage for mixed Arabic labels. Icon glyphs continue to use the original Ionicons font and icon names, since replacing functional icons would change the original app's iconography.

## Final color mapping

The five exact colors are declared once in shared `identityColors`; mobile aliases reference them. Dashboard CSS mirrors them because Tailwind requires CSS tokens.

| Role | Token / value |
| --- | --- |
| Primary actions, links, active icons and tabs, focus/selection | primary **#68234F** |
| Secondary/accent, warning/error soft fill, download-complete accent | accent **#FFCCA9** |
| Canvas, cards, white text, glass base | white **#FFFFFF** |
| Inset/secondary panels, soft brand/info/success surfaces, splash | surface **#F1E9F4** |
| Heading/body/strong text, dark brand end, player base and shadows | text **#291E2B** |
| Muted, faint and placeholder text | ink at **72%** opacity |
| Divider/card border | ink at **12%** opacity |
| Strong border | ink at **28%** opacity |
| Primary depth / existing gradient end | supplied ink; existing directions/stops/geometry preserved |
| Disabled/pressed states | original component opacity/interaction values, unchanged |
| Transparent | ink at 0% opacity, centrally defined |
| Player/thumbnail scrims, glass and text shadows | supplied ink/white with the original per-role opacity levels, all centralized |

### Missing/ambiguous design roles

- The package does not define success/error/warning colors. Success/info use primary on lilac; warning/error use primary on apricot. Existing labels, icons and accessibility semantics distinguish the states. No new green, red or orange was invented.
- No muted/line/disabled shades were supplied. Ink opacity provides those roles; original disabled opacity and pressed behavior remain intact.
- No gradient endpoints or hover shade was specified. Primary and ink are used as the closest supplied dark pair, keeping existing gradients and interactions.
- The source's lilac “surface” is used for secondary/inset surfaces while white remains the original main canvas/card base. This avoids repainting the entire app lilac.
- The app is explicitly light-only. We did not add a dark theme or change the appearance setting. A simulated dark OS preference leaves the same light theme in the browser review.
- Existing neutral black-and-white photograph/content imagery, professor portraits, educational documents/videos, historical screenshots and icon glyph outlines are content rather than obsolete brand tokens and were preserved.

## Logo and launch consistency

The supplied 1024px icon remains the launcher icon. Adaptive foreground/background and monochrome artwork remain the supplied assets. Notification artwork is the supplied white mark. Welcome/sign-in retain the supplied two-color app icon; the splash uses the supplied mulberry mark on lilac. Native splash, JS splash and font-loading backdrop use the same **#F1E9F4** value.

Original image boxes, 180px splash mark frame, clear-space artwork, native imageWidth, and all screen image sizes are unchanged. Android monochrome black is the supplied platform mask, not an invented app palette color. No package IDs, permissions, routes, startup timing or app configuration flags changed.

## Verification

- Dashboard production build: **passed**.
- Shared and mobile TypeScript checks: **passed**.
- Mobile lint: **0 errors, 45 pre-existing warnings**, unchanged count.
- Fresh Android and iOS Metro JS bundles: **passed**, using the normal production configuration, without browser adapters.
- Complete brand font checks: **8 faces**, weights 400/500/600/700, Arabic/French/digit coverage, and original hhea line-box metrics verified.
- AST protection: **43 mobile source files** match the pre-rebrand JSX structure, geometry, non-visual JSX props and motion configuration.
- Browser review: **18 navigable screens × Arabic/French × 360/430px = 72 cases for the corrected app**, compared with the same 72 original cases. Two additional splash widths were reviewed for each version. A standalone comparison gallery contains **148 captures**.
- Visible app text in the browser uses the new family aliases; no IBM Plex/Inter aliases remain loaded by the app. Dark-preference check preserves light-only typography and appearance.
- Source audit: no hex/RGB color literals or hardcoded font-family names remain in mobile components/screens; identity values and opacity variants are centralized in existing theme files. Native app.json retains the exact required static colors and matches the launch tokens.
- Enabled text contrast: white/primary **10.81:1**; ink/white **15.97:1**; ink/lilac **13.46:1**; primary/apricot **7.45:1**; muted/white **6.34:1**; muted/lilac **5.81:1**. Disabled states, photos and video content require contextual device review; these ratios are not a claim of complete WCAG certification.
- `git diff --check`: passed. No dependency declarations or lockfiles were changed.

### Practical limits

This machine has no Android SDK/emulator, connected mobile device or iOS runtime. Browser review uses adapters **outside the checkout** for native filesystem and screen-capture APIs. The adapters are never used by the native bundles. They make layout review possible; they do not validate downloads, capture protection, notifications, native font rendering or native playback/security behavior.

The video screen horizontally overflows in the browser **in both the original and corrected versions**. This is recorded as an existing browser/native-component limitation, not “fixed” by changing the app layout. It still needs native device QA. Inactive CoursesScreen source was audited but is not added to the navigation to manufacture a screen test.

Screens were visited with the original navigation tree and demo seed. The review does not claim a fresh end-to-end production login, payment flow or native release build. Native screenshots of every screen are still outstanding.

External review artifacts (not application code): `/workspace/rebrand-review/comparison.html`, original/fixed screenshots, capture manifests, contrast/font checks, and the AST comparison script. No test adapter or exposed navigation reference was added to the repository.

## All files changed/added in this correction

- `REBRAND-REPORT.md`
- `REBRAND-REVIEW.md`
- `apps/student-app/App.tsx`
- `apps/student-app/assets/fonts/BricolageGrotesque-Bold.ttf`
- `apps/student-app/assets/fonts/BricolageGrotesque-Medium.ttf`
- `apps/student-app/assets/fonts/BricolageGrotesque-OFL.txt`
- `apps/student-app/assets/fonts/BricolageGrotesque-Regular.ttf`
- `apps/student-app/assets/fonts/BricolageGrotesque-SemiBold.ttf`
- `apps/student-app/assets/fonts/NotoSansArabic-Bold.ttf`
- `apps/student-app/assets/fonts/NotoSansArabic-Medium.ttf`
- `apps/student-app/assets/fonts/NotoSansArabic-Regular.ttf`
- `apps/student-app/assets/fonts/NotoSansArabic-SemiBold.ttf`
- `apps/student-app/assets/fonts/SOURCES.md`
- `apps/student-app/src/components/LessonPlayer.tsx`
- `apps/student-app/src/components/VideoWatermark.tsx`
- `apps/student-app/src/components/ui.tsx`
- `apps/student-app/src/i18n/layout.ts`
- `apps/student-app/src/navigation/RootNavigator.tsx`
- `apps/student-app/src/screens/CourseDetailScreen.tsx`
- `apps/student-app/src/screens/LaunchSplash.tsx`
- `apps/student-app/src/screens/LibraryScreen.tsx`
- `apps/student-app/src/screens/MyLearningScreen.tsx`
- `apps/student-app/src/screens/ProfileScreen.tsx`
- `apps/student-app/src/screens/QnaScreen.tsx`
- `apps/student-app/src/screens/SearchScreen.tsx`
- `apps/student-app/src/screens/SignInScreen.tsx`
- `apps/student-app/src/screens/StudentCardScreen.tsx`
- `apps/student-app/src/screens/VideoScreen.tsx`
- `apps/student-app/src/theme.ts`
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-Bold.ttf`
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-Medium.ttf`
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-OFL.txt`
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-Regular.ttf`
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-SemiBold.ttf`
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-Bold.ttf`
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-Medium.ttf`
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-Regular.ttf`
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-SemiBold.ttf`
- `apps/teacher-dashboard/public/fonts/SOURCES.md`
- `apps/teacher-dashboard/src/main.tsx`
- `apps/teacher-dashboard/src/styles/theme.css`
- `packages/shared/src/tokens.ts`
