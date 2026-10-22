import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Film, ListChecks, Type } from 'lucide-react';
import type { LessonKind } from '@ostadiplus/shared';
import { Field, Modal } from '@/components/ui';
import { newId, useStore } from '@/store/DemoStore';
const kinds = [
  { kind: 'video', label: 'فيديو', detail: 'شرح بالصوت والصورة', icon: Film },
  { kind: 'pdf', label: 'ملف PDF', detail: 'ملخّص أو تمارين', icon: FileText },
  {
    kind: 'quiz',
    label: 'اختبار',
    detail: 'أسئلة وتقييم بالوقت',
    icon: ListChecks,
  },
  { kind: 'text', label: 'درس مكتوب', detail: 'نص وتنسيق', icon: Type },
] as const;
export function NewLessonDialog({
  courseId,
  chapterId,
  kind: initialKind = 'video',
  close,
}: {
  courseId?: string;
  chapterId?: string;
  kind?: LessonKind;
  close: () => void;
}) {
  useI18n();
  const { state, dispatch, notify } = useStore();
  const navigate = useNavigate();
  const [selectedCourse, setCourse] = useState(
    courseId ?? state.courses[0]?.id ?? '',
  );
  const course = state.courses.find((c) => c.id === selectedCourse);
  const [selectedChapter, setChapter] = useState(chapterId ?? '');
  const [kind, setKind] = useState<LessonKind>(initialKind);
  const [title, setTitle] = useState('');
  const [touched, setTouched] = useState(false);
  const chapters = course?.semesters.flatMap((s) => s.chapters) ?? [];
  const target = chapters.some((c) => c.id === selectedChapter)
    ? selectedChapter
    : (chapters[0]?.id ?? '');
  function create() {
    setTouched(true);
    if (title.trim().length < 2 || !target || !course) return;
    const id = newId('lsn');
    dispatch({
      type: 'lesson/add',
      payload: {
        courseId: course.id,
        chapterId: target,
        lesson: {
          id,
          title: title.trim(),
          kind,
          file: '',
          durationSec: 0,
          pages: 0,
          sizeMb: 0,
          published: false,
          ...(kind === 'quiz' ? { questions: [] } : {}),
        },
      },
    });
    notify(t('تم إنشاء مسودة الدرس'));
    close();
    navigate(`/courses/${course.id}?lesson=${id}`);
  }
  return (
    <Modal
      open
      onClose={close}
      title={initialKind === 'quiz' ? t('اختبار جديد') : t('محتوى جديد')}
      description={t('حدّد مكان الدرس ونوعه، ثم أضف المحتوى في المحرّر.')}
      size="md"
      footer={
        <>
          <button className="btn btn-outline" onClick={close}>
            {t('إلغاء')}
          </button>
          <button
            className="btn btn-primary"
            onClick={create}
            disabled={!course || !target}
          >
            {t('متابعة إلى المحرّر')}
            <ArrowLeft size={15} />
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-3 text-xs font-bold">{t('نوع المحتوى')}</legend>
          <div className="grid grid-cols-2 gap-3">
            {kinds.map((k) => (
              <button
                type="button"
                key={k.kind}
                aria-pressed={kind === k.kind}
                className={`content-type-choice ${kind === k.kind ? 'is-selected' : ''}`}
                onClick={() => setKind(k.kind)}
              >
                <k.icon size={22} strokeWidth={1.5} />
                <span className="block text-xs font-bold">{t(k.label)}</span>
                <span className="text-[10px] text-muted">{t(k.detail)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <Field
          label={t('عنوان الدرس')}
          error={
            touched && title.trim().length < 2
              ? t('اكتب عنواناً من حرفين على الأقل.')
              : undefined
          }
        >
          <input
            dir="auto"
            required
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('مثلاً: مدخل إلى النهايات')}
            maxLength={100}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">{t('الدورة')}</span>
            <select
              className="input"
              value={selectedCourse}
              disabled={!state.courses.length}
              onChange={(e) => {
                setCourse(e.target.value);
                setChapter('');
              }}
            >
              {!state.courses.length ? (
                <option value="">{t('لا توجد دورات بعد')}</option>
              ) : null}
              {state.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  <bdi>{c.title}</bdi>
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t('الفصل')}</span>
            <select
              className="input"
              value={target}
              disabled={!target}
              onChange={(e) => setChapter(e.target.value)}
            >
              {!target ? (
                <option value="">{t('لا توجد فصول بعد')}</option>
              ) : null}
              {course?.semesters.map((s) => (
                <optgroup key={s.id} label={t(s.title)}>
                  {s.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      <bdi>{c.title}</bdi>
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        {!target ? (
          <div className="rounded-lg bg-brand-soft p-4 text-sm text-brand">
            <p>
              {course
                ? t('أضف فصلاً إلى الدورة أولاً، ثم أضف محتواك.')
                : t('أنشئ دورة وأضف إليها فصلاً قبل إضافة المحتوى.')}
            </p>
            <Link
              className="mt-3 inline-flex font-bold underline underline-offset-4"
              to={course ? `/courses/${course.id}` : '/courses?action=new'}
              onClick={close}
            >
              {course ? t('فتح الدورة لإضافة فصل') : t('إنشاء دورة')}
            </Link>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
