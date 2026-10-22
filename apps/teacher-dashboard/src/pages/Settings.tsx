import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useEffect, useRef, useState } from 'react';
import { ClipboardCopy, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { Confirm, Field, PageHeader } from '@/components/ui';
import { useAction, useStore } from '@/store/DemoStore';
import { useUnsavedChanges } from '@/components/authoring/useUnsavedChanges';

const ignoreDirty = () => {};

export default function Settings() {
  useI18n();
  const { state, notify, exportPayload, isDirty } = useStore();
  const dispatch = useAction();
  const teacher = state.teacher;

  const [form, setForm] = useState(teacher);
  const [touched, setTouched] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [manualPayload, setManualPayload] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(teacher);
  useUnsavedChanges(dirty, ignoreDirty);

  useEffect(() => {
    setForm(teacher);
  }, [teacher]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameInvalid = form.name.trim().length < 3;
  const emailInvalid =
    form.email.trim().length > 0 &&
    !/^[^\s@]+@[^\s@]+$/.test(form.email.trim());

  return (
    <>
      <PageHeader
        title={t('الإعدادات')}
        description={t('بياناتك التي تظهر للطلاب وأدوات البيانات التجريبية.')}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* ---- profile ---- */}
        <form
          className="card p-5"
          noValidate
          onChange={() => setSaved(false)}
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (nameInvalid || emailInvalid) {
              (nameInvalid ? nameRef : emailRef).current?.focus();
              return;
            }
            dispatch(
              {
                type: 'teacher/update',
                payload: {
                  ...form,
                  name: form.name.trim(),
                  email: form.email.trim(),
                },
              },
              t('تم حفظ الملف الشخصي'),
            );
            setSaved(true);
          }}
        >
          <h2 className="text-lg">{t('الملف الشخصي')}</h2>

          <div className="mt-5 space-y-4">
            <Field
              label={t('الاسم')}
              error={
                touched && nameInvalid ? t('اكتب اسماً صحيحاً.') : undefined
              }
            >
              <input
                dir="auto"
                ref={nameRef}
                required
                autoComplete="name"
                className="input"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('الاسم اللاتيني')}>
                <input
                  className="input"
                  dir="ltr"
                  value={form.nameLatin}
                  onChange={(event) =>
                    setForm({ ...form, nameLatin: event.target.value })
                  }
                />
              </Field>
              <Field label={t('المادة')}>
                <input
                  dir="auto"
                  className="input"
                  value={form.subject}
                  onChange={(event) =>
                    setForm({ ...form, subject: event.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('اسم المركز')}>
                <input
                  dir="auto"
                  className="input"
                  value={form.centerName}
                  onChange={(event) =>
                    setForm({ ...form, centerName: event.target.value })
                  }
                />
              </Field>
              <Field label={t('المدينة')}>
                <input
                  dir="auto"
                  className="input"
                  value={form.centerCity}
                  onChange={(event) =>
                    setForm({ ...form, centerCity: event.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={t('البريد الإلكتروني')}
                error={
                  touched && emailInvalid ? t('بريد غير صحيح.') : undefined
                }
              >
                <input
                  className="input"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>
              <Field label={t('الهاتف')}>
                <input
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </Field>
            </div>

            <Field
              label={t('نبذة')}
              hint={t('سطر أو سطرين عن أسلوبك في التدريس.')}
            >
              <textarea
                dir="auto"
                className="textarea"
                style={{ minHeight: 90 }}
                maxLength={240}
                value={form.bio}
                onChange={(event) =>
                  setForm({ ...form, bio: event.target.value })
                }
              />
            </Field>
          </div>

          <div role="status" className="mt-4 text-sm text-brand">
            {saved
              ? t('تم حفظ تغييرات الملف الشخصي.')
              : dirty
                ? t('لديك تغييرات غير محفوظة.')
                : ''}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-faint">
              <ShieldCheck size={14} />
              {t('البيانات محلية على هذا الجهاز فقط.')}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setForm(teacher);
                  setTouched(false);
                  setSaved(false);
                }}
              >
                {t('تراجع')}
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                {t('حفظ')}
              </button>
            </div>
          </div>
        </form>

        {/* ---- demo data ---- */}
        <section className="card h-fit p-5">
          <h2 className="text-lg">{t('بيانات العرض التجريبي')}</h2>
          <p className="mt-1 text-sm text-muted">
            {state.courses.length}
            {t(' دورات · ')}
            {state.students.length}
            {t(' تلميذاً')}
            {isDirty ? t(' · عُدّلت') : ''}
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-alt/60 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <ClipboardCopy size={16} />
                  {t('نقل البيانات إلى تطبيق التلاميذ')}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {t('انسخ رمز المزامنة والصقه في تطبيق التلاميذ.')}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                disabled={copying}
                onClick={async () => {
                  try {
                    setCopying(true);
                    setCopyError('');
                    setManualPayload('');
                    const payload = await exportPayload();
                    setManualPayload(payload);
                    await navigator.clipboard.writeText(payload);
                    setManualPayload('');
                    notify(t('تم نسخ رمز المزامنة — الصقه في تطبيق التلاميذ'));
                  } catch {
                    setCopyError(
                      t(
                        'تعذّر النسخ التلقائي. يمكنك تحديد الرمز أدناه ونسخه يدوياً.',
                      ),
                    );
                  } finally {
                    setCopying(false);
                  }
                }}
              >
                <ClipboardCopy size={15} />
                {copying ? t('جارٍ النسخ…') : t('نسخ رمز المزامنة')}
              </button>
            </div>

            {copyError ? (
              <div className="rounded-xl border border-line bg-brand-soft p-4">
                <p role="alert" className="text-sm text-brand">
                  {copyError}
                </p>
                {manualPayload ? (
                  <Field
                    label={t('رمز المزامنة للنسخ اليدوي')}
                    hint={t(
                      'حدّد الرمز كاملاً ثم انسخه والصقه في تطبيق التلميذ.',
                    )}
                  >
                    <textarea
                      className="textarea mt-3"
                      dir="ltr"
                      readOnly
                      value={manualPayload}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <RotateCcw size={16} />
                  {t('إعادة ضبط العرض')}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {t('يحذف تعديلاتك ويعيد البيانات الأصلية.')}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--color-danger)' }}
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw size={15} />
                {t('إعادة الضبط')}
              </button>
            </div>
          </div>
        </section>
      </div>

      <Confirm
        open={resetOpen}
        title={t('إعادة ضبط بيانات العرض؟')}
        message={t(
          'سيُحذف كل ما عدّلته (دورات، تلاميذ، تقدّم) وتعود البيانات الأصلية.',
        )}
        confirmLabel={t('إعادة الضبط')}
        onConfirm={() => {
          dispatch(
            { type: 'reset' },
            t('عادت بيانات العرض إلى حالتها الأصلية'),
          );
          setResetOpen(false);
        }}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
