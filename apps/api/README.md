# OstadiPlus — watermark API

Prototype backend that issues **per-playback watermark codes** for protected
lesson videos and traces them back to a student when a recording leaks.

- Zero dependencies — Node built-ins only (`node:http`, `node:sqlite`,
  `node:crypto`), and it imports the TypeScript domain model straight from
  `@ostadiplus/shared` (Node ≥ 23.6 type stripping + a small resolver hook,
  see `src/resolve.mjs`).
- Storage: a local SQLite file, schema in `migrations/` (applied
  automatically on startup and recorded in `schema_migrations`).

## Run

```bash
npm run api                       # from the repo root → http://0.0.0.0:8787
npm run api -- --port 9000        # custom port
```

The Android emulator reaches the host as `10.0.2.2`, which is the app's
default. For a physical device build, point the app at your machine:

```bash
EXPO_PUBLIC_WATERMARK_API_URL=http://192.168.x.x:8787 npx expo run:android
```

| Environment variable    | Default                        | Meaning                                   |
| ----------------------- | ------------------------------ | ----------------------------------------- |
| `WATERMARK_API_PORT`    | `8787`                         | listen port                               |
| `WATERMARK_API_HOST`    | `0.0.0.0`                      | listen host                               |
| `WATERMARK_DB`          | `apps/api/data/watermarks.db`  | SQLite file                               |
| `WATERMARK_CODE_MODE`   | `random`                       | `random` = fresh code per playback start; `hmac` = stable code per student+course |
| `WATERMARK_HMAC_SECRET` | —                              | required in `hmac` mode                   |
| `WATERMARK_ADMIN_TOKEN` | `dev-admin-token`              | protects the trace endpoint               |

## Endpoints

**Start a playback session** (called by the app on every lesson open):

```bash
curl -s http://localhost:8787/api/playback/start \
  -H 'content-type: application/json' \
  -d '{"studentId":"st-iman","courseId":"crs-math-2bac","videoId":"<lesson id>","deviceInfo":"Android 15 · Google Pixel_9a"}'
# → 201 {"code":"K7M2QX9TPA4W","sessionId":"…","createdAt":"…"}
```

The request is only honored for a seeded student with an active, non-expired
enrollment in a published course, and the video must belong to that course.

**Trace a leaked code** (admin):

```bash
curl -s http://localhost:8787/api/admin/watermarks/K7M2QX9TPA4W \
  -H 'x-admin-token: dev-admin-token'
# → { code, sessionId, deviceInfo, createdAt, student{…}, course{…}, lesson{…} }
```

**Offline variant** (no server): `npm run api:trace -- K7M2QX9TPA4W` reads the
database directly and prints the same report.

## Prototype caveats

- The student identity comes from the request body. In production this
  endpoint sits behind the authenticated playback token and the student is
  taken from the verified session — never from the client.
- No rate limiting, no HTTPS termination, no CORS (the consumer is a native
  app, not a browser). Put it behind the real backend before exposing it.
- `READ_MEDIA_IMAGES` is **not** requested by the app: on Android ≤ 13 the
  screenshot-detection callback therefore stays silent (blocking works on
  every version).
