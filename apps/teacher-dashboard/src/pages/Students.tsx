import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  PauseCircle,
  Plus,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { relativeTime, type EnrollmentStatus } from '@ostadiplus/shared';
import { Avatar, EmptyState, Field, Modal, PageHeader, Pill, Toggle } from '@/components/ui';
import { useAction, useStore } from '@/store/DemoStore';

type Filter = 'all' | EnrollmentStatus;

const FILTERS: [Filter, string][] = [
  ['all', 'الكل'],
  ['active', 'نشط'],
  ['pending', 'معلّ'],
  ['suspended', 'موقوف'],
];

const STATUS_META: Record<
  EnrollmentStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  active: { label: 'نشط', tone: 'success' },
  pending: { label: 'معلّ — بانتظار التفعيل', tone: 'warning' },
  suspended: { label: 'موقوف', tone: 'danger' },
};

const LEVELS = [
  '2ème Bac — SVT & PC',
  '2ème Bac — PC & SM',
  '1ère Bac SM',
  'السنة الثانية ثانوي',
  'السنة الأولى ثانوي',
];

export default function Students() {
  const { state } = useStore();
  const dispatch = useAction();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('action') === 'new') {
      setCreating(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const rows = useMemo(() => {
    const needle = query.trim();
    return state.students
      .map((student) => {
        const enrollments = state.enrollments.filter((e) => e.studentId === student.id);
        return { student, enrollments };
      })
      .filter(({ student, enrollments }) => {
        if (filter !== 'all' && !enrollments.some((e) => e.status === filter)) return false;
        if (!needle) return true;
        return (
          student.fullName.includes(needle) ||
          student.phone.includes(needle) ||
          student.level.includes(needle)
        );
      });
  }, [state.students, state.enrollments, query, filter]);

  const counts = useMemo(() => {
    const total = state.students.length;
    const active = new Set(
      state.enrollments.filter((e) => e.status === 'active').map((e) => e.studentId),
    ).size;
    const pending = new Set(
      state.enrollments.filter((e) => e.status === 'pending').map((e) => e.studentId),
    ).size;
    return { total, active, pending };
  }, [state.students, state.enrollments]);

  return (
    <>
      <PageHeader
        title="التلاميذ والوصول"
        description="أضف تلميذاً، فعّل وصوله إلى الدورات، أو أوقفه — كل شيء يظهر فوراً في التطبيق."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <UserPlus size={17} />
            إضافة تلميذ
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile label="تلاميذ مسجّلون" value={counts.total} />
        <SummaryTile label="وصول نشط" value={counts.active} tone="success" />
        <SummaryTile label="بانتظار التفعيل" value={counts.pending} tone="warning" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-faint"
          />
          <input
            className="input ps-10"
            placeholder="ابحث بالاسم أو الهاتف…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="بحث في التلاميذ"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية حسب حالة الوصول">
          {FILTERS.map(([key, labelText]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-outline'}`}
            >
              {labelText}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={query || filter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا تلاميذ بعد'}
          description={
            query || filter !== 'all'
              ? 'جرّب كلمة بحث أخرى أو غيّر التصفية.'
              : 'أضف أول تلميذ وحدّد الدورة، ثم فعّل وصوله ليظهر في تطبيق التلاميذ.'
          }
          action={
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <UserPlus size={17} />
              إضافة تلميذ
            </button>
          }
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden p-0">
          {rows.map(({ student, enrollments }, index) => {
            const isOpen = expanded === student.id;
            const activeCount = enrollments.filter((e) => e.status === 'active').length;
            return (
              <li key={student.id}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Avatar label={student.monogram} seed={index} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold text-ink">
                      {student.fullName}
                    </div>
                    <div className="truncate text-xs text-muted">
                      <span dir="ltr" className="num">
                        {student.phone}
                      </span>
                      {' · '}
                      {student.level}
                      {' · '}
                      انضم {relativeTime(student.joinedAt)}
                    </div>
                  </div>

                  <div className="hidden items-center gap-2 sm:flex">
                    {activeCount > 0 ? (
                      <Pill tone="success" dot>
                        <span className="num">{activeCount}</span> دورة نشطة
                      </Pill>
                    ) : (
                      <Pill tone="warning" dot>
                        بلا وصول نشط
                      </Pill>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : student.id)}
                  >
                    {isOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                    {isOpen ? 'إخفاء' : 'الوصول'}
                  </button>
                </div>

                {isOpen ? (
                  <div className="border-t border-line bg-surface-alt/50 px-4 py-4">
                    <p className="mb-3 text-xs font-semibold text-muted">
                      حالة الوصول لكل دورة — أي تغيير هنا يظهر مباشرة في التطبيق.
                    </p>
                    <ul className="space-y-2">
                      {state.courses.map((course) => {
                        const enrollment = enrollments.find((e) => e.courseId === course.id);
                        const status = enrollment?.status;
                        return (
                          <li
                            key={course.id}
                            className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                              {course.title}
                            </span>
                            <Pill tone={status ? STATUS_META[status].tone : 'neutral'} dot>
                              {status ? STATUS_META[status].label : 'غير مشترك'}
                            </Pill>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="btn btn-soft btn-sm"
                                disabled={status === 'active'}
                                onClick={() => {
                                  dispatch(
                                    {
                                      type: 'enrollment/setStatus',
                                      payload: {
                                        studentId: student.id,
                                        courseId: course.id,
                                        status: 'active',
                                      },
                                    },
                                    `${student.fullName} يستطيع الآن فتح «${course.title}» في التطبيق`,
                                  );
                                }}
                              >
                                <CheckCircle2 size={14} />
                                تفعيل
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={status === 'pending'}
                                onClick={() =>
                                  dispatch(
                                    {
                                      type: 'enrollment/setStatus',
                                      payload: {
                                        studentId: student.id,
                                        courseId: course.id,
                                        status: 'pending',
                                      },
                                    },
                                    'أُعيد الطلب إلى حالة المراجعة',
                                  )
                                }
                              >
                                <PauseCircle size={14} />
                                معلّ
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--color-danger)' }}
                                disabled={status === 'suspended'}
                                onClick={() =>
                                  dispatch(
                                    {
                                      type: 'enrollment/setStatus',
                                      payload: {
                                        studentId: student.id,
                                        courseId: course.id,
                                        status: 'suspended',
                                      },
                                    },
                                    `تم إيقاف وصول ${student.fullName}`,
                                  )
                                }
                              >
                                إيقاف
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <AddStudentModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(payload) => {
          dispatch(
            { type: 'student/create', payload },
            payload.authorize && payload.courseId
              ? `تمت إضافة ${payload.fullName} مع تفعيل الوصول`
              : `تمت إضافة التلميذ ${payload.fullName}`,
          );
          setCreating(false);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function SummaryTile({
  label,
  value,
  tone = 'brand',
}: {
  label: string;
  value: number;
  tone?: 'brand' | 'success' | 'warning';
}) {
  const colors = {
    brand: { bg: 'var(--color-brand-soft)', fg: 'var(--color-brand-dark)' },
    success: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    warning: { bg: 'var(--color-accent-soft)', fg: '#8A5A00' },
  } as const;
  const style = colors[tone];
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: style.fg }}
      />
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-muted">{label}</div>
        <div className="num text-xl font-bold" style={{ color: style.fg }}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddStudentModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    fullName: string;
    phone: string;
    level: string;
    courseId: string | null;
    authorize: boolean;
  }) => void;
}) {
  const { state } = useStore();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [courseId, setCourseId] = useState<string>('');
  const [authorize, setAuthorize] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName('');
      setPhone('');
      setLevel(LEVELS[0]);
      setCourseId(state.courses[0]?.id ?? '');
      setAuthorize(true);
      setTouched(false);
    }
  }, [open, state.courses]);

  const nameInvalid = fullName.trim().length < 3;
  const phoneInvalid = phone.trim().length < 8;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة تلميذ"
      description="التلميذ يظهر فوراً في القائمة، ووصوله للدورات يبقى معلّاً حتى تفعّله."
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
              if (nameInvalid || phoneInvalid) return;
              onCreate({
                fullName: fullName.trim(),
                phone: phone.trim(),
                level,
                courseId: courseId || null,
                authorize,
              });
            }}
          >
            <Plus size={16} />
            إضافة التلميذ
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="الاسم الكامل"
          error={touched && nameInvalid ? 'اكتب اسماً من 3 أحرف على الأقل.' : undefined}
        >
          <input
            className="input"
            value={fullName}
            autoFocus
            placeholder="مثال: إمان السيد"
            maxLength={60}
            onChange={(event) => setFullName(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="رقم الهاتف"
            error={touched && phoneInvalid ? 'رقم هاتف غير صحيح.' : undefined}
          >
            <input
              className="input"
              dir="ltr"
              value={phone}
              inputMode="tel"
              placeholder="06 12 34 56 78"
              onChange={(event) => setPhone(event.target.value)}
            />
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

        <Field label="الدورة" hint="اتركها فارغة إن أضفت التلميذ دون دورة.">
          <select
            className="input"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">بدون دورة بعد</option>
            {state.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">تفعيل الوصول فوراً</div>
            <div className="text-xs text-muted">
              يظهر للطالب أنه يستطيع فتح الدورة مباشرة.
            </div>
          </div>
          <Toggle
            checked={authorize}
            label="تفعيل الوصول فوراً"
            onChange={setAuthorize}
          />
        </div>
      </div>
    </Modal>
  );
}
