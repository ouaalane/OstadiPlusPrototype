import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleHelp,
  Clock3,
  FileUp,
  Plus,
  Trash2,
} from 'lucide-react';
import type { QuizQuestion } from '@ostadiplus/shared';
import {
  authoringId,
  createQuestion,
  parseQuizImport,
  questionError,
} from '@/lib/authoring';
export function QuizBuilder({
  questions,
  timeLimitSec,
  onChange,
  onTime,
  touched,
}: {
  questions: QuizQuestion[];
  timeLimitSec: number;
  onChange: (q: QuizQuestion[]) => void;
  onTime: (s: number) => void;
  touched: boolean;
}) {
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const index = Math.min(active, Math.max(0, questions.length - 1));
  const question = questions[index];
  function patch(data: Partial<QuizQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...data } : q)));
  }
  function add() {
    onChange([...questions, createQuestion()]);
    setActive(questions.length);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024)
        throw new Error('الحد الأقصى لملف JSON هو 1 MB.');
      const parsed = parseQuizImport(await file.text());
      onChange(parsed.questions);
      onTime(parsed.timeLimitSec);
      setActive(0);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر استيراد الاختبار.');
    } finally {
      if (input.current) input.current.value = '';
    }
  }
  function move(dir: -1 | 1) {
    const next = [...questions];
    const target = index + dir;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setActive(target);
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-alt/30 p-4">
        <div className="flex items-center gap-2">
          <Clock3 size={16} className="text-brand" />
          <label className="text-[11px] font-bold" htmlFor="quiz-time">
            المدة بالثواني
          </label>
          <input
            id="quiz-time"
            aria-label="مدة الاختبار بالثواني"
            className="input num max-w-24 text-center"
            type="number"
            min="0"
            max="86400"
            step="1"
            value={timeLimitSec}
            onChange={(e) => onTime(Number(e.target.value))}
          />
          <span className="text-[9px] text-muted">0 = دون توقيت</span>
        </div>
        <button
          className="flex items-center gap-2 text-[11px] font-bold text-brand"
          onClick={() => input.current?.click()}
        >
          <FileUp size={15} />
          استيراد JSON
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          aria-label="استيراد أسئلة JSON"
          className="sr-only"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-accent/30 p-3 text-xs leading-6"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="me-2 text-[10px] font-bold text-muted">الأسئلة</span>
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setActive(i)}
            aria-label={`فتح السؤال ${i + 1}`}
            aria-pressed={index === i}
            className={`flex size-8 items-center justify-center rounded-lg border text-[11px] ${index === i ? 'border-brand bg-brand text-white' : touched && questionError(q) ? 'border-brand bg-accent/40' : 'border-line bg-white text-muted'}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          onClick={add}
          disabled={questions.length >= 100}
        >
          <Plus size={14} />
          سؤال
        </button>
      </div>
      {question ? (
        <section className="rounded-xl border border-line">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <span className="text-[11px] font-bold">
              السؤال {index + 1}{' '}
              <span className="ms-2 font-normal text-muted">
                من {questions.length}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-icon btn-ghost"
                aria-label="نقل السؤال لأعلى"
                disabled={index === 0}
                onClick={() => move(-1)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="btn btn-icon btn-ghost"
                aria-label="نقل السؤال لأسفل"
                disabled={index === questions.length - 1}
                onClick={() => move(1)}
              >
                <ArrowDown size={14} />
              </button>
              <button
                className="btn btn-icon btn-ghost"
                aria-label="حذف السؤال"
                onClick={() => {
                  onChange(questions.filter((_, i) => i !== index));
                  setActive(Math.max(0, index - 1));
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </header>
          <div className="space-y-5 p-4 sm:p-5">
            <label className="block">
              <span className="label">نص السؤال</span>
              <textarea
                className="textarea min-h-24"
                placeholder="اكتب السؤال هنا…"
                value={question.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
                maxLength={1000}
              />
            </label>
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold">اختيارات الإجابة</p>
                <span className="text-[10px] text-muted">
                  علّم الإجابة الصحيحة، أو أكثر من إجابة
                </span>
              </div>
              <div className="space-y-2">
                {question.options.map((o, i) => {
                  const correct = question.correctIds.includes(o.id);
                  return (
                    <div
                      key={o.id}
                      className={`flex items-center gap-3 rounded-lg border p-2 ${correct ? 'border-brand/40 bg-brand-soft/40' : 'border-line'}`}
                    >
                      <button
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${correct ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-muted'}`}
                        role="checkbox"
                        aria-checked={correct}
                        aria-label={`الإجابة ${i + 1} صحيحة`}
                        onClick={() =>
                          patch({
                            correctIds: correct
                              ? question.correctIds.filter((id) => id !== o.id)
                              : [...question.correctIds, o.id],
                          })
                        }
                      >
                        {correct ? (
                          <Check size={14} />
                        ) : (
                          <span className="num text-[10px]">
                            {String.fromCharCode(65 + i)}
                          </span>
                        )}
                      </button>
                      <input
                        aria-label={`نص الإجابة ${i + 1}`}
                        className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-xs outline-none"
                        value={o.text}
                        placeholder={`الاختيار ${i + 1}`}
                        maxLength={500}
                        onChange={(e) =>
                          patch({
                            options: question.options.map((v) =>
                              v.id === o.id
                                ? { ...v, text: e.target.value }
                                : v,
                            ),
                          })
                        }
                      />
                      <button
                        className="btn btn-icon btn-ghost"
                        aria-label={`حذف الإجابة ${i + 1}`}
                        disabled={question.options.length <= 2}
                        onClick={() =>
                          patch({
                            options: question.options.filter(
                              (v) => v.id !== o.id,
                            ),
                            correctIds: question.correctIds.filter(
                              (id) => id !== o.id,
                            ),
                          })
                        }
                      >
                        <XIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                className="btn btn-ghost btn-sm mt-3"
                onClick={() =>
                  patch({
                    options: [
                      ...question.options,
                      { id: authoringId(), text: '' },
                    ],
                  })
                }
                disabled={question.options.length >= 12}
              >
                <Plus size={14} />
                إضافة اختيار
              </button>
            </div>
            {touched && questionError(question) ? (
              <p role="alert" className="text-xs text-brand">
                {questionError(question)}
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <CircleHelp
            className="mx-auto mb-3 text-brand"
            size={30}
            strokeWidth={1.4}
          />
          <p className="text-sm font-bold">ابدأ بسؤالك الأول</p>
          <p className="mt-2 text-[11px] text-muted">
            اختيار واحد أو عدة اختيارات صحيحة، مع توقيت اختياري.
          </p>
          <button className="btn btn-primary btn-sm mt-5" onClick={add}>
            <Plus size={14} />
            إضافة سؤال
          </button>
        </div>
      )}
      <p className="flex gap-2 text-[10px] leading-6 text-muted">
        <CircleHelp size={13} className="mt-1 shrink-0" />
        الاختبار المحدّد بالوقت يُرسل تلقائياً عند انتهاء العدّاد. النتائج تظهر
        في «التقدّم والنتائج» بعد المزامنة.
      </p>
    </div>
  );
}
function XIcon() {
  return (
    <span aria-hidden="true" className="text-base leading-none">
      ×
    </span>
  );
}
