> Historical report. The exact uploaded assets and current verification are documented in [IDENTITY-SOURCE-REPORT.md](./IDENTITY-SOURCE-REPORT.md). Previous complete-family font substitutions are superseded.

> Historical first-pass report. Current corrections, font mapping and validation are in [REBRAND-REVIEW.md](./REBRAND-REVIEW.md).

# Visual rebrand report

Applied the supplied `oustadi-education-identity.zip` assets to the student app, teacher dashboard, and shared brand tokens. The package's documents were treated as reference material; the requested existing layouts and behavior were preserved.

## Palette mapping

The authoritative palette is mulberry `#68234F`, apricot `#FFCCA9`, lilac `#F1E9F4`, white `#FFFFFF`, and ink `#291E2B`.

| Existing role | Previous values | New values |
| --- | --- | --- |
| Primary/action/active | `#0B5CFF`, `#0546C8`, `#3D82FF` | `#68234F` |
| Brand soft backgrounds | `#E7F0FF`, `#F2F6FF` | `#F1E9F4` |
| Brand/decorative gradients | Blue, cyan, teal, violet, rose, orange combinations | Mulberry → ink; existing gradient directions/stops retained |
| Accent/warning surface | `#FFB400`, `#FFF4D6` | `#FFCCA9` |
| Canvas/inset panels/splash | `#F5F7FC`, `#F1F4FB`, `#F4F6F8`, `#F3F9FD` (mobile canvas was white) | `#F1E9F4` |
| Cards/white surfaces | `#FFFFFF` | `#FFFFFF` |
| Main/body text | `#0F1B33`, `#0B1220`, `#33415C`, `#4B5563` | `#291E2B` |
| Secondary/placeholder text | `#5B6882`, `#8A94AC`, `#6B7280`, `#9CA3AF` | `#6F6072` |
| Borders/strong borders | `#E3E8F2`, `#CFD8EA`, `#E5E7EB`, `#D1D5DB` | `#D7C6DA` / `#796B7C` |
| Success/info | Green/blue foregrounds and soft backgrounds | Mulberry on lilac |
| Error/warning | Red/brown foregrounds and soft backgrounds | Mulberry on apricot |
| Scrims/shadows | Navy RGB `15,27,51`, `11,18,32`, `4,9,18`, `10,20,45`, `8,14,30` | Ink RGB `41,30,43`; original opacity/radius/offset retained |

### Complete central token mapping

#### `packages/shared/src/tokens.ts`

| Token | Old | New |
| --- | --- | --- |
| `brand` | `#0B5CFF` | `#68234F` |
| `brandDark` | `#0546C8` | `#68234F` |
| `brandSoft` | `#E7F0FF` | `#F1E9F4` |
| `brandSofter` | `#F2F6FF` | `#F1E9F4` |
| `gradientFrom` | `#3D82FF` | `#68234F` |
| `gradientVia` | `#0B5CFF` | `#68234F` |
| `gradientTo` | `#0546C8` | `#291E2B` |
| `accent` | `#FFB400` | `#FFCCA9` |
| `accentSoft` | `#FFF4D6` | `#FFCCA9` |
| `success` | `#12A66A` | `#68234F` |
| `successSoft` | `#E3F6EE` | `#F1E9F4` |
| `danger` | `#D93025` | `#68234F` |
| `dangerSoft` | `#FDE8E6` | `#FFCCA9` |
| `info` | `#0EA5E9` | `#68234F` |
| `infoSoft` | `#E4F4FE` | `#F1E9F4` |
| `canvas` | `#F5F7FC` | `#F1E9F4` |
| `surface` | `#FFFFFF` | `#FFFFFF` |
| `surfaceAlt` | `#F1F4FB` | `#F1E9F4` |
| `ink` | `#0F1B33` | `#291E2B` |
| `body` | `#33415C` | `#291E2B` |
| `muted` | `#5B6882` | `#6F6072` |
| `faint` | `#8A94AC` | `#6F6072` |
| `border` | `#E3E8F2` | `#D7C6DA` |
| `borderStrong` | `#CFD8EA` | `#796B7C` |

#### `apps/student-app/src/theme.ts`

| Token | Old | New |
| --- | --- | --- |
| `brand` | `#0B5CFF` | `#68234F` |
| `brandDark` | `#0546C8` | `#68234F` |
| `brandSoft` | `#E7F0FF` | `#F1E9F4` |
| `brandSofter` | `#F2F6FF` | `#F1E9F4` |
| `canvas` | `#FFFFFF` | `#F1E9F4` |
| `surface` | `#FFFFFF` | `#FFFFFF` |
| `surfaceAlt` | `#F4F6F8` | `#F1E9F4` |
| `ink` | `#0B1220` | `#291E2B` |
| `body` | `#4B5563` | `#291E2B` |
| `muted` | `#6B7280` | `#6F6072` |
| `faint` | `#9CA3AF` | `#6F6072` |
| `line` | `#E5E7EB` | `#D7C6DA` |
| `lineStrong` | `#D1D5DB` | `#796B7C` |
| `accent` | `#FFB400` | `#FFCCA9` |
| `accentSoft` | `#FFF4D6` | `#FFCCA9` |
| `success` | `#12B76A` | `#68234F` |
| `successSoft` | `#E7F8F0` | `#F1E9F4` |
| `danger` | `#E5484D` | `#68234F` |
| `dangerSoft` | `#FDECEC` | `#FFCCA9` |
| `info` | `#0EA5E9` | `#68234F` |
| `infoSoft` | `#E4F4FE` | `#F1E9F4` |
| `black` | `#000000` | `#000000` |
| `white` | `#FFFFFF` | `#FFFFFF` |

