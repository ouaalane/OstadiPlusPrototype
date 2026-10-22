import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  centerToday,
  createAccessPeriod,
  courseTeacher,
  type AccessPlan,
} from '@ostadiplus/shared';
import { Modal } from '@/components/ui';
import { useAction, useStore } from '@/store/DemoStore';

export default function SubscriptionManager({
  studentId,
  initialCourseId,
  onClose,
}: {
  studentId: string;
  initialCourseId?: string;
  onClose: () => void;
}) {
  useI18n();
  const { state } = useStore();
  const formId = useId();
  const action = useAction();
  const [courseId, setCourseId] = useState(
    initialCourseId ?? state.courses[0]?.id ?? '',
  );
  const [choice, setChoice] = useState('months:1');
  const [months, setMonths] = useState(1);
  const [startsOn, setStartsOn] = useState(centerToday());
  const [endsOn, setEndsOn] = useState('');
  const [periodId, setPeriodId] = useState<string>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const course = state.courses.find((c) => c.id === courseId);
  const enrollment = state.enrollments.find(
    (e) => e.studentId === studentId && e.courseId === courseId,
  );
  const student = state.students.find((s) => s.id === studentId);
  const plan: AccessPlan = choice.startsWith('semester:')
    ? { kind: 'semester', semesterId: choice.slice(9), startsOn, endsOn }
    : { kind: 'months', durationMonths: months, startsOn };
  let preview = '';
  try {
    if (course) preview = createAccessPeriod(plan, course, 'preview').endsOn;
  } catch {
    /* form errors appear on submit */
  }
  const reset = () => {
    setPeriodId(undefined);
    setChoice('months:1');
    setMonths(1);
    setStartsOn(centerToday());
    setEndsOn('');
    setError('');
    setSaved(false);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t('إدارة الاشتراكات — {0}', [student?.fullName ?? ''])}
      description={t(
        'اختر الأستاذ والمقرر، ثم مدة الاشتراك أو الدورة الدراسية. انشر التحديثات لمزامنتها مع تطبيق التلميذ.',
      )}
      size="lg"
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          try {
            if (!course) throw new Error(t('اختر المقرر'));
            createAccessPeriod(plan, course, 'validate');
            action(
              {
                type: 'enrollment/grant',
                payload: { studentId, courseId, plan, periodId },
              },
              t('تم حفظ الاشتراك'),
            );
            setSaved(true);
            setPeriodId(undefined);
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : t('تعذر حفظ الاشتراك'),
            );
          }
        }}
      >
        <label className="block text-sm font-semibold">
          {t('الأستاذ والمقرر')}
          <select
            aria-label={t('الأستاذ والمقرر')}
            disabled={!state.courses.length}
            className="input w-full mt-2"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              reset();
            }}
          >
            {!state.courses.length ? (
              <option value="">{t('لا توجد مقررات بعد')}</option>
            ) : null}
            {state.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {courseTeacher(state, c).name} — <bdi>{c.title}</bdi> ·{' '}
                {c.level}
              </option>
            ))}
          </select>
        </label>
        {!course ? (
          <p className="rounded-lg bg-brand-soft p-3 text-sm">
            {t('لا يوجد مقرر لتخصيص اشتراك.')}{' '}
            <Link
              to="/courses"
              className="text-brand underline"
              onClick={onClose}
            >
              {t('انتقل إلى الدورات لإضافة مقرر')}
            </Link>
            .
          </p>
        ) : null}
        <section className="rounded-xl border border-line p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">{t('الاشتراكات المسجلة')}</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={reset}
            >
              {t('إضافة اشتراك')}
            </button>
          </div>
          {!enrollment || enrollment.accessPeriods?.length === 0 ? (
            <p className="text-sm text-muted">
              {t('لا يوجد اشتراك لهذا المقرر.')}
            </p>
          ) : !enrollment.accessPeriods ? (
            <p className="text-sm text-muted">
              {t('اشتراك سابق للمقرر كاملاً حتى ')}
              {enrollment.expiresAt.slice(0, 10)}
              {t('. الحفظ الأول يستبدله بالاشتراك المحدد أدناه.')}
            </p>
          ) : (
            <ul className="space-y-2">
              {enrollment.accessPeriods.map((p) => {
                const status =
                  Date.now() < +new Date(p.startsAt)
                    ? t('يبدأ لاحقاً')
                    : Date.now() >= +new Date(p.expiresAt)
                      ? t('منتهي')
                      : t('ساري');
                return (
                  <li
                    key={p.id}
                    className="flex justify-between gap-3 text-sm bg-surface rounded-lg p-3"
                  >
                    <div>
                      <strong>
                        {p.kind === 'months'
                          ? t('{0} شهر — المقرر كاملاً', [p.durationMonths])
                          : course?.semesters.find((s) => s.id === p.semesterId)
                              ?.title}
                      </strong>
                      <p className="text-xs text-muted mt-1" dir="ltr">
                        {p.startsOn} → {p.endsOn} · {status}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setPeriodId(p.id);
                        setChoice(
                          p.kind === 'months'
                            ? `months:${p.durationMonths}`
                            : `semester:${p.semesterId}`,
                        );
                        setMonths(p.durationMonths ?? 1);
                        setStartsOn(p.startsOn);
                        setEndsOn(p.endsOn);
                        setSaved(false);
                        setError('');
                      }}
                    >
                      {t('تعديل')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <fieldset
          className="space-y-3"
          disabled={saved || !course}
          aria-describedby={error ? `${formId}-error` : undefined}
        >
          <legend className="text-sm font-bold mb-3">
            {saved
              ? t('تم حفظ الاشتراك')
              : periodId
                ? t('تعديل الاشتراك')
                : t('اشتراك جديد')}
          </legend>
          <div className="subscription-plan-grid">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                data-period="months"
                type="button"
                aria-pressed={choice === `months:${n}`}
                className={`btn btn-sm ${choice === `months:${n}` ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setChoice(`months:${n}`);
                  setMonths(n);
                  setSaved(false);
                  setError('');
                }}
              >
                {n === 1 ? t('شهر') : n === 2 ? t('شهران') : t('ثلاثة أشهر')}
              </button>
            ))}
            {course?.semesters.map((s) => (
              <button
                key={s.id}
                data-period="semester"
                type="button"
                aria-pressed={choice === `semester:${s.id}`}
                className={`btn btn-sm ${choice === `semester:${s.id}` ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setChoice(`semester:${s.id}`);
                  setSaved(false);
                  setError('');
                }}
              >
                {t(s.title)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {plan.kind === 'months'
              ? t('اشتراك بالشهور: جميع دروس المقرر خلال المدة المحددة.')
              : t(
                  'اشتراك دورة: دروس هذه الدورة فقط. تاريخ النهاية يحدده المركز.',
                )}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              {t('تاريخ البداية')}
              <input
                dir="auto"
                aria-label={t('تاريخ البداية')}
                required
                type="date"
                className="input w-full mt-2"
                value={startsOn}
                onChange={(e) => {
                  setStartsOn(e.target.value);
                  setSaved(false);
                  setError('');
                }}
              />
            </label>
            {plan.kind === 'semester' ? (
              <label className="text-sm">
                {t('آخر يوم للوصول')}
                <input
                  dir="auto"
                  aria-label={t('آخر يوم للوصول')}
                  required
                  type="date"
                  min={startsOn}
                  className="input w-full mt-2"
                  value={endsOn}
                  onChange={(e) => {
                    setEndsOn(e.target.value);
                    setSaved(false);
                    setError('');
                  }}
                />
              </label>
            ) : (
              <label className="text-sm">
                {t('عدد الشهور (قابل للتخصيص)')}
                <input
                  dir="auto"
                  aria-label={t('عدد الشهور')}
                  type="number"
                  min={1}
                  max={24}
                  required
                  className="input w-full mt-2"
                  value={months}
                  onChange={(e) => {
                    setMonths(Number(e.target.value));
                    setChoice(`months:${e.target.value}`);
                    setSaved(false);
                    setError('');
                  }}
                />
              </label>
            )}
          </div>
        </fieldset>
        {preview && (
          <p className="rounded-lg bg-surface p-3 text-sm">
            {t('الوصول من ')}
            {startsOn}
            {t(' إلى نهاية يوم ')}
            {preview}
            {t(' بتوقيت المغرب. يتوقف تلقائياً بعد النهاية.')}
          </p>
        )}
        {error && (
          <p
            id={`${formId}-error`}
            role="alert"
            className="text-sm text-danger"
          >
            {t(error)}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-brand">
            {t(
              'تم حفظ الاشتراك. لإضافة مدة أخرى اختر «إضافة اشتراك»، ولتغيير الاشتراك الحالي اختر «تعديل» من القائمة. انشر التحديثات من صفحة المزامنة.',
            )}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saved || !course}
            className="btn btn-primary"
          >
            {t('حفظ الاشتراك')}
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t('إغلاق')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
