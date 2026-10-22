import { useRef, useState } from 'react';
import {
  Bold,
  Check,
  CheckCircle2,
  ChevronLeft,
  Download,
  Eye,
  ImagePlus,
  Italic,
  Link2,
  List,
  Quote,
  Save,
  Settings2,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { Lesson } from '@ostadiplus/shared';
import { Toggle } from '@/components/ui';
import { useStore } from '@/store/DemoStore';
import { KIND_META } from '@/lib/lessonKind';
import { bundledMediaUrl } from '@/lib/media';
import { lessonPublishError } from '@/lib/authoring';
import { MediaUpload } from './MediaUpload';
import { QuizBuilder } from './QuizBuilder';
import { RichText } from './RichText';
import { useUnsavedChanges } from './useUnsavedChanges';

export function LessonEditor({
  lesson,
  courseId,
  chapterId,
  chapterTitle,
  onDirty,
  onDelete,
}: {
  lesson: Lesson;
  courseId: string;
  chapterId: string;
  chapterTitle: string;
  onDirty: (dirty: boolean) => void;
  onDelete: () => void;
}) {
  const { dispatch, notify } = useStore();
  const [draft, setDraft] = useState<Lesson>(() => structuredClone(lesson));
  const [tab, setTab] = useState<'content' | 'settings' | 'preview'>('content');
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(lesson);
  const busy = uploading || thumbnailBusy;
  const meta = KIND_META[lesson.kind];
  useUnsavedChanges(dirty || busy, onDirty);
  const patch = (next: Partial<Lesson>) => setDraft((d) => ({ ...d, ...next }));
  const validation = lessonPublishError(draft);
  function save(publish?: boolean) {
    const willPublish = publish ?? draft.published;
    setTouched(willPublish);
    if (draft.title.trim().length < 2 || (willPublish && validation)) {
      setTouched(true);
      setTab('content');
      notify(validation ?? 'اكتب عنواناً من حرفين على الأقل.', 'error');
      return;
    }
    if (busy) return;
    const next = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description?.trim(),
      published: willPublish,
    };
    dispatch({
      type: 'lesson/update',
      payload: { courseId, chapterId, lessonId: lesson.id, patch: next },
    });
    setDraft(next);
    onDirty(false);
    notify(
      publish
        ? 'تم حفظ الدرس ونشره. انشر التحديثات لتصل إلى التطبيق.'
        : 'تم حفظ الدرس',
    );
  }
  return (
    <section className="lesson-editor">
      <header className="lesson-editor-heading">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-1 text-[10px] text-muted">
            <span className="truncate">{chapterTitle}</span>
            <ChevronLeft size={12} />
            <span>{meta.label}</span>
          </p>
          <h2 className="truncate text-lg font-bold">{lesson.title}</h2>
        </div>
        <span className={`status-label ${lesson.published ? '' : 'is-draft'}`}>
          {lesson.published ? 'منشور' : 'مسودة'}
        </span>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 sm:px-7">
        <div
          className="workspace-tabs border-0"
          role="tablist"
          aria-label="محرر الدرس"
        >
          {(
            [
              { key: 'content', label: 'محتوى الدرس', icon: meta.icon },
              { key: 'settings', label: 'الإعدادات', icon: Settings2 },
              { key: 'preview', label: 'معاينة', icon: Eye },
            ] as const
          ).map((t) => (
            <button
              role="tab"
              key={t.key}
              aria-selected={tab === t.key}
              className="workspace-tab flex items-center gap-2"
              disabled={busy}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
        <span
          className={`hidden items-center gap-1.5 text-[9px] sm:flex ${dirty ? 'text-brand' : 'text-muted'}`}
        >
          {dirty ? (
            <span className="size-1.5 rounded-full bg-brand" />
          ) : (
            <Check size={12} />
          )}{' '}
          {busy
            ? 'جارٍ تجهيز الملف'
            : dirty
              ? 'تغييرات غير محفوظة'
              : 'محفوظ في مساحتك'}
        </span>
      </div>
      <div className="lesson-editor-body">
        {tab === 'content' ? (
          <div className="space-y-7">
            <section>
              <EditorSection
                number="01"
                title="تفاصيل الدرس"
                description="عنوان واضح ووصف قصير يساعدان التلميذ على فهم ما سيتعلّمه."
              />
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="label">
                    عنوان الدرس <span className="text-brand">*</span>
                  </span>
                  <input
                    aria-label="عنوان الدرس"
                    className="input"
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    maxLength={100}
                  />
                </label>
                <label className="block">
                  <span className="label">
                    وصف الدرس{' '}
                    <span className="text-[10px] font-normal text-muted">
                      اختياري
                    </span>
                  </span>
                  <textarea
                    className="textarea min-h-24"
                    value={draft.description ?? ''}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="شنو غادي يفهم التلميذ من هذا الدرس؟"
                    maxLength={2000}
                  />
                </label>
              </div>
            </section>
            <section className="border-t border-line pt-6">
              <EditorSection
                number="02"
                title={
                  draft.kind === 'quiz'
                    ? 'بناء الاختبار'
                    : draft.kind === 'video'
                      ? 'ملف الفيديو'
                      : draft.kind === 'pdf'
                        ? 'المستند'
                        : 'محتوى الدرس'
                }
                description={
                  draft.kind === 'quiz'
                    ? 'حضّر الأسئلة والاختيارات، وحدّد الإجابات الصحيحة والتوقيت.'
                    : draft.kind === 'video'
                      ? 'ارفع الفيديو الأصلي أو اختر ملفاً من مكتبتك.'
                      : draft.kind === 'pdf'
                        ? 'أرفق الملخّص أو التمارين بصيغة PDF.'
                        : 'اكتب الدرس واستعمل أدوات التنسيق.'
                }
              />
              <div className="mt-5">
                {draft.kind === 'video' || draft.kind === 'pdf' ? (
                  <MediaUpload
                    lesson={draft}
                    onChange={patch}
                    onBusy={setUploading}
                  />
                ) : draft.kind === 'quiz' ? (
                  <QuizBuilder
                    questions={draft.questions ?? []}
                    timeLimitSec={draft.timeLimitSec ?? 0}
                    onChange={(questions) => patch({ questions })}
                    onTime={(timeLimitSec) => patch({ timeLimitSec })}
                    touched={touched}
                  />
                ) : (
                  <TextEditor
                    value={draft.body ?? ''}
                    onChange={(body) => patch({ body })}
                  />
                )}
              </div>
            </section>
            {draft.kind === 'video' ? (
              <section className="border-t border-line pt-6">
                <EditorSection
                  number="03"
                  title="الصورة المصغّرة"
                  description="أول صورة كيشوفها التلميذ. اختر صورة واضحة بنسبة 16:9."
                />
                <Thumbnail
                  value={draft.thumbnailUrl}
                  onChange={(thumbnailUrl) => patch({ thumbnailUrl })}
                  onBusy={setThumbnailBusy}
                />
              </section>
            ) : null}
          </div>
        ) : tab === 'settings' ? (
          <div className="space-y-7">
            <EditorSection
              number="01"
              title="الظهور والوصول"
              description="هذه الإعدادات تُطبّق بعد حفظ الدرس ونشر التحديثات."
            />
            <div className="setting-line">
              <div>
                <p className="text-xs font-bold">إظهار الدرس للتلاميذ</p>
                <p className="mt-2 text-[10px] leading-6 text-muted">
                  يبقى وصول التلميذ مرتبطاً باشتراكه ونشر الدورة.
                </p>
              </div>
              <Toggle
                checked={draft.published}
                onChange={(published) => patch({ published })}
                label="نشر الدرس"
              />
            </div>
            {draft.kind === 'video' ? (
              <div className="setting-line">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold">
                    <Download size={15} />
                    السماح بالمشاهدة دون إنترنت
                  </p>
                  <p className="mt-2 text-[10px] leading-6 text-muted">
                    التلميذ يقدر ينزّل الفيديو من داخل التطبيق.
                  </p>
                </div>
                <Toggle
                  checked={draft.allowDownload !== false}
                  onChange={(allowDownload) => patch({ allowDownload })}
                  label="السماح بتنزيل الفيديو"
                />
              </div>
            ) : null}
            <div className="flex items-center gap-3 rounded-lg bg-brand-soft/40 p-4">
              <CheckCircle2 size={19} className="shrink-0 text-brand" />
              <p className="text-[10px] leading-6 text-muted">
                الواترمارك ديال التلميذ كيبقى مفعّلاً فالفيديو وPDF داخل
                التطبيق.
              </p>
            </div>
            <div className="border-t border-line pt-6">
              <h3 className="text-xs font-bold">حذف الدرس</h3>
              <p className="my-3 text-[10px] leading-6 text-muted">
                الدرس ومحتواه سيتحيدان من المنهج بعد تأكيدك.
              </p>
              <button
                className="btn btn-outline btn-sm"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2 size={14} />
                حذف الدرس
              </button>
            </div>
          </div>
        ) : (
          <LessonPreview lesson={draft} />
        )}
        {touched && validation ? (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-accent/30 p-3 text-xs leading-6"
          >
            {validation}
          </p>
        ) : null}
      </div>
      <footer className="lesson-editor-footer">
        <span className="flex items-center gap-2 text-[10px] text-muted">
          {dirty ? (
            <span className="size-1.5 rounded-full bg-brand" />
          ) : (
            <Check size={13} />
          )}{' '}
          {busy
            ? 'انتظر اكتمال تجهيز الملف'
            : dirty
              ? 'احفظ تغييراتك قبل المغادرة'
              : 'كل التغييرات محفوظة'}
        </span>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${draft.published ? 'btn-primary' : 'btn-outline'}`}
            disabled={busy}
            onClick={() => save()}
          >
            <Save size={14} />
            حفظ الدرس
          </button>
          {!draft.published ? (
            <button
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => save(true)}
            >
              حفظ ونشر
            </button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
function EditorSection({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="num flex size-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-alt/50 text-[10px] text-brand">
        {number}
      </span>
      <div>
        <h3 className="text-[13px] font-bold">{title}</h3>
        <p className="mt-1 text-[10px] leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}
function TextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || 'نص';
    onChange(
      value.slice(0, start) + before + selected + after + value.slice(end),
    );
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="flex gap-1 border-b border-line bg-surface-alt/30 p-2">
        {[
          { icon: Bold, label: 'عريض', before: '**', after: '**' },
          { icon: Italic, label: 'مائل', before: '*', after: '*' },
          { icon: List, label: 'قائمة', before: '\n- ', after: '' },
          { icon: Quote, label: 'اقتباس', before: '\n> ', after: '' },
          { icon: Link2, label: 'رابط', before: '[', after: '](https://)' },
        ].map((t) => (
          <button
            key={t.label}
            className="btn btn-icon btn-ghost"
            aria-label={t.label}
            title={t.label}
            onClick={() => wrap(t.before, t.after)}
          >
            <t.icon size={15} />
          </button>
        ))}
      </div>
      <textarea
        ref={area}
        className="min-h-72 w-full resize-y border-0 p-4 text-xs leading-8 outline-none"
        aria-label="محتوى الدرس المكتوب"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="اكتب محتوى الدرس هنا…"
      />
    </div>
  );
}
function Thumbnail({
  value,
  onChange,
  onBusy,
}: {
  value?: string;
  onChange: (value?: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function choose(file?: File) {
    if (!file) return;
    setError('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError('اختر صورة JPG أو PNG أو WebP حتى 8 MB.');
      return;
    }
    setBusy(true);
    onBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error();
      const scale = Math.max(960 / img.width, 540 / img.height);
      ctx.drawImage(
        img,
        (960 - img.width * scale) / 2,
        (540 - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      );
      onChange(canvas.toDataURL('image/jpeg', 0.82));
    } catch {
      setError('تعذّرت قراءة الصورة. اختر صورة أخرى.');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      onBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <div className="mt-5 flex flex-wrap items-center gap-5">
      <div className="flex aspect-video w-44 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-surface-alt/40">
        {value ? (
          <img
            src={value}
            alt="معاينة الصورة المصغرة"
            className="size-full object-cover"
          />
        ) : (
          <ImagePlus size={25} strokeWidth={1.3} className="text-muted" />
        )}
      </div>
      <div>
        <button
          className="btn btn-outline btn-sm"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={14} />
          {busy ? 'جارٍ تجهيز الصورة…' : 'اختيار صورة مصغّرة'}
        </button>
        <p className="mt-2 text-[9px] text-muted">JPG، PNG، WebP · حتى 8 MB</p>
        {value ? (
          <button
            className="mt-3 text-[10px] font-bold text-brand"
            disabled={busy}
            onClick={() => onChange(undefined)}
          >
            إزالة الصورة
          </button>
        ) : null}
        {error ? (
          <p className="mt-2 text-[10px] text-brand" role="alert">
            {error}
          </p>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="اختيار صورة مصغّرة"
          className="sr-only"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
function LessonPreview({ lesson }: { lesson: Lesson }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState(false);
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 rounded-lg bg-brand-soft/40 px-4 py-3 text-[10px] text-muted">
        <Smartphone size={16} className="text-brand" />
        معاينة المحتوى قبل الحفظ. المزامنة ضرورية باش يبان فالتطبيق.
      </div>
      <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line p-5">
          <span className="text-[10px] text-brand">
            {KIND_META[lesson.kind].label}
          </span>
          <h3 className="mt-2 text-lg font-bold">{lesson.title}</h3>
          {lesson.description ? (
            <p className="mt-3 text-xs leading-7 text-muted">
              {lesson.description}
            </p>
          ) : null}
        </div>
        <div className="p-5">
          {lesson.kind === 'video' && lesson.file ? (
            <video
              controls
              playsInline
              src={bundledMediaUrl('video', lesson.file)}
              poster={lesson.thumbnailUrl}
              className="aspect-video w-full rounded-lg bg-ink"
            />
          ) : lesson.kind === 'pdf' && lesson.file ? (
            <a
              href={bundledMediaUrl('doc', lesson.file)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline w-full"
            >
              فتح المستند · {lesson.pages} صفحات
            </a>
          ) : lesson.kind === 'quiz' ? (
            <div className="space-y-5">
              <p className="text-[10px] text-muted">
                {lesson.questions?.length ?? 0} أسئلة ·{' '}
                {lesson.timeLimitSec
                  ? `${lesson.timeLimitSec} ثانية`
                  : 'دون توقيت'}
              </p>
              {lesson.questions?.map((q, i) => (
                <fieldset key={q.id}>
                  <legend className="mb-3 text-xs font-bold">
                    {i + 1}. {q.prompt}
                  </legend>
                  <div className="space-y-2">
                    {q.options.map((o) => (
                      <label
                        key={o.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-xs ${result && q.correctIds.includes(o.id) ? 'border-brand bg-brand-soft' : 'border-line'}`}
                      >
                        <input
                          type="checkbox"
                          checked={(answers[q.id] ?? []).includes(o.id)}
                          disabled={result}
                          onChange={(e) =>
                            setAnswers((a) => ({
                              ...a,
                              [q.id]: e.target.checked
                                ? [...(a[q.id] ?? []), o.id]
                                : (a[q.id] ?? []).filter((id) => id !== o.id),
                            }))
                          }
                        />
                        {o.text}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              {(lesson.questions?.length ?? 0) > 0 ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (result) setAnswers({});
                    setResult(!result);
                  }}
                >
                  {result ? 'إعادة المعاينة' : 'إظهار التصحيح'}
                </button>
              ) : (
                <p className="text-xs text-muted">أضف أسئلة لمعاينتها هنا.</p>
              )}
            </div>
          ) : (
            <RichText text={lesson.body ?? ''} />
          )}
        </div>
      </div>
    </div>
  );
}
