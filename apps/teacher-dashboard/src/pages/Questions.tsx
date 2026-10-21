import { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Send,
} from 'lucide-react';
import {
  isQuestionAnswered,
  lessonTitleForQuestion,
  makeReply,
  relativeTime,
} from '@ostadiplus/shared';
import { EmptyState, PageHeader, Pill } from '@/components/ui';
import { useAction, useStore } from '@/store/DemoStore';

type Filter = 'all' | 'unanswered';

/**
 * Course Q & R inbox.
 *
 * Every thread raised by an enrolled student is listed with its course and
 * optional lesson. Replies are written as the signed-in teacher and ride along
 * in the sync payload the student app imports.
 */
export default function Questions() {
  const { state } = useStore();
  const dispatch = useAction();
  const [filter, setFilter] = useState<Filter>('all');
  const [courseId, setCourseId] = useState<string>('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const questions = useMemo(
    () =>
      [...(state.questions ?? [])].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [state.questions],
  );

  const unansweredCount = questions.filter(
    (question) => !isQuestionAnswered(question),
  ).length;

  const coursesWithQuestions = useMemo(() => {
    const ids = new Set(questions.map((question) => question.courseId));
    return state.courses.filter((course) => ids.has(course.id));
  }, [questions, state.courses]);

  const visible = useMemo(
    () =>
      questions.filter((question) => {
        if (courseId !== 'all' && question.courseId !== courseId) return false;
        if (filter === 'unanswered' && isQuestionAnswered(question)) return false;
        return true;
      }),
    [questions, filter, courseId],
  );

  const reply = (questionId: string) => {
    const body = (drafts[questionId] ?? '').trim();
    if (!body) return;
    dispatch(
      {
        type: 'qna/reply',
        payload: {
          questionId,
          reply: makeReply({
            authorId: state.teacher.id,
            authorName: state.teacher.name,
            authorRole: 'teacher',
            body,
          }),
        },
      },
      'تم إرسال الرد',
    );
    setDrafts((current) => ({ ...current, [questionId]: '' }));
  };

  return (
    <>
      <PageHeader
        title="الأسئلة والأجوبة"
        description="أسئلة التلاميذ المشتركة داخل كل دورة. يظهر ردك لجميع الطلاب المشتركين، ويُزامَن مع تطبيقهم عند تصدير البيانات."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-softer text-brand">
            <MessageCircle size={19} />
          </span>
          <div>
            <div className="num text-xl font-bold text-ink">{questions.length}</div>
            <div className="text-xs text-muted">إجمالي الأسئلة</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-brand">
            <Clock3 size={19} />
          </span>
          <div>
            <div className="num text-xl font-bold text-ink">{unansweredCount}</div>
            <div className="text-xs text-muted">بانتظار الرد</div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2" role="tablist" aria-label="تصفية الأسئلة">
          {(
            [
              ['all', 'الكل'],
              ['unanswered', 'بدون رد'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-outline'}`}
            >
              {label} ({key === 'all' ? questions.length : unansweredCount})
            </button>
          ))}
        </div>

        <label className="w-full sm:max-w-xs">
          <span className="sr-only">تصفية حسب الدورة</span>
          <select
            className="input"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="all">كل الدورات</option>
            {coursesWithQuestions.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={24} />}
          title={filter === 'unanswered' ? 'لا أسئلة بانتظار الرد' : 'لا توجد أسئلة بعد'}
          description={
            filter === 'unanswered'
              ? 'أجبت على كل أسئلة التلاميذ. ستظهر هنا أي أسئلة جديدة.'
              : 'عندما يطرح تلميذ سؤالاً في إحدى دوراتك، ستجده هنا مع إمكانية الرد عليه.'
          }
        />
      ) : (
        <ul className="space-y-4">
          {visible.map((question) => {
            const course = state.courses.find(
              (item) => item.id === question.courseId,
            );
            const lessonTitle = lessonTitleForQuestion(state, question);
            const answered = isQuestionAnswered(question);
            const draft = drafts[question.id] ?? '';

            return (
              <li key={question.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink">
                      {question.authorName}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {course?.title ?? 'دورة محذوفة'} ·{' '}
                      {relativeTime(question.createdAt)}
                    </div>
                  </div>
                  <Pill tone={answered ? 'success' : 'warning'} dot>
                    {answered ? 'تمت الإجابة' : 'بانتظار الرد'}
                  </Pill>
                </div>

                {lessonTitle ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-softer px-2.5 py-1 text-xs font-semibold text-brand">
                    <BookOpen size={13} />
                    {lessonTitle}
                  </div>
                ) : null}

                <p className="mt-3 text-[14px] leading-7 text-ink">{question.body}</p>

                {question.replies.length > 0 ? (
                  <div className="mt-4 space-y-2.5">
                    {question.replies.map((item) => (
                      <div
                        key={item.id}
                        className={
                          item.authorRole === 'teacher'
                            ? 'rounded-xl border border-brand-soft bg-brand-softer p-3'
                            : 'rounded-xl bg-surface-alt p-3'
                        }
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-ink">
                            {item.authorName}
                          </span>
                          {item.authorRole === 'teacher' ? (
                            <Pill tone="brand">الأستاذ</Pill>
                          ) : null}
                          <span className="text-[11px] text-faint">
                            {relativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13px] leading-6 text-body">{item.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 border-t border-line pt-3">
                  <textarea
                    className="textarea"
                    style={{ minHeight: 80 }}
                    value={draft}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    placeholder="اكتب ردك على السؤال…"
                    maxLength={800}
                    aria-label={`الرد على سؤال ${question.authorName}`}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-muted">
                      يظهر ردك لجميع طلاب الدورة.
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={!draft.trim()}
                      onClick={() => reply(question.id)}
                    >
                      {answered ? <CheckCircle2 size={14} /> : <Send size={14} />}
                      إرسال الرد
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
