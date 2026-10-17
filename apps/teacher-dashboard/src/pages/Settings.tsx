import { useEffect, useState } from 'react';
import { ClipboardCopy, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { Confirm, Field, PageHeader } from '@/components/ui';
import { useAction, useStore } from '@/store/DemoStore';

export default function Settings() {
  const { state, notify, exportPayload, isDirty } = useStore();
  const dispatch = useAction();
  const teacher = state.teacher;

  const [form, setForm] = useState(teacher);
  const [touched, setTouched] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    setForm(teacher);
  }, [teacher]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameInvalid = form.name.trim().length < 3;
  const emailInvalid = form.email.trim().length > 0 && !form.email.includes('@');

  return (
    <>
      <PageHeader
        title="الإعدادات"
        description="بياناتك التي تظهر للطلاب وأدوات البيانات التجريبية."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* ---- profile ---- */}
        <section className="card p-5">
          <h2 className="text-lg">الملف الشخصي</h2>

          <div className="mt-5 space-y-4">
            <Field
              label="الاسم"
              error={touched && nameInvalid ? 'اكتب اسماً صحيحاً.' : undefined}
            >
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="الاسم اللاتيني">
                <input
                  className="input"
                  dir="ltr"
                  value={form.nameLatin}
                  onChange={(event) => setForm({ ...form, nameLatin: event.target.value })}
                />
              </Field>
              <Field label="المادة">
                <input
                  className="input"
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="اسم المركز">
                <input
                  className="input"
                  value={form.centerName}
                  onChange={(event) => setForm({ ...form, centerName: event.target.value })}
                />
              </Field>
              <Field label="المدينة">
                <input
                  className="input"
                  value={form.centerCity}
                  onChange={(event) => setForm({ ...form, centerCity: event.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="البريد الإلكتروني"
                error={touched && emailInvalid ? 'بريد غير صحيح.' : undefined}
              >
                <input
                  className="input"
                  dir="ltr"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </Field>
              <Field label="الهاتف">
                <input
                  className="input"
                  dir="ltr"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </Field>
            </div>

            <Field label="نبذة" hint="سطر أو سطرين عن أسلوبك في التدريس.">
              <textarea
                className="textarea"
                style={{ minHeight: 90 }}
                maxLength={240}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </Field>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-faint">
              <ShieldCheck size={14} />
              البيانات محلية على هذا الجهاز فقط.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setForm(teacher);
                  setTouched(false);
                }}
              >
                تراجع
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setTouched(true);
                  if (nameInvalid || emailInvalid) return;
                  dispatch(
                    { type: 'teacher/update', payload: { ...form } },
                    'تم حفظ الملف الشخصي',
                  );
                }}
              >
                <Save size={16} />
                حفظ
              </button>
            </div>
          </div>
        </section>

        {/* ---- demo data ---- */}
        <section className="card h-fit p-5">
          <h2 className="text-lg">بيانات العرض التجريبي</h2>
          <p className="mt-1 text-sm text-muted">
            {state.courses.length} دورات · {state.students.length} تلميذاً
            {isDirty ? ' · عُدّلت' : ''}
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-alt/60 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <ClipboardCopy size={16} />
                  نقل البيانات إلى تطبيق التلاميذ
                </div>
                <p className="mt-1 text-xs text-muted">
                  انسخ رمز المزامنة والصقه في تطبيق التلاميذ.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                disabled={copying}
                onClick={async () => {
                  try {
                    setCopying(true);
                    const payload = await exportPayload();
                    await navigator.clipboard.writeText(payload);
                    notify('تم نسخ رمز المزامنة — الصقه في تطبيق التلاميذ');
                  } catch {
                    notify('تعذر النسخ — تأكد من أذونات المتصفح', 'error');
                  } finally {
                    setCopying(false);
                  }
                }}
              >
                <ClipboardCopy size={15} />
                {copying ? 'جارٍ النسخ…' : 'نسخ رمز المزامنة'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <RotateCcw size={16} />
                  إعادة ضبط العرض
                </div>
                <p className="mt-1 text-xs text-muted">
                  يحذف تعديلاتك ويعيد البيانات الأصلية.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--color-danger)' }}
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw size={15} />
                إعادة الضبط
              </button>
            </div>
          </div>
        </section>
      </div>

      <Confirm
        open={resetOpen}
        title="إعادة ضبط بيانات العرض؟"
        message="سيُحذف كل ما عدّلته (دورات، تلاميذ، تقدّم) وتعود البيانات الأصلية."
        confirmLabel="إعادة الضبط"
        onConfirm={() => {
          dispatch({ type: 'reset' }, 'عادت بيانات العرض إلى حالتها الأصلية');
          setResetOpen(false);
        }}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
