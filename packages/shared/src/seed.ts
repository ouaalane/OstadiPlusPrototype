import type {
  Announcement,
  Chapter,
  Course,
  DemoState,
  Enrollment,
  Lesson,
  Student,
  TeacherProfile,
} from './types';
import { pdfAsset, videoAsset } from './mediaLibrary';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const now = '2026-10-14T09:30:00.000Z';
const daysFrom = (base: string, days: number) =>
  new Date(new Date(base).getTime() + days * 86_400_000).toISOString();

let seq = 0;
const uid = (prefix: string) => `${prefix}-${(++seq).toString(36).padStart(3, '0')}`;

/** A lesson backed by a bundled video asset. */
function video(key: string, published = true): Lesson {
  const asset = videoAsset(key);
  if (!asset) throw new Error(`media asset manquante: ${key}`);
  return {
    id: uid('lsn'),
    title: asset.title,
    kind: 'video',
    durationSec: asset.durationSec,
    pages: 0,
    sizeMb: asset.sizeMb,
    file: asset.file,
    published,
  };
}

/** A lesson backed by a bundled PDF asset. */
function doc(key: string, published = true): Lesson {
  const asset = pdfAsset(key);
  if (!asset) throw new Error(`media asset manquante: ${key}`);
  return {
    id: uid('lsn'),
    title: asset.title,
    kind: 'pdf',
    durationSec: 0,
    pages: asset.pages,
    sizeMb: asset.sizeMb,
    file: asset.file,
    published,
  };
}

function chapter(title: string, lessons: Lesson[]): Chapter {
  return { id: uid('chp'), title, lessons };
}

/* ------------------------------------------------------------------ */
/* Static profile                                                      */
/* ------------------------------------------------------------------ */

const teacher: TeacherProfile = {
  id: 'tch-jawad',
  name: 'أ. جواد العلمي',
  nameLatin: 'Jawad Alami',
  subject: 'الرياضيات',
  level: 'بكالوريا علوم — 2ème Bac',
  email: 'jawad.alami@ostadiplus.ma',
  phone: '+212 661 24 88 07',
  centerName: 'مركز الأطلس للدروس',
  centerCity: 'الدار البيضاء',
  bio: 'أستاذ الرياضيات، خبرة 12 سنة في تحضير تلاميذ شعب Sciences للامتحان الوطني.',
  since: '2024',
  monogram: 'JA',
};

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

const courseDiff: Course = {
  id: 'crs-diff',
  title: 'الحساب التفاضلي — مدخل وتطبيقات',
  subject: 'الرياضيات',
  level: '2ème Bac — SVT & PC',
  summary:
    'من مفهوم النهاية إلى دراسة تغيرات الدوال: تأسيس كامل مع تمارين محلولة على مستوى الامتحان الوطني.',
  cover: 'blue',
  status: 'published',
  createdAt: '2026-08-21T10:00:00.000Z',
  updatedAt: '2026-10-09T15:12:00.000Z',
  publishedAt: '2026-09-02T08:40:00.000Z',
  chapters: [
    chapter('النهايات والاستمرارية', [
      video('limits-intro'),
      video('limits-rules'),
      doc('limits-sheet'),
    ]),
    chapter('الاشتقاق', [
      video('derivative-concept'),
      video('derivative-rules'),
      doc('derivative-exercises'),
    ]),
    chapter('التطبيقات على المنحنيات', [
      video('curve-study'),
      doc('bac-exercises'),
    ]),
  ],
};

const courseVectors: Course = {
  id: 'crs-vectors',
  title: 'الهندسة الفضائية والمتجهات',
  subject: 'الرياضيات',
  level: '2ème Bac — PC & SM',
  summary:
    'المتجهات في الفضاء، الجداء السلمي، وتطبيقاتهما على المسائل الهندسية مع أمثلة من الامتحانات السابقة.',
  cover: 'indigo',
  status: 'published',
  createdAt: '2026-08-28T11:20:00.000Z',
  updatedAt: '2026-10-05T12:05:00.000Z',
  publishedAt: '2026-09-11T09:00:00.000Z',
  chapters: [
    chapter('المتجهات في الفضاء', [video('vectors'), doc('vectors-sheet')]),
    chapter('الجداء السلمي', [video('dot-product')]),
    chapter('تطبيقات هندسية', [video('geometry-problems')]),
  ],
};

