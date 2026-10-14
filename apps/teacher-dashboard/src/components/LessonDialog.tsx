import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Film, UploadCloud } from 'lucide-react';
import { formatDuration, formatSize } from '@ostadiplus/shared';
import { Field, Modal, Toggle } from '@/components/ui';
import { library, type LibraryItem, type LibraryKind } from '@/lib/library';
import { bundledMediaUrl, prepareUpload } from '@/lib/media';
import { useStore, type Action } from '@/store/DemoStore';

interface Selection {
  kind: LibraryKind;
  file: string;
  durationSec: number;
  pages: number;
  sizeMb: number;
  poster?: string;
  source: 'library' | 'upload';
}

export interface LessonDialogProps {
  open: boolean;
  courseId: string;
  chapterId: string;
  /** `null` = create, otherwise edit. */
  lesson: {
    id: string;
    title: string;
    kind: LibraryKind;
    file: string;
    durationSec: number;
    pages: number;
    sizeMb: number;
    published: boolean;
  } | null;
  onClose: () => void;
}

function stripExtension(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

export function LessonDialog({
  open,
  courseId,
  chapterId,
  lesson,
  onClose,
}: LessonDialogProps) {
  const { dispatch, notify } = useStore();
  const [title, setTitle] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [kindFilter, setKindFilter] = useState<LibraryKind>('video');
  const [published, setPublished] = useState(true);
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setUploading(false);
    setProgress(0);
    if (lesson) {
      setTitle(lesson.title);
      setPublished(lesson.published);
      const item = library.find((entry) => entry.file === lesson.file);
      setKindFilter(lesson.kind);
      setSelection({
        kind: lesson.kind,
        file: lesson.file,
        durationSec: lesson.durationSec,
        pages: lesson.pages,
        sizeMb: lesson.sizeMb,
        poster: item?.poster,
        source: item ? 'library' : 'upload',
      });
    } else {
      setTitle('');
      setPublished(true);
      setSelection(null);
      setKindFilter('video');
    }
  }, [open, lesson]);

  const items = library.filter((item) => item.kind === kindFilter);
  const invalid = title.trim().length < 2 || !selection;

  function selectItem(item: LibraryItem) {
    setKindFilter(item.kind);
    setSelection({
      kind: item.kind,
      file: item.file,
      durationSec: item.durationSec,
      pages: item.pages,
      sizeMb: item.sizeMb,
      poster: item.poster,
      source: 'library',
    });
    if (!title.trim()) setTitle(item.title);
  }

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(6);
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(92, value + 6 + Math.random() * 12));
    }, 90);
    try {
      const prepared = await prepareUpload(file);
      const nextKind: LibraryKind = prepared.kind === 'pdf' ? 'pdf' : 'video';
      setProgress(100);
      setKindFilter(nextKind);
      setSelection({
        kind: nextKind,
        file: prepared.name,
        durationSec: prepared.durationSec,
        pages: prepared.pages,
        sizeMb: prepared.sizeMb,
        source: 'upload',
      });
      if (!title.trim()) setTitle(stripExtension(file.name));
      notify('تم رفع الملف وقراءة بياناته');
    } catch {
      notify('تعذّر رفع الملف من هذا المتصفح', 'error');
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  }

  function save() {
    setTouched(true);
    if (invalid || !selection) return;
    const payload = {
      title: title.trim(),
      kind: selection.kind,
      file: selection.file,
      durationSec: selection.kind === 'video' ? selection.durationSec : 0,
      pages: selection.kind === 'pdf' ? selection.pages : 0,
      sizeMb: selection.sizeMb,
      published,
    };

    const action: Action = lesson
      ? {
          type: 'lesson/update',
          payload: { courseId, chapterId, lessonId: lesson.id, patch: payload },
        }
      : { type: 'lesson/add', payload: { courseId, chapterId, lesson: payload } };

    dispatch(action);
    notify(lesson ? 'تم تحديث الدرس' : 'تمت إضافة الدرس');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={lesson ? 'تعديل الدرس' : 'إضافة درس'}
      description="اختر فيديو أو مستنداً من مكتبة الوسائط، أو ارفع ملفاً جديداً من جهازك."
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            {lesson ? 'حفظ التعديلات' : 'إضافة الدرس'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field
          label="عنوان الدرس"
          error={touched && title.trim().length < 2 ? 'اكتب عنواناً واضحاً.' : undefined}
        >
          <input
            className="input"
            value={title}
            maxLength={90}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="مثال: قواعد حساب النهايات"
          />
        </Field>

        <div>
          <span className="label">مصدر المحتوى</span>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm ${
                selection?.source !== 'upload' ? 'btn-primary' : 'btn-outline'
              }`}
              onClick={() => setSelection(null)}
            >
              <Film size={15} />
              مكتبة الوسائط
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                selection?.source === 'upload' ? 'btn-primary' : 'btn-outline'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud size={15} />
              رفع ملف
            </button>
          </div>

          {selection?.source === 'upload' ? (
            <div className="rounded-xl border border-line bg-surface-alt px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink" dir="ltr">
                    {selection.file}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {selection.kind === 'video'
                      ? `${formatDuration(selection.durationSec)} · ${formatSize(selection.sizeMb)}`
                      : `${selection.pages} صفحات · ${formatSize(selection.sizeMb)}`}
                    {' · '}
                    محفوظ داخل لوحة الأستاذ
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileRef.current?.click()}
                >
                  استبدال
                </button>
              </div>
              {uploading ? (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-brand transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    جاري الرفع… <span className="num">{Math.round(progress)}%</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-3 flex gap-2" role="tablist" aria-label="نوع المحتوى">
                {(
                  [
                    ['video', 'فيديو'],
                    ['pdf', 'مستند PDF'],
                  ] as [LibraryKind, string][]
                ).map(([key, labelText]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={kindFilter === key}
                    className={`btn btn-sm ${
                      kindFilter === key ? 'btn-soft' : 'btn-outline'
                    }`}
                    onClick={() => setKindFilter(key)}
                  >
                    {labelText}
                  </button>
                ))}
              </div>

              <div className="scrollbar-slim grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {items.map((item) => {
                  const selected = selection?.file === item.file;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 text-start transition-colors ${
                        selected
                          ? 'border-brand bg-brand-softer'
                          : 'border-line bg-surface hover:bg-surface-alt'
                      }`}
                    >
                      <MediaThumb item={item} />
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
                      {selected ? (
                        <Check size={16} className="shrink-0 text-brand" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {touched && !selection ? (
            <p className="mt-2 text-xs font-semibold text-danger">
              اختر ملفاً قبل إضافة الدرس.
            </p>
          ) : null}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="video/*,application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />

        <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">إظهار الدرس للتلاميذ</div>
            <div className="text-xs text-muted">
              الدروس المخفية لا تظهر في تطبيق الطالب حتى تنشرها.
            </div>
          </div>
          <Toggle checked={published} onChange={setPublished} label="إظهار الدرس" />
        </div>
      </div>
    </Modal>
  );
}

function MediaThumb({ item }: { item: LibraryItem }) {
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
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
      style={{
        background:
          item.kind === 'video' ? 'var(--color-brand-soft)' : 'var(--color-danger-soft)',
        color:
          item.kind === 'video' ? 'var(--color-brand-dark)' : 'var(--color-danger)',
      }}
    >
      {item.kind === 'video' ? <Film size={18} /> : <FileText size={18} />}
    </span>
  );
}
