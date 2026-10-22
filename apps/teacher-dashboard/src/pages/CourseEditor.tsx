import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
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
  const { lang } = useI18n();
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const { state, dispatch, notify } = useStore();
  const course = state.courses.find((c) => c.id === courseId);
  const [tab, setTab] = useState<'content' | 'info' | 'preview'>('content');
  const [semesterId, setSemester] = useState('');
  const [query, setQuery] = useState('');
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const onDirty = useCallback((value: boolean) => setDirty(value), [lang]);
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
    window.confirm(t('عندك تغييرات غير محفوظة. واش بغيتي تواصل بلا حفظ؟'));
  function selectLesson(lessonId: string) {
    if (!canLeave()) return;
    setParams({ lesson: lessonId });
    setOutlineOpen(false);
    setDirty(false);
  }
  function newLesson(chapterId?: string, kind: LessonKind = 'video') {
    if (!canLeave()) return;
    setAdding({ chapterId, kind });
  }
  function removeLesson(lesson: Lesson, chapter: Chapter) {
    setConfirmation({
      title: t('حذف الدرس؟'),
      message: t('غادي يتحيد «{0}» من المنهج. تأكد قبل المتابعة.', [
        lesson.title,
      ]),
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
        notify(t('تم حذف الدرس'));
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
        title: t('إيقاف نشر الدورة؟'),
        message: t(
          'الدورة ما غاتبقاش متاحة للتلاميذ بعد نشر التحديثات. المحتوى والاشتراكات كيبقاو محفوظين.',
        ),
        action: () => {
          dispatch({
            type: 'course/setStatus',
            payload: { id: course!.id, status: 'draft' },
          });
          notify(t('تم إيقاف نشر الدورة'));
        },
      });
    } else setPublishReview(true);
  }
  return (
    <div className="course-editor-page" data-editing={!!selection}>
      <header className="course-editor-top">
        <div className="course-editor-location">
          <Link to="/courses" className="course-back-link">
            <ArrowRight size={16} aria-hidden="true" />
            <span className="sr-only">{t('الدورات التعليمية')}</span>
          </Link>
          <h1 className="workspace-title">
            <bdi>{course.title}</bdi>
          </h1>
          <span className="status-label" data-draft={course.status === 'draft'}>
            {course.status === 'published' ? t('منشورة') : t('مسودة')}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => changeTab('preview')}
          >
            <Eye size={15} aria-hidden="true" />
            {t('معاينة التلميذ')}
          </button>
          <button className="btn btn-outline btn-sm" onClick={publish}>
            {course.status === 'published' ? t('إيقاف النشر') : t('نشر الدورة')}
          </button>
        </div>
      </header>
      <div className="course-management-bar">
        <div
          className="workspace-tabs border-0"
          role="tablist"
          aria-label={t('إدارة الدورة')}
        >
          {(
            [
              { key: 'content', label: t('محتوى الدورة'), icon: BookOpen },
              { key: 'info', label: t('معلومات الدورة'), icon: Settings2 },
              { key: 'preview', label: t('معاينة'), icon: Eye },
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
        {!selection ? (
          <p className="pb-3 text-[10px] text-muted sm:pb-0">
            <span className="num">{lessons.length}</span>
            {t(' درس')} <span className="mx-2">·</span>{' '}
            <span className="num">{published.length}</span>
            {t(' منشور')}
          </p>
        ) : null}
      </div>
      {tab === 'info' ? (
        <CourseInfo courseId={course.id} onDirty={onDirty} />
      ) : tab === 'preview' ? (
        <CoursePreview state={state} courseId={course.id} />
      ) : (
        <div className="authoring-layout">
          <button
            className="lesson-outline-toggle"
            aria-expanded={outlineOpen}
            aria-controls="lesson-course-outline"
            onClick={() => setOutlineOpen((value) => !value)}
          >
            <BookOpen size={17} aria-hidden="true" />
            <span>{t('دروس الدورة')}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <aside
            id="lesson-course-outline"
            className="course-outline"
            data-expanded={outlineOpen || !selection}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <div>
                <h2 className="text-xs font-bold">{t('مخطط الدورة')}</h2>
              </div>
              <button
                className="btn btn-icon btn-outline"
                aria-label={t('إضافة محتوى للدورة')}
                onClick={() => newLesson()}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="border-b border-line p-3">
              <div
                className="mb-3 flex gap-1 rounded-lg bg-surface-alt/60 p-1"
                aria-label={t('الدورات الدراسية')}
              >
                {course.semesters.map((s) => (
                  <button
                    key={s.id}
                    className={`flex-1 rounded-md px-2 py-2 text-[10px] ${semester?.id === s.id ? 'bg-white font-bold text-brand shadow-card' : 'text-muted'}`}
                    aria-pressed={semester?.id === s.id}
                    onClick={() => setSemester(s.id)}
                  >
                    {t(s.title)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute start-3 top-3 text-muted"
                />
                <input
                  dir="auto"
                  aria-label={t('بحث في مخطط الدورة')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('ابحث عن درس…')}
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
                            {ci + 1}. <bdi>{chapter.title}</bdi>
                          </span>
                          <span className="mt-1 block text-[9px] text-muted">
                            {chapter.lessons.length}
                            {t(' دروس')}
                          </span>
                        </span>
                      </button>
                      <details className="outline-menu">
                        <summary
                          aria-label={t('إجراءات الفصل {0}', [chapter.title])}
                        >
                          <MoreHorizontal size={16} />
                        </summary>
                        <div>
                          {[
                            {
                              label: t('إعادة تسمية الفصل'),
                              icon: PenLine,
                              action: () =>
                                setChapterForm({
                                  id: chapter.id,
                                  title: chapter.title,
                                }),
                            },
                            {
                              label: t('نقل الفصل لأعلى'),
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
                              label: t('نقل الفصل لأسفل'),
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
                              label: t('حذف الفصل'),
                              icon: Trash2,
                              action: () =>
                                setConfirmation({
                                  title: t('حذف الفصل؟'),
                                  message: t(
                                    'الفصل «{0}» فيه {1} دروس. الحذف غادي يشمل جميع دروسه.',
                                    [chapter.title, chapter.lessons.length],
                                  ),
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
                                    notify(t('تم حذف الفصل'));
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
                                aria-label={`${lesson.title} — ${t(KIND_META[lesson.kind].label)}`}
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
                                    <bdi>{lesson.title}</bdi>
                                  </span>
                                  <span className="mt-1 flex items-center gap-1.5 text-[8px] text-muted">
                                    <span
                                      className={`size-1.5 rounded-full ${lesson.published ? 'bg-brand' : 'border border-line-strong'}`}
                                    />
                                    {lesson.published ? t('منشور') : t('مسودة')}
                                  </span>
                                </span>
                              </button>
                              <details className="outline-menu me-2">
                                <summary
                                  aria-label={t('إجراءات درس {0}', [
                                    lesson.title,
                                  ])}
                                >
                                  <MoreHorizontal size={13} />
                                </summary>
                                <div>
                                  {[
                                    {
                                      label: t('نقل الدرس لأعلى'),
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
                                      label: t('نقل الدرس لأسفل'),
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
                                      label: t('حذف الدرس'),
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
                            {t('لا دروس بعد. أضف أول درس.')}
                          </p>
                        ) : null}
                        <button
                          className="mx-3 my-2 flex items-center gap-2 px-1 py-2 text-[10px] font-bold text-brand"
                          onClick={() => newLesson(chapter.id)}
                        >
                          <Plus size={13} />
                          {t('إضافة درس')}
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
              {t('إضافة فصل')}
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
                    {t('مساحة صناعة التعلّم')}
                  </p>
                  <h2 className="text-2xl font-bold leading-relaxed">
                    {t('منهج واضح.')}
                    <br />
                    {t('تجربة تعلّم أفضل.')}
                  </h2>
                  <p className="mt-4 max-w-md text-xs leading-7 text-muted">
                    {t(
                      'اختَر درساً من مخطط الدورة لتحريره، أو أضف محتوى جديداً. جميع الفصول والدروس كيبقاو قريبين منك وأنت كتخدم.',
                    )}
                  </p>
                  <button
                    className="btn btn-primary mt-6"
                    onClick={() => newLesson()}
                    disabled={!course.semesters.some((s) => s.chapters.length)}
                  >
                    <Plus size={16} />
                    {t('إضافة محتوى')}
                  </button>
                </div>
                <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line border-y border-line">
                  {[
                    {
                      label: t('فيديوهات'),
                      icon: Film,
                      value: lessons.filter((l) => l.kind === 'video').length,
                    },
                    {
                      label: t('مستندات PDF'),
                      icon: FileText,
                      value: lessons.filter((l) => l.kind === 'pdf').length,
                    },
                    {
                      label: t('اختبارات'),
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
                  <h3 className="text-xs font-bold">{t('قبل نشر دورتك')}</h3>
                  {[
                    {
                      done: course.title.trim().length >= 4,
                      label: t('عنوان الدورة ومعلوماتها'),
                    },
                    {
                      done: lessons.some(hasContent),
                      label: t('إضافة محتوى تعليمي'),
                    },
                    {
                      done: published.length > 0,
                      label: t('نشر درس واحد على الأقل'),
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
                    {t('نشر التحديثات لتطبيق التلميذ')}
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
          title={chapterForm.id ? t('تعديل اسم الفصل') : t('فصل جديد')}
          footer={
            <>
              <button
                className="btn btn-outline"
                onClick={() => setChapterForm(null)}
              >
                {t('إلغاء')}
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
                  notify(t('تم حفظ الفصل'));
                }}
              >
                {t('حفظ الفصل')}
              </button>
            </>
          }
        >
          <label className="block">
            <span className="label">{t('عنوان الفصل')}</span>
            <input
              dir="auto"
              className="input"
              value={chapterForm.title}
              onChange={(e) =>
                setChapterForm({ ...chapterForm, title: e.target.value })
              }
              maxLength={100}
            />
          </label>
          <p className="mt-3 text-[10px] text-muted">
            {t('داخل ')}
            {semester?.title}
            {t('. يمكنك ترتيب الفصول من قائمة الإجراءات.')}
          </p>
        </Modal>
      ) : null}
      {confirmation ? (
        <Confirm
          open
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={t('تأكيد')}
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
          title={t('مراجعة ونشر الدورة')}
          description={t('تأكد أن المحتوى جاهز قبل إتاحته للتلاميذ.')}
          footer={
            <>
              <button
                className="btn btn-outline"
                onClick={() => setPublishReview(false)}
              >
                {t('رجوع')}
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
                  notify(t('تم نشر الدورة. انشر التحديثات لتطبيق التلميذ.'));
                }}
              >
                {t('تأكيد نشر الدورة')}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <h3 className="text-base font-bold">
              <bdi>{course.title}</bdi>
            </h3>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-soft/50 p-5">
              <div>
                <p className="num text-2xl">{published.length}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {t('دروس جاهزة ومنشورة')}
                </p>
              </div>
              <div>
                <p className="num text-2xl">
                  {lessons.length - published.length}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  {t('دروس تبقى مخفية')}
                </p>
              </div>
            </div>
            {!published.length || dirty ? (
              <p role="alert" className="text-xs leading-7 text-brand">
                {dirty
                  ? t('احفظ تغييرات الدرس أولاً، ثم انشر الدورة.')
                  : t('خاصك درس واحد بمحتوى منشور على الأقل.')}
              </p>
            ) : null}
            <p className="flex gap-2 text-[11px] leading-7 text-muted">
              <CircleHelp size={15} className="mt-1 shrink-0" />
              {t(
                'النشر كيجهّز الدورة للتلاميذ أصحاب الاشتراك المفعّل. من بعد انشر التحديثات من صفحة المزامنة.',
              )}
            </p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