const courseFunctions: Course = {
  id: 'crs-functions',
  title: 'الدوال اللوغاريتمية والأسية',
  subject: 'الرياضيات',
  level: '2ème Bac — SVT & PC',
  summary:
    'خصائص الدالتين اللوغاريتمية والأسية، منحنياتهما، وحلول التمثيل البياني مع تدريب موجّه.',
  cover: 'cyan',
  status: 'published',
  createdAt: '2026-09-06T14:00:00.000Z',
  updatedAt: '2026-10-11T17:45:00.000Z',
  publishedAt: '2026-09-19T10:30:00.000Z',
  chapters: [
    chapter('أساسيات الدالتين', [video('logarithm'), video('exponential')]),
    chapter('تدريب موجّه', [doc('functions-exercises')]),
  ],
};

const courseExam: Course = {
  id: 'crs-exam',
  title: 'تحضير الامتحان الوطني — مراجعة شاملة',
  subject: 'الرياضيات',
  level: '2ème Bac — كل الشعب',
  summary:
    'خطة مراجعة نهائية، استراتيجية حل الامتحان بالوقت المحدد، وسلسلة تمارين مركّبة.',
  cover: 'violet',
  status: 'draft',
  createdAt: '2026-10-02T08:15:00.000Z',
  updatedAt: '2026-10-13T18:20:00.000Z',
  chapters: [
    chapter('استراتيجية الحل', [
      video('exam-strategy'),
      doc('bac-exercises', false),
    ]),
  ],
};

/* ------------------------------------------------------------------ */
/* Students & enrollments                                              */
/* ------------------------------------------------------------------ */

interface StudentInput {
  id: string;
  fullName: string;
  phone: string;
  level: string;
  joinedAt: string;
  monogram: string;
}

const studentInputs: StudentInput[] = [
  { id: 'st-iman', fullName: 'إيمان السيد', phone: '0662 11 44 08', level: '2ème Bac SVT', joinedAt: '2026-09-03T10:12:00.000Z', monogram: 'إس' },
  { id: 'st-yassine', fullName: 'ياسين المرابط', phone: '0670 55 21 34', level: '2ème Bac PC', joinedAt: '2026-09-04T09:05:00.000Z', monogram: 'يم' },
  { id: 'st-salma', fullName: 'سلمى بنعيسى', phone: '0661 90 12 77', level: '2ème Bac SVT', joinedAt: '2026-09-05T16:40:00.000Z', monogram: 'سـب' },
  { id: 'st-omar', fullName: 'عمر الشرقاوي', phone: '0655 34 88 21', level: '2ème Bac PC', joinedAt: '2026-09-08T11:30:00.000Z', monogram: 'عش' },
  { id: 'st-mehdi', fullName: 'مهدي بوعزة', phone: '0678 41 09 63', level: '2ème Bac SVT', joinedAt: '2026-09-10T13:20:00.000Z', monogram: 'مب' },
  { id: 'st-nour', fullName: 'نور الهدى زروال', phone: '0699 27 63 15', level: '2ème Bac SVT', joinedAt: '2026-09-12T10:00:00.000Z', monogram: 'نز' },
  { id: 'st-ayoub', fullName: 'أيوب الكتاني', phone: '0663 78 45 92', level: '2ème Bac PC', joinedAt: '2026-09-14T15:10:00.000Z', monogram: 'أك' },
  { id: 'st-reda', fullName: 'رضا أملاح', phone: '0687 32 55 40', level: '2ème Bac SM', joinedAt: '2026-09-16T12:45:00.000Z', monogram: 'رم' },
  { id: 'st-safaa', fullName: 'سفية بوهدو', phone: '0654 09 71 26', level: '2ème Bac SVT', joinedAt: '2026-09-18T09:35:00.000Z', monogram: 'سف' },
  { id: 'st-kenza', fullName: 'كنزة بلحاج', phone: '0671 63 20 84', level: '2ème Bac SVT', joinedAt: '2026-09-21T14:15:00.000Z', monogram: 'كب' },
  { id: 'st-anas', fullName: 'أنس الصغير', phone: '0666 45 12 09', level: '2ème Bac SVT', joinedAt: '2026-09-24T17:05:00.000Z', monogram: 'أس' },
  { id: 'st-hiba', fullName: 'هبة الرامي', phone: '0682 17 93 50', level: '1ère Bac SM', joinedAt: '2026-10-01T10:50:00.000Z', monogram: 'هر' },
  { id: 'st-zakaria', fullName: 'زكريا الفاسي', phone: '0690 58 34 27', level: '2ème Bac PC', joinedAt: '2026-10-04T11:25:00.000Z', monogram: 'زف' },
  { id: 'st-fatima', fullName: 'فاطمة الزهراء العلوي', phone: '0638 74 60 13', level: '1ère Bac Lettres', joinedAt: '2026-10-07T08:55:00.000Z', monogram: 'ف ع' },
];

