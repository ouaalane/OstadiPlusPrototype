/**
 * Reception desk («استقبال») — simplified interface for center staff.
 *
 * Dedicated to student access and subscriptions only. Receptionists can:
 *  - Search for students by code
 *  - Register new students (link to center)
 *  - Activate / renew course subscriptions
 *  - View active and expired subscriptions
 *  - Check which courses a student can access
 *
 * Receptionists cannot manage course content or teacher settings.
 *
 * Bilingual (FR/AR), RTL layout.
 */

import { useCallback, useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { isEnrollmentExpired, type CenterMembership, type EnrollmentStatus } from '@ostadiplus/shared';
import { DataTable, Field, Pill, Segmented, type DataTableColumn } from '@/components/ui';
import { useAction, useStore } from '@/store/DemoStore';

type Tab = 'active' | 'expired' | 'all';

const TABS: [Tab, string][] = [
  ['active', 'نشط'],
  ['expired', 'منتهي'],
  ['all', 'الكل'],
];

const STATUS_META: Record<
  EnrollmentStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  active: { label: 'نشط', tone: 'success' },
  pending: { label: 'بانتظار التفعيل', tone: 'warning' },
  suspended: { label: 'موقوف', tone: 'danger' },
  requested: { label: 'طلب قيد المراجعة', tone: 'neutral' },
  rejected: { label: 'تم رفض الطلب', tone: 'neutral' },
  cancelled: { label: 'ملغي', tone: 'neutral' },
};

