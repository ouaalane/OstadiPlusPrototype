-- 0001_create_video_watermarks.sql
--
-- Traceability ledger for protected lesson playback.
--
-- Every time a student starts a playback session, the API mints a short
-- Base32 code (12 chars, no visually confusable characters), inserts a row
-- here and returns the code to the player. The player renders the code as a
-- moving watermark, so a leaked recording can be traced back to the exact
-- student, course, video, session and device it was captured from
-- (see `GET /api/admin/watermarks/:code`).

CREATE TABLE IF NOT EXISTS video_watermarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,        -- 12-char Base32, no 0/O/1/I/L
  student_id  TEXT    NOT NULL,               -- Student.id (shared domain model)
  course_id   TEXT    NOT NULL,               -- Course.id, e.g. 'crs-math-2bac'
  video_id    TEXT    NOT NULL,               -- Lesson.id with kind = 'video'
  session_id  TEXT    NOT NULL,               -- one UUID per playback start
  device_info TEXT    NOT NULL DEFAULT '',    -- client-reported platform/model (≤ 160 chars)
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The code column carries a UNIQUE index implicitly; these cover the two
-- admin questions ("what did this student watch?" / "who watched this course?").
CREATE INDEX IF NOT EXISTS idx_video_watermarks_student ON video_watermarks (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_watermarks_course  ON video_watermarks (course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_watermarks_video   ON video_watermarks (video_id, created_at DESC);
