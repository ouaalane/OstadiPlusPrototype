import { useI18n } from '@/i18n/useI18n';
import { translate as t, relativeTime } from '@/i18n/locale';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpLeft,
  BookOpen,
  CheckCheck,
  MessageCircle,
  Search,
  Send,
} from 'lucide-react';
import {
  isQuestionAnswered,
  lessonTitleForQuestion,
  makeReply,
} from '@ostadiplus/shared';
import { Avatar, EmptyState } from '@/components/ui';
import { useUnsavedChanges } from '@/components/authoring/useUnsavedChanges';
import { useStore } from '@/store/DemoStore';
const ignoreDirty = () => {};

export default function Questions() {
  const { lang } = useI18n();
  const { state, dispatch, notify } = useStore();
  const [filter, setFilter] = useState<'all' | 'unanswered'>('all');
  const [query, setQuery] = useState('');
  const [courseId, setCourse] = useState('all');
  const [selected, setSelected] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedReply, setSavedReply] = useState<string | null>(null);
  useUnsavedChanges(
    Object.values(drafts).some((value) => value.trim() !== ''),
    ignoreDirty,
  );
  const questions = useMemo(
    () =>
      [...(state.questions ?? [])].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [state.questions, lang],
  );
  const pending = questions.filter((q) => !isQuestionAnswered(q));
  const visible = questions.filter(
    (q) =>
      (filter === 'all' || !isQuestionAnswered(q)) &&
      (courseId === 'all' || q.courseId === courseId) &&
      `${q.body} ${q.authorName}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const active = visible.find((q) => q.id === selected) ?? visible[0];
  const filtered =
    query.trim() !== '' || courseId !== 'all' || filter !== 'all';
  function clearFilters() {
    setQuery('');
    setCourse('all');
    setFilter('all');
  }
  const course = state.courses.find((c) => c.id === active?.courseId);
  const lessonTitle = active ? lessonTitleForQuestion(state, active) : '';
  const draft = active ? (drafts[active.id] ?? '') : '';
  function send() {
    if (!active || !draft.trim()) return;
    dispatch({
      type: 'qna/reply',
      payload: {
        questionId: active.id,
        reply: makeReply({
          authorId: state.teacher.id,
          authorName: state.teacher.name,
          authorRole: 'teacher',
          body: draft.trim(),
        }),
      },
    });
    setDrafts((d) => ({ ...d, [active.id]: '' }));
    setSavedReply(active.authorName);
    notify(t('تم حفظ الرد. انشر التحديثات لتصل إلى التلميذ.'));
  }
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="section-kicker">{t('قريب من تلاميذك')}</p>
          <h1 className="workspace-title">{t('كل سؤال، بداية للفهم')}</h1>
          <p className="workspace-subtitle">
            {t('تابع نقاشات الدروس، وضّح الأفكار، وخلي كل تلميذ يلقى الجواب.')}
          </p>
        </div>
        <Link to="/sync" className="btn btn-outline btn-sm">
          {t('جلب الأسئلة ونشر الأجوبة')}
          <ArrowUpLeft size={14} />
        </Link>
      </div>
      {savedReply ? (
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-brand-soft p-4"
          role="status"
        >
          <p className="text-sm">
            {t('تم حفظ ردك على سؤال ')}
            {savedReply}
            {t('. انشر التحديثات ليصل إلى التلميذ.')}
          </p>
          <Link to="/sync" className="text-link">
            {t('نشر الأجوبة ')}
            <ArrowUpLeft size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      <section className="workspace-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5">
          <div
            className="workspace-tabs border-0"
            role="group"
            aria-label={t('تصفية الأسئلة')}
          >
            {(
              [
                ['all', t('كل الأسئلة'), questions.length],
                ['unanswered', t('بانتظار جواب'), pending.length],
              ] as const
            ).map(([key, label, count]) => (
              <button
                type="button"
                aria-pressed={filter === key}
                key={key}
                className="workspace-tab"
                onClick={() => setFilter(key)}
              >
                {t(label)}
                <span className="num ms-2 rounded bg-brand-soft px-1.5 py-0.5 text-[9px]">
                  {count}
                </span>
              </button>
            ))}
          </div>
          <select
            aria-label={t('تصفية الأسئلة حسب الدورة')}
            className="input my-2 h-9 w-auto max-w-60 text-[10px]"
            value={courseId}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="all">{t('جميع الدورات')}</option>
            {state.courses.map((c) => (
              <option key={c.id} value={c.id}>
                <bdi>{c.title}</bdi>
              </option>
            ))}
          </select>
        </div>
        <div className="inbox-layout">
          <aside className="inbox-list">
            <div className="relative border-b border-line p-4">
              <Search
                aria-hidden="true"
                size={14}
                className="pointer-events-none absolute start-7 top-7 text-muted"
              />
              <input
                dir="auto"
                className="workspace-search"
                aria-label={t('البحث في الأسئلة')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ابحث عن سؤال أو تلميذ…')}
              />
            </div>
            <div className="inbox-threads">
              <p className="px-4 py-2 text-xs text-muted" role="status">
                {visible.length}
                {t(' من ')}
                {questions.length}
                {t(' أسئلة')}
              </p>
              {visible.length ? (
                visible.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setSelected(q.id)}
                    aria-pressed={active?.id === q.id}
                    className={`inbox-thread ${active?.id === q.id ? 'is-selected' : ''}`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Avatar
                        label={q.authorName
                          .split(' ')
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join('')}
                        size={28}
                      />
                      <span className="min-w-0 flex-1 truncate text-[10px] font-bold">
                        {q.authorName}
                      </span>
                      {!isQuestionAnswered(q) ? (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="size-1.5 rounded-full bg-brand"
                            aria-hidden="true"
                          />
                          <span className="sr-only">{t('بانتظار جواب')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-brand">
                          <CheckCheck size={12} aria-hidden="true" />
                          <span className="sr-only">{t('تمت الإجابة')}</span>
                        </span>
                      )}
                    </div>
                    {drafts[q.id]?.trim() ? (
                      <span className="mb-2 block text-xs font-bold text-brand">
                        {t('مسودة رد')}
                      </span>
                    ) : null}
                    <p className="line-clamp-2 text-[11px] leading-6">
                      {q.body}
                    </p>
                    <p className="mt-3 flex items-center justify-between gap-2 text-[9px] text-muted">
                      <span className="max-w-40 truncate">
                        {state.courses.find((c) => c.id === q.courseId)?.title}
                      </span>
                      <span className="shrink-0">
                        {relativeTime(q.createdAt)}
                      </span>
                    </p>
                  </button>
                ))
              ) : (
                <p className="p-8 text-center text-xs leading-7 text-muted">
                  {questions.length
                    ? t('لا أسئلة تطابق التصفية الحالية.')
                    : t('لا توجد أسئلة بعد.')}
                </p>
              )}
            </div>
          </aside>
          {active ? (
            <article className="min-w-0">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
                <div>
                  <h2 className="text-sm font-bold">
                    {course?.title ?? t('نقاش الدورة')}
                  </h2>
                  {lessonTitle ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                      <BookOpen size={12} />
                      {lessonTitle}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`status-label ${isQuestionAnswered(active) ? '' : 'is-draft'}`}
                >
                  {isQuestionAnswered(active)
                    ? t('تمت الإجابة')
                    : t('بانتظار جواب')}
                </span>
              </header>
              <div className="space-y-6 p-5 sm:p-7">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Avatar
                      label={active.authorName
                        .split(' ')
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join('')}
                      size={31}
                    />
                    <div>
                      <p className="text-[11px] font-bold">
                        {active.authorName}
                      </p>
                      <p className="mt-1 text-[9px] text-muted">
                        {relativeTime(active.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words rounded-xl border border-line p-4 text-xs leading-8">
                    {active.body}
                  </p>
                </div>
                {active.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-xl p-4 ${r.authorRole === 'teacher' ? 'bg-brand-soft/65' : 'border border-line'}`}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold">
                        {r.authorName}
                      </span>
                      {r.authorRole === 'teacher' ? (
                        <span className="rounded bg-white px-2 py-0.5 text-[8px] text-brand">
                          {t('الأستاذ')}
                        </span>
                      ) : null}
                      <span className="ms-auto text-[9px] text-muted">
                        {relativeTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-8">
                      {r.body}
                    </p>
                  </div>
                ))}
                {!active.replies.length ? (
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <MessageCircle size={15} />
                    {t('التلميذ كيتسنى توضيحك.')}
                  </div>
                ) : null}
                <div className="border-t border-line pt-5">
                  <label
                    className="mb-3 block text-xs font-bold"
                    htmlFor="teacher-reply"
                  >
                    {t('جوابك للتلميذ')}
                  </label>
                  <textarea
                    dir="auto"
                    id="teacher-reply"
                    className="textarea min-h-32"
                    placeholder={t('اشرح الفكرة بمثال بسيط…')}
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [active.id]: e.target.value }))
                    }
                    maxLength={2000}
                    aria-describedby="teacher-reply-hint teacher-reply-length"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs leading-6 text-muted">
                      <p id="teacher-reply-hint">
                        {draft.trim()
                          ? t('الجواب كيبان لمشتركي الدورة بعد نشر التحديثات.')
                          : t(
                              'اكتب جواباً لتفعيل الإرسال. سيظهر للتلميذ بعد نشر التحديثات.',
                            )}
                      </p>
                      <p id="teacher-reply-length">
                        <span className="num">{draft.length} / 2000</span>
                        {t(' حرف')}
                      </p>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!draft.trim()}
                      onClick={send}
                    >
                      <Send size={14} />
                      {t('إرسال الرد')}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <div className="flex min-h-96 items-center justify-center p-8">
              <EmptyState
                icon={<MessageCircle size={32} strokeWidth={1.3} />}
                title={
                  filtered
                    ? filter === 'unanswered' &&
                      !query.trim() &&
                      courseId === 'all'
                      ? t('لا أسئلة بانتظار جواب')
                      : t('لا أسئلة مطابقة')
                    : t('مساحة للنقاش والتوضيح')
                }
                description={
                  filtered
                    ? t('يمكنك إزالة البحث والتصفية للرجوع إلى جميع الأسئلة.')
                    : t('ستظهر أسئلة التلاميذ هنا بعد جلبها من صفحة المزامنة.')
                }
                action={
                  filtered ? (
                    <button className="btn btn-outline" onClick={clearFilters}>
                      {t('عرض كل الأسئلة')}
                    </button>
                  ) : (
                    <Link to="/sync" className="btn btn-outline">
                      {t('جلب الأسئلة')}
                    </Link>
                  )
                }
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
