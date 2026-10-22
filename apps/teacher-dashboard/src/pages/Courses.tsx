import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpLeft,
  BookOpen,
  Clock3,
  Layers,
  LayoutGrid,
  List,
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
import { CourseCover, EmptyState, Field, Modal } from '@/components/ui';
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
  const [view, setView] = useState<'list' | 'grid'>('list');
  useEffect(() => {
    if (params.get('action') === 'new') {
      setCreating(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);
  const courses = useMemo(
    () =>
      state.courses.filter(
        (c) =>
          (filter === 'all' || c.status === filter) &&
          `${c.title} ${c.level} ${c.subject}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [state.courses, filter, query],
  );
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="section-kicker">صناعة المحتوى</p>
          <h1 className="workspace-title">دوراتك التعليمية</h1>
          <p className="workspace-subtitle">
            من أول فكرة إلى درس منشور. رتّب محتواك وصمّم رحلة تعلّم متكاملة.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={17} />
          إنشاء دورة
        </button>
      </div>
      <div className="course-stat-strip" aria-label="ملخص الدورات">
        <div>
          <BookOpen size={18} aria-hidden="true" />
          <strong className="num">{state.courses.length}</strong> دورة تعليمية
        </div>
        <div>
          <span className="status-label">منشورة</span>
          <strong className="num">
            {state.courses.filter((c) => c.status === 'published').length}
          </strong>
        </div>
        <div>
          <span className="status-label is-draft">مسودة</span>
          <strong className="num">
            {state.courses.filter((c) => c.status === 'draft').length}
          </strong>
        </div>
      </div>
      <section className="workspace-panel course-catalog">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5">
          <div
            className="workspace-tabs border-0"
            role="tablist"
            aria-label="حالة الدورات"
          >
            {(
              [
                ['all', 'كل الدورات'],
                ['published', 'منشورة'],
                ['draft', 'مسودات'],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                className="workspace-tab"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="num ms-2 rounded bg-brand-soft/60 px-1.5 py-0.5 text-[9px] text-muted">
                  {
                    state.courses.filter(
                      (c) => key === 'all' || c.status === key,
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 py-3">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                aria-label="بحث في الدورات"
                placeholder="ابحث في دوراتك…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="workspace-search max-w-56"
              />
            </div>
            <div className="hidden items-center rounded-lg border border-line p-1 sm:flex">
              <button
                className={`rounded p-1.5 ${view === 'list' ? 'bg-brand-soft text-brand' : 'text-muted'}`}
                onClick={() => setView('list')}
                aria-label="عرض قائمة"
                aria-pressed={view === 'list'}
              >
                <List size={16} />
              </button>
              <button
                className={`rounded p-1.5 ${view === 'grid' ? 'bg-brand-soft text-brand' : 'text-muted'}`}
                onClick={() => setView('grid')}
                aria-label="عرض بطاقات"
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>
        {courses.length ? (
          view === 'list' ? (
            <div className="overflow-x-auto">
              <table className="workspace-table min-w-[780px]">
                <thead>
                  <tr>
                    <th>الدورة التعليمية</th>
                    <th>المنهج</th>
                    <th>التلاميذ</th>
                    <th>الحالة</th>
                    <th>آخر تحديث</th>
                    <th>
                      <span className="sr-only">الإدارة</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link
                          to={`/courses/${c.id}`}
                          className="flex items-center gap-4"
                        >
                          <CourseCover
                            cover={c.cover}
                            subject={c.subject}
                            compact
                            className="h-16 w-24 shrink-0 rounded-lg"
                          />
                          <span>
                            <span className="block max-w-64 truncate font-bold">
                              {c.title}
                            </span>
                            <span className="mt-1 block text-[10px] text-muted">
                              {c.level}
                            </span>
                            <span className="mt-2 inline-flex items-center gap-1 text-[9px] text-muted">
                              <Clock3 size={11} />
                              {Math.round(courseDurationSec(c) / 60)} دقيقة
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <p>{countLessons(c)} دروس</p>
                        <p className="mt-1 text-[10px] text-muted">
                          {countChapters(c)} فصول
                        </p>
                      </td>
                      <td>
                        <span className="num">
                          {activeStudentCount(state, c.id)}
                        </span>
                        <span className="ms-1 text-[10px] text-muted">نشط</span>
                      </td>
                      <td>
                        <span
                          className={`status-label ${c.status === 'draft' ? 'is-draft' : ''}`}
                        >
                          {c.status === 'published' ? 'منشورة' : 'مسودة'}
                        </span>
                      </td>
                      <td className="text-[10px] text-muted">
                        {relativeTime(c.updatedAt)}
                      </td>
                      <td>
                        <Link
                          to={`/courses/${c.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          إدارة
                          <ArrowUpLeft size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  to={`/courses/${c.id}`}
                  className="catalog-course-card overflow-hidden rounded-xl border border-line"
                >
                  <CourseCover
                    cover={c.cover}
                    subject={c.subject}
                    compact
                    className="h-40"
                  >
                    <span className="mt-auto rounded bg-white px-2 py-1 text-[9px] text-ink">
                      {c.subject}
                    </span>
                  </CourseCover>
                  <div className="space-y-3 p-4">
                    <span
                      className={`status-label ${c.status === 'draft' ? 'is-draft' : ''}`}
                    >
                      {c.status === 'published' ? 'منشورة' : 'مسودة'}
                    </span>
                    <h2 className="line-clamp-2 text-base font-bold">
                      {c.title}
                    </h2>
                    <p className="text-[10px] text-muted">{c.level}</p>
                    <div className="flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted">
                      <span>
                        <Layers size={12} className="me-1 inline" />
                        {countLessons(c)} درس
                      </span>
                      <span>
                        <Users size={12} className="me-1 inline" />
                        {activeStudentCount(state, c.id)} تلميذ
                      </span>
                      <ArrowUpLeft size={15} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="p-6">
            <EmptyState
              icon={<BookOpen size={25} />}
              title={
                state.courses.length
                  ? 'لا توجد دورات مطابقة'
                  : 'ابدأ بأول دورة تعليمية'
              }
              description={
                state.courses.length
                  ? 'لا توجد نتائج تطابق البحث والتصفية الحالية. يمكنك إعادة عرض كل دوراتك.'
                  : 'أنشئ دورتك الأولى، ثم أضف الفصول والدروس عندما تكون جاهزاً.'
              }
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (state.courses.length) {
                      setQuery('');
                      setFilter('all');
                    } else {
                      setCreating(true);
                    }
                  }}
                >
                  {state.courses.length ? 'مسح البحث والتصفية' : 'إنشاء دورة'}
                </button>
              }
            />
          </div>
        )}
        <footer className="flex items-center justify-between border-t border-line px-5 py-4 text-[10px] text-muted">
          <span>
            عرض {courses.length} من {state.courses.length} دورات
          </span>
          <span>المحتوى محفوظ في مساحتك</span>
        </footer>
      </section>
      <CreateCourseModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(payload) => {
          dispatch(
            { type: 'course/create', payload },
            'تم إنشاء الدورة كمسودة',
          );
          setCreating(false);
          navigate(`/courses/${payload.id}`);
        }}
      />
    </>
  );
}

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
          error={
            touched && invalid ? 'اكتب عنواناً من 4 أحرف على الأقل.' : undefined
          }
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
          <span className="label">غلاف الدورة</span>
          <div className="flex flex-wrap gap-2">
            {COVERS.map((key) => {
              const selected = cover === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`غلاف ${key}`}
                  aria-pressed={selected}
                  onClick={() => setCover(key)}
                  className={`overflow-hidden rounded-lg transition-transform ${
                    selected
                      ? 'scale-110 ring-2 ring-ink ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                >
                  <CourseCover cover={key} subject={''} className="h-12 w-20" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
