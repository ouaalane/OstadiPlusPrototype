# Video watermark verification

## Fixes

- Grant requests depend on student/course/lesson identity, rather than `found`/profile object references. Progress saves and the 30-second enrollment refresh no longer clear the displayed code or cancel the session request.
- The existing standalone demo fallback is displayed immediately while a registry-backed grant is pending. The server code replaces it when issued. Offline demo codes remain explicitly **unregistered and untraceable**; disabling `WATERMARK_ALLOW_OFFLINE_FALLBACK` also disables the provisional code.
- The two copies move sequentially. One remains at its normal opacity while the other fades/repositions; interrupted transitions and the watchdog restore visibility. The overlay has its own stacking order and stays independent of the controls.
- Linked demo mode supports browser preflight/POST requests to the video and PDF grant endpoints. This CORS allowance excludes admin trace endpoints and is not enabled in standalone non-demo API mode.

## Repeatable checks

```sh
node check-watermark.mjs
node scripts/check-video-watermarks.mjs
```

The second command starts an isolated Expo web preview, API and SQLite ledger, and opens Chromium through Playwright. Set `PLAYWRIGHT_CHROMIUM_PATH` if Chromium is outside `/usr/bin/chromium`; set `OUSTADI_SCREENSHOT_DIR` to retain screenshots and the per-video JSON report. Temporary servers, media and records are removed afterwards. `MOBILE_PREVIEW_URL` can reuse a review preview exposing `globalThis.__reviewNav`.

The browser fixture publishes all seed video lessons, including drafts, solely in temporary test data. It opens **31 bundled video lessons plus one real uploaded MP4**, verifies actual playback and visible in-bounds watermarks in portrait and landscape, and resolves every displayed server code to the correct student/course/lesson through the admin endpoint. It also checks:

- continuous visibility through random movement, hidden controls, progress saves and the enrollment refresh;
- no duplicate grant issuance from those state updates;
- rapid pause/resume and resuming after the pause fade has completed;
- slow issuance, request timeout/retry and offline fallback without a blank overlay.

Existing checks cover code format, placement, ledger uniqueness, authorization, PDF grants and HTTP tracing. Student typecheck and lint must also pass; the repository has existing lint warnings.

## Verification boundary

The preview uses the production app, player, watermark, grant client and API. Only native screen-capture and filesystem modules have browser adapters. It verifies JavaScript animation and actual browser video playback, **not Android SurfaceView composition, physical rotation sensors, native downloads, or iOS capture protection**. Android/iOS hardware was unavailable in this environment. A device acceptance check remains necessary: play a video for at least 35 seconds, hide controls, rotate both ways, pause/resume, then repeat for an uploaded and downloaded video.

The watermark intentionally fades away while playback is paused; at least one copy stays visible while playback runs. Colors, opacity, typography, curriculum and navigation are unchanged.
