import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useRef, useState } from 'react';
import {
  Bold,
  CheckCircle2,
  Download,
  Eye,
  ImagePlus,
  Italic,
  Link2,
  List,
  Quote,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { Lesson } from '@ostadiplus/shared';
import { Field, Toggle } from '@/components/ui';
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
  useI18n();
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
      notify(validation ?? t('اكتب عنواناً من حرفين على الأقل.'), 'error');
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
        ? t('تم حفظ الدرس ونشره. انشر التحديثات لتصل إلى التطبيق.')
        : t('تم حفظ الدرس'),
    );
  }
  return (
    <section
      className="lesson-editor"
      aria-label={t('تحرير الدرس — {0}', [chapterTitle])}
    >
      <h2 className="sr-only">
        <bdi>{lesson.title}</bdi>
      </h2>
      <header className="lesson-editor-heading">
        <div className="lesson-editor-identity">
          <span className="lesson-kind-icon">
            <meta.icon size={18} aria-hidden="true" />
          </span>
          <span className="text-sm font-bold">{t(meta.label)}</span>
          <span className="status-label" data-draft={!lesson.published}>
            {lesson.published ? t('منشور') : t('مسودة')}
          </span>
        </div>
        <div className="lesson-save-actions">
          <span role="status" className="lesson-save-status">
            {busy ? t('جارٍ التجهيز…') : dirty ? t('غير محفوظ') : t('محفوظ')}
          </span>
          <button
            className={`btn btn-sm ${draft.published ? 'btn-primary' : 'btn-outline'}`}
            disabled={busy}
            onClick={() => save()}
          >
            <Save size={15} aria-hidden="true" />
            {t('حفظ الدرس')}
          </button>
          {!draft.published ? (
            <button
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => save(true)}
            >
              {t('حفظ ونشر')}
            </button>
          ) : null}
        </div>
      </header>
      <div className="lesson-editor-tabs">
        <div
          className="workspace-tabs border-0"
          role="tablist"
          aria-label={t('محرر الدرس')}
        >
          {(
            [
              { key: 'content', label: t('محتوى الدرس'), icon: meta.icon },
              { key: 'settings', label: t('الإعدادات'), icon: Settings2 },
              { key: 'preview', label: t('معاينة'), icon: Eye },
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
              <t.icon size={15} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="lesson-editor-body">
        {tab === 'content' ? (
          <div className="lesson-content-fields">
            <Field
              label={t('عنوان الدرس')}
              error={
                touched && draft.title.trim().length < 2
                  ? t('اكتب عنواناً من حرفين على الأقل.')
                  : undefined
              }
            >
              <input
                dir="auto"
                required
                aria-label={t('عنوان الدرس')}
                className="input lesson-title-input"
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                maxLength={100}
              />
            </Field>
            <section className="lesson-main-content" aria-label={t(meta.label)}>
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
            </section>
            <details className="lesson-optional-details">
              <summary>{t('تفاصيل إضافية')}</summary>
              <div className="lesson-optional-fields">
                <Field label={t('وصف الدرس')}>
                  <textarea
                    dir="auto"
                    className="textarea"
                    value={draft.description ?? ''}
                    onChange={(e) => patch({ description: e.target.value })}
                    maxLength={2000}
                  />
                </Field>
                {draft.kind === 'video' ? (
                  <div>
                    <h3 className="text-sm font-bold">
                      {t('الصورة المصغّرة')}
                    </h3>
                    <Thumbnail
                      value={draft.thumbnailUrl}
                      onChange={(thumbnailUrl) => patch({ thumbnailUrl })}
                      onBusy={setThumbnailBusy}
                    />
                  </div>
                ) : null}
              </div>
            </details>
          </div>
        ) : tab === 'settings' ? (
          <div className="lesson-settings-fields">
            <div className="setting-line">
              <p className="text-sm font-bold">{t('إظهار الدرس للتلاميذ')}</p>
              <Toggle
                checked={draft.published}
                onChange={(published) => patch({ published })}
                label={t('نشر الدرس')}
              />
            </div>
            {draft.kind === 'video' ? (
              <div className="setting-line">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Download size={16} aria-hidden="true" />
                  {t('السماح بالمشاهدة دون إنترنت')}
                </p>
                <Toggle
                  checked={draft.allowDownload !== false}
                  onChange={(allowDownload) => patch({ allowDownload })}
                  label={t('السماح بتنزيل الفيديو')}
                />
              </div>
            ) : null}
            {draft.kind === 'video' || draft.kind === 'pdf' ? (
              <p className="flex items-center gap-2 text-xs text-muted">
                <CheckCircle2
                  size={16}
                  className="text-brand"
                  aria-hidden="true"
                />
                {t('الواترمارك مفعّل')}
              </p>
            ) : null}
            <div className="lesson-delete-action">
              <button
                className="btn btn-outline btn-sm"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2 size={15} aria-hidden="true" />
                {t('حذف الدرس')}
              </button>
            </div>
          </div>
        ) : (
          <LessonPreview lesson={draft} />
        )}
        {touched && validation && draft.title.trim().length >= 2 ? (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-accent/30 p-3 text-xs leading-6"
          >
            {t(validation)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
function TextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  useI18n();
  const area = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || t('نص');
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
          { icon: Bold, label: t('عريض'), before: '**', after: '**' },
          { icon: Italic, label: t('مائل'), before: '*', after: '*' },
          { icon: List, label: t('قائمة'), before: '\n- ', after: '' },
          { icon: Quote, label: t('اقتباس'), before: '\n> ', after: '' },
          { icon: Link2, label: t('رابط'), before: '[', after: '](https://)' },
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
        dir="auto"
        ref={area}
        className="lesson-text-area"
        aria-label={t('محتوى الدرس المكتوب')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('اكتب محتوى الدرس هنا…')}
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
  useI18n();
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
      setError(t('اختر صورة JPG أو PNG أو WebP حتى 8 MB.'));
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
      setError(t('تعذّرت قراءة الصورة. اختر صورة أخرى.'));
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
            alt={t('معاينة الصورة المصغرة')}
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
          {busy ? t('جارٍ تجهيز الصورة…') : t('اختيار صورة مصغّرة')}
        </button>
        <p className="mt-2 text-[9px] text-muted">
          {t('JPG، PNG، WebP · حتى 8 MB')}
        </p>
        {value ? (
          <button
            className="mt-3 text-[10px] font-bold text-brand"
            disabled={busy}
            onClick={() => onChange(undefined)}
          >
            {t('إزالة الصورة')}
          </button>
        ) : null}
        {error ? (
          <p className="mt-2 text-[10px] text-brand" role="alert">
            {t(error)}
          </p>
        ) : null}
        <input
          dir="auto"
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t('اختيار صورة مصغّرة')}
          className="sr-only"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
function LessonPreview({ lesson }: { lesson: Lesson }) {
  useI18n();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState(false);
  return (
    <div>
      <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line p-5">
          <span className="text-[10px] text-brand">
            {t(KIND_META[lesson.kind].label)}
          </span>
          <h3 className="mt-2 text-lg font-bold">
            <bdi>{lesson.title}</bdi>
          </h3>
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
              {t('فتح المستند · ')}
              {lesson.pages}
              {t(' صفحات')}
            </a>
          ) : lesson.kind === 'quiz' ? (
            <div className="space-y-5">
              <p className="text-[10px] text-muted">
                {lesson.questions?.length ?? 0}
                {t(' أسئلة ·')}{' '}
                {lesson.timeLimitSec
                  ? t('{0} ثانية', [lesson.timeLimitSec])
                  : t('دون توقيت')}
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
                          dir="auto"
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
                  {result ? t('إعادة المعاينة') : t('إظهار التصحيح')}
                </button>
              ) : (
                <p className="text-xs text-muted">
                  {t('أضف أسئلة لمعاينتها هنا.')}
                </p>
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
