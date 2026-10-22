import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useEffect, useState } from 'react';
import { useUnsavedChanges } from './useUnsavedChanges';
import {
  countLessons,
  courseDurationSec,
  coverGradients,
} from '@ostadiplus/shared';
import { CourseCover, Field } from '@/components/ui';
import { useAction, useStore, type NewCourse } from '@/store/DemoStore';
const LEVELS = [
  '2ème Bac — SVT & PC',
  '2ème Bac — PC & SM',
  '2ème Bac — كل الشعب',
  '1ère Bac SM',
  'السنة الأولى ثانوي',
];
const SUBJECTS = ['الرياضيات', 'الفيزياء والكيمياء', 'علوم الحياة والأرض'];
export function CourseInfo({
  courseId,
  onDirty,
}: {
  courseId: string;
  onDirty: (value: boolean) => void;
}) {
  useI18n();
  const { state } = useStore();
  const dispatch = useAction();
  const course = state.courses.find((c) => c.id === courseId);
  const [form, setForm] = useState<NewCourse | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (course) {
      setForm({
        id: course.id,
        title: course.title,
        subject: course.subject,
        level: course.level,
        summary: course.summary,
        cover: course.cover,
      });
    }
  }, [course?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    !!course &&
    !!form &&
    (['title', 'subject', 'level', 'summary', 'cover'] as const).some(
      (key) => course[key] !== form[key],
    );
  useUnsavedChanges(dirty, onDirty);
  if (!course || !form) return null;

  const invalid = form.title.trim().length < 4;

  return (
    <div className="card max-w-2xl p-5">
      <div className="space-y-4">
        <Field
          label={t('عنوان الدورة')}
          error={
            touched && invalid
              ? t('اكتب عنواناً من 4 أحرف على الأقل.')
              : undefined
          }
        >
          <input
            dir="auto"
            className="input"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('المادة')}>
            <select
              className="input"
              value={form.subject}
              onChange={(event) =>
                setForm({ ...form, subject: event.target.value })
              }
            >
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('المستوى')}>
            <select
              className="input"
              value={form.level}
              onChange={(event) =>
                setForm({ ...form, level: event.target.value })
              }
            >
              {LEVELS.map((item) => (
                <option key={item} value={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('وصف مختصر')}>
          <textarea
            dir="auto"
            className="textarea"
            value={form.summary}
            maxLength={240}
            onChange={(event) =>
              setForm({ ...form, summary: event.target.value })
            }
          />
        </Field>

        <div>
          <span className="label">{t('غلاف الدورة')}</span>
          <div className="cover-choice-grid">
            {Object.keys(coverGradients).map((key) => {
              const selected = form.cover === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={t('غلاف {0}', [key])}
                  aria-pressed={selected}
                  onClick={() =>
                    setForm({ ...form, cover: key as NewCourse['cover'] })
                  }
                  className="cover-choice"
                  data-selected={selected}
                >
                  <CourseCover
                    cover={key}
                    subject={''}
                    className="aspect-[5/3] w-full"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <CourseCover
            cover={form.cover}
            subject={form.subject}
            className="h-16 w-28"
          >
            <span className="mt-auto text-xs font-bold text-white">
              <span className="num">{countLessons(course)}</span>
              {t(' درس')}
            </span>
          </CourseCover>
          <div className="text-xs text-muted">
            {t('الغلاف يظهر لطالب في قائمة الدورات داخل التطبيق.')}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setForm({
                id: course.id,
                title: course.title,
                subject: course.subject,
                level: course.level,
                summary: course.summary,
                cover: course.cover,
              });
              setTouched(false);
            }}
          >
            {t('تراجع')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setTouched(true);
              if (invalid) return;
              dispatch(
                {
                  type: 'course/update',
                  payload: {
                    id: course.id,
                    patch: {
                      title: form.title.trim(),
                      subject: form.subject,
                      level: form.level,
                      summary: form.summary.trim(),
                      cover: form.cover,
                    },
                  },
                },
                t('تم حفظ معلومات الدورة'),
              );
              setForm({
                ...form,
                title: form.title.trim(),
                summary: form.summary.trim(),
              });
              setTouched(false);
            }}
          >
            {t('حفظ التعديلات')}
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs text-faint">
        {t('مدة الدورة الحالية:')}{' '}
        <span className="num">
          {Math.round(courseDurationSec(course) / 60)}
        </span>{' '}
        {t('دقيقة.')}
      </p>
    </div>
  );
}
