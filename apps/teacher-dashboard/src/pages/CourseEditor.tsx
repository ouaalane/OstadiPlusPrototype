import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Film,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  countLessons,
  courseDurationSec,
  coverGradients,
  formatDuration,
  formatSize,
} from '@ostadiplus/shared';
import { CourseCover, Confirm, EmptyState, Field, Modal, PageHeader, Pill, Toggle } from '@/components/ui';
import { CoursePreview } from '@/components/CoursePreview';
import { LessonDialog } from '@/components/LessonDialog';
import { useAction, useStore, type NewCourse } from '@/store/DemoStore';

type Tab = 'content' | 'info' | 'preview';

const LEVELS = [
  '2ème Bac — SVT & PC',
  '2ème Bac — PC & SM',
  '2ème Bac — كل الشعب',
  '1ère Bac SM',
  'السنة الأولى ثانوي',
];

const SUBJECTS = ['الرياضيات', 'الفيزياء والكيمياء', 'علوم الحياة والأرض'];

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const { state, notify } = useStore();
  const dispatch = useAction();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('content');
  const [lessonTarget, setLessonTarget] = useState<{
    chapterId: string;
    lesson: Parameters<typeof LessonDialog>[0]['lesson'];
  } | null>(null);
  const [chapterTarget, setChapterTarget] = useState<{
    mode: 'add' | 'rename';
    chapterId?: string;
    initial?: string;
  } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const course = useMemo(
    () => state.courses.find((c) => c.id === courseId),
    [state.courses, courseId],
  );

  useEffect(() => {
    if (!course) navigate('/courses', { replace: true });
  }, [course, navigate]);

  if (!course) return null;

  const isPublished = course.status === 'published';
  const lessons = countLessons(course);
  const publishedLessons = course.chapters
    .flatMap((c) => c.lessons)
    .filter((l) => l.published).length;

  function togglePublish() {
    if (!course) return;
    if (!isPublished) {
      if (publishedLessons === 0) {
        setTab('content');
        notify('لا يمكن نشر دورة بدون محتوى منشور — أضف درساً واحداً منشوراً أولاً', 'error');
        return;
      }
      dispatch({ type: 'course/setStatus', payload: { id: course.id, status: 'published' } }, 'تم نشر الدورة — أصبحت ظاهرة في تطبيق التلاميذ');
      return;
    }
    setConfirm({
      title: 'إيقاف نشر الدورة؟',
      message:
        'لن تظهر الدورة ل التلاميذ الجدد، وسيبقى محتواها ووصول التلاميذ الحاليين محفوظاً كما هو.',
      confirmLabel: 'إيقاف النشر',
      onConfirm: () => {
        if (!course) return;
        dispatch(
          { type: 'course/setStatus', payload: { id: course.id, status: 'draft' } },
          'أصبحت الدورة مسودة',
        );
        setConfirm(null);
      },
    });
  }

  return (
    <>
      <Link
        to="/courses"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowRight size={16} />
        كل الدورات
      </Link>

      <PageHeader
        title={course.title}
        description={`${course.subject} · ${course.level} · آخر تحديث ${new Date(
          course.updatedAt,
        ).toLocaleDateString('ar-MA')}`}
        actions={
          <>
            <Pill tone={isPublished ? 'success' : 'warning'} dot>
              {isPublished ? 'منشورة' : 'مسودة'}
            </Pill>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setTab('preview')}
            >
              <Eye size={17} />
              معاينة
            </button>
            <button
              type="button"
              className={isPublished ? 'btn btn-danger' : 'btn btn-primary'}
              onClick={togglePublish}
            >
              {isPublished ? 'إيقاف النشر' : 'نشر الدورة'}
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-line pb-3" role="tablist">
        {(
          [
            ['content', 'المحتوى'],
            ['info', 'معلومات الدورة'],
            ['preview', 'معاينة'],
          ] as [Tab, string][]
        ).map(([key, labelText]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
          >
            {labelText}
          </button>
        ))}
        <span className="ms-auto hidden self-center text-xs text-muted sm:block">
          <span className="num">{course.chapters.length}</span> فصل ·{' '}
          <span className="num">{lessons}</span> درس ·{' '}
          <span className="num">{publishedLessons}</span> منشور
        </span>
      </div>

      {tab === 'info' ? (
        <InfoTab courseId={course.id} />
      ) : tab === 'preview' ? (
        <CoursePreview state={state} courseId={course.id} />
      ) : (
        <>
          {course.chapters.length === 0 ? (
            <EmptyState
              icon={<Layers size={24} />}
              title="ابدأ بإضافة فصل"
              description="قسّم الدورة إلى فصول (مثال: النهايات، الاشتقاق، التطبيقات) ثم أضف داخل كل فصل دروساً بفيديو أو مستند."
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setChapterTarget({ mode: 'add' })}
                >
                  <Plus size={17} />
                  إضافة فصل
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {course.chapters.map((chapter, ci) => (
                <section key={chapter.id} className="card p-0">
                  <header className="flex items-center gap-3 border-b border-line px-4 py-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand-dark">
                      <span className="num">{ci + 1}</span>
                    </span>
                    <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
                      {chapter.title}
                    </h2>
                    <span className="hidden text-xs text-muted sm:block">
                      <span className="num">{chapter.lessons.length}</span> دروس
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="hidden items-center gap-1 sm:flex">
                        <IconAction
                          label="نقل لأعلى"
                          disabled={ci === 0}
                          onClick={() =>
                            dispatch({
                              type: 'chapter/move',
                              payload: {
                                courseId: course.id,
                                chapterId: chapter.id,
                                dir: -1,
                              },
                            })
                          }
                        >
                          <ChevronUp size={16} />
                        </IconAction>
                        <IconAction
                          label="نقل لأسفل"
                          disabled={ci === course.chapters.length - 1}
                          onClick={() =>
                            dispatch({
                              type: 'chapter/move',
                              payload: {
                                courseId: course.id,
                                chapterId: chapter.id,
                                dir: 1,
                              },
                            })
                          }
                        >
                          <ChevronDown size={16} />
                        </IconAction>
                      </span>
                      <IconAction
                        label="إعادة تسمية"
                        onClick={() =>
                          setChapterTarget({
                            mode: 'rename',
                            chapterId: chapter.id,
                            initial: chapter.title,
                          })
                        }
                      >
                        <Pencil size={15} />
                      </IconAction>
                      <IconAction
                        label="حذف الفصل"
                        danger
                        onClick={() =>
                          setConfirm({
                            title: 'حذف الفصل؟',
                            message: `سيُحذف فصل «${chapter.title}» مع ${
                              chapter.lessons.length
                            } درس. لا يمكن التراجع.`,
                            confirmLabel: 'حذف الفصل',
                            onConfirm: () => {
                              dispatch(
                                {
                                  type: 'chapter/delete',
                                  payload: {
                                    courseId: course.id,
                                    chapterId: chapter.id,
                                  },
                                },
                                'تم حذف الفصل',
                              );
                              setConfirm(null);
                            },
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </IconAction>
                    </div>
                  </header>

                  {chapter.lessons.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-muted">
                      لا دروس في هذا الفصل بعد.
                    </p>
                  ) : (
                    <ul>
                      {chapter.lessons.map((item, li) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
                        >
                          <span className="num w-5 shrink-0 text-center text-xs text-faint">
                            {li + 1}
                          </span>
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background:
                                item.kind === 'video'
                                  ? 'var(--color-brand-soft)'
                                  : 'var(--color-danger-soft)',
                              color:
                                item.kind === 'video'
                                  ? 'var(--color-brand-dark)'
                                  : 'var(--color-danger)',
                            }}
                          >
                            {item.kind === 'video' ? (
                              <Film size={16} />
                            ) : (
                              <FileText size={16} />
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14.5px] font-semibold text-ink">
                              {item.title}
                            </div>
                            <div className="truncate text-xs text-muted">
                              {item.kind === 'video'
                                ? formatDuration(item.durationSec)
                                : `${item.pages} صفحات`}
                              {' · '}
                              {formatSize(item.sizeMb)}
                              {' · '}
                              <span dir="ltr" className="num">
                                {item.file}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden text-xs text-muted sm:block">
                              {item.published ? 'منشور' : 'مخفي'}
                            </span>
                            <Toggle
                              checked={item.published}
                              label={`إظهار درس ${item.title}`}
                              onChange={(value) =>
                                dispatch({
                                  type: 'lesson/setPublished',
                                  payload: {
                                    courseId: course.id,
                                    chapterId: chapter.id,
                                    lessonId: item.id,
                                    published: value,
                                  },
                                })
                              }
                            />
                            <div className="flex items-center gap-1">
                              <span className="hidden items-center gap-1 sm:flex">
                                <IconAction
                                  label="نقل لأعلى"
                                  disabled={li === 0}
                                  onClick={() =>
                                    dispatch({
                                      type: 'lesson/move',
                                      payload: {
                                        courseId: course.id,
                                        chapterId: chapter.id,
                                        lessonId: item.id,
                                        dir: -1,
                                      },
                                    })
                                  }
                                >
                                  <ChevronUp size={15} />
                                </IconAction>
                                <IconAction
                                  label="نقل لأسفل"
                                  disabled={li === chapter.lessons.length - 1}
                                  onClick={() =>
                                    dispatch({
                                      type: 'lesson/move',
                                      payload: {
                                        courseId: course.id,
                                        chapterId: chapter.id,
                                        lessonId: item.id,
                                        dir: 1,
                                      },
                                    })
                                  }
                                >
                                  <ChevronDown size={15} />
                                </IconAction>
                              </span>
                              <IconAction
                                label="تعديل الدرس"
                                onClick={() =>
                                  setLessonTarget({ chapterId: chapter.id, lesson: item })
                                }
                              >
                                <Pencil size={14} />
                              </IconAction>
                              <IconAction
                                label="حذف الدرس"
                                danger
                                onClick={() =>
                                  setConfirm({
                                    title: 'حذف الدرس؟',
                                    message: `سيُحذف درس «${item.title}» نهائياً من هذه الدورة.`,
                                    confirmLabel: 'حذف الدرس',
                                    onConfirm: () => {
                                      dispatch(
                                        {
                                          type: 'lesson/delete',
                                          payload: {
                                            courseId: course.id,
                                            chapterId: chapter.id,
                                            lessonId: item.id,
                                          },
                                        },
                                        'تم حذف الدرس',
                                      );
                                      setConfirm(null);
                                    },
                                  })
                                }
                              >
                                <Trash2 size={14} />
                              </IconAction>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <footer className="px-4 py-3">
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={() => setLessonTarget({ chapterId: chapter.id, lesson: null })}
                    >
                      <Plus size={15} />
                      إضافة درس
                    </button>
                  </footer>
                </section>
              ))}

              <button
                type="button"
                className="btn btn-outline w-full border-dashed py-4"
                onClick={() => setChapterTarget({ mode: 'add' })}
              >
                <Plus size={17} />
                إضافة فصل جديد
              </button>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      {lessonTarget ? (
        <LessonDialog
          open
          courseId={course.id}
          chapterId={lessonTarget.chapterId}
          lesson={lessonTarget.lesson}
          onClose={() => setLessonTarget(null)}
        />
      ) : null}

      <ChapterDialog
        target={chapterTarget}
        onClose={() => setChapterTarget(null)}
        onSubmit={(title) => {
          if (!chapterTarget) return;
          if (chapterTarget.mode === 'add') {
            dispatch(
              { type: 'chapter/add', payload: { courseId: course.id, title } },
              'تمت إضافة الفصل',
            );
          } else if (chapterTarget.chapterId) {
            dispatch(
              {
                type: 'chapter/update',
                payload: { courseId: course.id, chapterId: chapterTarget.chapterId, title },
              },
              'تم تحديث اسم الفصل',
            );
          }
          setChapterTarget(null);
        }}
      />

      <Confirm
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel ?? 'تأكيد'}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function IconAction({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      style={danger ? { color: 'var(--color-danger)' } : undefined}
    >
      {children}
    </button>
  );
}

function ChapterDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: { mode: 'add' | 'rename'; initial?: string } | null;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(target?.initial ?? '');
  }, [target]);

  const open = target !== null;
  const invalid = value.trim().length < 3;

  return (
    <Modal2
      open={open}
      onClose={onClose}
      title={target?.mode === 'rename' ? 'إعادة تسمية الفصل' : 'إضافة فصل'}
      onSubmit={() => {
        if (invalid) return;
        onSubmit(value.trim());
      }}
    >
      <Field label="عنوان الفصل">
        <input
          className="input"
          value={value}
          autoFocus
          maxLength={70}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !invalid) onSubmit(value.trim());
          }}
          placeholder="مثال: النهايات والاستمرارية"
        />
      </Field>
      {invalid && value.length > 0 ? (
        <p className="mt-2 text-xs font-semibold text-danger">
          العنوان قصير جداً.
        </p>
      ) : null}
    </Modal2>
  );
}

/* Thin wrapper so ChapterDialog does not need to re-implement Modal chrome. */
function Modal2({
  open,
  onClose,
  title,
  children,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" onClick={onSubmit}>
            حفظ
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Info tab                                                            */
/* ------------------------------------------------------------------ */

function InfoTab({ courseId }: { courseId: string }) {
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

  if (!course || !form) return null;

  const invalid = form.title.trim().length < 4;

  return (
    <div className="card max-w-2xl p-5">
      <div className="space-y-4">
        <Field
          label="عنوان الدورة"
          error={touched && invalid ? 'اكتب عنواناً من 4 أحرف على الأقل.' : undefined}
        >
          <input
            className="input"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="المادة">
            <select
              className="input"
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            >
              {SUBJECTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="المستوى">
            <select
              className="input"
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
            >
              {LEVELS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="وصف مختصر">
          <textarea
            className="textarea"
            value={form.summary}
            maxLength={240}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
          />
        </Field>

        <div>
          <span className="label">لون الغلاف</span>
          <div className="flex flex-wrap gap-2">
            {Object.keys(coverGradients).map((key) => {
              const [from, to] = coverGradients[key];
              const selected = form.cover === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`غلاف ${key}`}
                  aria-pressed={selected}
                  onClick={() =>
                    setForm({ ...form, cover: key as NewCourse['cover'] })
                  }
                  className={`h-9 w-9 rounded-lg transition-transform ${
                    selected
                      ? 'scale-110 ring-2 ring-ink ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <CourseCover cover={form.cover} subject={form.subject} className="h-16 w-28">
            <span className="mt-auto text-xs font-bold text-white">
              <span className="num">{countLessons(course)}</span> درس
            </span>
          </CourseCover>
          <div className="text-xs text-muted">
            الغلاف يظهر لطالب في قائمة الدورات داخل التطبيق.
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
            تراجع
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
                'تم حفظ معلومات الدورة',
              );
            }}
          >
            حفظ التعديلات
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs text-faint">
        مدة الدورة الحالية:{' '}
        <span className="num">{Math.round(courseDurationSec(course) / 60)}</span> دقيقة.
      </p>
    </div>
  );
}
