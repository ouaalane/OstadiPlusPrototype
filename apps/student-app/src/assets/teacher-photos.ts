/**
 * Professor photo sets bundled with the app.
 *
 * Keyed by `TeacherProfile.photo` / `CourseTeacher.photo`, so every professor
 * can look like their own brand the moment they send a portrait — the course
 * header and the instructor row read from here. Keys that are missing (or not
 * bundled yet) fall back to the course cover art and the monogram avatar.
 *
 * `hero` is the course header band, already composed to the header's ratio so
 * the portrait sits clear of the title; `avatar` is a square face crop for
 * small placements.
 */

export interface TeacherPhotos {
  /** Course header art (composed for the header band, not the raw photo). */
  hero: number;
  /** Square face crop for the instructor row and similar placements. */
  avatar: number;
}

export const teacherPhotos: Record<string, TeacherPhotos> = {
  'jawad-alamy': {
    hero: require('./teachers/jawad-alamy.jpg'),
    avatar: require('./teachers/jawad-alamy-avatar.jpg'),
  },
};

/** Photo set for a teacher key, or `undefined` when none is bundled. */
export function teacherPhotosFor(key: string | undefined): TeacherPhotos | undefined {
  return key ? teacherPhotos[key] : undefined;
}
