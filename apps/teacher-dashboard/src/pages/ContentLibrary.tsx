import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpLeft,
  Check,
  Clock3,
  Eye,
  FileText,
  Film,
  ListChecks,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatDuration, formatSize } from '@ostadiplus/shared';
import { Confirm, EmptyState, Modal, TableScroll } from '@/components/ui';
import { NewLessonDialog } from '@/components/authoring/NewLessonDialog';
import { lessonPublishError } from '@/lib/authoring';
import { KIND_META } from '@/lib/lessonKind';
import { libraryItemByFile } from '@/lib/library';
import { bundledMediaUrl } from '@/lib/media';
import { useStore } from '@/store/DemoStore';
export default function ContentLibrary({ quiz = false }: { quiz?: boolean }) {
  const { lang } = useI18n();
  const { state, dispatch, notify } = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState(params.get('kind') ?? 'all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishFeedback, setPublishFeedback] = useState<{
    message: string;
    blocked: { id: string; title: string; to: string; error: string }[];
  } | null>(null);
  useEffect(() => {
    setQuery('');
    setCourseFilter('all');
    setSelected(new Set());
    setPublishFeedback(null);
    setPreview(null);
    setDeleting(null);
  }, [quiz]);
  useEffect(() => {
    if (params.get('action')) {
      setCreating(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);
  const all = useMemo(
    () =>
      state.courses
        .flatMap((course) =>
          course.semesters.flatMap((s) =>
            s.chapters.flatMap((chapter) =>
              chapter.lessons.map((lesson) => ({ course, chapter, lesson })),
            ),
          ),
        )
        .filter((r) =>
          quiz
            ? r.lesson.kind === 'quiz'
            : ['video', 'pdf', 'text'].includes(r.lesson.kind),
        ),
    [state.courses, quiz, lang],
  );
  const rows = all.filter(
    (r) =>
      (kind === 'all' || r.lesson.kind === kind || quiz) &&
      (courseFilter === 'all' || r.course.id === courseFilter) &&
      `${r.lesson.title} ${r.course.title}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const activePreview = all.find((r) => r.lesson.id === preview);
  const toDelete = all.find((r) => r.lesson.id === deleting);
  const attempts = (state.quizAttempts ?? []).filter((a) =>
    all.some((r) => r.lesson.id === a.lessonId),
  );
  const answered = attempts.reduce((n, a) => n + a.correct, 0),
    totalAnswers = attempts.reduce((n, a) => n + a.total, 0);
  const allSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.lesson.id));
  function publish(value: boolean) {
    const targets = all.filter((r) => selected.has(r.lesson.id));
    const valid = targets.filter(
      (r) => !value || !lessonPublishError(r.lesson),
    );
    for (const r of valid)
      dispatch({
        type: 'lesson/setPublished',
        payload: {
          courseId: r.course.id,
          chapterId: r.chapter.id,
          lessonId: r.lesson.id,
          published: value,
        },
      });
    const blocked = targets
      .filter((r) => !valid.includes(r))
      .map((r) => ({
        id: r.lesson.id,
        title: r.lesson.title,
        to: `/courses/${r.course.id}?lesson=${r.lesson.id}`,
        error: lessonPublishError(r.lesson)!,
      }));
    const message = valid.length
      ? t('تم {0} {1} من {2} عناصر. انشر التحديثات لتصل إلى التطبيق.', [
          value ? 'نشر' : 'إخفاء',
          valid.length,
          targets.length,
        ])
      : t('لم يتم نشر أي عنصر. أكمل المحتوى المطلوب أولاً.');
    setSelected(new Set(blocked.map((item) => item.id)));
    setPublishFeedback({ message, blocked });
    notify(message, blocked.length ? 'error' : 'success');
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">
            {quiz ? t('التقييم والتعلّم') : t('مكتبتك التعليمية')}
          </p>
          <h1 className="workspace-title">
            {quiz ? t('اختبارات تصنع الفهم') : t('كل محتواك، في مكان واحد')}
          </h1>
          <p className="workspace-subtitle">
            {quiz
              ? t('حضّر أسئلة واضحة، اضبط التوقيت، وتابع نتائج تلاميذك.')
              : t('الفيديوهات، الملخّصات والدروس المكتوبة، منظّمة عبر دوراتك.')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          {quiz ? <Plus size={16} /> : <Upload size={16} />}{' '}
          {quiz ? t('إنشاء اختبار') : t('إضافة محتوى')}
        </button>
      </div>
      {quiz ? (
        <div className="workspace-panel mb-6 grid grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t('إجمالي الاختبارات'),
              value: all.length,
              icon: ListChecks,
            },
            {
              label: t('الاختبارات المنشورة'),
              value: all.filter((r) => r.lesson.published).length,
              icon: Check,
            },
            {
              label: t('محاولات التلاميذ'),
              value: attempts.length,
              icon: Clock3,
            },
            {
              label: t('نسبة الإجابات الصحيحة'),
              value: totalAnswers
                ? `${Math.round((answered / totalAnswers) * 100)}%`
                : '—',
              icon: FileText,
            },
          ].map((m) => (
            <div key={m.label} className="workspace-metric">
              <div className="mb-3 flex items-center justify-between text-muted">
                <span className="text-[10px]">{m.label}</span>
                <m.icon size={15} />
              </div>
              <p className="metric-number num">{m.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      <section className="workspace-panel">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5">
          {quiz ? (
            <h2 className="py-4 text-xs font-bold">
              {t('بنك الاختبارات')}{' '}
              <span className="num ms-2 text-muted">{all.length}</span>
            </h2>
          ) : (
            <div
              className="workspace-tabs border-0"
              role="group"
              aria-label={t('نوع المحتوى')}
            >
              {[
                ['all', t('كل المحتوى')],
                ['video', t('فيديو')],
                ['pdf', 'PDF'],
                ['text', t('نصوص')],
              ].map(([k, label]) => (
                <button
                  type="button"
                  aria-pressed={kind === k}
                  key={k}
                  className="workspace-tab"
                  onClick={() => {
                    setKind(k);
                    setSelected(new Set());
                    setPublishFeedback(null);
                  }}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          )}
        </header>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              dir="auto"
              aria-label={t('بحث في المحتوى')}
              className="workspace-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(new Set());
                setPublishFeedback(null);
              }}
              placeholder={
                quiz ? t('ابحث عن اختبار…') : t('ابحث عن عنوان أو دورة…')
              }
            />
          </div>
          <select
            className="input h-10 w-auto max-w-60 text-[11px]"
            aria-label={t('تصفية المحتوى حسب الدورة')}
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setSelected(new Set());
              setPublishFeedback(null);
            }}
          >
            <option value="all">{t('كل الدورات')}</option>
            {state.courses.map((c) => (
              <option value={c.id} key={c.id}>
                <bdi>{c.title}</bdi>
              </option>
            ))}
          </select>
        </div>
        {selected.size ? (
          <div
            className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-soft/60 px-5 py-3 text-[10px]"
            role="status"
          >
            <span className="flex-1 font-bold">
              {selected.size}
              {t(' عناصر محددة')}
            </span>
            <button
              className="font-bold text-brand"
              onClick={() => publish(true)}
            >
              {t('نشر المحدّد')}
            </button>
            <button
              className="font-bold text-brand"
              onClick={() => publish(false)}
            >
              {t('إخفاء المحدّد')}
            </button>
            <button
              className="text-muted"
              onClick={() => setSelected(new Set())}
            >
              {t('إلغاء التحديد')}
            </button>
          </div>
        ) : null}
        {publishFeedback ? (
          <div
            className="border-b border-line bg-brand-soft/40 p-5"
            role={publishFeedback.blocked.length ? 'alert' : 'status'}
          >
            <p className="text-sm font-semibold">
              {t(publishFeedback.message)}
            </p>
            {publishFeedback.blocked.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {publishFeedback.blocked.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="font-bold text-brand underline underline-offset-4"
                      to={item.to}
                    >
                      {item.title}
                    </Link>
                    <span className="text-muted"> — {t(item.error)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {rows.length ? (
          <TableScroll label={t('المحتوى التعليمي')}>
            <table className="workspace-table min-w-[790px]">
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      dir="auto"
                      type="checkbox"
                      aria-label={t('تحديد كل المحتوى المعروض')}
                      checked={allSelected}
                      ref={(node) => {
                        if (node)
                          node.indeterminate =
                            selected.size > 0 && !allSelected;
                      }}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? new Set(rows.map((r) => r.lesson.id))
                            : new Set(),
                        )
                      }
                    />
                  </th>
                  <th>{quiz ? t('الاختبار') : t('المحتوى')}</th>
                  <th>{t('الدورة والفصل')}</th>
                  <th>{quiz ? t('الأسئلة والتوقيت') : t('النوع والحجم')}</th>
                  <th>{t('الحالة')}</th>
                  <th>
                    <span className="sr-only">{t('إجراءات المحتوى')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ lesson, course, chapter }) => {
                  const meta = KIND_META[lesson.kind],
                    Icon = meta.icon;
                  const poster =
                    lesson.thumbnailUrl ??
                    (libraryItemByFile(lesson.file)?.poster
                      ? bundledMediaUrl(
                          'poster',
                          libraryItemByFile(lesson.file)!.poster!,
                        )
                      : undefined);
                  return (
                    <tr key={lesson.id}>
                      <td>
                        <input
                          dir="auto"
                          type="checkbox"
                          aria-label={t('تحديد {0}', [lesson.title])}
                          checked={selected.has(lesson.id)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(lesson.id);
                              else next.delete(lesson.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td>
                        <Link
                          to={`/courses/${course.id}?lesson=${lesson.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-soft text-brand">
                            {poster && lesson.kind === 'video' ? (
                              <img
                                src={poster}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <Icon size={21} strokeWidth={1.5} />
                            )}
                          </span>
                          <span className="block max-w-64 text-xs font-bold leading-6">
                            <bdi>{lesson.title}</bdi>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <p className="max-w-48 truncate text-[10px]">
                          <bdi>{course.title}</bdi>
                        </p>
                        <p className="mt-1 max-w-48 truncate text-[9px] text-muted">
                          <bdi>{chapter.title}</bdi>
                        </p>
                      </td>
                      <td>
                        <p className="text-[10px]">
                          {quiz
                            ? t('{0} أسئلة', [lesson.questions?.length ?? 0])
                            : t(meta.label)}
                        </p>
                        <p className="content-file-meta mt-1 text-[9px] text-muted">
                          {quiz ? (
                            lesson.timeLimitSec ? (
                              <span className="num">
                                {lesson.timeLimitSec}s
                              </span>
                            ) : (
                              t('دون توقيت')
                            )
                          ) : lesson.kind === 'video' ? (
                            <>
                              <span className="num">
                                {formatDuration(lesson.durationSec)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="num">
                                {formatSize(lesson.sizeMb)}
                              </span>
                            </>
                          ) : lesson.kind === 'pdf' ? (
                            <>
                              <span>
                                <span className="num">{lesson.pages}</span>{' '}
                                {t('صفحات')}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="num">
                                {formatSize(lesson.sizeMb)}
                              </span>
                            </>
                          ) : (
                            t('نص منسّق')
                          )}
                        </p>
                      </td>
                      <td>
                        <span
                          className={`status-label ${lesson.published ? '' : 'is-draft'}`}
                        >
                          {lesson.published ? t('منشور') : t('مسودة')}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            className="btn btn-icon btn-ghost"
                            aria-label={t('تحرير {0}', [lesson.title])}
                            to={`/courses/${course.id}?lesson=${lesson.id}`}
                          >
                            <ArrowUpLeft size={16} />
                          </Link>
                          {lesson.kind === 'video' || lesson.kind === 'pdf' ? (
                            <button
                              className="btn btn-icon btn-ghost"
                              onClick={() => setPreview(lesson.id)}
                              aria-label={t('معاينة {0}', [lesson.title])}
                            >
                              <Eye size={15} />
                            </button>
                          ) : null}
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => setDeleting(lesson.id)}
                            aria-label={t('حذف {0}', [lesson.title])}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={quiz ? <ListChecks size={26} /> : <Film size={26} />}
              title={
                all.length
                  ? t('لا توجد عناصر مطابقة')
                  : quiz
                    ? t('ابدأ بأول اختبار')
                    : t('أضف محتواك التعليمي')
              }
              description={
                all.length
                  ? t(
                      'لا توجد نتائج تطابق البحث والتصفية الحالية. اعرض كل المحتوى وحاول مجدداً.',
                    )
                  : t('اختر الدورة والفصل، ثم أضف المحتوى في المحرّر.')
              }
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (all.length) {
                      setQuery('');
                      setKind('all');
                      setCourseFilter('all');
                      setSelected(new Set());
                      setPublishFeedback(null);
                    } else setCreating(true);
                  }}
                >
                  <Plus size={15} aria-hidden="true" />
                  {all.length
                    ? t('مسح البحث والتصفية')
                    : quiz
                      ? t('إنشاء اختبار')
                      : t('إضافة محتوى')}
                </button>
              }
            />
          </div>
        )}
        <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-4 text-[10px] text-muted">
          <span>
            {t('عرض ')}
            {rows.length}
            {t(' من ')}
            {all.length}
            {t(' عناصر')}
          </span>
          <span>{t('التعديل كيتمّ في محرّر الدورة')}</span>
        </footer>
      </section>
      {creating ? (
        <NewLessonDialog
          kind={
            quiz
              ? 'quiz'
              : kind === 'pdf'
                ? 'pdf'
                : kind === 'text'
                  ? 'text'
                  : 'video'
          }
          close={() => setCreating(false)}
        />
      ) : null}
      {activePreview ? (
        <Modal
          open
          onClose={() => setPreview(null)}
          title={activePreview.lesson.title}
          size="lg"
        >
          {activePreview.lesson.file ? (
            activePreview.lesson.kind === 'video' ? (
              <video
                controls
                playsInline
                preload="metadata"
                src={bundledMediaUrl('video', activePreview.lesson.file)}
                poster={activePreview.lesson.thumbnailUrl}
                className="aspect-video w-full rounded-lg bg-ink"
              />
            ) : (
              <a
                href={bundledMediaUrl('doc', activePreview.lesson.file)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline w-full"
              >
                {t('فتح المستند')}
              </a>
            )
          ) : (
            <p className="p-5 text-xs text-muted">
              {t('الملف مازال ما تزادش. افتح المحرّر لإضافته.')}
            </p>
          )}
        </Modal>
      ) : null}
      {toDelete ? (
        <Confirm
          open
          title={t('حذف المحتوى؟')}
          message={t('غادي يتحيد «{0}» من دورة {1}.', [
            toDelete.lesson.title,
            toDelete.course.title,
          ])}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            dispatch({
              type: 'lesson/delete',
              payload: {
                courseId: toDelete.course.id,
                chapterId: toDelete.chapter.id,
                lessonId: toDelete.lesson.id,
              },
            });
            setDeleting(null);
            setSelected(new Set());
            notify(t('تم حذف المحتوى'));
          }}
        />
      ) : null}
    </>
  );
}