export default function Reception() {
  const { state, pendingMemberships, findStudentByCode } = useStore();
  const action = useAction();

  const [tab, setTab] = useState<Tab>('all');
  const [searchCode, setSearchCode] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<ReturnType<typeof findStudentByCode> | null>(null);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const center = state.centers[0];

  const searchStudent = useCallback(() => {
    const code = searchCode.trim();
    if (!code) {
      setResult({ tone: 'error', text: 'أدخل رمز الطالب أولاً.' });
      return;
    }
    const student = findStudentByCode(code);
    if (!student) {
      setSelectedStudent(null);
      setResult({ tone: 'error', text: 'لم يتم العثور على تلميذ بهذا الرمز.' });
      return;
    }
    setSelectedStudent(student);
    setResult({ tone: 'success', text: `تم العثور على ${student.fullName} (${student.studentCode}).` });
  }, [searchCode, findStudentByCode]);

  const enrollmentsOfStudent = useMemo(() => {
    if (!selectedStudent) return [];
    return state.enrollments.filter((e) => e.studentId === selectedStudent.id);
  }, [selectedStudent, state.enrollments]);

  const filteredEnrollments = useMemo(() => {
    return enrollmentsOfStudent.filter((e) => {
      if (tab === 'all') return true;
      if (tab === 'active') return e.status === 'active' && !isEnrollmentExpired(e);
      if (tab === 'expired') return e.status === 'active' && isEnrollmentExpired(e);
      return true;
    });
  }, [enrollmentsOfStudent, tab]);

  const coursesMap = useMemo(
    () => new Map(state.courses.map((c) => [c.id, c])),
    [state.courses],
  );

  const activateCourse = useCallback(
    (courseId: string) => {
      if (!selectedStudent) return;
      if (!center) {
        setResult({ tone: 'error', text: 'لم يتم إعداد مركز.' });
        return;
      }
      action({
        type: 'enrollment/setStatus',
        payload: {
          studentId: selectedStudent.id,
          courseId,
          status: 'active',
          durationMonths: 6,
        },
      });
      const course = state.courses.find((c) => c.id === courseId);
      setResult({ tone: 'success', text: `تم تفعيل «${course?.title ?? ''}» لـ ${selectedStudent.fullName}` });
    },
    [selectedStudent, state, action, center],
  );

  const renewCourse = useCallback(
    (courseId: string) => {
      if (!selectedStudent) return;
      action({
        type: 'enrollment/renew',
        payload: {
          studentId: selectedStudent.id,
          courseId,
          durationMonths: 6,
        },
      });
      const course = state.courses.find((c) => c.id === courseId);
      setResult({ tone: 'success', text: `تم تجديد «${course?.title ?? ''}» لـ ${selectedStudent.fullName}` });
    },
    [selectedStudent, state, action],
  );

  /* ---- Table columns ---- */
  const enrollmentColumns: DataTableColumn<(typeof filteredEnrollments)[number]>[] = useMemo(
    () => [
      {
        key: 'course',
        header: 'المقرر',
        width: '300px',
        sortValue: (e) => coursesMap.get(e.courseId)?.title ?? '',
        render: (e) => {
          const course = coursesMap.get(e.courseId);
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand-dark">
                {course?.title?.charAt(0) ?? '—'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-bold text-ink">
                  {course?.title ?? '—'}
                </p>
                <p className="truncate text-xs text-muted">{course?.subject ?? ''}</p>
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'الحالة',
        align: 'center',
        width: '130px',
        sortValue: (e) => e.status,
        render: (e) => {
          const expired = e.status === 'active' && isEnrollmentExpired(e);
          const meta = expired ? { label: 'منتهي', tone: 'danger' as const } : STATUS_META[e.status];
          return <Pill tone={meta.tone} dot>{meta.label}</Pill>;
        },
      },
      {
        key: 'activated',
        header: 'تاريخ التفعيل',
        align: 'center',
        hideOnMobile: true,
        sortValue: (e) => e.authorizedAt,
        render: (e) => (
          <span className="num text-[13px] text-body">
            {new Date(e.authorizedAt).toLocaleDateString('ar-MA')}
          </span>
        ),
      },
      {
        key: 'expires',
        header: 'تاريخ الانتهاء',
        align: 'center',
        sortValue: (e) => e.expiresAt,
        render: (e) => {
          const expired = e.status === 'active' && isEnrollmentExpired(e);
          return (
            <div>
              <span
                className={[
                  'num block text-[13px] font-semibold',
                  expired ? 'text-danger' : 'text-ink',
                ].join(' ')}
              >
                {new Date(e.expiresAt).toLocaleDateString('ar-MA')}
              </span>
              {expired ? (
                <p className="mt-0.5 text-[11px] font-semibold text-danger">منتهي الصلاحية</p>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'action',
        header: 'الإجراء',
        align: 'end',
        width: '120px',
        render: (e) => {
          const expired = e.status === 'active' && isEnrollmentExpired(e);
          const needsAction = expired || e.status !== 'active';
          return (
            <button
              type="button"
              className={['btn btn-sm', needsAction ? 'btn-primary' : 'btn-outline'].join(' ')}
              onClick={() => (expired ? renewCourse(e.courseId) : activateCourse(e.courseId))}
              disabled={!needsAction}
            >
              {expired ? 'تجديد' : e.status === 'active' ? 'مفعل' : 'تفعيل'}
            </button>
          );
        },
      },
    ],
    [coursesMap, renewCourse, activateCourse],
  );

  const handleRegisterLink = useCallback(() => {
    if (!selectedStudent) return;
    const existing = pendingMemberships.find(
      (m: CenterMembership) => m.studentId === selectedStudent.id && m.status === 'requested',
    );
    if (existing) {
      setResult({
        tone: 'error',
        text: 'يوجد طلب انضمام قيد الانتظار لهذا التلميذ بالفعل.',
      });
      return;
    }
    if (!center) {
      setResult({ tone: 'error', text: 'لم يتم إعداد مركز.' });
      return;
    }
    action({
      type: 'membership/request',
      payload: { studentId: selectedStudent.id, centerId: center.id },
    });
    setResult({
      tone: 'success',
      text: `تم إرسال طلب انضمام إلى ${center.name} — ينتظر موافقة التلميذ.`,
    });
  }, [selectedStudent, pendingMemberships, center, action]);

  return (
    <div className="space-y-6">
      {/* Result banner */}
      {result ? (
        <div
          className={`rounded-lg p-4 text-sm flex items-center gap-3 ${
            result.tone === 'success'
              ? 'bg-success-soft text-success border border-success/20'
              : 'bg-danger-soft text-danger border border-danger/20'
          }`}
        >
          <span>{result.tone === 'success' ? '✓' : '✕'}</span>
          <p>{result.text}</p>
        </div>
      ) : null}

      {/* ---- Search card ---- */}
      <div className="card overflow-hidden">
        <div className="border-b border-line bg-brand-softer px-5 py-4">
          <h2 className="text-base font-bold text-ink">بحث برمز الطالب</h2>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[260px] flex-1">
              <Field label="رمز الطالب">
                <input
                  className="input"
                  dir="ltr"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="UST-7F3K2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchStudent();
                  }}
                />
              </Field>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={searchStudent}
            >
              بحث
            </button>
            {selectedStudent && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRegisterLink}
                disabled={!!pendingMemberships.find(
                  (m: CenterMembership) => m.studentId === selectedStudent.id && m.status === 'requested',
                )}
              >
                ربط بالمركز
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedStudent ? (
        <>
          {/* ---- Student identity ---- */}
          <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-ink">{selectedStudent.fullName}</h2>
              <p className="text-xs text-muted">
                {selectedStudent.studentType === 'bac-libre' ? 'باك حر' : 'متمدرس'} ·{' '}
                {selectedStudent.level}
              </p>
            </div>
            <span className="text-xs text-muted">
              <span className="font-semibold">الرمز:</span>{' '}
              <span dir="ltr" className="num">{selectedStudent.studentCode}</span>
            </span>
            <span className="text-xs text-muted">
              <span className="font-semibold">الهاتف:</span>{' '}
              <span dir="ltr" className="num">{selectedStudent.phone}</span>
            </span>
          </div>

          {/* ---- Enrollments ---- */}
          <DataTable
            columns={enrollmentColumns}
            rows={filteredEnrollments}
            getRowId={(e) => e.id}
            title="المقررات المفعلة للتلميذ"
            compact
            toolbar={
              <Segmented
                value={tab}
                onChange={setTab}
                options={TABS}
                ariaLabel="تصفية حسب حالة الاشتراك"
              />
            }
            emptyState={
              <div className="flex flex-col items-center gap-2 text-muted">
                <Inbox size={26} className="text-faint" />
                <p className="text-sm font-semibold">
                  {tab === 'active'
                    ? 'لا اشتراكات نشطة'
                    : tab === 'expired'
                      ? 'لا اشتراكات منتهية'
                      : 'لا اشتراكات مسجلة لهذا التلميذ'}
                </p>
              </div>
            }
            highlightRow={(e) => e.status === 'active' && isEnrollmentExpired(e)}
          />

          {/* ---- Available courses to activate ---- */}
          <div className="card overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-line bg-surface">
              <h3 className="text-sm font-bold text-ink">
                تفعيل وصول لمقرر جديد
              </h3>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.courses.map((course) => {
                  const already = enrollmentsOfStudent.find(
                    (e) => e.courseId === course.id,
                  );
                  const canActivate =
                    !already || (already.status === 'active' && isEnrollmentExpired(already));
                  return (
                    <div
                      key={course.id}
                      className={[
                        'card rounded-xl p-4 border border-line transition-all hover:border-brand/30 hover:shadow-sm',
                        !canActivate
                          ? 'border-dashed border-dashed bg-surface/50 hover:shadow-none'
                          : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark font-medium text-[10px]">
                          {course.title.charAt(0)}
                        </div>
                        {already && !canActivate ? (
                          <span className="text-[10px] font-semibold text-muted bg-surface-alt rounded-full px-2 py-0.5">
                            مسجل
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs font-medium text-ink leading-tight mb-1">
                        {course.title}
                      </p>
                      <p className="text-[10px] text-muted mb-3">
                        {course.subject} • {course.level}
                      </p>
                      <button
                        type="button"
                        className={[
                          'w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors border',
                          !canActivate
                            ? 'bg-surface border-line text-muted cursor-not-allowed hover:!bg-surface hover:!text-muted'
                            : 'bg-brand border-transparent text-white hover:bg-brand-dark shadow-sm hover:shadow-md',
                        ].join(' ')}
                        disabled={!canActivate}
                        onClick={() => canActivate && activateCourse(course.id)}
                      >
                        {already && isEnrollmentExpired(already) ? 'تجديد' : 'تفعيل'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---- Pending membership requests ---- */}
          <div className="card overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-line bg-surface">
              <h3 className="text-sm font-bold text-ink">
                طلبات الانضمام قيد الانتظار
              </h3>
            </div>
            <div className="px-5 py-4">
              {pendingMemberships.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  لا توجد طلبات انضمام قيد الانتظار.
                </p>
              ) : (
                <ul className="divide-y divide-line/50">
                  {pendingMemberships.map((membership: CenterMembership) => {
                    const student = state.students.find((s) => s.id === membership.studentId);
                    if (!student) return null;
                    return (
                      <li key={membership.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-muted mt-0.5" dir="ltr">
                            <span className="num">{student.studentCode}</span>
                          </p>
                        </div>
                        <Pill tone="warning" dot>
                          بانتظار موافقة التلميذ
                        </Pill>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
