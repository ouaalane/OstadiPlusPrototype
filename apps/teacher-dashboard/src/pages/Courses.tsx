import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Clock3,
  Layers,
  Pencil,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import {
  activeStudentCount,
  countChapters,
  countLessons,
  courseDurationSec,
  coverGradients,
  relativeTime,
} from '@ostadiplus/shared';
import { CourseCover, EmptyState, Field, Modal, PageHeader, Pill } from '@/components/ui';
import { useAction, useStore, newId, type NewCourse } from '@/store/DemoStore';

const LEVELS = [
  '2ème Bac — SVT & PC',
  '2ème Bac — PC & SM',
  '2ème Bac — كل الشعب',
  '1ère Bac SM',
  'السنة الأولى ثانوي',
];

const SUBJECTS = ['الرياضيات', 'الفيزياء والكيمياء', 'علوم الحياة والأرض'];

const COVERS = Object.keys(coverGradients);

type Filter = 'all' | 'published' | 'draft';

export default function Courses() {
  const { state } = useStore();
  const dispatch = useAction();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (params.get('action') === 'new') {
      setCreating(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const courses = useMemo(() => {
    const needle = query.trim();
    return state.courses.filter((course) => {
      if (filter !== 'all' && course.status !== filter) return false;
      if (!needle) return true;
      return (
        course.title.includes(needle) ||
        course.level.includes(needle) ||
        course.subject.includes(needle)
      );
    });
  }, [state.courses, query, filter]);

  return (
    <>
      <PageHeader
        title="الدورات"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={17} />
            إنشاء دورة
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-faint"
          />
          <input
            className="input ps-10"
            placeholder="ابحث في دوراتك…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="بحث في الدورات"
          />
        </div>

        <div className="flex gap-2" role="tablist" aria-label="تصفية حسب الحالة">
          {(
            [
              ['all', 'الكل'],
              ['published', 'منشورة'],
              ['draft', 'مسودة'],
            ] as [Filter, string][]
          ).map(([key, labelText]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`btn btn-sm ${
                filter === key ? 'btn-primary' : 'btn-outline'
              }`}
            >
              {labelText}
            </button>
          ))}
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title={query || filter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد دورات بعد'}
          description={
            query || filter !== 'all'
              ? 'جرّب كلمة بحث أخرى أو غيّر التصفية.'
              : 'أنشئ دورتك الأولى، أضف الفصول والدروس، ثم انشرها في خطوات بسيطة.'
          }
          action={
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus size={17} />
              إنشاء دورة
            </button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const lessons = countLessons(course);
            const students = activeStudentCount(state, course.id);
            const isPublished = course.status === 'published';
            return (
              <li key={course.id} className="card group flex flex-col overflow-hidden p-0">
                <Link to={`/courses/${course.id}`} className="block">
                  <CourseCover
                    cover={course.cover}
                    subject={course.subject}
                    className="h-32"
                  >
                    <div className="flex items-end justify-between gap-2">
                      <Pill
                        tone={isPublished ? 'success' : 'warning'}
                        dot
                      >
                        {isPublished ? 'منشورة' : 'مسودة'}
                      </Pill>
                      <span className="num rounded-lg bg-black/20 px-2 py-1 text-xs font-semibold text-white">
                        {lessons} درس
                      </span>
                    </div>
                  </CourseCover>
                </Link>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <Link to={`/courses/${course.id}`}>
                      <h3 className="line-clamp-2 text-[15.5px] font-bold leading-snug hover:text-brand">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="mt-1 text-xs text-muted">{course.level}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers size={14} />
                      <span className="num">{countChapters(course)}</span>
                      فصل
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} />
                      <span className="num">
                        {Math.round(courseDurationSec(course) / 60)}
                      </span>
                      دقيقة
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} />
                      <span className="num">{students}</span>
                      تلميذ
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/courses/${course.id}`}
                      className="btn btn-soft btn-sm flex-1"
                    >
                      <Pencil size={14} />
                      إدارة الدورة
                    </Link>
                    <span className="text-[11px] text-faint">
                      {relativeTime(course.updatedAt)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CreateCourseModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(payload) => {
          dispatch({ type: 'course/create', payload }, 'تم إنشاء الدورة كمسودة');
          setCreating(false);
          navigate(`/courses/${payload.id}`);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function CreateCourseModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: NewCourse) => void;
}) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [summary, setSummary] = useState('');
  const [cover, setCover] = useState('blue');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setSubject(SUBJECTS[0]);
      setLevel(LEVELS[0]);
      setSummary('');
      setCover('blue');
      setTouched(false);
    }
  }, [open]);

  const invalid = title.trim().length < 4;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إنشاء دورة جديدة"
      description="تُحفظ كمسودة حتى تنشرها."
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setTouched(true);
              if (invalid) return;
              onCreate({
                id: newId('crs'),
                title: title.trim(),
                subject,
                level,
                summary: summary.trim() || 'لم تُضف بعد وصف هذه الدورة.',
                cover: cover as NewCourse['cover'],
              });
            }}
          >
            إنشاء الدورة
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="عنوان الدورة"
          hint="مثال: الحساب التفاضلي — مدخل وتطبيقات"
          error={touched && invalid ? 'اكتب عنواناً من 4 أحرف على الأقل.' : undefined}
        >
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان واضح للتلاميذ"
            maxLength={90}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="المادة">
            <select
              className="input"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              {SUBJECTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="المستوى">
            <select
              className="input"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              {LEVELS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="وصف مختصر" hint="يظهر لطالب في صفحة الدورة.">
          <textarea
            className="textarea"
            style={{ minHeight: 90 }}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="ماذا سيتعلم التلميذ في هذه الدورة؟"
            maxLength={240}
          />
        </Field>

        <div>
          <span className="label">لون الغلاف</span>
          <div className="flex flex-wrap gap-2">
            {COVERS.map((key) => {
              const [from, to] = coverGradients[key];
              const selected = cover === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`غلاف ${key}`}
                  aria-pressed={selected}
                  onClick={() => setCover(key)}
                  className={`h-9 w-9 rounded-lg transition-transform ${
                    selected ? 'scale-110 ring-2 ring-ink ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
