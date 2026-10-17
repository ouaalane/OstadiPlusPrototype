import type {
  AppNotification,
  Center,
  CenterMembership,
  Chapter,
  Course,
  DemoState,
  Enrollment,
  Lesson,
  Semester,
  Student,
  TeacherProfile,
} from './types';
import { pdfAsset, videoAsset } from './mediaLibrary';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const daysFrom = (base: string, days: number) =>
  new Date(new Date(base).getTime() + days * 86_400_000).toISOString();

let seq = 0;
const uid = (prefix: string) => `${prefix}-${(++seq).toString(36).padStart(3, '0')}`;

/** Generates a short readable student code like "UST-7F3K2". */
function makeStudentCode(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[hash % chars.length];
    hash = (hash * 1664525 + 1013904223) >>> 0;
  }
  return `UST-${code}`;
}

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

/** One semester of the program («الدورة الأولى» / «الدورة الثانية»). */
function semester(title: string, chapters: Chapter[]): Semester {
  return { id: uid('sem'), title, chapters };
}

/** A lesson with a rich-text body (markdown-lite). */
function text(title: string, body: string, published = true): Lesson {
  return {
    id: uid('lsn'),
    title,
    kind: 'text',
    durationSec: 0,
    pages: 0,
    sizeMb: 0,
    file: '',
    published,
    body,
  };
}

