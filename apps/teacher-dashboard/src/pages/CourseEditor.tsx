import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Film,
  GripVertical,
  Layers,
  Link2,
  ListChecks,
  ListOrdered,
  MoreVertical,
  PenLine,
  Plus,
  Quote,
  Trash2,
  Type as TypeIcon,
  UploadCloud,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  allLessons,
  countChapters,
  countLessons,
  courseDurationSec,
  coverGradients,
  findChapter,
  formatDuration,
  formatSize,
  type Chapter,
  type Course,
  type Lesson,
  type LessonKind,
  type QuizQuestion,
} from '@ostadiplus/shared';
import {
  Confirm,
  CourseCover,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pill,
  Toggle,
} from '@/components/ui';
import { LessonDetails } from '@/components/LessonDetails';
import { CoursePreview } from '@/components/CoursePreview';
import { library, type LibraryItem } from '@/lib/library';
import {
  KIND_META,
  hasContent,
  lessonMeta,
} from '@/lib/lessonKind';
import { bundledMediaUrl, prepareUpload } from '@/lib/media';
import { useAction, useStore, type NewCourse, type NewLesson } from '@/store/DemoStore';

type Tab = 'content' | 'info' | 'preview';

const LEVELS = [
  '2ème Bac — SVT & PC',
  '2ème Bac — PC & SM',
  '2ème Bac — كل الشعب',
  '1ère Bac SM',
  'السنة الأولى ثانوي',
];

const SUBJECTS = ['الرياضيات', 'الفيزياء والكيمياء', 'علوم الحياة والأرض'];