## Assets and typography

- Replaced student app launcher icon with the supplied opaque 1024px app icon; Expo generates platform sizes during native builds. Preserved every supplied 24/32/48/64/128/256/512/1024px variant in `assets/brand/` and dashboard `public/brand/`.
- Installed supplied Android adaptive foreground/background and monochrome artwork through existing Expo configuration. No generated native directories were created.
- Mobile sign-in/welcome use the supplied two-color app icon, which remains legible on both white and mulberry. Native/JS splash use the supplied mulberry mark on lilac, with the existing 180px presentation unchanged.
- Notification icon uses the supplied transparent white mark. Dashboard and media-generator logo sources use the supplied mulberry mark. Favicons use the supplied artwork. All copied PNG/SVG artwork is unchanged from the upload.
- Added Noto Sans Arabic regular and Bricolage Grotesque bold, with both OFL licenses. Mobile regular Arabic and bold Latin use the supplied files. Missing mobile weights retain IBM Plex Arabic and Inter to preserve weight hierarchy. Dashboard uses Noto Sans Arabic and Bricolage for its wordmark, retaining Inter for regular numeric text.
- Supplied Arabic/French wordmarks and mark variants are retained in each brand asset folder. Existing app naming, bundle IDs, scheme, channels, screen labels, and copy are unchanged; the package's proposed Arabic spelling was not imposed on existing content.
- Existing educational photos, professor branding, lesson videos/documents, demo data, and historical screenshots were preserved. Updated media-template colors/logo source for future generated material without regenerating the educational content.

## Choices where the package was incomplete

- No error/success/info palette: reused mulberry with lilac or apricot surfaces. Existing status labels, icons, and state logic remain unchanged. These states are not distinguished by hue alone.
- No muted/border colors: chose ink/lilac blends `#6F6072`, `#D7C6DA`, and `#796B7C` for readable text and subtle boundaries.
- No hover or gradient specification: reused the supplied primary/ink/lilac colors inside the existing gradient and interaction definitions; no geometry or timing changes.
- Only regular Arabic and bold Latin fonts were supplied: other mobile weights keep their existing fonts. Font family changes can affect glyph metrics/line wrapping even though no font sizes, spacing, or positioning values changed.
- Existing app is explicitly light-only. Its appearance mode was preserved; no dark-mode feature was added.

## Verification

- Dashboard production build and shared/mobile TypeScript checks passed.
- Mobile lint completed: 0 errors, 45 warnings, matching the warning count before this task.
- Android and iOS JavaScript bundles both generated successfully after the rebrand.
- Expo public configuration resolves successfully; icon assets were checked for expected dimensions and transparency (1024px launcher icon is opaque; foreground/notification/splash artwork is transparent).
- Browser smoke checks covered overview, courses, students, reception, questions, and settings at 1440px and 390px, plus the course editor at both widths. No page errors occurred.
- Before/after checks for the six main dashboard routes confirmed unchanged main content bounds and element counts at both widths. AST checks confirmed identical JSX tag sequences and numeric literals in the 19 changed TS/TSX files. Layout, radii, spacing, typography sizes, navigation, callbacks, animation timing, and state/data logic were not changed.
- Contrast: white/mulberry 10.81:1; ink/lilac 13.46:1; muted/lilac 4.93:1; mulberry/apricot 7.45:1. Dashboard hero heading explicitly uses white so it does not inherit ink on the mulberry background.
- Source audit found no old primary blue/gold/splash color literals in current application/theme/media-template sources. Educational content and historical verification files are excluded from branding substitutions.
- Native launchers, notifications, font rendering, and every mobile screen still require a rebuilt app on an Android/iOS device or emulator. This cloud instance has no Android SDK/emulator or iOS runtime; bundling does not establish on-device visual correctness. No claim of pixel-identical native layout is made.
- Dashboard before/after captures and validation logs are in `/workspace/rebrand-validation/` (outside the checkout).

## Changed/added files

Every changed or added file is listed below, including this report. No dependency manifest or lockfile was changed.