const students: Student[] = studentInputs.map((s) => ({
  ...s,
  email: `${s.id.replace('st-', '')}@example.ma`,
}));

interface EnrollmentInput {
  studentId: string;
  courseId: string;
  status: Enrollment['status'];
  authorizedAt: string;
  expiresAt?: string;
  payment?: { amount: number; currency: string; paidAt: string };
}

const enrollmentInputs: EnrollmentInput[] = [
  { studentId: 'st-iman', courseId: 'crs-diff', status: 'active', authorizedAt: '2026-09-03T10:20:00.000Z', payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-03T10:25:00.000Z' } },
  { studentId: 'st-iman', courseId: 'crs-functions', status: 'active', authorizedAt: '2026-09-20T09:15:00.000Z' },
  { studentId: 'st-yassine', courseId: 'crs-diff', status: 'active', authorizedAt: '2026-09-04T09:10:00.000Z', payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-04T09:15:00.000Z' } },
  { studentId: 'st-yassine', courseId: 'crs-vectors', status: 'active', authorizedAt: '2026-09-12T14:30:00.000Z' },
  { studentId: 'st-salma', courseId: 'crs-diff', status: 'active', authorizedAt: '2026-09-05T16:45:00.000Z', payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-05T16:50:00.000Z' } },
  { studentId: 'st-omar', courseId: 'crs-vectors', status: 'active', authorizedAt: '2026-09-08T11:35:00.000Z' },
  { studentId: 'st-omar', courseId: 'crs-diff', status: 'suspended', authorizedAt: '2026-09-09T08:00:00.000Z' },
  { studentId: 'st-mehdi', courseId: 'crs-diff', status: 'active', authorizedAt: '2026-09-10T13:25:00.000Z', payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-10T13:30:00.000Z' } },
  { studentId: 'st-mehdi', courseId: 'crs-functions', status: 'active', authorizedAt: '2026-09-22T10:05:00.000Z' },
  { studentId: 'st-nour', courseId: 'crs-functions', status: 'active', authorizedAt: '2026-09-12T10:10:00.000Z' },
  { studentId: 'st-ayoub', courseId: 'crs-vectors', status: 'active', authorizedAt: '2026-09-14T15:15:00.000Z', payment: { amount: 300, currency: 'MAD', paidAt: '2026-09-14T15:20:00.000Z' } },
  { studentId: 'st-reda', courseId: 'crs-vectors', status: 'active', authorizedAt: '2026-09-16T12:50:00.000Z' },
  { studentId: 'st-safaa', courseId: 'crs-diff', status: 'active', authorizedAt: '2026-09-18T09:40:00.000Z' },
  { studentId: 'st-kenza', courseId: 'crs-diff', status: 'active', authorizedAt: '2026-09-21T14:20:00.000Z', payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-21T14:25:00.000Z' } },
  { studentId: 'st-kenza', courseId: 'crs-functions', status: 'active', authorizedAt: '2026-09-21T14:22:00.000Z' },
  { studentId: 'st-anas', courseId: 'crs-diff', status: 'suspended', authorizedAt: '2026-09-24T17:10:00.000Z' },
  { studentId: 'st-hiba', courseId: 'crs-diff', status: 'pending', authorizedAt: '2026-10-01T10:55:00.000Z' },
  { studentId: 'st-zakaria', courseId: 'crs-vectors', status: 'pending', authorizedAt: '2026-10-04T11:30:00.000Z' },
  { studentId: 'st-fatima', courseId: 'crs-diff', status: 'pending', authorizedAt: '2026-10-07T09:00:00.000Z' },
];

const enrollments: Enrollment[] = enrollmentInputs.map((e) => ({
  id: uid('enr'),
  studentId: e.studentId,
  courseId: e.courseId,
  status: e.status,
  authorizedAt: e.authorizedAt,
  authorizedBy: 'أ. جواد العلمي',
  expiresAt: e.expiresAt ?? daysFrom(now, 214),
  payment: e.payment,
}));

/* ------------------------------------------------------------------ */
/* Announcements & activity                                            */
/* ------------------------------------------------------------------ */

const announcements: Announcement[] = [
  {
    id: 'an-1',
    title: 'حلقة مراجعة يوم السبت 09:00',
    body: 'سلام، حلقة المراجعة تناول موضوع الامتحان الوطني 2024 نُقلت إلى يوم السبت على الساعة التاسعة صباحاً. أحضر دفتر التمارين وسلسلة التمارين المحلولة.',
    courseId: 'crs-diff',
    publishedAt: '2026-10-12T08:05:00.000Z',
  },
  {
    id: 'an-2',
    title: 'سلسلة تمارين جديدة متاحة',
    body: 'أضفت سلسلة تمارين محلولة في الاشتقاق ضمن درس «قواعد الاشتقاق». حمّل الملف وحاول حل التمارين قبل مشاهدة الحل.',
    courseId: 'crs-diff',
    publishedAt: '2026-10-09T17:30:00.000Z',
  },
  {
    id: 'an-3',
    title: 'موعد تسليم أشغال السنة',
    body: 'تذكير بتسليم أشغال السنة قبل نهاية الشهر. من لديه صعوبة في حل التمرين الثالث، يراجع درس الجداء السلمي.',
    courseId: null,
    publishedAt: '2026-10-05T12:00:00.000Z',
  },
];

const activity: DemoState['activity'] = [
  { id: 'ac-1', kind: 'student', text: 'تم تفعيل وصول «كنزة بلحاج» في الدورة الحساب التفاضلي', at: '2026-10-13T16:20:00.000Z' },
  { id: 'ac-2', kind: 'lesson', text: 'تم نشر الدرس «دراسة تغيرات الدوال والمنحنيات»', at: '2026-10-12T11:05:00.000Z' },
  { id: 'ac-3', kind: 'announcement', text: 'تم نشر إعلان «حلقة مراجعة يوم السبت 09:00»', at: '2026-10-12T08:05:00.000Z' },
  { id: 'ac-4', kind: 'course', text: 'تم تحديث دورة «الدوال اللوغاريتمية والأسية»', at: '2026-10-11T17:45:00.000Z' },
  { id: 'ac-5', kind: 'student', text: 'طلب طالب جديد: زكريا الفاسي — دورة الهندسة الفضائية', at: '2026-10-04T11:30:00.000Z' },
];

/* ------------------------------------------------------------------ */
/* Student progress (demo phone persona)                              */
/* ------------------------------------------------------------------ */

const diffLessons = courseDiff.chapters.flatMap((c) => c.lessons);
const functionLessons = courseFunctions.chapters.flatMap((c) => c.lessons);

const progress: DemoState['progress'] = {
  'st-iman': [
    { lessonId: diffLessons[0].id, positionSec: diffLessons[0].durationSec, completed: true, updatedAt: '2026-09-14T19:10:00.000Z' },
    { lessonId: diffLessons[1].id, positionSec: diffLessons[1].durationSec, completed: true, updatedAt: '2026-09-18T20:02:00.000Z' },
    { lessonId: diffLessons[2].id, positionSec: 0, completed: true, updatedAt: '2026-09-19T18:44:00.000Z' },
    { lessonId: diffLessons[3].id, positionSec: 214, completed: false, updatedAt: '2026-10-11T21:31:00.000Z' },
    { lessonId: functionLessons[0].id, positionSec: 120, completed: false, updatedAt: '2026-10-13T20:15:00.000Z' },
  ],
  'st-yassine': [
    { lessonId: diffLessons[0].id, positionSec: 504, completed: true, updatedAt: '2026-09-15T18:00:00.000Z' },
    { lessonId: diffLessons[1].id, positionSec: 402, completed: false, updatedAt: '2026-10-02T19:22:00.000Z' },
  ],
};

/* ------------------------------------------------------------------ */

export const DEMO_STATE: DemoState = {
  version: 1,
  activeStudentId: 'st-iman',
  teacher,
  courses: [courseDiff, courseVectors, courseFunctions, courseExam],
  students,
  enrollments,
  announcements,
  activity,
  progress,
};

/** Deep-clone so callers can mutate freely. */
export function createDemoState(): DemoState {
  return JSON.parse(JSON.stringify(DEMO_STATE)) as DemoState;
}
