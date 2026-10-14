/**
 * OstadiPlus — domain model shared by the teacher dashboard (React web)
 * and the student application (React Native / Android).
 *
 * The model is intentionally a subset of the PRD (Cahier des Charges v1.0):
 * courses → chapters → lessons, enrollment/access, announcements, progress.
 * Everything else (payments gateway, quizzes, offline licences) is out of
 * prototype scope.
 */

export type CourseStatus = 'draft' | 'published';
export type LessonKind = 'video' | 'pdf';
export type EnrollmentStatus = 'active' | 'pending' | 'suspended';

export interface TeacherProfile {
  id: string;
  name: string;
  nameLatin: string;
  subject: string;
  level: string;
  email: string;
  phone: string;
  centerName: string;
  centerCity: string;
  bio: string;
  since: string;
  /** Two-letter monogram used when no photo is available. */
  monogram: string;
}

export interface Lesson {
  id: string;
  title: string;
  kind: LessonKind;
  /** Video length in seconds (0 for documents). */
  durationSec: number;
  /** Page count for documents. */
  pages: number;
  /** Asset size shown in the UI, in megabytes. */
  sizeMb: number;
  /** File name of the bundled media asset. */
  file: string;
  published: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  level: string;
  summary: string;
  /** Key into the cover palette (see tokens.coverGradients). */
  cover: CoverKey;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  chapters: Chapter[];
}

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  level: string;
  joinedAt: string;
  /** Two-letter monogram. */
  monogram: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  authorizedAt: string;
  authorizedBy: string;
  expiresAt: string;
  /** Cash payment recorded at the centre — never gates access (PRD ENR-03). */
  payment?: {
    amount: number;
    currency: string;
    paidAt: string;
  };
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** null = every enrolled student. */
  courseId: string | null;
  publishedAt: string;
}

export interface ActivityEvent {
  id: string;
  kind: 'course' | 'student' | 'announcement' | 'lesson';
  text: string;
  at: string;
}

export interface LessonProgress {
  lessonId: string;
  positionSec: number;
  completed: boolean;
  updatedAt: string;
}

export interface DemoState {
  version: number;
  /** Signed-in student used by the Android app. */
  activeStudentId: string;
  teacher: TeacherProfile;
  courses: Course[];
  students: Student[];
  enrollments: Enrollment[];
  announcements: Announcement[];
  activity: ActivityEvent[];
  /** studentId → per-lesson progress. */
  progress: Record<string, LessonProgress[]>;
}

export type CoverKey =
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'cyan'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'slate';