- `REBRAND-REPORT.md`
- `apps/student-app/App.tsx`
- `apps/student-app/app.json`
- `apps/student-app/assets/adaptive-background.png`
- `apps/student-app/assets/adaptive-icon.png`
- `apps/student-app/assets/adaptive-monochrome.png`
- `apps/student-app/assets/brand/android-background.png`
- `apps/student-app/assets/brand/android-foreground.png`
- `apps/student-app/assets/brand/android-monochrome.png`
- `apps/student-app/assets/brand/app-icon-1024.png`
- `apps/student-app/assets/brand/app-icon-128.png`
- `apps/student-app/assets/brand/app-icon-24.png`
- `apps/student-app/assets/brand/app-icon-256.png`
- `apps/student-app/assets/brand/app-icon-32.png`
- `apps/student-app/assets/brand/app-icon-48.png`
- `apps/student-app/assets/brand/app-icon-512.png`
- `apps/student-app/assets/brand/app-icon-64.png`
- `apps/student-app/assets/brand/logo-ar-black.png`
- `apps/student-app/assets/brand/logo-ar-mulberry.png`
- `apps/student-app/assets/brand/logo-ar-white.png`
- `apps/student-app/assets/brand/logo-fr-black.png`
- `apps/student-app/assets/brand/logo-fr-mulberry.png`
- `apps/student-app/assets/brand/logo-fr-white.png`
- `apps/student-app/assets/brand/mark-black.png`
- `apps/student-app/assets/brand/mark-mulberry.png`
- `apps/student-app/assets/brand/mark-two-color.png`
- `apps/student-app/assets/brand/mark-white.png`
- `apps/student-app/assets/favicon.png`
- `apps/student-app/assets/fonts/BricolageGrotesque-Bold.ttf`
- `apps/student-app/assets/fonts/BricolageGrotesque-OFL.txt`
- `apps/student-app/assets/fonts/NotoSansArabic-Brand.ttf`
- `apps/student-app/assets/fonts/NotoSansArabic-OFL.txt`
- `apps/student-app/assets/icon.png`
- `apps/student-app/assets/logo-lockup.png`
- `apps/student-app/assets/logo.png`
- `apps/student-app/assets/notification-icon.png`
- `apps/student-app/assets/splash-icon.png`
- `apps/student-app/src/components/LessonPlayer.tsx`
- `apps/student-app/src/components/ui.tsx`
- `apps/student-app/src/lib/lesson.ts`
- `apps/student-app/src/notifications/lessonAlerts.ts`
- `apps/student-app/src/screens/CourseDetailScreen.tsx`
- `apps/student-app/src/screens/LaunchSplash.tsx`
- `apps/student-app/src/screens/QnaScreen.tsx`
- `apps/student-app/src/screens/WelcomeScreen.tsx`
- `apps/student-app/src/theme.ts`
- `apps/teacher-dashboard/index.html`
- `apps/teacher-dashboard/public/brand/android-background.png`
- `apps/teacher-dashboard/public/brand/android-foreground.png`
- `apps/teacher-dashboard/public/brand/android-monochrome.png`
- `apps/teacher-dashboard/public/brand/app-icon-1024.png`
- `apps/teacher-dashboard/public/brand/app-icon-128.png`
- `apps/teacher-dashboard/public/brand/app-icon-24.png`
- `apps/teacher-dashboard/public/brand/app-icon-256.png`
- `apps/teacher-dashboard/public/brand/app-icon-32.png`
- `apps/teacher-dashboard/public/brand/app-icon-48.png`
- `apps/teacher-dashboard/public/brand/app-icon-512.png`
- `apps/teacher-dashboard/public/brand/app-icon-64.png`
- `apps/teacher-dashboard/public/brand/logo-ar-black.png`
- `apps/teacher-dashboard/public/brand/logo-ar-mulberry.png`
- `apps/teacher-dashboard/public/brand/logo-ar-white.png`
- `apps/teacher-dashboard/public/brand/logo-fr-black.png`
- `apps/teacher-dashboard/public/brand/logo-fr-mulberry.png`
- `apps/teacher-dashboard/public/brand/logo-fr-white.png`
- `apps/teacher-dashboard/public/brand/mark-black.png`
- `apps/teacher-dashboard/public/brand/mark-mulberry.png`
- `apps/teacher-dashboard/public/brand/mark-two-color.png`
- `apps/teacher-dashboard/public/brand/mark-white.png`
- `apps/teacher-dashboard/public/favicon.svg`
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-Bold.ttf`
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-OFL.txt`
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-Brand.ttf`
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-OFL.txt`
- `apps/teacher-dashboard/public/logo.png`
- `apps/teacher-dashboard/src/components/AppShell.tsx`
- `apps/teacher-dashboard/src/components/Logo.tsx`
- `apps/teacher-dashboard/src/components/ui.tsx`
- `apps/teacher-dashboard/src/lib/lessonKind.tsx`
- `apps/teacher-dashboard/src/pages/CourseEditor.tsx`
- `apps/teacher-dashboard/src/pages/Overview.tsx`
- `apps/teacher-dashboard/src/pages/Questions.tsx`
- `apps/teacher-dashboard/src/pages/Students.tsx`
- `apps/teacher-dashboard/src/styles/theme.css`
- `assets/logo.png`
- `packages/shared/src/tokens.ts`
- `scripts/media/templates.mjs`
