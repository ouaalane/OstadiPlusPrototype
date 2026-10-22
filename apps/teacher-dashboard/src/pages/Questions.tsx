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
  relativeTime,
} from '@ostadiplus/shared';
import { Avatar } from '@/components/ui';
import { useStore } from '@/store/DemoStore';
export default function Questions() {
  const { state, dispatch, notify } = useStore();
  const [filter, setFilter] = useState<'all' | 'unanswered'>('all');
  const [query, setQuery] = useState('');
  const [courseId, setCourse] = useState('all');
  const [selected, setSelected] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const questions = useMemo(
    () =>
      [...(state.questions ?? [])].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [state.questions],
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
    notify('تم حفظ الرد. انشر التحديثات لتصل إلى التلميذ.');
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">قريب من تلاميذك</p>
          <h1 className="workspace-title">كل سؤال، بداية للفهم</h1>
          <p className="workspace-subtitle">
            تابع نقاشات الدروس، وضّح الأفكار، وخلي كل تلميذ يلقى الجواب.
          </p>
        </div>
        <Link to="/sync" className="btn btn-outline btn-sm">
          جلب الأسئلة ونشر الأجوبة
          <ArrowUpLeft size={14} />
        </Link>
      </div>
      <section className="workspace-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5">
          <div
            className="workspace-tabs border-0"
            role="tablist"
            aria-label="تصفية الأسئلة"
          >
            {(
              [
                ['all', 'كل الأسئلة', questions.length],
                ['unanswered', 'بانتظار جواب', pending.length],
              ] as const
            ).map(([key, label, count]) => (
              <button
                role="tab"
                aria-selected={filter === key}
                key={key}
                className="workspace-tab"
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="num ms-2 rounded bg-brand-soft px-1.5 py-0.5 text-[9px]">
                  {count}
                </span>
              </button>
            ))}
          </div>
          <select
            aria-label="تصفية الأسئلة حسب الدورة"
            className="input my-2 h-9 w-auto max-w-60 text-[10px]"
            value={courseId}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="all">جميع الدورات</option>
            {state.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="inbox-layout">
          <aside className="inbox-list">
            <div className="relative border-b border-line p-4">
              <Search
                size={14}
                className="pointer-events-none absolute start-7 top-7 text-muted"
              />
              <input
                className="workspace-search"
                aria-label="البحث في الأسئلة"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن سؤال أو تلميذ…"
              />
            </div>
            <div className="inbox-threads">
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
                        <span
                          className="size-1.5 rounded-full bg-brand"
                          aria-label="بانتظار جواب"
                        />
                      ) : (
                        <CheckCheck size={12} className="text-brand" />
                      )}
                    </div>
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
                  لا أسئلة مطابقة. جرّب بحثاً أو تصفية أخرى.
                </p>
              )}
            </div>
          </aside>
          {active ? (
            <article className="min-w-0">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
                <div>
                  <h2 className="text-sm font-bold">
                    {course?.title ?? 'نقاش الدورة'}
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
                  {isQuestionAnswered(active) ? 'تمت الإجابة' : 'بانتظار جواب'}
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
                  <p className="rounded-xl border border-line p-4 text-xs leading-8">
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
                          الأستاذ
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
                    التلميذ كيتسنى توضيحك.
                  </div>
                ) : null}
                <div className="border-t border-line pt-5">
                  <label
                    className="mb-3 block text-xs font-bold"
                    htmlFor="teacher-reply"
                  >
                    جوابك للتلميذ
                  </label>
                  <textarea
                    id="teacher-reply"
                    className="textarea min-h-32"
                    placeholder="اشرح الفكرة بمثال بسيط…"
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [active.id]: e.target.value }))
                    }
                    maxLength={2000}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[9px] leading-6 text-muted">
                      الجواب كيبان لمشتركي الدورة بعد نشر التحديثات.
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!draft.trim()}
                      onClick={send}
                    >
                      <Send size={14} />
                      إرسال الرد
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <div className="flex min-h-96 flex-col items-center justify-center gap-3 p-8 text-center">
              <MessageCircle
                size={32}
                strokeWidth={1.3}
                className="text-brand"
              />
              <h2 className="text-sm font-bold">مساحة للنقاش والتوضيح</h2>
              <p className="max-w-xs text-xs leading-7 text-muted">
                أسئلة تلاميذك غاتبان هنا من بعد المزامنة.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
