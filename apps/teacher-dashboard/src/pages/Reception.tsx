import { useI18n } from '@/i18n/useI18n';
import { translate as t, getLocale } from '@/i18n/locale';
import SubscriptionManager from '@/components/SubscriptionManager';
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

import { useCallback, useMemo, useRef, useState } from 'react';
import { Inbox } from 'lucide-react';
import {
  enrollmentHasAccess,
  isEnrollmentExpired,
  type CenterMembership,
  type EnrollmentStatus,
} from '@ostadiplus/shared';
import {
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  Pill,
  Segmented,
  type DataTableColumn,
} from '@/components/ui';
import { useStore } from '@/store/DemoStore';

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
  pending: { label: 'بدون اشتراك محدد', tone: 'warning' },
  suspended: { label: 'موقوف', tone: 'danger' },
  requested: { label: 'طلب قيد المراجعة', tone: 'neutral' },
  rejected: { label: 'تم رفض الطلب', tone: 'neutral' },
  cancelled: { label: 'ملغي', tone: 'neutral' },
};

export default function Reception() {
  const { lang } = useI18n();
  const {
    state,
    pendingMemberships,
    findStudentByCode,
    lookupStudentByCode,
    inviteStudent,
  } = useStore();
  const [connectionBusy, setConnectionBusy] = useState(false);

  const [subscriptionCourse, setSubscriptionCourse] = useState<string | null>(
    null,
  );
  const [tab, setTab] = useState<Tab>('all');
  const [searchCode, setSearchCode] = useState('');
  const [studentSelection, setSelectedStudent] = useState<ReturnType<
    typeof findStudentByCode
  > | null>(null);
  const [result, setResult] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedStudent =
    state.students.find((s) => s.id === studentSelection?.id) ??
    studentSelection;
  const center = state.centers[0];
  const selectedMembership = (state.memberships ?? []).find(
    (membership) =>
      membership.studentId === selectedStudent?.id &&
      membership.centerId === center?.id &&
      (membership.status === 'active' || membership.status === 'requested'),
  );

  const latestCode = useRef(searchCode);
  latestCode.current = searchCode;
  const searchStudent = useCallback(async () => {
    const code = searchCode.trim();
    if (!code) {
      setSelectedStudent(null);
      setSubscriptionCourse(null);
      setResult({ tone: 'error', text: t('أدخل رمز الطالب أولاً.') });
      return;
    }
    setConnectionBusy(true);
    let student;
    try {
      student = await lookupStudentByCode(code);
    } catch {
      setResult({
        tone: 'error',
        text: t('تعذّر الاتصال بالمركز. تحقق من الرابط وحاول مجدداً.'),
      });
      return;
    } finally {
      setConnectionBusy(false);
    }
    if (latestCode.current.trim() !== code) return;
    if (!student) {
      setSelectedStudent(null);
      setResult({
        tone: 'error',
        text: t('لم يتم العثور على تلميذ بهذا الرمز.'),
      });
      return;
    }
    setSelectedStudent(student);
    setSubscriptionCourse(null);
    setTab('all');
    setResult({
      tone: 'success',
      text: t('تم العثور على {0} ({1}).', [
        student.fullName,
        student.studentCode,
      ]),
    });
  }, [searchCode, findStudentByCode, lookupStudentByCode, lang]);

  const enrollmentsOfStudent = useMemo(() => {
    if (!selectedStudent) return [];
    return state.enrollments.filter((e) => e.studentId === selectedStudent.id);
  }, [selectedStudent, state.enrollments, lang]);

  const filteredEnrollments = useMemo(() => {
    return enrollmentsOfStudent.filter((e) => {
      if (tab === 'all') return true;
      if (tab === 'active') return enrollmentHasAccess(e);
      if (tab === 'expired')
        return e.status === 'active' && isEnrollmentExpired(e);
      return true;
    });
  }, [enrollmentsOfStudent, tab, lang]);

  const coursesMap = useMemo(
    () => new Map(state.courses.map((c) => [c.id, c])),
    [state.courses, lang],
  );

  const manageSubscription = useCallback(
    (courseId: string) => setSubscriptionCourse(courseId),
    [lang],
  );

  const enrollmentColumns: DataTableColumn<
    (typeof filteredEnrollments)[number]
  >[] = useMemo(
    () => [
      {
        key: 'course',
        header: t('المقرر'),
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
                <p className="truncate text-xs text-muted">
                  {course?.subject ?? ''}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: t('الحالة'),
        align: 'center',
        width: '130px',
        sortValue: (e) => e.status,
        render: (e) => {
          const expired = e.status === 'active' && isEnrollmentExpired(e);
          const meta = expired
            ? { label: t('منتهي'), tone: 'danger' as const }
            : e.status === 'active' && !enrollmentHasAccess(e)
              ? { label: t('يبدأ لاحقاً'), tone: 'neutral' as const }
              : STATUS_META[e.status];
          return (
            <Pill tone={meta.tone} dot>
              {t(meta.label)}
            </Pill>
          );
        },
      },
      {
        key: 'activated',
        header: t('تاريخ التسجيل'),
        align: 'center',
        hideOnMobile: true,
        sortValue: (e) => e.authorizedAt,
        render: (e) => (
          <span className="num text-[13px] text-body">
            {new Date(e.authorizedAt).toLocaleDateString(getLocale())}
          </span>
        ),
      },
      {
        key: 'expires',
        header: t('تاريخ الانتهاء'),
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
                {e.accessPeriods?.length
                  ? e.accessPeriods
                      .map((p) => p.endsOn)
                      .sort()
                      .at(-1)
                  : new Date(e.expiresAt).toLocaleDateString(getLocale())}
              </span>
              {expired ? (
                <p className="mt-0.5 text-[11px] font-semibold text-danger">
                  {t('منتهي الصلاحية')}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'action',
        header: t('الإجراء'),
        align: 'end',
        width: '120px',
        render: (e) => {
          const expired = e.status === 'active' && isEnrollmentExpired(e);
          const needsAction = expired || e.status !== 'active';
          return (
            <button
              type="button"
              className={[
                'btn btn-sm',
                needsAction ? 'btn-primary' : 'btn-outline',
              ].join(' ')}
              onClick={() => manageSubscription(e.courseId)}
            >
              {t('إدارة الاشتراك')}
            </button>
          );
        },
      },
    ],
    [coursesMap, manageSubscription, lang],
  );

  const handleRegisterLink = useCallback(async () => {
    if (!selectedStudent) return;
    const existing = (state.memberships ?? []).find(
      (membership) =>
        membership.studentId === selectedStudent.id &&
        membership.centerId === center?.id &&
        (membership.status === 'requested' || membership.status === 'active'),
    );
    if (existing) {
      setResult({
        tone: 'error',
        text:
          existing.status === 'active'
            ? t('التلميذ مرتبط بهذا المركز بالفعل.')
            : t('يوجد طلب انضمام قيد الانتظار لهذا التلميذ بالفعل.'),
      });
      return;
    }
    if (!center) {
      setResult({ tone: 'error', text: t('لم يتم إعداد مركز.') });
      return;
    }
    setConnectionBusy(true);
    try {
      await inviteStudent(selectedStudent.id, center.id);
    } catch {
      setResult({
        tone: 'error',
        text: t('تعذّر إرسال الدعوة. تحقق من الاتصال وحاول مجدداً.'),
      });
      return;
    } finally {
      setConnectionBusy(false);
    }
    setResult({
      tone: 'success',
      text: t('تم إرسال طلب انضمام إلى {0} — ينتظر موافقة التلميذ.', [
        center.name,
      ]),
    });
  }, [selectedStudent, state.memberships, center, inviteStudent, lang]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('استقبال التلاميذ')}
        description={t(
          'ابحث برمز التلميذ، راجع هويته، ثم خصّص اشتراكه مع الأستاذ والمقرر المناسبين.',
        )}
      />
      {/* Result banner */}
      {result ? (
        <div
          role={result.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-lg p-4 text-sm flex items-center gap-3 ${
            result.tone === 'success'
              ? 'bg-success-soft text-success border border-success/20'
              : 'bg-danger-soft text-danger border border-danger/20'
          }`}
        >
          <span aria-hidden="true">
            {result.tone === 'success' ? '✓' : '✕'}
          </span>
          <p>
            {result.tone === 'success' &&
            selectedMembership?.status === 'active'
              ? t('التلميذ مرتبط بهذا المركز بالفعل.')
              : t(result.text)}
          </p>
        </div>
      ) : null}

      {/* ---- Search card ---- */}
      <div className="card overflow-hidden">
        <div className="border-b border-line bg-brand-softer px-5 py-4">
          <h2 className="text-base font-bold text-ink">
            {t('بحث برمز الطالب')}
          </h2>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[260px] flex-1">
              <Field label={t('رمز الطالب')}>
                <input
                  className="input"
                  dir="ltr"
                  value={searchCode}
                  onChange={(e) => {
                    setSearchCode(e.target.value);
                    setSelectedStudent(null);
                    setSubscriptionCourse(null);
                    setResult(null);
                  }}
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
              disabled={connectionBusy}
            >
              {t('بحث')}
            </button>
            {selectedStudent && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRegisterLink}
                disabled={connectionBusy || !center || !!selectedMembership}
              >
                {selectedMembership?.status === 'active'
                  ? t('مرتبط بالمركز')
                  : selectedMembership?.status === 'requested'
                    ? t('طلب قيد الانتظار')
                    : t('ربط بالمركز')}
              </button>
            )}
          </div>
          {selectedStudent && selectedMembership ? (
            <p className="mt-3 text-xs text-muted">
              {selectedMembership.status === 'active'
                ? t(
                    'التلميذ مرتبط بـ {0}. الاشتراكات مخصّصة لكل مقرر على حدة.',
                    [center?.name],
                  )
                : t('تم إرسال الطلب؛ تبقى موافقة التلميذ مطلوبة في التطبيق.')}
            </p>
          ) : null}
        </div>
      </div>

      {!selectedStudent && !result ? (
        <EmptyState
          icon={<Inbox size={26} aria-hidden="true" />}
          title={t('ابدأ ببطاقة التلميذ')}
          description={t(
            'اطلب من التلميذ رمز UST الموجود في بطاقته داخل التطبيق، ثم أدخله في خانة البحث أعلاه.',
          )}
        />
      ) : null}

      {selectedStudent ? (
        <>
          {/* ---- Student identity ---- */}
          <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-ink">
                {selectedStudent.fullName}
              </h2>
              {selectedMembership?.status === 'active' ? (
                <p className="text-xs text-muted">
                  {selectedStudent.studentType === 'bac-libre'
                    ? t('باك حر')
                    : t('متمدرس')}{' '}
                  · {selectedStudent.level}
                </p>
              ) : null}
            </div>
            <span className="text-xs text-muted">
              <span className="font-semibold">{t('الرمز:')}</span>{' '}
              <span dir="ltr" className="num">
                {selectedStudent.studentCode}
              </span>
            </span>
            <span className="text-xs text-muted">
              <span className="font-semibold">
                {selectedMembership?.status === 'active' ? t('الهاتف:') : ''}
              </span>{' '}
              <span dir="ltr" className="num">
                {selectedMembership?.status === 'active'
                  ? selectedStudent.phone
                  : ''}
              </span>
            </span>
          </div>

          {selectedMembership?.status === 'active' ? (
            <>
              {/* ---- Enrollments ---- */}
              <DataTable
                columns={enrollmentColumns}
                rows={filteredEnrollments}
                getRowId={(e) => e.id}
                title={t('المقررات المفعلة للتلميذ')}
                compact
                toolbar={
                  <Segmented
                    value={tab}
                    onChange={setTab}
                    options={TABS}
                    ariaLabel={t('تصفية حسب حالة الاشتراك')}
                  />
                }
                emptyState={
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <Inbox size={26} className="text-faint" />
                    <p className="text-sm font-semibold">
                      {tab === 'active'
                        ? t('لا اشتراكات نشطة')
                        : tab === 'expired'
                          ? t('لا اشتراكات منتهية')
                          : t('لا اشتراكات مسجلة لهذا التلميذ')}
                    </p>
                  </div>
                }
                highlightRow={(e) =>
                  e.status === 'active' && isEnrollmentExpired(e)
                }
              />

              {/* ---- Available courses to activate ---- */}
              <div className="card overflow-hidden mt-6">
                <div className="px-5 py-4 border-b border-line bg-surface">
                  <h3 className="text-sm font-bold text-ink">
                    {t('تسجيل اشتراك مع أستاذ')}
                  </h3>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.courses.map((course) => {
                      const already = enrollmentsOfStudent.find(
                        (e) => e.courseId === course.id,
                      );
                      const hasAccess = already && enrollmentHasAccess(already);
                      return (
                        <div
                          key={course.id}
                          className={[
                            'card rounded-xl p-4 border border-line transition-all hover:border-brand/30 hover:shadow-sm',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark font-medium text-[10px]">
                              {course.title.charAt(0)}
                            </div>
                            {hasAccess ? (
                              <span className="text-[10px] font-semibold text-muted bg-surface-alt rounded-full px-2 py-0.5">
                                {t('مسجل')}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs font-medium text-ink leading-tight mb-1">
                            <bdi>{course.title}</bdi>
                          </p>
                          <p className="text-[10px] text-muted mb-3">
                            {course.subject} • {course.level}
                          </p>
                          <button
                            type="button"
                            className={[
                              'w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors border',
                              'bg-brand border-transparent text-white hover:bg-brand-dark shadow-sm hover:shadow-md',
                            ].join(' ')}
                            onClick={() => manageSubscription(course.id)}
                          >
                            {t('تخصيص الاشتراك')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="card p-4 text-sm text-muted">
              {t(
                'المعلومات الكاملة والاشتراكات متاحة بعد قبول التلميذ للدعوة.',
              )}
            </p>
          )}
          {/* ---- Pending membership requests ---- */}
          <div className="card overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-line bg-surface">
              <h3 className="text-sm font-bold text-ink">
                {t('طلبات الانضمام قيد الانتظار')}
              </h3>
            </div>
            <div className="px-5 py-4">
              {pendingMemberships.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  {t('لا توجد طلبات انضمام قيد الانتظار.')}
                </p>
              ) : (
                <ul className="divide-y divide-line/50">
                  {pendingMemberships.map((membership: CenterMembership) => {
                    const student = state.students.find(
                      (s) => s.id === membership.studentId,
                    );
                    if (!student) return null;
                    return (
                      <li
                        key={membership.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            <bdi>{student.fullName}</bdi>
                          </p>
                          <p className="text-xs text-muted mt-0.5" dir="ltr">
                            <span className="num">{student.studentCode}</span>
                          </p>
                        </div>
                        <Pill tone="warning" dot>
                          {t('بانتظار موافقة التلميذ')}
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
      {subscriptionCourse && selectedStudent && (
        <SubscriptionManager
          key={`${selectedStudent.id}:${subscriptionCourse}`}
          studentId={selectedStudent.id}
          initialCourseId={subscriptionCourse}
          onClose={() => setSubscriptionCourse(null)}
        />
      )}
    </div>
  );
}
