import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Eye,
  FileText,
  Film,
  ListChecks,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';
import {
  allLessons,
  type Chapter,
  type Lesson,
  type LessonKind,
} from '@ostadiplus/shared';
import { Confirm, Modal } from '@/components/ui';
import { CoursePreview } from '@/components/CoursePreview';
import { CourseInfo } from '@/components/authoring/CourseInfo';
import { LessonEditor } from '@/components/authoring/LessonEditor';
import { NewLessonDialog } from '@/components/authoring/NewLessonDialog';
import { lessonPublishError } from '@/lib/authoring';
import { KIND_META, hasContent } from '@/lib/lessonKind';
import { useStore } from '@/store/DemoStore';

type Confirmation = { title: string; message: string; action: () => void };
export default function CourseEditor() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const { state, dispatch, notify } = useStore();
  const course = state.courses.find((c) => c.id === courseId);
  const [tab, setTab] = useState<'content' | 'info' | 'preview'>('content');
  const [semesterId, setSemester] = useState('');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const onDirty = useCallback((value: boolean) => setDirty(value), []);
  const [adding, setAdding] = useState<{
    chapterId?: string;
    kind: LessonKind;
  } | null>(null);
  const [chapterForm, setChapterForm] = useState<{
    id?: string;
    title: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [publishReview, setPublishReview] = useState(false);
  const selectedId = params.get('lesson');
  useEffect(() => {
    const selectedSemester = course?.semesters.find((s) =>
      s.chapters.some((c) => c.lessons.some((l) => l.id === selectedId)),
    );
    if (selectedSemester) {
      setSemester(selectedSemester.id);
      setTab('content');
      setQuery('');
      setCollapsed(new Set());
    }
  }, [course?.id, selectedId]);
  if (!course) return <Navigate to="/courses" replace />;
  const semester =
    course.semesters.find((s) => s.id === semesterId) ?? course.semesters[0];
  const selection = course.semesters
    .flatMap((s) => s.chapters)
    .flatMap((chapter) =>
      chapter.lessons.map((lesson) => ({ lesson, chapter })),
    )
    .find((v) => v.lesson.id === selectedId);
  const published = allLessons(course).filter(
    (l) => l.published && !lessonPublishError(l),
  );
  const lessons = allLessons(course);
  const canLeave = () =>
    !dirty ||
    window.confirm('عندك تغييرات غير محفوظة. واش بغيتي تواصل بلا حفظ؟');
  function selectLesson(lessonId: string) {
    if (!canLeave()) return;
    setParams({ lesson: lessonId });
    setDirty(false);
  }
  function newLesson(chapterId?: string, kind: LessonKind = 'video') {
    if (!canLeave()) return;
    setAdding({ chapterId, kind });
  }
  function removeLesson(lesson: Lesson, chapter: Chapter) {
    setConfirmation({
      title: 'حذف الدرس؟',
      message: `غادي يتحيد «${lesson.title}» من المنهج. تأكد قبل المتابعة.`,
      action: () => {
        dispatch({
          type: 'lesson/delete',
          payload: {
            courseId: course!.id,
            chapterId: chapter.id,
            lessonId: lesson.id,
          },
        });
        setParams({});
        setDirty(false);
        notify('تم حذف الدرس');
      },
    });
  }
  function changeTab(next: typeof tab) {
    if (next !== tab && !canLeave()) return;
    setTab(next);
    setDirty(false);
  }
  function publish() {
    if (course!.status === 'published') {
      setConfirmation({
        title: 'إيقاف نشر الدورة؟',
        message:
          'الدورة ما غاتبقاش متاحة للتلاميذ بعد نشر التحديثات. المحتوى والاشتراكات كيبقاو محفوظين.',
        action: () => {
          dispatch({
            type: 'course/setStatus',
            payload: { id: course!.id, status: 'draft' },
          });
          notify('تم إيقاف نشر الدورة');
        },
      });
    } else setPublishReview(true);
  }
  return (
    <>
      <div className="mb-6">
        <Link
          to="/courses"
          className="mb-5 inline-flex items-center gap-2 text-[10px] text-muted hover:text-brand"
        >
          <ArrowRight size={13} />
          الدورات التعليمية
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-muted">
                {course.subject}{' '}
                <span className="mx-1 text-line-strong">/</span> {course.level}
              </span>
              <span
                className={`status-label ${course.status === 'draft' ? 'is-draft' : ''}`}
              >
                {course.status === 'published' ? 'منشورة' : 'مسودة'}
              </span>
            </div>
            <h1 className="workspace-title">{course.title}</h1>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => changeTab('preview')}
            >
              <Eye size={14} />
              معاينة التلميذ
            </button>
            <button className="btn btn-primary btn-sm" onClick={publish}>
              {course.status === 'published' ? 'إيقاف النشر' : 'نشر الدورة'}
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <div
          className="workspace-tabs border-0"
          role="tablist"
          aria-label="إدارة الدورة"
        >
          {(
            [
              { key: 'content', label: 'محتوى الدورة', icon: BookOpen },
              { key: 'info', label: 'معلومات الدورة', icon: Settings2 },
              { key: 'preview', label: 'معاينة', icon: Eye },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className="workspace-tab flex items-center gap-2"
              onClick={() => changeTab(t.key)}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
        <p className="pb-3 text-[10px] text-muted sm:pb-0">
          <span className="num">{lessons.length}</span> درس{' '}
          <span className="mx-2">·</span>{' '}
          <span className="num">{published.length}</span> منشور
        </p>
      </div>
      {tab === 'info' ? (
        <CourseInfo courseId={course.id} onDirty={onDirty} />
      ) : tab === 'preview' ? (
        <CoursePreview state={state} courseId={course.id} />
      ) : (
        <div className="authoring-layout">
          <aside className="course-outline">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <div>
                <h2 className="text-xs font-bold">مخطط الدورة</h2>
                <p className="mt-1 text-[9px] text-muted">
                  الفصول والدروس، في مكان واحد
                </p>
              </div>
              <button
                className="btn btn-icon btn-outline"
                aria-label="إضافة محتوى للدورة"
                onClick={() => newLesson()}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="border-b border-line p-3">
              <div
                className="mb-3 flex gap-1 rounded-lg bg-surface-alt/60 p-1"
                aria-label="الدورات الدراسية"
              >
                {course.semesters.map((s) => (
                  <button
                    key={s.id}
                    className={`flex-1 rounded-md px-2 py-2 text-[10px] ${semester?.id === s.id ? 'bg-white font-bold text-brand shadow-card' : 'text-muted'}`}
                    aria-pressed={semester?.id === s.id}
                    onClick={() => setSemester(s.id)}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute start-3 top-3 text-muted"
                />
                <input
                  aria-label="بحث في مخطط الدورة"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن درس…"
                  className="workspace-search h-9"
                />
              </div>
            </div>
            <div className="outline-scroll">
              {semester?.chapters.map((chapter, ci) => {
                const rows = chapter.lessons.filter((l) =>
                  l.title.includes(query),
                );
                if (query && !rows.length && !chapter.title.includes(query))
                  return null;
                return (
                  <section
                    key={chapter.id}
                    className="border-b border-line last:border-0"
                  >
                    <div className="flex items-center gap-2 bg-surface-alt/25 px-3 py-3">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-2 text-start"
                        aria-expanded={!collapsed.has(chapter.id)}
                        onClick={() =>
                          setCollapsed((set) => {
                            const next = new Set(set);
                            if (next.has(chapter.id)) next.delete(chapter.id);
                            else next.add(chapter.id);
                            return next;
                          })
                        }
                      >
                        <ChevronDown
                          size={13}
                          className={`shrink-0 text-muted ${collapsed.has(chapter.id) ? '-rotate-90' : ''}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-bold">
                            {ci + 1}. {chapter.title}
                          </span>
                          <span className="mt-1 block text-[9px] text-muted">
                            {chapter.lessons.length} دروس
                          </span>
                        </span>
                      </button>
                      <details className="outline-menu">
                        <summary aria-label={`إجراءات الفصل ${chapter.title}`}>
                          <MoreHorizontal size={16} />
                        </summary>
                        <div>
                          {[
                            {
                              label: 'إعادة تسمية الفصل',
                              icon: PenLine,
                              action: () =>
                                setChapterForm({
                                  id: chapter.id,
                                  title: chapter.title,
                                }),
                            },
                            {
                              label: 'نقل الفصل لأعلى',
                              icon: ArrowUp,
                              disabled: ci === 0,
                              action: () =>
                                dispatch({
                                  type: 'chapter/move',
                                  payload: {
                                    courseId: course.id,
                                    chapterId: chapter.id,
                                    dir: -1,
                                  },
                                }),
                            },
                            {
                              label: 'نقل الفصل لأسفل',
                              icon: ArrowDown,
                              disabled:
                                ci === (semester?.chapters.length ?? 0) - 1,
                              action: () =>
                                dispatch({
                                  type: 'chapter/move',
                                  payload: {
                                    courseId: course.id,
                                    chapterId: chapter.id,
                                    dir: 1,
                                  },
                                }),
                            },
                            {
                              label: 'حذف الفصل',
                              icon: Trash2,
                              action: () =>
                                setConfirmation({
                                  title: 'حذف الفصل؟',
                                  message: `الفصل «${chapter.title}» فيه ${chapter.lessons.length} دروس. الحذف غادي يشمل جميع دروسه.`,
                                  action: () => {
                                    dispatch({
                                      type: 'chapter/delete',
                                      payload: {
                                        courseId: course.id,
                                        chapterId: chapter.id,
                                      },
                                    });
                                    if (selection?.chapter.id === chapter.id)
                                      setParams({});
                                    notify('تم حذف الفصل');
                                  },
                                }),
                            },
                          ].map((a) => (
                            <button
                              key={a.label}
                              disabled={a.disabled}
                              onClick={(e) => {
                                if (!canLeave()) return;
                                e.currentTarget
                                  .closest('details')
                                  ?.removeAttribute('open');
                                a.action();
                              }}
                            >
                              <a.icon size={13} />
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                    {!collapsed.has(chapter.id) || query ? (
                      <div className="py-1">
                        {rows.map((lesson, li) => {
                          const Icon = KIND_META[lesson.kind].icon;
                          return (
                            <div
                              key={lesson.id}
                              className={`outline-lesson ${selectedId === lesson.id ? 'is-selected' : ''}`}
                            >
                              <button
                                className="flex min-w-0 flex-1 items-start gap-2.5 py-3 ps-3 text-start"
                                onClick={() => selectLesson(lesson.id)}
                                aria-current={
                                  selectedId === lesson.id ? 'page' : undefined
                                }
                              >
                                <Icon
                                  size={15}
                                  className="mt-0.5 shrink-0 text-brand"
                                  strokeWidth={1.5}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="line-clamp-2 text-[10px] leading-5">
                                    {lesson.title}
                                  </span>
                                  <span className="mt-1 flex items-center gap-1.5 text-[8px] text-muted">
                                    <span
                                      className={`size-1.5 rounded-full ${lesson.published ? 'bg-brand' : 'border border-line-strong'}`}
                                    />
                                    {KIND_META[lesson.kind].label} ·{' '}
                                    {lesson.published ? 'منشور' : 'مسودة'}
                                  </span>
                                </span>
                              </button>
                              <details className="outline-menu me-2">
                                <summary
                                  aria-label={`إجراءات درس ${lesson.title}`}
                                >
                                  <MoreHorizontal size={13} />
                                </summary>
                                <div>
                                  {[
                                    {
                                      label: 'نقل الدرس لأعلى',
                                      icon: ArrowUp,
                                      disabled: li === 0 || !!query,
                                      action: () =>
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
                                      label: 'نقل الدرس لأسفل',
                                      icon: ArrowDown,
                                      disabled:
                                        li === rows.length - 1 || !!query,
                                      action: () =>
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
                                    {
                                      label: 'حذف الدرس',
                                      icon: Trash2,
                                      action: () =>
                                        removeLesson(lesson, chapter),
                                    },
                                  ].map((a) => (
                                    <button
                                      key={a.label}
                                      disabled={a.disabled}
                                      onClick={(e) => {
                                        if (!canLeave()) return;
                                        e.currentTarget
                                          .closest('details')
                                          ?.removeAttribute('open');
                                        a.action();
                                      }}
                                    >
                                      <a.icon size={13} />
                                      {a.label}
                                    </button>
                                  ))}
                                </div>
                              </details>
                            </div>
                          );
                        })}
                        {!rows.length ? (
                          <p className="px-5 py-4 text-[10px] text-muted">
                            لا دروس بعد. أضف أول درس.
                          </p>
                        ) : null}
                        <button
                          className="mx-3 my-2 flex items-center gap-2 px-1 py-2 text-[10px] font-bold text-brand"
                          onClick={() => newLesson(chapter.id)}
                        >
                          <Plus size={13} />
                          إضافة درس
                        </button>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
            <button
              className="m-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-3 text-[11px] font-bold text-brand hover:bg-surface-alt"
              disabled={!semester}
              onClick={() => {
                if (canLeave()) setChapterForm({ title: '' });
              }}
            >
              <Plus size={14} />
              إضافة فصل
            </button>
          </aside>
          <div className="min-w-0">
            {selection ? (
              <LessonEditor
                key={selection.lesson.id}
                lesson={selection.lesson}
                courseId={course.id}
                chapterId={selection.chapter.id}
                chapterTitle={selection.chapter.title}
                onDirty={onDirty}
                onDelete={() =>
                  removeLesson(selection.lesson, selection.chapter)
                }
              />
            ) : (
              <div className="workspace-panel">
                <div className="course-start">
                  <span className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <BookOpen size={26} strokeWidth={1.3} />
                  </span>
                  <p className="mb-3 text-[10px] font-bold text-brand">
                    مساحة صناعة التعلّم
                  </p>
                  <h2 className="text-2xl font-bold leading-relaxed">
                    منهج واضح.
                    <br />
                    تجربة تعلّم أفضل.
                  </h2>
                  <p className="mt-4 max-w-md text-xs leading-7 text-muted">
                    اختَر درساً من مخطط الدورة لتحريره، أو أضف محتوى جديداً.
                    جميع الفصول والدروس كيبقاو قريبين منك وأنت كتخدم.
                  </p>
                  <button
                    className="btn btn-primary mt-6"
                    onClick={() => newLesson()}
                    disabled={!course.semesters.some((s) => s.chapters.length)}
                  >
                    <Plus size={16} />
                    إضافة محتوى
                  </button>
                </div>
                <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line border-y border-line">
                  {[
                    {
                      label: 'فيديوهات',
                      icon: Film,
                      value: lessons.filter((l) => l.kind === 'video').length,
                    },
                    {
                      label: 'مستندات PDF',
                      icon: FileText,
                      value: lessons.filter((l) => l.kind === 'pdf').length,
                    },
                    {
                      label: 'اختبارات',
                      icon: ListChecks,
                      value: lessons.filter((l) => l.kind === 'quiz').length,
                    },
                  ].map((k) => (
                    <div key={k.label} className="p-5 text-center">
                      <k.icon
                        className="mx-auto mb-3 text-brand"
                        size={20}
                        strokeWidth={1.4}
                      />
                      <span className="num text-xl">{k.value}</span>
                      <p className="mt-2 text-[9px] text-muted">{k.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 p-6">
                  <h3 className="text-xs font-bold">قبل نشر دورتك</h3>
                  {[
                    {
                      done: course.title.trim().length >= 4,
                      label: 'عنوان الدورة ومعلوماتها',
                    },
                    {
                      done: lessons.some(hasContent),
                      label: 'إضافة محتوى تعليمي',
                    },
                    {
                      done: published.length > 0,
                      label: 'نشر درس واحد على الأقل',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-3 text-[11px]"
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded-full border ${s.done ? 'border-brand bg-brand text-white' : 'border-line-strong text-muted'}`}
                      >
                        {s.done ? (
                          <Check size={11} />
                        ) : (
                          <span className="size-1 rounded-full bg-line-strong" />
                        )}
                      </span>
                      <span className={s.done ? 'text-ink' : 'text-muted'}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                  <Link
                    to="/sync"
                    className="mt-2 flex items-center gap-2 border-t border-line pt-4 text-[10px] font-bold text-brand"
                  >
                    نشر التحديثات لتطبيق التلميذ
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {adding ? (
        <NewLessonDialog
          courseId={course.id}
          chapterId={adding.chapterId ?? semester?.chapters[0]?.id}
          kind={adding.kind}
          close={() => setAdding(null)}
        />
      ) : null}
      {chapterForm ? (
        <Modal
          open
          onClose={() => setChapterForm(null)}
          title={chapterForm.id ? 'تعديل اسم الفصل' : 'فصل جديد'}
          footer={
            <>
              <button
                className="btn btn-outline"
                onClick={() => setChapterForm(null)}
              >
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                disabled={chapterForm.title.trim().length < 2}
                onClick={() => {
                  if (chapterForm.id)
                    dispatch({
                      type: 'chapter/update',
                      payload: {
                        courseId: course.id,
                        chapterId: chapterForm.id,
                        title: chapterForm.title.trim(),
                      },
                    });
                  else if (semester)
                    dispatch({
                      type: 'chapter/add',
                      payload: {
                        courseId: course.id,
                        semesterId: semester.id,
                        title: chapterForm.title.trim(),
                      },
                    });
                  setChapterForm(null);
                  notify('تم حفظ الفصل');
                }}
              >
                حفظ الفصل
              </button>
            </>
          }
        >
          <label className="block">
            <span className="label">عنوان الفصل</span>
            <input
              className="input"
              value={chapterForm.title}
              onChange={(e) =>
                setChapterForm({ ...chapterForm, title: e.target.value })
              }
              maxLength={100}
            />
          </label>
          <p className="mt-3 text-[10px] text-muted">
            داخل {semester?.title}. يمكنك ترتيب الفصول من قائمة الإجراءات.
          </p>
        </Modal>
      ) : null}
      {confirmation ? (
        <Confirm
          open
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel="تأكيد"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            confirmation.action();
            setConfirmation(null);
          }}
        />
      ) : null}
      {publishReview ? (
        <Modal
          open
          onClose={() => setPublishReview(false)}
          title="مراجعة ونشر الدورة"
          description="تأكد أن المحتوى جاهز قبل إتاحته للتلاميذ."
          footer={
            <>
              <button
                className="btn btn-outline"
                onClick={() => setPublishReview(false)}
              >
                رجوع
              </button>
              <button
                className="btn btn-primary"
                disabled={!published.length || dirty}
                onClick={() => {
                  dispatch({
                    type: 'course/setStatus',
                    payload: { id: course.id, status: 'published' },
                  });
                  setPublishReview(false);
                  notify('تم نشر الدورة. انشر التحديثات لتطبيق التلميذ.');
                }}
              >
                تأكيد نشر الدورة
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <h3 className="text-base font-bold">{course.title}</h3>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-soft/50 p-5">
              <div>
                <p className="num text-2xl">{published.length}</p>
                <p className="mt-1 text-[10px] text-muted">
                  دروس جاهزة ومنشورة
                </p>
              </div>
              <div>
                <p className="num text-2xl">
                  {lessons.length - published.length}
                </p>
                <p className="mt-1 text-[10px] text-muted">دروس تبقى مخفية</p>
              </div>
            </div>
            {!published.length || dirty ? (
              <p role="alert" className="text-xs leading-7 text-brand">
                {dirty
                  ? 'احفظ تغييرات الدرس أولاً، ثم انشر الدورة.'
                  : 'خاصك درس واحد بمحتوى منشور على الأقل.'}
              </p>
            ) : null}
            <p className="flex gap-2 text-[11px] leading-7 text-muted">
              <CircleHelp size={15} className="mt-1 shrink-0" />
              النشر كيجهّز الدورة للتلاميذ أصحاب الاشتراك المفعّل. من بعد انشر
              التحديثات من صفحة المزامنة.
            </p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
