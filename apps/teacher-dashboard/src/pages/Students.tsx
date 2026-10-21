import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardPaste,
  PauseCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  relativeTime,
  type CenterMembership,
  type Enrollment,
  type EnrollmentStatus,
  type Student,
} from '@ostadiplus/shared';
import {
  Avatar,
  DataTable,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pill,
  Segmented,
  type DataTableColumn,
  type PillTone,
} from '@/components/ui';
import { useAction, useStore } from '@/store/DemoStore';

type Filter = 'all' | EnrollmentStatus;

const FILTERS: [Filter, string][] = [
  ['all', 'الكل'],
  ['active', 'نشط'],
  ['pending', 'معلّ'],
  ['suspended', 'موقوف'],
];

const STATUS_META: Record<EnrollmentStatus, { label: string; tone: PillTone }> = {
  active: { label: 'نشط', tone: 'success' },
  pending: { label: 'معلّ — بانتظار التفعيل', tone: 'warning' },
  suspended: { label: 'موقوف', tone: 'danger' },
  requested: { label: 'طلب قيد المراجعة', tone: 'info' },
  rejected: { label: 'تم رفض الطلب', tone: 'danger' },
  cancelled: { label: 'ملغي', tone: 'neutral' },
};

export default function Students() {
  const { state, pendingMemberships, findStudentByCode } = useStore();
  const action = useAction();

  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [managing, setManaging] = useState<{
    student: Student;
    enrollments: Enrollment[];
  } | null>(null);
  const [requestResult, setRequestResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  /* Stitch «تفعيل تلميذ جديد بالمعرف أو رمز QR» — lookup by the student's
   * opaque code (UST-XXXXX), never by name or phone (multi-center privacy). */
  const [method, setMethod] = useState<'code' | 'qr'>('code');
  const [codeInput, setCodeInput] = useState('');
  const [activation, setActivation] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const rows = useMemo(
    () =>
      state.students
        .map((student) => {
          const enrollments = state.enrollments.filter((e) => e.studentId === student.id);
          return { student, enrollments };
        })
        .filter(({ enrollments }) => {
          if (filter !== 'all' && !enrollments.some((e) => e.status === filter)) return false;
          return true;
        }),
    [state.students, state.enrollments, filter],
  );

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

  /* ---- Table columns ---- */
  const columns: DataTableColumn<(typeof rows)[number]>[] = useMemo(
    () => [
      {
        key: 'student',
        header: 'التلميذ',
        width: '280px',
        sortValue: ({ student }) => student.fullName,
        render: ({ student }, index) => (
          <div className="flex items-center gap-3">
            <Avatar label={student.monogram} seed={index} size={38} />
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-bold text-ink">
                {student.fullName}
              </div>
              <div className="truncate text-xs text-muted">
                <span dir="ltr" className="num">{student.phone}</span>
                {' · '}
                <span dir="ltr" className="num">{student.studentCode}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'level',
        header: 'المستوى',
        sortValue: ({ student }) => student.level,
        render: ({ student }) => (
          <span className="text-[13px] font-semibold text-body">{student.level}</span>
        ),
      },
      {
        key: 'joined',
        header: 'تاريخ الانضمام',
        hideOnMobile: true,
        sortValue: ({ student }) => student.joinedAt,
        render: ({ student }) => (
          <span className="text-xs text-muted">انضم {relativeTime(student.joinedAt)}</span>
        ),
      },
      {
        key: 'access',
        header: 'حالة الوصول',
        align: 'center',
        width: '130px',
        sortValue: ({ enrollments }) =>
          enrollments.filter((e) => e.status === 'active').length,
        render: ({ enrollments }) => {
          const activeCount = enrollments.filter((e) => e.status === 'active').length;
          return activeCount > 0 ? (
            <Pill tone="success" dot>
              <span className="num">{activeCount}</span> دورة نشطة
            </Pill>
          ) : (
            <Pill tone="warning" dot>بلا وصول نشط</Pill>
          );
        },
      },
      {
        key: 'courses',
        header: 'المقررات',
        align: 'center',
        hideOnMobile: true,
        render: ({ enrollments }) => {
          const subscribed = state.courses.filter((c) =>
            enrollments.some((e) => e.courseId === c.id),
          );
          if (subscribed.length === 0) {
            return <span className="text-xs text-faint">لا مقررات</span>;
          }
          return (
            <div className="flex flex-wrap justify-center gap-1.5">
              {subscribed.map((course) => {
                const enrollment = enrollments.find((e) => e.courseId === course.id);
                if (!enrollment) return null;
                return (
                  <span
                    key={course.id}
                    title={`${course.title} — ${STATUS_META[enrollment.status].label}`}
                    className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      enrollment.status === 'active'
                        ? 'bg-success-soft text-success'
                        : enrollment.status === 'pending'
                          ? 'bg-accent-soft text-brand'
                          : 'bg-surface-alt text-muted',
                    ].join(' ')}
                  >
                    {course.title.length > 14
                      ? `${course.title.slice(0, 14)}…`
                      : course.title}
                  </span>
                );
              })}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'الإجراء',
        align: 'end',
        width: '150px',
        render: (row) => (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setManaging({ student: row.student, enrollments: row.enrollments })}
          >
            إدارة الوصول
          </button>
        ),
      },
    ],
    [state.courses],
  );

  /* Resolve a student by their opaque code (UST-XXXXX). Security: lookup is
   * by code only — never by name or phone (multi-center privacy). */
  const verifyStudent = () => {
    const needle = codeInput.trim();
    if (!needle) {
      setActivation({ tone: 'error', text: 'أدخل رمز الطالب أولاً.' });
      return;
    }
    const found = findStudentByCode(needle);
    if (!found) {
      setActivation({
        tone: 'error',
        text: 'لم يتم العثور على تلميذ بهذا الرمز — تأكد من نسخ الرمز من بطاقة الطالب في التطبيق.',
      });
      return;
    }
    setFilter('all');
    setExpanded(found.id);
    setActivation({ tone: 'ok', text: `تم التحقق من ${found.fullName} (${found.studentCode}) — اختر المركز لإرسال طلب الانضمام.` });
  };

  /* Send a center connection request for the verified student. Creates a
   * membership in 'requested' state and a notification for the student. The
   * student must accept via their app before the center can see details or
   * assign courses. */
  const sendRequest = () => {
    if (!expanded) return;
    const center = state.centers[0];
    if (!center) {
      setRequestResult({ tone: 'error', text: 'لم يتم إعداد مركز للمعلم.' });
      return;
    }
    action({
      type: 'membership/request',
      payload: { studentId: expanded, centerId: center.id },
    });
    setRequestResult({
      tone: 'ok',
      text: `تم إرسال طلب الانضمام إلى ${center.name}. سيصل إشعار إلى تطبيق التلميذ للموافقة أو الرفض.`,
    });
    setActivation(null);
  };

  /* Simulated QR scan: fills the field with the first student code awaiting activation. */
  const simulateScan = () => {
    const target =
      state.students.find((s) =>
        state.enrollments.some((e) => e.studentId === s.id && e.status === 'pending'),
      ) ?? state.students[0];
    if (!target) return;
    setCodeInput(target.studentCode);
    setActivation({
      tone: 'ok',
      text: `تم التقاط الرمز: ${target.fullName} (${target.studentCode}) — راجع المعلومات ثم أرسل طلب الانضمام.`,
    });
    setExpanded(target.id);
  };

  return (
    <>
      <PageHeader
        title="تفعيل تلاميذ المراكز"
        description="أرسل طلب انضمام برمز الطالب، ثم فعّل وصوله للمقررات بعد موافقته في التطبيق."
      />

      {/* تفعيل تلميذ جديد بالمعرف أو رمز QR */}
      <div className="card mb-5 overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-softer px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <UserPlus size={19} />
          </div>
          <h2 className="min-w-0 flex-1 text-base font-bold text-ink">
            تفعيل تلميذ جديد
          </h2>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 inline-flex rounded-xl border border-line bg-surface-alt p-1">
            <button
              type="button"
              onClick={() => setMethod('code')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                method === 'code' ? 'bg-white text-brand-dark shadow-sm' : 'text-muted'
              }`}
            >
              <Tag size={15} />
              رمز الطالب
            </button>
            <button
              type="button"
              onClick={() => setMethod('qr')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                method === 'qr' ? 'bg-white text-brand-dark shadow-sm' : 'text-muted'
              }`}
            >
              <QrCode size={15} />
              مسح رمز QR
            </button>
          </div>

          {method === 'code' ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <Field label="رمز الطالب">
                  <div className="flex gap-2">
                    <input
                      className="input"
                      dir="ltr"
                      value={codeInput}
                      placeholder="UST-7F3K2"
                      onChange={(event) => {
                        setCodeInput(event.target.value);
                        setActivation(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') verifyStudent();
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        const first = state.students[0];
                        if (first) setCodeInput(first.studentCode);
                      }}
                    >
                      <ClipboardPaste size={16} />
                      لصق
                    </button>
                  </div>
                </Field>
              </div>
              <button type="button" className="btn btn-primary" onClick={verifyStudent}>
                <ShieldCheck size={16} />
                تحقق
              </button>
              {expanded && (
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={sendRequest}
                  disabled={!!requestResult}
                >
                  <UserPlus size={16} />
                  إرسال طلب انضمام
                </button>
              )}
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={simulateScan}>
              <ScanLine size={16} />
              بدء المسح الضوئي
            </button>
          )}

          {activation ? (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                activation.tone === 'ok'
                  ? 'bg-success-soft text-success'
                  : 'bg-danger-soft text-danger'
              }`}
            >
              {activation.text}
            </p>
          ) : null}
          {requestResult ? (
            <p className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold bg-brand-soft text-brand-dark">
              {requestResult.text}
            </p>
          ) : null}
        </div>
      </div>

      {/* Pending center membership requests — sent by the center, awaiting student acceptance. */}
      {pendingMemberships.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-muted mb-2">طلبات الانضمام قيد الانتظار</h3>
          <ul className="card divide-y divide-line overflow-hidden p-0">
            {pendingMemberships.map((membership: CenterMembership) => {
              const student = state.students.find((s) => s.id === membership.studentId);
              const center = state.centers.find((c) => c.id === membership.centerId);
              if (!student || !center) return null;
              return (
                <li key={membership.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink truncate">
                      {student.fullName}
                    </div>
                    <div className="text-xs text-muted">
                      {student.studentCode} · {center.name}
                    </div>
                  </div>
                  <Pill tone="warning" dot>
                    في انتظار موافقة التلميذ
                  </Pill>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile label="تلاميذ مسجّلون" value={counts.total} />
        <SummaryTile label="وصول نشط" value={counts.active} tone="success" />
        <SummaryTile label="بانتظار التفعيل" value={counts.pending} tone="warning" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={filter !== 'all' ? 'لا تلاميذ بهذه الحالة' : 'لا تلاميذ بعد'}
          description={
            filter !== 'all'
              ? 'غيّر التصفية لعرض تلاميذ آخرين.'
              : 'لم يسجّل أي تلميذ في التطبيق بعد — سيظهر هنا تلقائياً بمجرد أن يُنشئ حساباً ويزور المركز.'
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={({ student }) => student.id}
          title="التلاميذ المرتبطون بهذه المركزية"
          searchPlaceholder="بحث بالاسم أو الرمز…"
          selectedIds={selected}
          onSelectionChange={setSelected}
          toolbar={
            <div className="flex flex-wrap items-center gap-2.5">
              <Segmented
                value={filter}
                onChange={setFilter}
                options={FILTERS}
                ariaLabel="تصفية حسب حالة الوصول"
              />
              <button type="button" className="btn btn-dark btn-sm" onClick={simulateScan}>
                <QrCode size={15} />
                طلب انضمام برمز QR
              </button>
            </div>
          }
          emptyState={
            <div className="flex flex-col items-center gap-2 text-muted">
              <Users size={28} className="text-faint" />
              <p className="text-sm font-semibold">لا توجد نتائج مطابقة</p>
              <p className="text-xs">جرّب تعديل البحث أو التصفية.</p>
            </div>
          }
        />
      )}

      {/* ---- Per-course access manager (modal) ---- */}
      <Modal
        open={managing !== null}
        onClose={() => setManaging(null)}
        title={managing ? `حالة الوصول — ${managing.student.fullName}` : ''}
        description="حالة الوصول لكل دورة — أي تغيير هنا يظهر مباشرة في التطبيق."
        size="md"
      >
        {managing ? (
          <ul className="space-y-2">
            {state.courses.map((course) => {
              const enrollment = managing.enrollments.find((e) => e.courseId === course.id);
              const status = enrollment?.status;
              return (
                <li
                  key={course.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
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
                        action(
                          {
                            type: 'enrollment/setStatus',
                            payload: { studentId: managing.student.id, courseId: course.id, status: 'active' },
                          },
                          `${managing.student.fullName} يستطيع الآن فتح «${course.title}» في التطبيق`,
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
                        action(
                          {
                            type: 'enrollment/setStatus',
                            payload: { studentId: managing.student.id, courseId: course.id, status: 'pending' },
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
                      className="btn btn-danger btn-sm"
                      disabled={status === 'suspended'}
                      onClick={() =>
                        action(
                          {
                            type: 'enrollment/setStatus',
                            payload: { studentId: managing.student.id, courseId: course.id, status: 'suspended' },
                          },
                          `تم إيقاف وصول ${managing.student.fullName}`,
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
        ) : null}
      </Modal>
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
    warning: { bg: 'var(--color-accent-soft)', fg: 'var(--color-brand)' },
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