const localUid = () => Math.random().toString(36).slice(2, 9);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

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
  const [editing, setEditing] = useState<{ chapterId: string; lessonId: string } | null>(
    null,
  );
  const [chapterTarget, setChapterTarget] = useState<{
    mode: 'add' | 'rename';
    semesterId?: string;
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
  const publishedLessons = allLessons(course).filter((l) => l.published).length;

  function togglePublish() {
    if (!course) return;
    if (!isPublished) {
      if (publishedLessons === 0) {
        setTab('content');
        notify('أضف درساً واحداً منشوراً أولاً', 'error');
        return;
      }
      dispatch(
        { type: 'course/setStatus', payload: { id: course.id, status: 'published' } },
        'تم نشر الدورة — أصبحت ظاهرة في تطبيق التلاميذ',
      );
      return;
    }
    setConfirm({
      title: 'إيقاف نشر الدورة؟',
      message: 'لن تظهر الدورة للتلاميذ الجدد، ومحتواها ووصول التلاميذ الحاليين محفوظ.',
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
        description={`${course.subject} · ${course.level}`}
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
            ['content', 'المنهج'],
            ['info', 'معلومات الدورة'],
            ['preview', 'معاينة'],
          ] as [Tab, string][]
        ).map(([key, labelText]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              if (key === 'content') setEditing(null);
            }}
            className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
          >
            {labelText}
          </button>
        ))}
        <span className="ms-auto hidden self-center text-xs text-muted sm:block">
          <span className="num">{countChapters(course)}</span> فصل ·{' '}
          <span className="num">{lessons}</span> درس ·{' '}
          <span className="num">{publishedLessons}</span> منشور
        </span>
      </div>

      {tab === 'info' ? (
        <InfoTab courseId={course.id} />
      ) : tab === 'preview' ? (
        <CoursePreview state={state} courseId={course.id} />
      ) : editing ? (
        <LessonStudio
          course={course}
          chapterId={editing.chapterId}
          lessonId={editing.lessonId}
          onBack={() => setEditing(null)}
          onOpenLesson={(chapterId, lessonId) => setEditing({ chapterId, lessonId })}
        />
      ) : (
        <Curriculum
          course={course}
          onAddChapter={(semesterId) => setChapterTarget({ mode: 'add', semesterId })}
          onRenameChapter={(chapterId, initial) =>
            setChapterTarget({ mode: 'rename', chapterId, initial })
          }
          onDeleteChapter={(chapter) =>
            setConfirm({
              title: 'حذف الفصل؟',
              message: `سيُحذف فصل «${chapter.title}» مع ${chapter.lessons.length} درس. لا يمكن التراجع.`,
              confirmLabel: 'حذف الفصل',
              onConfirm: () => {
                dispatch(
                  { type: 'chapter/delete', payload: { courseId: course.id, chapterId: chapter.id } },
                  'تم حذف الفصل',
                );
                setConfirm(null);
              },
            })
          }
          onOpenLesson={(chapterId, lessonId) => setEditing({ chapterId, lessonId })}
        />
      )}

      <ChapterDialog
        target={chapterTarget}
        onClose={() => setChapterTarget(null)}
        onSubmit={(title) => {
          if (!chapterTarget) return;
          if (chapterTarget.mode === 'add') {
            dispatch(
              {
                type: 'chapter/add',
                payload: {
                  courseId: course.id,
                  semesterId:
                    chapterTarget.semesterId ?? course.semesters[0]?.id ?? '',
                  title,
                },
              },
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
/* Curriculum — Teachable-style sections & lessons                      */
/* ------------------------------------------------------------------ */

function Curriculum({
  course,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
  onOpenLesson,
}: {
  course: Course;
  onAddChapter: (semesterId: string) => void;
  onRenameChapter: (chapterId: string, initial: string) => void;
  onDeleteChapter: (chapter: Chapter) => void;
  onOpenLesson: (chapterId: string, lessonId: string) => void;
}) {
  const { dispatch, notify } = useStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [inlineAdd, setInlineAdd] = useState<string | null>(null);
  const [mediaCreate, setMediaCreate] = useState<{
    chapterId: string;
    kind: 'video' | 'pdf';
  } | null>(null);
  const [quizCreate, setQuizCreate] = useState<string | null>(null);

  function toggleCollapse(chapterId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }

  function quickQuiz(chapterId: string) {
    const lesson: NewLesson = {
      title: 'اختبار جديد',
      kind: 'quiz',
      file: '',
      durationSec: 0,
      pages: 0,
      sizeMb: 0,
      published: false,
      questions: [],
    };
    dispatch({ type: 'lesson/add', payload: { courseId: course.id, chapterId, lesson } });
    notify('أُضيف اختبار جديد — افتحه لكتابة الأسئلة');
    setQuizCreate(null);
  }

  return (
    <div className="space-y-6">
      {course.semesters.map((semester) => (
        <section key={semester.id} className="space-y-4">
          <header className="flex items-center justify-between gap-3 border-b-2 border-brand-soft pb-2">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink">{semester.title}</h2>
              <p className="text-xs text-muted">
                <span className="num">{semester.chapters.length}</span> فصل ·{' '}
                <span className="num">
                  {semester.chapters.reduce((n, c) => n + c.lessons.length, 0)}
                </span>{' '}
                درس
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm shrink-0"
              onClick={() => onAddChapter(semester.id)}
            >
              <Plus size={15} />
              إضافة فصل
            </button>
          </header>

          {semester.chapters.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-muted">
              لا فصول في هذه الدورة بعد — أضف أول فصل.
            </p>
          ) : (
            semester.chapters.map((chapter, ci) => {
              const isCollapsed = collapsed.has(chapter.id);
              return (
                <section key={chapter.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0px_2px_8px_rgba(41,30,43,0.05)]">
                  {/* Section header */}
                  <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                    <GripVertical size={16} className="shrink-0 text-faint/70" />
                    <button
                      type="button"
                      onClick={() => toggleCollapse(chapter.id)}
                      aria-expanded={!isCollapsed}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand-dark">
                        <span className="num">{ci + 1}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold text-ink">
                          {chapter.title}
                        </span>
                        <span className="block text-xs text-muted">
                          <span className="num">{chapter.lessons.length}</span> دروس
                        </span>
                      </span>
                      {isCollapsed ? (
                        <ChevronDown size={16} className="shrink-0 text-muted" />
                      ) : (
                        <ChevronUp size={16} className="shrink-0 text-muted" />
                      )}
                    </button>

                    <Menu
                      label={`إجراءات الفصل ${chapter.title}`}
                      items={[
                        {
                          icon: PenLine,
                          text: 'إعادة تسمية',
                          onClick: () => onRenameChapter(chapter.id, chapter.title),
                        },
                        {
                          icon: ChevronUp,
                          text: 'نقل لأعلى',
                          disabled: ci === 0,
                          onClick: () =>
                            dispatch({
                              type: 'chapter/move',
                              payload: { courseId: course.id, chapterId: chapter.id, dir: -1 },
                            }),
                        },
                        {
                          icon: ChevronDown,
                          text: 'نقل لأسفل',
                          disabled: ci === semester.chapters.length - 1,
                          onClick: () =>
                            dispatch({
                              type: 'chapter/move',
                              payload: { courseId: course.id, chapterId: chapter.id, dir: 1 },
                            }),
                        },
                        { divider: true },
                        {
                          icon: Trash2,
                          text: 'حذف الفصل',
                          danger: true,
                          onClick: () => onDeleteChapter(chapter),
                        },
                      ]}
                    />
                  </header>

                  {/* Lessons */}
                  {!isCollapsed ? (
                    <>
                      {chapter.lessons.length === 0 && inlineAdd !== chapter.id ? (
                        <p className="px-4 py-4 text-sm text-muted">لا دروس بعد — أضف أول درس.</p>
                      ) : (
                        <ul>
                          {chapter.lessons.map((lesson, li) => (
                            <LessonRow
                              key={lesson.id}
                              course={course}
                              chapter={chapter}
                              lesson={lesson}
                              index={li}
                              total={chapter.lessons.length}
                              onOpen={() => onOpenLesson(chapter.id, lesson.id)}
                            />
                          ))}
                        </ul>
                      )}

                      {/* Inline new-lesson input (Teachable style) */}
                      {inlineAdd === chapter.id ? (
                        <InlineLessonInput
                          onCancel={() => setInlineAdd(null)}
                          onSave={(title) => {
                            const lesson: NewLesson = {
                              title,
                              kind: 'text',
                              file: '',
                              durationSec: 0,
                              pages: 0,
                              sizeMb: 0,
                              published: false,
                            };
                            dispatch({
                              type: 'lesson/add',
                              payload: { courseId: course.id, chapterId: chapter.id, lesson },
                            });
                            setInlineAdd(null);
                            notify('تمت إضافة الدرس — افتحه لإضافة المحتوى');
                          }}
                        />
                      ) : null}

                      {/* Section quick actions */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
                        <QuickAction
                          icon={Plus}
                          text="درس جديد"
                          onClick={() => setInlineAdd(chapter.id)}
                        />
                        <QuickAction
                          icon={Film}
                          text="رفع فيديو"
                          onClick={() => setMediaCreate({ chapterId: chapter.id, kind: 'video' })}
                        />
                        <QuickAction
                          icon={ListChecks}
                          text="اختبار"
                          onClick={() => setQuizCreate(chapter.id)}
                        />
                      </div>
                    </>
                  ) : null}
                </section>
              );
            })
          )}
        </section>
      ))}

      {mediaCreate ? (
        <MediaDialog
          open
          mode="create"
          mediaKind={mediaCreate.kind}
          courseId={course.id}
          chapterId={mediaCreate.chapterId}
          onClose={() => setMediaCreate(null)}
        />
      ) : null}

      {quizCreate ? (
        <QuickQuizConfirm
          onCancel={() => setQuizCreate(null)}
          onConfirm={() => quickQuiz(quizCreate)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lesson row                                                          */
/* ------------------------------------------------------------------ */

function LessonRow({
  course,
  chapter,
  lesson,
  index,
  total,
  onOpen,
}: {
  course: Course;
  chapter: Chapter;
  lesson: Lesson;
  index: number;
  total: number;
  onOpen: () => void;
}) {
  const { dispatch } = useStore();
  const meta = KIND_META[lesson.kind];
  const Icon = meta.icon;
  const empty = !hasContent(lesson);

  return (
    <li className="flex items-center gap-2.5 border-b border-line/60 px-4 py-2.5 transition-colors hover:bg-surface-alt/60">
      <GripVertical size={15} className="shrink-0 text-faint/70" />
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: meta.soft, color: meta.dark }}
      >
        <Icon size={15} />
      </span>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <span className="block truncate text-[14px] font-semibold text-ink">
          {lesson.title}
        </span>
        <span className="block truncate text-xs text-muted">
          {[meta.label, lessonMeta(lesson)].filter(Boolean).join(' · ')}
        </span>
      </button>

      {empty ? (
        <button
          type="button"
          onClick={onOpen}
          className="hidden shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-brand sm:block"
        >
          بلا محتوى
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'lesson/setPublished',
              payload: {
                courseId: course.id,
                chapterId: chapter.id,
                lessonId: lesson.id,
                published: !lesson.published,
              },
            })
          }
          className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors sm:inline-flex ${
            lesson.published
              ? 'bg-success-soft text-success'
              : 'bg-surface-alt text-muted hover:text-ink'
          }`}
          title={lesson.published ? 'إخفاء الدرس عن التلاميذ' : 'نشر الدرس'}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'currentColor' }}
          />
          {lesson.published ? 'منشور' : 'مسودة'}
        </button>
      )}

      <Menu
        label={`إجراءات درس ${lesson.title}`}
        items={[
          { icon: PenLine, text: 'تعديل الدرس', onClick: onOpen },
          {
            icon: lesson.published ? X : Check,
            text: lesson.published ? 'إخفاء عن التلاميذ' : 'نشر الدرس',
            onClick: () =>
              dispatch({
                type: 'lesson/setPublished',
                payload: {
                  courseId: course.id,
                  chapterId: chapter.id,
                  lessonId: lesson.id,
                  published: !lesson.published,
                },
              }),
          },
          {
            icon: ChevronUp,
            text: 'نقل لأعلى',
            disabled: index === 0,
            onClick: () =>
              dispatch({
                type: 'lesson/move',
                payload: {
                  courseId: course.id,
                  chapterId: chapter.id,
                  lessonId: lesson.id,
                  dir: -1,
                },
              }),
          },
          {
            icon: ChevronDown,
            text: 'نقل لأسفل',
            disabled: index === total - 1,
            onClick: () =>
              dispatch({
                type: 'lesson/move',
                payload: {
                  courseId: course.id,
                  chapterId: chapter.id,
                  lessonId: lesson.id,
                  dir: 1,
                },
              }),
          },
          { divider: true },
          {
            icon: Trash2,
            text: 'حذف الدرس',
            danger: true,
            onClick: () =>
              dispatch({
                type: 'lesson/delete',
                payload: {
                  courseId: course.id,
                  chapterId: chapter.id,
                  lessonId: lesson.id,
                },
              }),
          },
        ]}
      />
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Lesson studio — Teachable-style lesson page                         */
/* ------------------------------------------------------------------ */

function LessonStudio({
  course,
  chapterId,
  lessonId,
  onBack,
  onOpenLesson,
}: {
  course: Course;
  chapterId: string;
  lessonId: string;
  onBack: () => void;
  onOpenLesson: (chapterId: string, lessonId: string) => void;
}) {
  const { dispatch, notify } = useStore();
  const chapter = findChapter(course, chapterId)?.chapter;
  const lesson = chapter?.lessons.find((l) => l.id === lessonId);

  const [drawer, setDrawer] = useState(false);
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [mediaTarget, setMediaTarget] = useState<'video' | 'pdf' | null>(null);
  const [textOpen, setTextOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    setTitle(lesson?.title ?? '');
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!chapter || !lesson) {
    return (
      <EmptyState
        icon={<Layers size={24} />}
        title="الدرس غير موجود"
        description="ربما حُذف هذا الدرس — عد إلى المنهج."
        action={
          <button type="button" className="btn btn-primary" onClick={onBack}>
            العودة إلى المنهج
          </button>
        }
      />
    );
  }

  const meta = KIND_META[lesson.kind];
  const empty = !hasContent(lesson);

  function saveTitle() {
    const value = title.trim();
    if (!chapter || !lesson || value.length < 2 || value === lesson.title) return;
    dispatch({
      type: 'lesson/update',
      payload: {
        courseId: course.id,
        chapterId: chapter.id,
        lessonId: lesson.id,
        patch: { title: value },
      },
    });
  }

  function clearContent() {
    if (!chapter || !lesson) return;
    dispatch({
      type: 'lesson/update',
      payload: {
        courseId: course.id,
        chapterId: chapter.id,
        lessonId: lesson.id,
        patch: {
          kind: 'text',
          file: '',
          durationSec: 0,
          pages: 0,
          sizeMb: 0,
          body: undefined,
          questions: undefined,
        },
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowRight size={16} />
        المنهج
      </button>

      {/* Lesson title bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-2xl font-bold text-ink outline-none"
          value={title}
          maxLength={90}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          aria-label="عنوان الدرس"
        />
        {empty ? (
          <Pill tone="warning" dot>
            بلا محتوى
          </Pill>
        ) : (
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'lesson/setPublished',
                payload: {
                  courseId: course.id,
                  chapterId: chapter.id,
                  lessonId: lesson.id,
                  published: !lesson.published,
                },
              })
            }
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              lesson.published
                ? 'bg-success-soft text-success'
                : 'bg-surface-alt text-muted'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
            {lesson.published ? 'منشور' : 'مسودة'}
          </button>
        )}
        <Menu
          label="إجراءات الدرس"
          items={[
            {
              icon: Trash2,
              text: 'حذف الدرس',
              danger: true,
              onClick: () => {
                dispatch({
                  type: 'lesson/delete',
                  payload: {
                    courseId: course.id,
                    chapterId: chapter.id,
                    lessonId: lesson.id,
                  },
                });
                onBack();
              },
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* ---- Main column ---- */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Content block */}
          {empty ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
              <p className="text-sm font-semibold text-muted">
                لا محتوى في هذا الدرس بعد
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDrawer(true)}
              >
                <Plus size={17} />
                إضافة محتوى
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: meta.soft, color: meta.dark }}
                >
                  <meta.icon size={14} />
                </span>
                <span className="text-[13px] font-bold text-ink">{meta.label}</span>
                <span className="ms-auto flex items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (lesson.kind === 'video' || lesson.kind === 'pdf') {
                        setMediaTarget(lesson.kind);
                      } else if (lesson.kind === 'text') setTextOpen(true);
                      else if (lesson.kind === 'quiz') setQuizOpen(true);
                    }}
                  >
                    تعديل
                  </button>
                  <Menu
                    label="إجراءات المحتوى"
                    items={[
                      {
                        icon: Trash2,
                        text: 'إزالة المحتوى',
                        danger: true,
                        onClick: clearContent,
                      },
                    ]}
                  />
                </span>
              </header>
              <div className="px-4 py-4">
                {lesson.kind === 'video' ? (
                  <VideoBlockPreview lesson={lesson} />
                ) : lesson.kind === 'pdf' ? (
                  <PdfBlockPreview lesson={lesson} />
                ) : lesson.kind === 'text' ? (
                  <RichText text={lesson.body ?? ''} />
                ) : (
                  <QuizBlockPreview lesson={lesson} />
                )}
              </div>
            </div>
          )}

          {/* Add content */}
          {!empty ? (
            <button
              type="button"
              className="btn btn-primary w-full py-3"
              onClick={() => setDrawer(true)}
            >
              <Plus size={17} />
              إضافة محتوى
            </button>
          ) : null}

          <LessonDetails key={lesson.id} lesson={lesson} onSave={patch => {dispatch({type:'lesson/update',payload:{courseId:course.id,chapterId:chapter.id,lessonId:lesson.id,patch}}); notify('تم حفظ تفاصيل الدرس');}} />
          {/* Lesson settings */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="text-sm font-bold text-ink">إعدادات الدرس</h3>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">نشر الدرس للتلاميذ</div>
                <div className="text-xs text-muted">
                  الدروس المخفية لا تظهر في تطبيق الطالب.
                </div>
              </div>
              <Toggle
                checked={lesson.published}
                label="نشر الدرس"
                onChange={(value) =>
                  dispatch({
                    type: 'lesson/setPublished',
                    payload: {
                      courseId: course.id,
                      chapterId: chapter.id,
                      lessonId: lesson.id,
                      published: value,
                    },
                  })
                }
              />
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:underline"
              onClick={() => {
                dispatch({
                  type: 'lesson/delete',
                  payload: {
                    courseId: course.id,
                    chapterId: chapter.id,
                    lessonId: lesson.id,
                  },
                });
                onBack();
              }}
            >
              <Trash2 size={15} />
              حذف الدرس
            </button>
          </div>
        </div>

        {/* ---- Outline sidebar ---- */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="text-sm font-bold text-ink">مخطط الدورة</h3>
            <div className="scrollbar-slim mt-3 max-h-[420px] space-y-4 overflow-y-auto">
              {course.semesters.map((semester) => (
                <div key={semester.id} className="space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-brand-dark">
                    <Layers size={12} />
                    {semester.title}
                  </p>
                  {semester.chapters.map((item, ci) => (
                    <div key={item.id}>
                      <p className="text-xs font-bold text-muted">
                        <span className="num">{ci + 1}</span>. {item.title}
                      </p>
                      <ul className="mt-1 space-y-0.5 border-s-2 border-line ps-2">
                        {item.lessons.map((entry) => {
                          const current = entry.id === lesson.id;
                          return (
                            <li key={entry.id}>
                              <button
                                type="button"
                                onClick={() => onOpenLesson(item.id, entry.id)}
                                className={`block w-full truncate rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors ${
                                  current
                                    ? 'bg-brand-softer font-bold text-brand-dark'
                                    : 'text-muted hover:bg-surface-alt hover:text-ink'
                                }`}
                              >
                                {entry.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ---- Add-content drawer (Teachable style) ---- */}
      {drawer ? (
        <AddContentDrawer
          lessonKind={lesson.kind}
          hasExisting={!empty}
          onClose={() => setDrawer(false)}
          onPick={(tile) => {
            setDrawer(false);
            if (tile === 'video' || tile === 'pdf') setMediaTarget(tile);
            else if (tile === 'text') setTextOpen(true);
            else if (tile === 'quiz') setQuizOpen(true);
          }}
        />
      ) : null}

      {mediaTarget ? (
        <MediaDialog
          open
          mode="replace"
          mediaKind={mediaTarget}
          courseId={course.id}
          chapterId={chapter.id}
          lesson={lesson}
          onClose={() => setMediaTarget(null)}
        />
      ) : null}

      {textOpen ? (
        <TextDialog
          courseId={course.id}
          chapterId={chapter.id}
          lesson={lesson}
          onClose={() => setTextOpen(false)}
        />
      ) : null}

      {quizOpen ? (
        <QuizDialog
          courseId={course.id}
          chapterId={chapter.id}
          lesson={lesson}
          onClose={() => setQuizOpen(false)}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Block previews                                                      */
/* ------------------------------------------------------------------ */

function VideoBlockPreview({ lesson }: { lesson: Lesson }) {
  const item = library.find(entry => entry.file === lesson.file);
  const poster = lesson.thumbnailUrl || (item?.poster ? bundledMediaUrl('poster',item.poster) : undefined);
  return <div><video controls playsInline preload="metadata" poster={poster} src={bundledMediaUrl('video',lesson.file)} className="aspect-video w-full rounded-xl bg-ink"/><div className="mt-3 flex gap-4 text-xs text-muted"><span>{formatDuration(lesson.durationSec)}</span><span>{formatSize(lesson.sizeMb)}</span></div></div>;
}

function PdfBlockPreview({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt/60 px-4 py-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <FileText size={19} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink" dir="ltr">
          {lesson.file || '—'}
        </div>
        <div className="text-xs text-muted">
          <span className="num">{lesson.pages}</span> صفحات ·{' '}
          <span className="num">{formatSize(lesson.sizeMb)}</span>
        </div>
        {lesson.file ? <a className="mt-2 inline-block text-sm font-bold text-brand underline" href={bundledMediaUrl('doc', lesson.file)} target="_blank" rel="noreferrer">فتح المستند ومعاينته</a> : null}
      </div>
    </div>
  );
}

function QuizBlockPreview({ lesson }: { lesson: Lesson }) {
  const questions = lesson.questions ?? [];
  if (questions.length === 0) {
    return <p className="text-sm text-muted">لا أسئلة بعد — اضغط «تعديل» لإضافة أسئلة.</p>;
  }
  return (
    <ol className="space-y-2">
      {questions.map((question, index) => (
        <li
          key={question.id}
          className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-alt/50 px-3.5 py-2.5"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[11px] font-bold text-brand">
            <span className="num">{index + 1}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{question.prompt}</span>
            <span className="block text-xs text-muted">
              <span className="num">{question.options.length}</span> خيارات ·{' '}
              <span className="num">{question.correctIds.length}</span> صحيحة
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Rich text (markdown-lite renderer)                                  */
/* ------------------------------------------------------------------ */

function RichText({ text }: { text: string }) {
  if (!text.trim()) return <p className="text-sm text-muted">لا نص بعد.</p>;
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm leading-7 text-body">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        if (trimmed.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{inlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <p
              key={index}
              className="border-s-3 border-brand bg-brand-softer/60 px-3 py-1.5 text-muted"
            >
              {inlineMarkdown(trimmed.slice(2))}
            </p>
          );
        }
        return <p key={index}>{inlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

/** Renders **bold** and *italic* spans. */
function inlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/* ------------------------------------------------------------------ */
/* Add-content drawer                                                  */
/* ------------------------------------------------------------------ */

type ContentTile = 'video' | 'text' | 'pdf' | 'quiz';

function AddContentDrawer({
  lessonKind,
  hasExisting,
  onPick,
  onClose,
}: {
  lessonKind: LessonKind;
  hasExisting: boolean;
  onPick: (tile: ContentTile) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-[rgba(41,30,43,0.4)]"
      />
      <div className="animate-rise absolute inset-y-0 end-0 flex w-[340px] max-w-full flex-col border-s border-line bg-surface shadow-raised">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-bold text-ink">إضافة محتوى</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="scrollbar-slim flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {hasExisting ? (
            <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-xs font-semibold text-brand">
              سيتم استبدال محتوى «{KIND_META[lessonKind].label}» الحالي بالجديد.
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">
              المحتوى
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <ContentTileButton
                icon={Film}
                label="فيديو"
                onClick={() => onPick('video')}
              />
              <ContentTileButton
                icon={TypeIcon}
                label="نص وصور"
                onClick={() => onPick('text')}
              />
              <ContentTileButton
                icon={FileText}
                label="ملف PDF"
                onClick={() => onPick('pdf')}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">
              أدوات تعليمية
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <ContentTileButton
                icon={ListChecks}
                label="اختبار"
                onClick={() => onPick('quiz')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentTileButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white px-2 py-4 transition-colors hover:border-brand/40 hover:bg-brand-softer"
    >
      <Icon size={21} className="text-ink" />
      <span className="text-xs font-bold text-ink">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Media dialog — upload or pick from library (video / pdf)            */
/* ------------------------------------------------------------------ */

interface MediaSelection {
  kind: 'video' | 'pdf';
  file: string;
  durationSec: number;
  pages: number;
  sizeMb: number;
  source: 'library' | 'upload';
}

function stripExtension(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function MediaDialog({
  open,
  mode,
  mediaKind,
  courseId,
  chapterId,
  lesson,
  onClose,
}: {
  open: boolean;
  mode: 'create' | 'replace';
  mediaKind: 'video' | 'pdf';
  courseId: string;
  chapterId: string;
  lesson?: Lesson;
  onClose: () => void;
}) {
  const { dispatch, notify } = useStore();
  const [tab, setTab] = useState<'upload' | 'library'>('upload');
  const [title, setTitle] = useState('');
  const [selection, setSelection] = useState<MediaSelection | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab('upload');
    setTouched(false);
    setUploading(false);
    setProgress(0);
    setDragging(false);
    if (mode === 'replace' && lesson) {
      setTitle(lesson.title);
      const item = library.find((entry) => entry.file === lesson.file);
      setSelection({
        kind: mediaKind,
        file: lesson.file,
        durationSec: lesson.durationSec,
        pages: lesson.pages,
        sizeMb: lesson.sizeMb,
        source: item ? 'library' : 'upload',
      });
      setTab(item ? 'library' : 'upload');
    } else {
      setTitle('');
      setSelection(null);
    }
  }, [open, mode, mediaKind]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = library.filter((item) => item.kind === mediaKind);
  const invalid = (mode === 'create' && title.trim().length < 2) || !selection;

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(8);
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(92, value + 6 + Math.random() * 12));
    }, 90);
    try {
      const prepared = await prepareUpload(file);
      if (prepared.kind !== mediaKind) {
        notify(
          mediaKind === 'video' ? 'الملف ليس فيديو' : 'الملف ليس مستنداً',
          'error',
        );
        return;
      }
      setProgress(100);
      setSelection({
        kind: mediaKind,
        file: prepared.name,
        durationSec: prepared.durationSec,
        pages: prepared.pages,
        sizeMb: prepared.sizeMb,
        source: 'upload',
      });
      if (mode === 'create' && !title.trim()) setTitle(stripExtension(file.name));
      notify('تم رفع الملف وقراءة بياناته');
    } catch {
      notify('تعذّر الرفع. شغّل خادم العرض وتحقق من رابطه وحجم الملف (100 MB).', 'error');
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 400);
    }
  }

  function save() {
    setTouched(true);
    if (uploading || invalid || !selection) return;
    const base = {
      kind: mediaKind,
      file: selection.file,
      durationSec: mediaKind === 'video' ? selection.durationSec : 0,
      pages: mediaKind === 'pdf' ? selection.pages : 0,
      sizeMb: selection.sizeMb,
      body: undefined,
      questions: undefined,
    };
    if (mode === 'create') {
      const lessonPayload: NewLesson = {
        title: title.trim(),
        published: false,
        ...base,
      };
      dispatch({
        type: 'lesson/add',
        payload: { courseId, chapterId, lesson: lessonPayload },
      });
      notify(mediaKind === 'video' ? 'تمت إضافة الدرس بالفيديو' : 'تمت إضافة الدرس بالمستند');
    } else if (lesson) {
      dispatch({
        type: 'lesson/update',
        payload: {
          courseId,
          chapterId,
          lessonId: lesson.id,
          patch: { ...base, title: title.trim() },
        },
      });
      notify('تم تحديث محتوى الدرس');
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mediaKind === 'video' ? 'إضافة فيديو' : 'إضافة ملف PDF'}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" disabled={uploading || invalid} onClick={save}>
            {mode === 'create' ? 'إضافة الدرس' : 'حفظ'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-line pb-3" role="tablist">
          {(
            [
              ['upload', 'رفع ملف'],
              ['library', 'مكتبة الوسائط'],
            ] as ['upload' | 'library', string][]
          ).map(([key, labelText]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`btn btn-sm ${tab === key ? 'btn-soft' : 'btn-ghost'}`}
            >
              {labelText}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? 'border-brand bg-brand-softer'
                : 'border-line bg-surface-alt/50 hover:border-brand/40'
            }`}
          >
            <UploadCloud size={30} className="text-brand" />
            <p className="text-sm font-bold text-ink">
              اسحب الملف وأفلته هنا أو انقر للاختيار
            </p>
            <p className="text-xs text-muted">
              {mediaKind === 'video'
                ? 'MP4، WebM، MOV · الحد الأقصى 100 MB'
                : 'الصيغ المدعومة: .pdf'}
            </p>
            {selection?.source === 'upload' ? (
              <p className="mt-1 max-w-full truncate rounded-lg bg-white px-3 py-1 text-xs font-semibold text-ink" dir="ltr">
                {selection.file}
              </p>
            ) : null}
            {uploading ? (
              <div className="mt-2 w-full max-w-xs">
                <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-brand transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  جاري الرفع… <span className="num">{Math.round(progress)}%</span>
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {items.map((item) => {
              const selected = selection?.file === item.file;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelection({
                      kind: mediaKind,
                      file: item.file,
                      durationSec: item.durationSec,
                      pages: item.pages,
                      sizeMb: item.sizeMb,
                      source: 'library',
                    });
                    if (mode === 'create' && !title.trim()) setTitle(item.title);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 text-start transition-colors ${
                    selected
                      ? 'border-brand bg-brand-softer'
                      : 'border-line bg-surface hover:bg-surface-alt'
                  }`}
                >
                  <LibraryThumb item={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {item.kind === 'video'
                        ? `${formatDuration(item.durationSec)} · ${formatSize(item.sizeMb)}`
                        : `${item.pages} صفحات · ${formatSize(item.sizeMb)}`}
                    </span>
                  </span>
                  {selected ? <Check size={16} className="shrink-0 text-brand" /> : null}
                </button>
              );
            })}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov' : 'application/pdf,.pdf'}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />

        {mode === 'create' ? (
          <Field
            label="عنوان الدرس"
            error={touched && title.trim().length < 2 ? 'اكتب عنواناً واضحاً.' : undefined}
          >
            <input
              className="input"
              value={title}
              maxLength={90}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: مقدمة عن النهايات"
            />
          </Field>
        ) : null}

        {touched && !selection ? (
          <p className="text-xs font-semibold text-danger">
            {mediaKind === 'video' ? 'اختر أو ارفع فيديو أولاً.' : 'اختر أو ارفع ملفاً أولاً.'}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function LibraryThumb({ item }: { item: LibraryItem }) {
  const [failed, setFailed] = useState(false);
  if (item.poster && !failed) {
    return (
      <img
        src={bundledMediaUrl('poster', item.poster)}
        alt=""
        className="h-11 w-20 shrink-0 rounded-lg object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
      style={{ background: meta.soft, color: meta.dark }}
    >
      <Icon size={18} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Text dialog — markdown-lite editor                                  */
/* ------------------------------------------------------------------ */

function TextDialog({
  courseId,
  chapterId,
  lesson,
  onClose,
}: {
  courseId: string;
  chapterId: string;
  lesson: Lesson;
  onClose: () => void;
}) {
  const { dispatch, notify } = useStore();
  const [body, setBody] = useState(lesson.body ?? '');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after: string) {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd) || 'نص';
    const next =
      value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
    setBody(next);
    window.requestAnimationFrame(() => {
      el.focus();
      const cursor = selectionStart + before.length + selected.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function save() {
    dispatch({
      type: 'lesson/update',
      payload: {
        courseId,
        chapterId,
        lessonId: lesson.id,
        patch: {
          kind: 'text',
          file: '',
          durationSec: 0,
          pages: 0,
          sizeMb: 0,
          body,
          questions: undefined,
        },
      },
    });
    notify('تم حفظ نص الدرس');
    onClose();
  }

  const tools: { icon: LucideIcon; label: string; run: () => void }[] = [
    { icon: PenLine, label: 'عريض', run: () => wrap('**', '**') },
    { icon: TypeIcon, label: 'مائل', run: () => wrap('*', '*') },
    { icon: ListOrdered, label: 'قائمة', run: () => wrap('\n- ', '') },
    { icon: Quote, label: 'اقتباس', run: () => wrap('\n> ', '') },
    { icon: Link2, label: 'رابط', run: () => wrap('[', '](https://)') },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="نص وصور"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            حفظ
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface-alt p-1.5">
          {tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              onClick={tool.run}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white hover:text-ink"
            >
              <tool.icon size={15} />
            </button>
          ))}
        </div>
        <textarea
          ref={areaRef}
          className="textarea"
          style={{ minHeight: 240 }}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="اكتب محتوى الدرس…&#10;&#10;دعم بسيط للتنسيق: **عريض** · *مائل* · ابدأ السطر بـ - لقائمة أو > لاقتباس."
        />
        <p className="text-xs text-faint">
          معاينة بسيطة: <strong className="text-ink">عريض</strong> ·{' '}
          <em>مائل</em> · قوائم برموز «-».
        </p>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Quiz dialog — question builder                                      */
/* ------------------------------------------------------------------ */

function newQuestion(): QuizQuestion {
  return {
    id: localUid(),
    prompt: '',
    options: [
      { id: localUid(), text: '' },
      { id: localUid(), text: '' },
    ],
    correctIds: [],
  };
}

function QuizDialog({
  courseId,
  chapterId,
  lesson,
  onClose,
}: {
  courseId: string;
  chapterId: string;
  lesson: Lesson;
  onClose: () => void;
}) {
  const { dispatch, notify } = useStore();
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    (lesson.questions ?? []).length > 0
      ? cloneQuestions(lesson.questions ?? [])
      : [newQuestion()],
  );
  const [touched, setTouched] = useState(false);
  const [timeLimit, setTimeLimit] = useState(lesson.timeLimitSec ?? 0);

  async function importQuiz(file: File) {
    try {
      if (file.size > 1024 * 1024) throw new Error('large');
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.questions) || !data.questions.length || data.questions.length > 100) throw new Error('questions');
      const imported: QuizQuestion[] = data.questions.map((q: QuizQuestion) => {
        if (typeof q.prompt !== 'string' || q.prompt.trim().length < 2 || !Array.isArray(q.options) || q.options.length < 2 || !Array.isArray(q.correctIds) || !q.correctIds.length) throw new Error('question');
        if (q.options.some(o => typeof o.id !== 'string' || typeof o.text !== 'string' || !o.text.trim()) || new Set(q.options.map(o => o.id)).size !== q.options.length || q.correctIds.some(id => !q.options.some(o => o.id === id))) throw new Error('answers');
        return {...q, id: crypto.randomUUID(), options: q.options.map(o => ({...o})), correctIds: [...q.correctIds]};
      });
      if (data.timeLimitSec !== undefined && (!Number.isInteger(data.timeLimitSec) || data.timeLimitSec < 0 || data.timeLimitSec > 86400)) throw new Error('time');
      setQuestions(imported);
      setTimeLimit(data.timeLimitSec ?? 0);
      setTouched(false);
      notify('تم استيراد الأسئلة — راجعها ثم احفظ الاختبار');
    } catch {
      notify('ملف غير صالح. استعمل نموذج JSON الموضّح في دليل الداشبورد (حتى 100 سؤال، 1 MB).', 'error');
    }
  }

  function cloneQuestions(source: QuizQuestion[]): QuizQuestion[] {
    return source.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
      correctIds: [...question.correctIds],
    }));
  }

  function patchQuestion(id: string, patch: Partial<QuizQuestion>) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  }

  function toggleCorrect(question: QuizQuestion, optionId: string) {
    const has = question.correctIds.includes(optionId);
    patchQuestion(question.id, {
      correctIds: has
        ? question.correctIds.filter((item) => item !== optionId)
        : [...question.correctIds, optionId],
    });
  }

  function questionErrors(question: QuizQuestion): {
    prompt: boolean;
    answers: boolean;
  } {
    const filled = question.options.filter((option) => option.text.trim());
    return {
      prompt: question.prompt.trim().length < 2,
      answers: filled.length < 2 || !question.correctIds.some(id => filled.some(option => option.id === id)),
    };
  }

  const invalid = questions.some((question) => {
    const errors = questionErrors(question);
    return errors.prompt || errors.answers;
  });

  function save() {
    setTouched(true);
    if (invalid) return;
    dispatch({
      type: 'lesson/update',
      payload: {
        courseId,
        chapterId,
        lessonId: lesson.id,
        patch: {
          kind: 'quiz',
          timeLimitSec: timeLimit,
          file: '',
          durationSec: 0,
          pages: 0,
          sizeMb: 0,
          body: undefined,
          questions: questions.map((question) => ({
            ...question,
            prompt: question.prompt.trim(),
            correctIds: question.correctIds.filter(id => question.options.some(option => option.id === id && option.text.trim())),
            options: question.options
              .filter((option) => option.text.trim())
              .map((option) => ({ ...option, text: option.text.trim() })),
          })),
        },
      },
    });
    notify('تم حفظ الاختبار');
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="أسئلة الاختبار"
      description="أسئلة اختيارات متعددة — صحّح الإجابة أو الإجابات الصحيحة لكل سؤال."
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            حفظ الاختبار
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="btn btn-outline cursor-pointer">استيراد أسئلة JSON<input aria-label="استيراد أسئلة JSON" type="file" accept=".json,application/json" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void importQuiz(file); e.target.value = ''; }}/></label>
        <label className="block rounded-xl bg-brand-softer p-4"><span className="mb-2 block text-sm font-bold">مدة الاختبار بالثواني (0 = دون توقيت)</span><input aria-label="مدة الاختبار بالثواني" type="number" min="0" max="86400" className="input" value={timeLimit} onChange={e=>setTimeLimit(Math.max(0,Math.min(86400,Number(e.target.value)||0)))}/></label>
        {questions.map((question, index) => {
          const errors = questionErrors(question);
          return (
            <div key={question.id} className="rounded-2xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-faint">
                  سؤال <span className="num">{index + 1}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon text-danger"
                  aria-label={`حذف السؤال ${index + 1}`}
                  onClick={() =>
                    setQuestions((prev) =>
                      prev.length > 1 ? prev.filter((item) => item.id !== question.id) : prev,
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <input
                className={`input ${touched && errors.prompt ? 'border-danger' : ''}`}
                value={question.prompt}
                maxLength={220}
                placeholder="اكتب السؤال هنا"
                onChange={(event) => patchQuestion(question.id, { prompt: event.target.value })}
              />
              {touched && errors.prompt ? (
                <p className="mt-1.5 text-xs font-semibold text-danger">السؤال مطلوب.</p>
              ) : null}

              <p className="mb-2 mt-4 text-xs font-bold text-muted">
                الاختيارات — علّم الإجابة أو الإجابات الصحيحة
              </p>
              <div className="space-y-2">
                {question.options.map((option, oi) => {
                  const correct = question.correctIds.includes(option.id);
                  return (
                    <div key={option.id} className="flex items-center gap-2">
                      <input
                        className="input"
                        value={option.text}
                        maxLength={160}
                        placeholder={`الإجابة ${oi + 1}`}
                        onChange={(event) =>
                          patchQuestion(question.id, {
                            options: question.options.map((item) =>
                              item.id === option.id
                                ? { ...item, text: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        title={correct ? 'إجابة صحيحة' : 'علّم كإجابة صحيحة'}
                        aria-pressed={correct}
                        onClick={() => toggleCorrect(question, option.id)}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                          correct
                            ? 'border-success bg-success-soft text-success'
                            : 'border-line text-faint hover:text-ink'
                        }`}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        title="حذف الاختيار"
                        aria-label={`حذف الإجابة ${oi + 1}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-danger"
                        onClick={() =>
                          patchQuestion(question.id, {
                            options: question.options.filter((item) => item.id !== option.id),
                            correctIds: question.correctIds.filter((id) => id !== option.id),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {touched && errors.answers ? (
                <p className="mt-1.5 text-xs font-semibold text-danger">
                  أضف اختيارين على الأقل وعلّم إجابة صحيحة واحدة.
                </p>
              ) : null}

              <button
                type="button"
                className="btn btn-ghost btn-sm mt-3"
                onClick={() =>
                  patchQuestion(question.id, {
                    options: [
                      ...question.options,
                      { id: localUid(), text: '' },
                    ],
                  })
                }
              >
                <Plus size={14} />
                إضافة اختيار
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className="btn btn-outline w-full border-dashed py-3"
          onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
        >
          <Plus size={16} />
          إضافة سؤال
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Shared small pieces                                                 */
/* ------------------------------------------------------------------ */

type MenuItem =
  | { divider: true }
  | {
      icon: LucideIcon;
      text: string;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
    };

function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <MoreVertical size={16} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-1 w-48 rounded-xl border border-line bg-white py-1 shadow-raised"
        >
          {items.map((item, index) =>
            'divider' in item ? (
              <div key={index} className="my-1 border-t border-line" />
            ) : (
              <button
                key={index}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-start text-[13px] font-semibold transition-colors disabled:opacity-30 ${
                  item.danger
                    ? 'text-danger hover:bg-danger-soft'
                    : 'text-body hover:bg-surface-alt'
                }`}
              >
                <item.icon size={14} />
                {item.text}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  text,
  onClick,
}: {
  icon: LucideIcon;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted transition-colors hover:text-brand-dark"
    >
      <Icon size={15} />
      {text}
    </button>
  );
}

function InlineLessonInput({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (title: string) => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const invalid = value.trim().length < 2;

  return (
    <div className="flex items-center gap-2 border-b border-line/60 bg-brand-softer/40 px-4 py-3">
      <GripVertical size={15} className="shrink-0 text-faint/70" />
      <input
        ref={inputRef}
        className="input h-9 flex-1"
        value={value}
        maxLength={90}
        placeholder="عنوان الدرس الجديد…"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !invalid) onSave(value.trim());
          if (event.key === 'Escape') onCancel();
        }}
      />
      <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
        إلغاء
      </button>
      <button
        type="button"
        className="btn btn-dark btn-sm"
        disabled={invalid}
        onClick={() => onSave(value.trim())}
      >
        حفظ
      </button>
    </div>
  );
}

function QuickQuizConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      title="إضافة اختبار"
      description="سيُضاف اختبار جديد كدرس — افتحه لكتابة الأسئلة والخيارات."
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            إضافة الاختبار
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">
        يمكنك نشره للتلاميذ بعد إضافة الأسئلة من صفحة الدرس.
      </p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Chapter dialog                                                      */
/* ------------------------------------------------------------------ */

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
    <Modal
      open={open}
      onClose={onClose}
      title={target?.mode === 'rename' ? 'إعادة تسمية الفصل' : 'إضافة فصل'}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={invalid}
            onClick={() => onSubmit(value.trim())}
          >
            حفظ
          </button>
        </>
      }
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