/** A multiple-choice quiz lesson. */
function quiz(
  title: string,
  input: { prompt: string; options: string[]; correct: number[] }[],
  published = true,
): Lesson {
  return {
    id: uid('lsn'),
    title,
    kind: 'quiz',
    durationSec: 0,
    pages: 0,
    sizeMb: 0,
    file: '',
    published,
    questions: input.map((q) => {
      const options = q.options.map((optionText) => ({
        id: uid('opt'),
        text: optionText,
      }));
      return {
        id: uid('qst'),
        prompt: q.prompt,
        options,
        correctIds: q.correct.map((index) => options[index].id),
      };
    }),
  };
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
/* Center                                                              */
/* ------------------------------------------------------------------ */

const demoCenter: Center = {
  id: 'ctr-atlas',
  name: 'مركز الأطلس للدروس',
  city: 'الدار البيضاء',
  inviteCode: 'ATLAS-23',
  teacherId: 'tch-jawad',
};

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

const courseMath: Course = {
  id: 'crs-math-2bac',
  title: 'الرياضيات · 2ème Bac',
  subject: 'الرياضيات',
  level: '2ème Bac — SVT & PC',
  teacher: { name: 'أ. جواد العلمي', subject: 'الرياضيات', monogram: 'JA' },
  summary:
    'برنامج السنة كاملاً مقسّماً على الدورتين: النهايات والاشتقاق ودراسة الدوال في الدورة الأولى، والمتجهات والدوال اللوغاريتمية والأسية في الدورة الثانية.',
  cover: 'blue',
  status: 'published',
  createdAt: '2026-08-21T10:00:00.000Z',
  updatedAt: '2026-10-09T15:12:00.000Z',
  publishedAt: '2026-09-02T08:40:00.000Z',
  semesters: [
    semester('الدورة الأولى', [
      chapter('النهايات والاتصال', [
        video('limits-intro'),
        text(
          'ملخص: قواعد حساب النهايات',
          'أهم القواعد التي يجب إتقانها قبل الانتقال إلى الاشتقاق:\n\n- **قاعدة الأصل**: إذا تقارب (u) نحو ℓ فإن (uⁿ) تتجه نحو ℓⁿ\n- **نهاية جداء دالتين**: نهاية الجداء تساوي جداء النهايتين\n- **الدالة المثلثية**: تُحسب بالحالة القياسية للزاوية\n\n> تنبيه: تأكد دائماً من أن الدالة متصلة عند النقطة قبل تطبيق القواعد.',
        ),
        video('limits-rules'),
        doc('limits-sheet'),
        quiz('اختبر فهمك — النهايات', [
          {
            prompt: 'ما نهاية الدالة (2x + 1) عندما تؤول x إلى 3؟',
            options: ['5', '6', '7', '8'],
            correct: [2],
          },
          {
            prompt: 'إذا كانت نهاية u تساوي 2 ونهاية v تساوي 3، فما نهاية الجداء (u · v)؟',
            options: ['5', '6', '1', 'غير محددة'],
            correct: [1],
          },
          {
            prompt: 'أي من العبارات التالية صحيحة عند حساب النهايات؟',
            options: [
              'نهاية جداء دالتين تساوي جداء نهايتيهما دائماً',
              'يجب أن تكون الدالتان متصلتين قبل تطبيق قاعدة الجداء',
              'نهاية مجموع دالتين تساوي مجموع نهايتيهما',
              'الخيارات 2 و3 صحيحتان',
            ],
            correct: [3],
          },
        ]),
      ]),
      chapter('الاشتقاق ودراسة الدوال', [
        video('derivative-concept'),
        video('derivative-rules'),
        doc('derivative-exercises'),
        video('curve-study'),
      ]),
    ]),
    semester('الدورة الثانية', [
      chapter('الهندسة الفضائية والمتجهات', [
        video('vectors'),
        doc('vectors-sheet'),
        video('dot-product'),
        video('geometry-problems'),
      ]),
      chapter('الدوال اللوغاريتمية والأسية', [
        video('logarithm'),
        video('exponential'),
        doc('functions-exercises'),
        quiz('اختبر فهمك — الدوال الأسية واللوغاريتمية', [
          {
            prompt: 'ما مجموعة تعريف الدالة x ↦ ln(x)؟',
            options: [']0, +∞[', '[0, +∞[', 'ℝ', 'ℝ*'],
            correct: [0],
          },
          {
            prompt: 'ما قيمة ln(1)؟',
            options: ['1', '0', 'e', 'غير معرّفة'],
            correct: [1],
          },
          {
            prompt: 'أي علاقة صحيحة لكل عددين موجبين قطعاً a و b؟',
            options: ['ln(a + b) = ln(a) + ln(b)', 'ln(a · b) = ln(a) · ln(b)', 'ln(a · b) = ln(a) + ln(b)', 'ln(a − b) = ln(a) / ln(b)'],
            correct: [2],
          },
        ]),
      ]),
      chapter('تحضير الامتحان الوطني', [
        video('exam-strategy'),
        doc('bac-exercises'),
      ]),
    ]),
  ],
};

const coursePhysics: Course = {
  id: 'crs-phys-2bac',
  title: 'الفيزياء · 2ème Bac',
  subject: 'الفيزياء',
  level: '2ème Bac — SVT & PC',
  teacher: { name: 'أ. أحمد التازي', subject: 'الفيزياء', monogram: 'AT' },
  summary:
    'برنامج الفيزياء للسنة الثانية باك: الموجات الميكانيكية والتحولات النووية في الدورة الأولى، والكهرباء والميكانيك في الدورة الثانية.',
  cover: 'indigo',
  status: 'published',
  createdAt: '2026-08-25T09:30:00.000Z',
  updatedAt: '2026-10-12T10:20:00.000Z',
  publishedAt: '2026-09-05T09:10:00.000Z',
  semesters: [
    semester('الدورة الأولى', [
      chapter('الموجات الميكانيكية المتوالية', [
        text(
          'خصائص الموجة الميكانيكية المتوالية',
          'الموجة الميكانيكية المتوالية هي انتشار اضطراب في وسط مرن، تنقل الطاقة **دون نقل المادة**.\n\n- **طول الموجة**: λ = v · T = v / f (بالمتر)\n- **سرعة الانتشار**: v = λ / T، تتعلق بطبيعة الوسط ولا تتعلق بالمصدر\n- **تأخر نقطة**: τ = d / v حيث d مسافة النقطة عن المصدر\n- **التردد**: f ثابت في كل الأوساط، وهو خاصية المصدر\n\n> أصناف الأمواج حسب التردد: تحت صوتية (f < 20 Hz)، مسموعة (20 Hz ≤ f ≤ 20 kHz)، فوق صوتية (f > 20 kHz).',
        ),
        quiz('اختبر فهمك — الموجات الميكانيكية', [
          {
            prompt: 'ما الوحدة العالمية لطول الموجة؟',
            options: ['الهيرتز (Hz)', 'المتر (m)', 'المتر على الثانية (m/s)', 'الثانية (s)'],
            correct: [1],
          },
          {
            prompt: 'موجة ترددها 50 Hz تنتشر بسرعة 20 m/s. ما طولها الموجي؟',
            options: ['0,4 m', '2,5 m', '1000 m', '70 m'],
            correct: [0],
          },
          {
            prompt: 'إذا تضاعف تردد المصدر مع بقاء الوسط نفسه، فإن طول الموجة:',
            options: ['يتضاعف', 'ينقص إلى النصف', 'لا يتغير', 'ينعدم'],
            correct: [1],
          },
        ]),
      ]),
      chapter('التحولات النووية', [
        text(
          'النشاط الإشعاعي والتناقص الإشعاعي',
          'النشاط الإشعاعي هو تفتت **تلقائي** لنوى غير مستقرة مع إصدار إشعاعات.\n\n- **قانونا صودي**: انحفاظ عدد النويات A وعدد الشحنات Z\n- **تفكك α**: انبعاث نواة الهيليوم ⁴₂He\n- **تفكك β⁻**: تحول نيوترون إلى بروتون مع انبعاث إلكترون\n- **التناقص الإشعاعي**: N(t) = N₀ · e^(−λt) حيث λ ثابتة التفكك\n- **نصف العمر**: t½ = ln 2 / λ\n\n> نشاط عينة: a(t) = a₀ · e^(−λt)، ويقاس بالبيكريل (Bq).',
        ),
        quiz('اختبر فهمك — التحولات النووية', [
          {
            prompt: 'ما وحدة النشاط الإشعاعي في النظام العالمي؟',
            options: ['البيكريل (Bq)', 'الجول (J)', 'الفولط (V)', 'الكولوم (C)'],
            correct: [0],
          },
          {
            prompt: 'خلال تفكك α لنواة ᴬ_Z X، تصبح النواة المتولدة:',
            options: [
              'عددها الكتلي A − 4 وعددها الشحني Z − 2',
              'عددها الكتلي A − 4 وعددها الشحني Z − 1',
              'عددها الكتلي لا يتغير وعددها الشحني Z + 1',
              'عددها الكتلي A وعددها الشحني Z − 2',
            ],
            correct: [0],
          },
          {
            prompt: 'نصف العمر t½ لعمود مشع هو المدة اللازمة:',
            options: [
              'لتفكك جميع النوى',
              'لتفكك نصف عدد النوى الابتدائي',
              'لمضاعفة النشاط الإشعاعي',
              'لتغيّر ثابتة التفكك λ',
            ],
            correct: [1],
          },
        ]),
      ]),
    ]),
    semester('الدورة الثانية', [
      chapter('الكهرباء: ثنائي القطب RC', [
        text(
          'شحن وتفريغ مكثف — ثابت الزمن',
          'ندرس دارة تتكون من مولد للتوتر المستمر (E)، مقاومة R ومكثف سعته C.\n\n- **ثابت الزمن**: τ = R · C (بالثانية)\n- **شحن المكثف**: u_C(t) = E · (1 − e^(−t/τ))\n- **تفريغ المكثف**: u_C(t) = E · e^(−t/τ)\n- **شدة التيار**: i = dq/dt = C · du_C/dt\n\n> عند اللحظة t = τ أثناء الشحن يبلغ u_C حوالي 63% من E، وعند التفريغ ينزل إلى حوالي 37% من E.',
        ),
        quiz('اختبر فهمك — ثنائي القطب RC', [
          {
            prompt: 'ما وحدة ثابت الزمن τ = R · C؟',
            options: ['الفاراد (F)', 'الأوم (Ω)', 'الثانية (s)', 'الأمبير (A)'],
            correct: [2],
          },
          {
            prompt: 'أثناء شحن مكثف، عند اللحظة t = τ يكون التوتر u_C:',
            options: ['مساوياً لـ E', 'حوالي 63% من E', 'حوالي 37% من E', 'منعدماً'],
            correct: [1],
          },
          {
            prompt: 'خلال تفريغ مكثف في مقاومة، تتغير شدة التيار مع الزمن:',
            options: [
              'تناقصاً أسياً نحو الصفر',
              'تزايداً أسياً',
              'بشكل خطي نحو الصفر',
              'لا تتغير',
            ],
            correct: [0],
          },
        ]),
      ]),
      chapter('الميكانيك: قوانين نيوتن', [
        text(
          'قوانين نيوتن وتطبيقاتها',
          'تُدرس حركة الجسم الصلب في **مرجع غاليلي** بتطبيق قوانين نيوتن.\n\n- **القانون الأول**: إذا كان مجموع القوى المؤثرة معدوماً، فمركز ثقل الجسم يبقى ساكناً أو يتحرك حركة مستقيمة منتظمة\n- **القانون الثاني**: ΣF = m · a\n- **القانون الثالث**: F(A/B) = − F(B/A)\n- **الطاقة الحركية**: Ec = ½ · m · v²\n- **الطاقة الكامنة الثقالية**: Epp = m · g · h\n\n> العمل W = F · d · cos α، وبمبدأ انحفاظ الطاقة الميكانيكية: Ec + Epp = ثابتة في غياب الاحتكاك.',
        ),
        quiz('اختبر فهمك — قوانين نيوتن', [
          {
            prompt: 'في مرجع غاليلي، إذا كان مجموع القوى المؤثرة على جسم معدوماً فإن مركز ثقله:',
            options: [
              'يتحرك بسرعة متزايدة',
              'يبقى ساكناً أو يتحرك حركة مستقيمة منتظمة',
              'يتحرك حركة دائرية منتظمة',
              'يتوقف فوراً',
            ],
            correct: [1],
          },
          {
            prompt: 'ما التعبير الصحيح للقانون الثاني لنيوتن؟',
            options: ['ΣF = m · a', 'ΣF = m / a', 'ΣF = a / m', 'ΣF = m · v'],
            correct: [0],
          },
          {
            prompt: 'جسم كتلته 2 kg يخضع لقوة محصلة ثابتة شدتها 6 N. ما تسارعه؟',
            options: ['12 m/s²', '3 m/s²', '0,33 m/s²', '8 m/s²'],
            correct: [1],
          },
        ]),
      ]),
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
  studentType: 'bac-libre' | 'moutamadris';
}

const studentInputs: StudentInput[] = [
  { id: 'st-iman',    fullName: 'إيمان السيد',          phone: '0662 11 44 08', level: '2ème Bac SVT',       joinedAt: '2026-09-03T10:12:00.000Z', monogram: 'إس', studentType: 'moutamadris' },
  { id: 'st-yassine', fullName: 'ياسين المرابط',         phone: '0670 55 21 34', level: '2ème Bac PC',        joinedAt: '2026-09-04T09:05:00.000Z', monogram: 'يم', studentType: 'moutamadris' },
  { id: 'st-salma',   fullName: 'سلمى بنعيسى',           phone: '0661 90 12 77', level: '2ème Bac SVT',       joinedAt: '2026-09-05T16:40:00.000Z', monogram: 'سـب', studentType: 'moutamadris' },
  { id: 'st-omar',    fullName: 'عمر الشرقاوي',           phone: '0655 34 88 21', level: '2ème Bac PC',        joinedAt: '2026-09-08T11:30:00.000Z', monogram: 'عش', studentType: 'moutamadris' },
  { id: 'st-mehdi',   fullName: 'مهدي بوعزة',             phone: '0678 41 09 63', level: '2ème Bac SVT',       joinedAt: '2026-09-10T13:20:00.000Z', monogram: 'مب', studentType: 'moutamadris' },
  { id: 'st-nour',    fullName: 'نور الهدى زروال',         phone: '0699 27 63 15', level: '2ème Bac SVT',       joinedAt: '2026-09-12T10:00:00.000Z', monogram: 'نز', studentType: 'moutamadris' },
  { id: 'st-ayoub',   fullName: 'أيوب الكتاني',            phone: '0663 78 45 92', level: '2ème Bac PC',        joinedAt: '2026-09-14T15:10:00.000Z', monogram: 'أك', studentType: 'moutamadris' },
  { id: 'st-reda',    fullName: 'رضا أملاح',               phone: '0687 32 55 40', level: '2ème Bac SM',        joinedAt: '2026-09-16T12:45:00.000Z', monogram: 'رم', studentType: 'bac-libre' },
  { id: 'st-safaa',   fullName: 'سفية بوهدو',              phone: '0654 09 71 26', level: '2ème Bac SVT',       joinedAt: '2026-09-18T09:35:00.000Z', monogram: 'سف', studentType: 'moutamadris' },
  { id: 'st-kenza',   fullName: 'كنزة بلحاج',              phone: '0671 63 20 84', level: '2ème Bac SVT',       joinedAt: '2026-09-21T14:15:00.000Z', monogram: 'كب', studentType: 'moutamadris' },
  { id: 'st-anas',    fullName: 'أنس الصغير',              phone: '0666 45 12 09', level: '2ème Bac SVT',       joinedAt: '2026-09-24T17:05:00.000Z', monogram: 'أس', studentType: 'bac-libre' },
  { id: 'st-hiba',    fullName: 'هبة الرامي',              phone: '0682 17 93 50', level: '1ère Bac SM',        joinedAt: '2026-10-01T10:50:00.000Z', monogram: 'هر', studentType: 'bac-libre' },
  { id: 'st-zakaria', fullName: 'زكريا الفاسي',            phone: '0690 58 34 27', level: '2ème Bac PC',        joinedAt: '2026-10-04T11:25:00.000Z', monogram: 'زف', studentType: 'moutamadris' },
  { id: 'st-fatima',  fullName: 'فاطمة الزهراء العلوي',   phone: '0638 74 60 13', level: '1ère Bac Lettres',   joinedAt: '2026-10-07T08:55:00.000Z', monogram: 'ف ع', studentType: 'bac-libre' },
];

const students: Student[] = studentInputs.map((s) => ({
  ...s,
  email: `${s.id.replace('st-', '')}@example.ma`,
  studentCode: makeStudentCode(s.id),
}));

interface EnrollmentInput {
  studentId: string;
  courseId: string;
  status: Enrollment['status'];
  authorizedAt: string;
  expiresAt?: string;
  durationMonths?: number;
  payment?: { amount: number; currency: string; paidAt: string };
}

const enrollmentInputs: EnrollmentInput[] = [
  { studentId: 'st-iman',    courseId: 'crs-math-2bac', status: 'active',    authorizedAt: '2026-09-03T10:20:00.000Z', durationMonths: 6, payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-03T10:25:00.000Z' } },
  { studentId: 'st-iman',    courseId: 'crs-phys-2bac', status: 'active',    authorizedAt: '2026-09-20T09:15:00.000Z', durationMonths: 6 },
  { studentId: 'st-yassine', courseId: 'crs-math-2bac', status: 'active',    authorizedAt: '2026-09-04T09:10:00.000Z', durationMonths: 3, payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-04T09:15:00.000Z' } },
  { studentId: 'st-yassine', courseId: 'crs-phys-2bac', status: 'active',    authorizedAt: '2026-09-12T14:30:00.000Z', durationMonths: 3 },
  { studentId: 'st-salma',   courseId: 'crs-math-2bac', status: 'active',    authorizedAt: '2026-09-05T16:45:00.000Z', durationMonths: 6, payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-05T16:50:00.000Z' } },
  { studentId: 'st-omar',    courseId: 'crs-phys-2bac', status: 'active',    authorizedAt: '2026-09-08T11:35:00.000Z', durationMonths: 3 },
  { studentId: 'st-omar',    courseId: 'crs-math-2bac', status: 'suspended', authorizedAt: '2026-09-09T08:00:00.000Z' },
  { studentId: 'st-mehdi',   courseId: 'crs-math-2bac', status: 'active',    authorizedAt: '2026-09-10T13:25:00.000Z', durationMonths: 6, payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-10T13:30:00.000Z' } },
  { studentId: 'st-mehdi',   courseId: 'crs-phys-2bac', status: 'active',    authorizedAt: '2026-09-22T10:05:00.000Z', durationMonths: 6 },
  { studentId: 'st-nour',    courseId: 'crs-phys-2bac', status: 'active',    authorizedAt: '2026-09-12T10:10:00.000Z', durationMonths: 3 },
  { studentId: 'st-ayoub',   courseId: 'crs-math-2bac', status: 'active',    authorizedAt: '2026-09-14T15:15:00.000Z', durationMonths: 3, payment: { amount: 300, currency: 'MAD', paidAt: '2026-09-14T15:20:00.000Z' } },
  { studentId: 'st-reda',    courseId: 'crs-phys-2bac', status: 'active',    authorizedAt: '2026-09-16T12:50:00.000Z', durationMonths: 3 },
  { studentId: 'st-safaa',   courseId: 'crs-math-2bac', status: 'active',    authorizedAt: '2026-09-18T09:40:00.000Z', durationMonths: 6 },
  { studentId: 'st-kenza',   courseId: 'crs-math-2bac', status: 'active',    authorizedAt: '2026-09-21T14:20:00.000Z', durationMonths: 6, payment: { amount: 350, currency: 'MAD', paidAt: '2026-09-21T14:25:00.000Z' } },
  { studentId: 'st-kenza',   courseId: 'crs-phys-2bac', status: 'active',    authorizedAt: '2026-09-21T14:22:00.000Z', durationMonths: 6 },
  { studentId: 'st-anas',    courseId: 'crs-math-2bac', status: 'suspended', authorizedAt: '2026-09-24T17:10:00.000Z' },
  { studentId: 'st-hiba',    courseId: 'crs-math-2bac', status: 'pending',   authorizedAt: '2026-10-01T10:55:00.000Z' },
  { studentId: 'st-zakaria', courseId: 'crs-phys-2bac', status: 'pending',   authorizedAt: '2026-10-04T11:30:00.000Z' },
  { studentId: 'st-fatima',  courseId: 'crs-math-2bac', status: 'pending',   authorizedAt: '2026-10-07T09:00:00.000Z' },
];

const enrollments: Enrollment[] = enrollmentInputs.map((e) => ({
  id: uid('enr'),
  studentId: e.studentId,
  courseId: e.courseId,
  status: e.status,
  authorizedAt: e.authorizedAt,
  authorizedBy:
    e.courseId === 'crs-phys-2bac' ? 'أ. أحمد التازي' : 'أ. جواد العلمي',
  expiresAt: e.expiresAt ?? daysFrom(
    e.authorizedAt,
    (e.durationMonths ?? 6) * 30,
  ),
  durationMonths: e.durationMonths,
  payment: e.payment,
}));

/* ------------------------------------------------------------------ */
/* Center memberships (consent-based enrollment)                      */
/* ------------------------------------------------------------------ */

const memberships: CenterMembership[] = [
  {
    id: 'mbr-001',
    studentId: 'st-iman',
    centerId: 'ctr-atlas',
    status: 'active',
    requestedAt: '2026-09-03T10:00:00.000Z',
    respondedAt: '2026-09-03T10:10:00.000Z',
  },
  {
    id: 'mbr-002',
    studentId: 'st-hiba',
    centerId: 'ctr-atlas',
    status: 'requested',
    requestedAt: '2026-10-01T10:45:00.000Z',
  },
];

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const notifications: AppNotification[] = [
  {
    id: 'notif-1',
    studentId: 'st-hiba',
    kind: 'center-request',
    payload: { centerId: 'ctr-atlas', centerName: 'مركز الأطلس للدروس' },
    read: false,
    createdAt: '2026-10-01T10:45:00.000Z',
  },
];

const activity: DemoState['activity'] = [
  { id: 'ac-1', kind: 'student',       text: 'تم تفعيل وصول «كنزة بلحاج» في دورة «الرياضيات · 2ème Bac»', at: '2026-10-13T16:20:00.000Z' },
  { id: 'ac-2', kind: 'lesson',        text: 'تم نشر الدرس «دراسة تغيرات الدوال والمنحنيات»',              at: '2026-10-12T11:05:00.000Z' },
  { id: 'ac-3', kind: 'lesson',        text: 'أضاف «أ. أحمد التازي» درسين جديدين في «الفيزياء · 2ème Bac»', at: '2026-10-12T10:20:00.000Z' },
  { id: 'ac-4', kind: 'course',        text: 'تم تحديث دورة «الرياضيات · 2ème Bac»',                       at: '2026-10-11T17:45:00.000Z' },
  { id: 'ac-5', kind: 'student',       text: 'طلب طالب جديد: زكريا الفاسي — دورة «الفيزياء · 2ème Bac»',   at: '2026-10-04T11:30:00.000Z' },
];

/* ------------------------------------------------------------------ */
/* Student progress (demo phone persona)                               */
/* ------------------------------------------------------------------ */

/** Every lesson of a course, semester → topic → lesson. */
const lessonsOf = (course: Course) =>
  course.semesters.flatMap((s) => s.chapters).flatMap((c) => c.lessons);

const mathLessons = lessonsOf(courseMath);
const physicsLessons = lessonsOf(coursePhysics);

const progress: DemoState['progress'] = {
  'st-iman': [
    { lessonId: mathLessons[0].id, positionSec: mathLessons[0].durationSec, completed: true,  updatedAt: '2026-09-14T19:10:00.000Z' },
    { lessonId: mathLessons[2].id, positionSec: mathLessons[2].durationSec, completed: true,  updatedAt: '2026-09-18T20:02:00.000Z' },
    { lessonId: mathLessons[3].id, positionSec: 0,                          completed: true,  updatedAt: '2026-09-19T18:44:00.000Z' },
    { lessonId: mathLessons[5].id, positionSec: 214,                        completed: false, updatedAt: '2026-10-11T21:31:00.000Z' },
    { lessonId: physicsLessons[1].id, positionSec: 0,                       completed: true,  updatedAt: '2026-10-13T20:05:00.000Z' },
    { lessonId: physicsLessons[3].id, positionSec: 0,                       completed: false, updatedAt: '2026-10-13T20:15:00.000Z' },
  ],
  'st-yassine': [
    { lessonId: mathLessons[0].id, positionSec: 504, completed: true,  updatedAt: '2026-09-15T18:00:00.000Z' },
    { lessonId: mathLessons[2].id, positionSec: 402, completed: false, updatedAt: '2026-10-02T19:22:00.000Z' },
  ],
};

/* ------------------------------------------------------------------ */

export const DEMO_STATE: DemoState = {
  version: 4,
  /* No auto sign-in: a fresh install opens on the welcome screen and
     the student authenticates via Login / Signup (or guest account picker). */
  activeStudentId: '',
  lang: 'ar',
  teacher,
  centers: [demoCenter],
  courses: [courseMath, coursePhysics],
  students,
  enrollments,
  memberships,
  notifications,
  activity,
  progress,
};

/** Deep-clone so callers can mutate freely. */
export function createDemoState(): DemoState {
  return JSON.parse(JSON.stringify(DEMO_STATE)) as DemoState;
}
