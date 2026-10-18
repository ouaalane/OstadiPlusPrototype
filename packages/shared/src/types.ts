/**
 * OstadiPlus — domain model shared by the teacher dashboard (React web)
 * and the student application (React Native / Android).
 *
 * v2 — adds: Center, CenterMembership, Notification, StudentType, Role,
 * expanded LessonKind & EnrollmentStatus, Lesson.description,
 * Enrollment.durationMonths, Lang/Dir for i18n.
 */

/* ------------------------------------------------------------------ */
/* Primitive enumerations                                              */
/* ------------------------------------------------------------------ */

export type CourseStatus = 'draft' | 'published';

export type LessonKind =
  | 'video'
  | 'pdf'
  | 'image'
  | 'exercise'
  | 'exam'
  | 'text'
  | 'quiz';

/** One multiple-choice question inside a quiz lesson. */
export interface QuizQuestion {
  id: string;
  prompt: string;
  /** Answer options (at least 2). */
  options: { id: string; text: string }[];
  /** Ids of the correct option(s) — single or multiple choice. */
  correctIds: string[];
}

/** All possible states in the enrollment lifecycle. */
export type EnrollmentStatus =
  | 'active'     // access granted and not expired
  | 'pending'    // waiting for teacher/receptionist to activate
  | 'suspended'  // explicitly deactivated by staff
  | 'requested'  // student has sent a join request, staff not yet responded
  | 'rejected'   // staff rejected the request
  | 'cancelled'; // student cancelled the request

export type StudentType = 'bac-libre' | 'moutamadris';

export type Role = 'teacher' | 'receptionist' | 'student';

/** Supported UI languages. */
export type Lang = 'fr' | 'ar';

/** Text direction derived from the selected language. */
export type Dir = 'ltr' | 'rtl';

export type CoverKey =
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'cyan'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'slate';

/* ------------------------------------------------------------------ */
/* Teacher / center                                                    */
/* ------------------------------------------------------------------ */

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

/**
 * A teaching center entity. One teacher may run one or more centers.
 * Students associate with a center (not directly with a teacher) through
 * the consent-based enrollment flow.
 */
export interface Center {
  id: string;
  /** Center display name. */
  name: string;
  city: string;
  /**
   * Short human-readable invitation code that students enter to join
   * (e.g. "ATLAS-23"). Not a secret — authorization is enforced by the
   * backend / store, not by possession of the code alone.
   */
  inviteCode: string;
  teacherId: string;
}

/* ------------------------------------------------------------------ */
/* Course / chapter / lesson                                           */
/* ------------------------------------------------------------------ */

export interface Lesson {
  id: string;
  title: string;
  kind: LessonKind;
  /** Optional teacher-written description shown below the lesson title. */
  description?: string;
  /** Video length in seconds (0 for documents). */
  durationSec: number;
  /** Page count for documents. */
  pages: number;
  /** Asset size shown in the UI, in megabytes. */
  sizeMb: number;
  /** File name of the bundled media asset. */
  file: string;
  published: boolean;
  /** Rich-text body for `text` lessons (markdown-lite: **bold**, *italic*, - lists). */
  body?: string;
  /** Questions for `quiz` lessons. */
  questions?: QuizQuestion[];
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

/**
 * One school semester of a course program («الدورة الأولى» / «الدورة الثانية»).
 * A semester groups the topics taught during that half of the year, exactly
 * the way the official program is published.
 */
export interface Semester {
  id: string;
  /** Display title, e.g. «الدورة الأولى». */
  title: string;
  /** Topics (chapters) taught during this semester. */
  chapters: Chapter[];
}

/**
 * The teacher who owns a course. Stored on the course itself so a student
 * always sees the prof who actually teaches that module.
 */
export interface CourseTeacher {
  /** Full display name, e.g. «أ. جواد العلمي». */
  name: string;
  /** Module the teacher teaches, e.g. «الفيزياء». */
  subject: string;
  /** Two-letter monogram used when no photo is available. */
  monogram: string;
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
  /** Owning teacher; falls back to the platform teacher profile when absent. */
  teacher?: CourseTeacher;
  /** The program, split by semester. */
  semesters: Semester[];
}

/* ------------------------------------------------------------------ */
/* Student                                                             */
/* ------------------------------------------------------------------ */

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  level: string;
  joinedAt: string;
  /** Two-letter monogram. */
  monogram: string;
  /**
   * Short opaque code displayed as a QR and typed at the center desk.
   * Format: "UST-XXXXX" (5 alphanumeric chars). Used only as an
   * identifier — authorization is always verified by the store.
   */
  studentCode: string;
  /** Moroccan student type: independent ("Bac Libre") or enrolled in school. */
  studentType: StudentType;
}

/* ------------------------------------------------------------------ */
/* Center membership (consent-based join flow)                        */
/* ------------------------------------------------------------------ */

/**
 * Records the relationship between a student and a center.
 * Separate from Enrollment so that "joined a center" and
 * "has access to a course" are independent states.
 */
export interface CenterMembership {
  id: string;
  studentId: string;
  centerId: string;
  /**
   * Lifecycle:
   *   requested  — student has not yet accepted the center's scan
   *   active     — student accepted; center can see profile & assign courses
   *   rejected   — student rejected
   *   cancelled  — student or staff cancelled
   */
  status: 'requested' | 'active' | 'rejected' | 'cancelled';
  requestedAt: string;
  respondedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Enrollment                                                          */
/* ------------------------------------------------------------------ */

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  authorizedAt: string;
  authorizedBy: string;
  expiresAt: string;
  /** Subscription length chosen at activation time (months). */
  durationMonths?: number;
  /** Cash payment recorded at the centre — never gates access (PRD ENR-03). */
  payment?: {
    amount: number;
    currency: string;
    paidAt: string;
  };
}


/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationKind =
  | 'center-request'   // center wants to connect to this student
  | 'access-granted'   // teacher activated a course for the student
  | 'new-lesson';      // teacher published a lesson in one of the student's courses

/**
 * Payload of a `new-lesson` notification. Kept flat and string-only so the same
 * shape can ride along in a push payload and be handed straight to the device's
 * notification tray.
 */
export interface NewLessonNotificationPayload {
  lessonId: string;
  lessonKind: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  teacherName: string;
}

export interface AppNotification {
  id: string;
  studentId: string;
  kind: NotificationKind;
  /** JSON-serialisable context depending on kind. */
  payload: Record<string, string>;
  read: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Activity                                                             */
/* ------------------------------------------------------------------ */

export interface ActivityEvent {
  id: string;
  kind: 'course' | 'student' | 'lesson';
  text: string;
  at: string;
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export interface LessonProgress {
  lessonId: string;
  positionSec: number;
  completed: boolean;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Root state                                                          */
/* ------------------------------------------------------------------ */

export interface DemoState {
  /** Increment when the shape changes to invalidate old localStorage. */
  version: number;
  /** Signed-in student used by the Android app (empty = not signed in). */
  activeStudentId: string;
  /** Currently selected UI language (used by both apps). */
  lang: Lang;
  teacher: TeacherProfile;
  centers: Center[];
  courses: Course[];
  students: Student[];
  enrollments: Enrollment[];
  memberships: CenterMembership[];
  notifications: AppNotification[];
  activity: ActivityEvent[];
  /** studentId → per-lesson progress. */
  progress: Record<string, LessonProgress[]>;
}
