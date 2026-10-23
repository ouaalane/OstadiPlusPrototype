import { useI18n } from '@/i18n/useI18n';
import { translate as t, relativeTime } from '@/i18n/locale';
import SubscriptionManager from '@/components/SubscriptionManager';
import { useMemo, useRef, useState } from 'react';
import {
  ClipboardPaste,
  QrCode,
  ScanLine,
  ShieldCheck,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  enrollmentHasAccess,
  isEnrollmentExpired,
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
  Pill,
  Segmented,
  type DataTableColumn,
} from '@/components/ui';
import { useStore } from '@/store/DemoStore';

type Filter = 'all' | EnrollmentStatus | 'expired' | 'scheduled';

const FILTERS: [Filter, string][] = [
  ['all', 'الكل'],
  ['active', 'نشط'],
  ['expired', 'اشتراك منتهي'],
  ['scheduled', 'يبدأ لاحقاً'],
  ['pending', 'بدون اشتراك محدد'],
];

export default function Students() {
  const { lang } = useI18n();
  const {
    state,
    pendingMemberships,
    lookupStudentByCode,
    inviteStudent,
  } = useStore();
  const [connectionBusy, setConnectionBusy] = useState(false);

  const [filter, setFilter] = useState<Filter>('all');
  const [activationOpen, setActivationOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [managing, setManaging] = useState<{
    student: Student;
    enrollments: Enrollment[];
  } | null>(null);
  const [requestResult, setRequestResult] = useState<{
    tone: 'ok' | 'error';
    text: string;
  } | null>(null);

  /* Stitch «ربط تلميذ بالمركز بالمعرف أو رمز QR» — lookup by the student's
   * opaque code (UST-XXXXX), never by name or phone (multi-center privacy). */
  const [method, setMethod] = useState<'code' | 'qr'>('code');
  const [codeInput, setCodeInput] = useState('');
  const center = state.centers[0];
  const latestCode = useRef(codeInput);
  latestCode.current = codeInput;
  const centreStudents = useMemo(
    () =>
      state.students.filter((student) =>
        state.memberships.some(
          (m) =>
            m.studentId === student.id &&
            m.centerId === center?.id &&
            m.status === 'active',
        ),
      ),
    [state.students, state.memberships, center?.id],
  );
  const verifiedStudent = state.students.find(
    (student) => student.id === expanded,
  );
  const existingMembership = (state.memberships ?? []).find(
    (membership) =>
      membership.studentId === expanded &&
      membership.centerId === center?.id &&
      (membership.status === 'active' || membership.status === 'requested'),
  );

  const [activation, setActivation] = useState<{
    tone: 'ok' | 'error';
    text: string;
  } | null>(null);

  const rows = useMemo(
    () =>
      centreStudents
        .map((student) => {
          const enrollments = state.enrollments.filter(
            (e) => e.studentId === student.id,
          );
          return { student, enrollments };
        })
        .filter(({ enrollments }) => {
          if (filter === 'pending' && enrollments.length === 0) return true;
          if (
            filter !== 'all' &&
            !enrollments.some((e) =>
              filter === 'active'
                ? enrollmentHasAccess(e)
                : filter === 'expired'
                  ? isEnrollmentExpired(e)
                  : filter === 'scheduled'
                    ? e.status === 'active' &&
                      !enrollmentHasAccess(e) &&
                      !isEnrollmentExpired(e)
                    : e.status === filter,
            )
          )
            return false;
          return true;
        }),
    [centreStudents, state.enrollments, filter, lang],
  );

  const counts = useMemo(() => {
    const total = centreStudents.length;
    const active = new Set(
      state.enrollments
        .filter(
          (e) =>
            centreStudents.some((s) => s.id === e.studentId) &&
            enrollmentHasAccess(e),
        )
        .map((e) => e.studentId),
    ).size;
    const pending = centreStudents.filter((student) => {
      const enrollments = state.enrollments.filter(
        (enrollment) => enrollment.studentId === student.id,
      );
      return (
        enrollments.length === 0 ||
        enrollments.some((enrollment) => enrollment.status === 'pending')
      );
    }).length;
    return { total, active, pending };
  }, [centreStudents, state.enrollments, lang]);

  /* ---- Table columns ---- */
  const columns: DataTableColumn<(typeof rows)[number]>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('التلميذ'),
        width: '280px',
        sortValue: ({ student }) => student.fullName,
        render: ({ student }, index) => (
          <div className="flex items-center gap-3">
            <Avatar label={student.monogram} seed={index} size={38} />
            <div className="min-w-0">
              <div className="student-name text-[14.5px] font-bold text-ink">
                <bdi>{student.fullName}</bdi>
              </div>
              <div className="student-meta text-xs text-muted">
                <span dir="ltr" className="num">
                  {student.phone}
                </span>
                <span dir="ltr" className="num">
                  {student.studentCode}
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'level',
        header: t('المستوى'),
        sortValue: ({ student }) => student.level,
        render: ({ student }) => (
          <span className="text-[13px] font-semibold text-body">
            {student.level}
          </span>
        ),
      },
      {
        key: 'joined',
        header: t('تاريخ الانضمام'),
        hideOnMobile: true,
        sortValue: ({ student }) => student.joinedAt,
        render: ({ student }) => (
          <span className="text-xs text-muted">
            {t('انضم ')}
            {relativeTime(student.joinedAt)}
          </span>
        ),
      },
      {
        key: 'access',
        header: t('حالة الوصول'),
        align: 'center',
        width: '130px',
        sortValue: ({ enrollments }) =>
          enrollments.filter(
            (e) =>
              centreStudents.some((s) => s.id === e.studentId) &&
              enrollmentHasAccess(e),
          ).length,
        render: ({ enrollments }) => {
          const activeCount = enrollments.filter((e) =>
            enrollmentHasAccess(e),
          ).length;
          return activeCount > 0 ? (
            <Pill tone="success" dot>
              <span className="num">{activeCount}</span>
              {t(' اشتراك سارٍ')}
            </Pill>
          ) : (
            <Pill tone="warning" dot>
              {t('بلا وصول نشط')}
            </Pill>
          );
        },
      },
      {
        key: 'courses',
        header: t('المقررات'),
        align: 'center',
        hideOnMobile: true,
        render: ({ enrollments }) => {
          const subscribed = state.courses.filter((c) =>
            enrollments.some((e) => e.courseId === c.id),
          );
          if (subscribed.length === 0) {
            return <span className="text-xs text-faint">{t('لا مقررات')}</span>;
          }
          return (
            <div className="flex min-w-[160px] flex-wrap justify-center gap-1.5">
              {subscribed.map((course) => {
                const enrollment = enrollments.find(
                  (e) => e.courseId === course.id,
                );
                if (!enrollment) return null;
                return (
                  <span
                    key={course.id}
                    title={`${course.title} — ${isEnrollmentExpired(enrollment) ? t('اشتراك منتهي') : enrollmentHasAccess(enrollment) ? t('اشتراك ساري') : t('بدون وصول حالياً')}`}
                    className={[
                      'student-course-label text-[11px] font-semibold',
                      enrollmentHasAccess(enrollment)
                        ? 'bg-success-soft text-success'
                        : enrollment.status === 'pending'
                          ? 'bg-accent-soft text-brand'
                          : 'bg-surface-alt text-muted',
                    ].join(' ')}
                  >
                    <bdi>{course.title}</bdi>
                  </span>
                );
              })}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: t('الإجراء'),
        align: 'end',
        width: '150px',
        render: (row) => (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() =>
              setManaging({
                student: row.student,
                enrollments: row.enrollments,
              })
            }
          >
            {t('إدارة الوصول')}
          </button>
        ),
      },
    ],
    [state.courses, lang],
  );

  /* Resolve a student by their opaque code (UST-XXXXX). Security: lookup is
   * by code only — never by name or phone (multi-center privacy). */
  const verifyStudent = async () => {
    const needle = codeInput.trim();
    setExpanded(null);
    setRequestResult(null);
    if (!needle) {
      setActivation({ tone: 'error', text: t('أدخل رمز الطالب أولاً.') });
      return;
    }
    setConnectionBusy(true);
    let found;
    try {
      found = await lookupStudentByCode(needle);
    } catch {
      setActivation({
        tone: 'error',
        text: t('تعذّر الاتصال بالمركز. تحقق من الرابط وحاول مجدداً.'),
      });
      return;
    } finally {
      setConnectionBusy(false);
    }
    if (latestCode.current.trim() !== needle) return;
    if (!found) {
      setActivation({
        tone: 'error',
        text: t(
          'لم يتم العثور على تلميذ بهذا الرمز — تأكد من نسخ الرمز من بطاقة الطالب في التطبيق.',
        ),
      });
      return;
    }
    setFilter('all');
    setExpanded(found.id);
    setActivation({
      tone: 'ok',
      text: t(
        'تم التحقق من {0} ({1}) — راجع معلومات التلميذ ثم أرسل طلب الانضمام إلى المركز.',
        [found.fullName, found.studentCode],
      ),
    });
  };

  /* Send a center connection request for the verified student. Creates a
   * membership in 'requested' state and a notification for the student. The
   * student must accept via their app before the center can see details or
   * assign courses. */
  const sendRequest = async () => {
    if (!verifiedStudent || existingMembership) return;
    if (!center) {
      setRequestResult({ tone: 'error', text: t('لم يتم إعداد مركز للمعلم.') });
      return;
    }
    setConnectionBusy(true);
    try {
      await inviteStudent(verifiedStudent.id, center.id);
    } catch {
      setRequestResult({
        tone: 'error',
        text: t('تعذّر إرسال الدعوة. تحقق من الاتصال وحاول مجدداً.'),
      });
      return;
    } finally {
      setConnectionBusy(false);
    }
    setRequestResult({
      tone: 'ok',
      text: t(
        'تم إرسال طلب الانضمام إلى {0}. سيصل إشعار إلى تطبيق التلميذ للموافقة أو الرفض.',
        [center.name],
      ),
    });
    setActivation(null);
  };

  /* Simulated QR scan: fills the field with the first student code awaiting activation. */
  const simulateScan = () => {
    const target =
      state.students.find((s) =>
        state.enrollments.some(
          (e) => e.studentId === s.id && e.status === 'pending',
        ),
      ) ?? state.students[0];
    setRequestResult(null);
    if (!target) {
      setExpanded(null);
      setActivation({
        tone: 'error',
        text: t('لا توجد بيانات تلاميذ لتجربة QR حالياً.'),
      });
      return;
    }
    setCodeInput(target.studentCode);
    setActivation({
      tone: 'ok',
      text: t('رمز تجريبي: {0} ({1}) — راجع المعلومات ثم أرسل طلب الانضمام.', [
        target.fullName,
        target.studentCode,
      ]),
    });
    setExpanded(target.id);
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">{t('المرافقة والمتابعة')}</p>
          <h1 className="workspace-title">{t('التلاميذ والاشتراكات')}</h1>
          <p className="workspace-subtitle">
            {t('فعّل الوصول، تابع الاشتراكات، وخلي كل تلميذ مرتبط بمساره.')}
          </p>
        </div>
        <button
          className="btn btn-primary"
          aria-expanded={activationOpen}
          aria-controls={activationOpen ? 'student-link-panel' : undefined}
          onClick={() => setActivationOpen((v) => !v)}
        >
          <UserPlus size={16} />
          {activationOpen ? t('إغلاق الربط') : t('ربط تلميذ بالمركز')}
        </button>
      </div>

      {/* ربط تلميذ بالمركز بالمعرف أو رمز QR */}
      {activationOpen ? (
        <div id="student-link-panel" className="card mb-5 overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-softer px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <UserPlus size={19} />
            </div>
            <h2 className="min-w-0 flex-1 text-base font-bold text-ink">
              {t('ربط تلميذ بالمركز')}
            </h2>
          </div>

          <div className="px-5 py-4">
            <div className="mb-3 inline-flex rounded-xl border border-line bg-surface-alt p-1">
              <button
                type="button"
                onClick={() => setMethod('code')}
                aria-pressed={method === 'code'}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  method === 'code'
                    ? 'bg-white text-brand-dark shadow-sm'
                    : 'text-muted'
                }`}
              >
                <Tag size={15} />
                {t('رمز الطالب')}
              </button>
              <button
                type="button"
                onClick={() => setMethod('qr')}
                aria-pressed={method === 'qr'}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  method === 'qr'
                    ? 'bg-white text-brand-dark shadow-sm'
                    : 'text-muted'
                }`}
              >
                <QrCode size={15} />
                {t('تجربة QR')}
              </button>
            </div>

            {method === 'code' ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1">
                  <Field label={t('رمز الطالب')}>
                    <div className="flex gap-2">
                      <input
                        className="input"
                        aria-label={t('رمز الطالب')}
                        aria-invalid={activation?.tone === 'error' || undefined}
                        aria-describedby={
                          activation ? 'student-code-result' : undefined
                        }
                        dir="ltr"
                        value={codeInput}
                        placeholder="UST-7F3K2"
                        onChange={(event) => {
                          setCodeInput(event.target.value);
                          setActivation(null);
                          setExpanded(null);
                          setRequestResult(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') verifyStudent();
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={async () => {
                          try {
                            setCodeInput(
                              (await navigator.clipboard.readText()).trim(),
                            );
                            setActivation(null);
                            setExpanded(null);
                            setRequestResult(null);
                          } catch {
                            setActivation({
                              tone: 'error',
                              text: t(
                                'المتصفح ما سمحش بقراءة الحافظة. لصق الرمز مباشرة في الخانة.',
                              ),
                            });
                          }
                        }}
                      >
                        <ClipboardPaste size={16} />
                        {t('لصق')}
                      </button>
                    </div>
                  </Field>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={verifyStudent}
                  disabled={connectionBusy}
                >
                  <ShieldCheck size={16} />
                  {t('تحقق')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={simulateScan}
              >
                <ScanLine size={16} />
                {t('تجربة رمز من بيانات العرض')}
              </button>
            )}

            {activation ? (
              <p
                id="student-code-result"
                role={activation.tone === 'error' ? 'alert' : 'status'}
                className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                  activation.tone === 'ok'
                    ? 'bg-success-soft text-success'
                    : 'bg-danger-soft text-danger'
                }`}
              >
                {activation.text}
              </p>
            ) : null}
            {verifiedStudent ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
                <div>
                  <p className="text-sm font-bold">
                    {verifiedStudent.fullName}{' '}
                    <span className="num text-xs text-muted">
                      {verifiedStudent.studentCode}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {center
                      ? t('المركز: {0}', [center.name])
                      : t('لم يتم إعداد مركز للمعلم.')}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {existingMembership?.status === 'active'
                      ? t('التلميذ مرتبط بهذا المركز بالفعل.')
                      : existingMembership?.status === 'requested'
                        ? t('طلب الانضمام ينتظر موافقة التلميذ في التطبيق.')
                        : t(
                            'إرسال الطلب لا يفعّل الاشتراكات تلقائياً؛ تبقى موافقة التلميذ مطلوبة.',
                          )}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={sendRequest}
                  disabled={connectionBusy || !center || !!existingMembership}
                >
                  <UserPlus size={16} aria-hidden="true" />
                  {existingMembership?.status === 'active'
                    ? t('مرتبط بالمركز')
                    : existingMembership?.status === 'requested'
                      ? t('طلب قيد الانتظار')
                      : t('إرسال طلب انضمام')}
                </button>
              </div>
            ) : null}
            {requestResult ? (
              <p
                role={requestResult.tone === 'error' ? 'alert' : 'status'}
                className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold bg-brand-soft text-brand-dark"
              >
                {requestResult.text}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Pending center membership requests — sent by the center, awaiting student acceptance. */}
      {pendingMemberships.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-muted mb-2">
            {t('طلبات الانضمام قيد الانتظار')}
          </h3>
          <ul className="card divide-y divide-line overflow-hidden p-0">
            {pendingMemberships.map((membership: CenterMembership) => {
              const student = state.students.find(
                (s) => s.id === membership.studentId,
              );
              const center = state.centers.find(
                (c) => c.id === membership.centerId,
              );
              if (!student || !center) return null;
              return (
                <li
                  key={membership.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink truncate">
                      <bdi>{student.fullName}</bdi>
                    </div>
                    <div className="text-xs text-muted">
                      {student.studentCode} · {center.name}
                    </div>
                  </div>
                  <Pill tone="warning" dot>
                    {t('في انتظار موافقة التلميذ')}
                  </Pill>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile label={t('تلاميذ مسجّلون')} value={counts.total} />
        <SummaryTile
          label={t('وصول نشط')}
          value={counts.active}
          tone="success"
        />
        <SummaryTile
          label={t('بدون اشتراك محدد')}
          value={counts.pending}
          tone="warning"
        />
      </div>

      {centreStudents.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={
            filter !== 'all' ? t('لا تلاميذ بهذه الحالة') : t('لا تلاميذ بعد')
          }
          description={
            filter !== 'all'
              ? t('غيّر التصفية لعرض تلاميذ آخرين.')
              : t(
                  'لم يسجّل أي تلميذ في التطبيق بعد — سيظهر هنا تلقائياً بمجرد أن يُنشئ حساباً ويزور المركز.',
                )
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={({ student }) => student.id}
          getRowLabel={({ student }) => student.fullName}
          title={t('تلاميذ المركز')}
          searchPlaceholder={t('بحث بالاسم أو الرمز…')}
          selectedIds={selected}
          onSelectionChange={setSelected}
          toolbar={
            <div className="flex flex-wrap items-center gap-2.5">
              <Segmented
                value={filter}
                onChange={setFilter}
                options={FILTERS}
                ariaLabel={t('تصفية حسب حالة الوصول')}
              />
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={() => setActivationOpen(true)}
              >
                <QrCode size={15} />
                {t('ربط تلميذ')}
              </button>
            </div>
          }
          emptyState={
            <div className="flex flex-col items-center gap-2 text-muted">
              <Users size={28} className="text-faint" />
              <p className="text-sm font-semibold">
                {t('لا توجد نتائج مطابقة')}
              </p>
              <p className="text-xs">{t('جرّب تعديل البحث أو التصفية.')}</p>
              {filter !== 'all' ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setFilter('all')}
                >
                  {t('عرض كل الحالات')}
                </button>
              ) : null}
            </div>
          }
        />
      )}

      {managing && (
        <SubscriptionManager
          studentId={managing.student.id}
          onClose={() => setManaging(null)}
        />
      )}
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
  useI18n();
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
        <div className="truncate text-xs font-semibold text-muted">
          {t(label)}
        </div>
        <div className="num text-xl font-bold" style={{ color: style.fg }}>
          {value}
        </div>
      </div>
    </div>
  );
}
