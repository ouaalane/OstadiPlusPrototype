import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  Film,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import { formatDuration, formatSize, type Lesson } from '@ostadiplus/shared';
import { Modal } from '@/components/ui';
import { library } from '@/lib/library';
import { bundledMediaUrl, listUploads, prepareUpload } from '@/lib/media';

type Asset = Pick<Lesson, 'file' | 'durationSec' | 'pages' | 'sizeMb'>;
export function MediaUpload({
  lesson,
  onChange,
  onBusy,
}: {
  lesson: Lesson;
  onChange: (asset: Asset) => void;
  onBusy: (busy: boolean) => void;
}) {
  useI18n();
  const [stage, setStage] = useState<'idle' | 'reading' | 'uploading' | 'done'>(
    'idle',
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState(false);
  const [drag, setDrag] = useState(false);
  const [uploads, setUploads] = useState<
    Awaited<ReturnType<typeof listUploads>>
  >([]);
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const last = useRef<File | null>(null);
  const kind = lesson.kind === 'pdf' ? 'pdf' : 'video';
  const busy = stage === 'reading' || stage === 'uploading';
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  async function choose(file?: File) {
    if (!file || busy) return;
    last.current = file;
    setError('');
    setCanRetry(false);
    const matches =
      kind === 'pdf'
        ? /\.pdf$/i.test(file.name)
        : /\.(mp4|webm|mov)$/i.test(file.name);
    if (!matches) {
      setError(
        kind === 'pdf'
          ? t('اختر ملف PDF صالحاً.')
          : t('اختر فيديو بصيغة MP4 أو WebM أو MOV.'),
      );
      return;
    }
    if (file.size > 100 * 1024 * 1024 || !file.size) {
      setError(t('اختر ملفاً غير فارغ، لا يتجاوز 100 MB.'));
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setStage('reading');
    setProgress(0);
    try {
      const result = await prepareUpload(file, {
        signal: abort.signal,
        onProgress: (percent) => {
          setStage('uploading');
          setProgress(percent);
        },
      });
      onChange({
        file: result.name,
        durationSec: result.durationSec,
        pages: result.pages,
        sizeMb: result.sizeMb,
      });
      setStage('done');
    } catch (e) {
      setStage('idle');
      setCanRetry(!(e instanceof DOMException && e.name === 'AbortError'));
      setError(
        e instanceof DOMException && e.name === 'AbortError'
          ? t('تم إلغاء الرفع. يمكنك اختيار الملف من جديد.')
          : e instanceof Error
            ? e.message
            : t('تعذّر رفع الملف. حاول مجدداً.'),
      );
    } finally {
      controller.current = null;
      if (input.current) input.current.value = '';
    }
  }
  async function showLibrary() {
    setPicker(true);
    setPickerLoading(true);
    setPickerError(false);
    try {
      setUploads(await listUploads());
    } catch {
      setUploads([]);
      setPickerError(true);
    } finally {
      setPickerLoading(false);
    }
  }
  return (
    <div className="space-y-4">
      {lesson.file ? (
        <div className="overflow-hidden rounded-xl border border-line">
          {kind === 'video' ? (
            <video
              controls
              playsInline
              preload="metadata"
              src={bundledMediaUrl('video', lesson.file)}
              poster={lesson.thumbnailUrl || undefined}
              className="aspect-video max-h-[330px] w-full bg-ink"
            />
          ) : (
            <div className="flex items-center gap-4 bg-surface-alt/50 p-6">
              <span className="flex size-14 items-center justify-center rounded-xl bg-white text-brand">
                <FileText size={27} strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{t('المستند مرفق بالدرس')}</p>
                <p className="mt-2 text-[10px] text-muted">
                  {lesson.pages}
                  {t(' صفحات · ')}
                  {formatSize(lesson.sizeMb)}
                </p>
              </div>
              <a
                href={bundledMediaUrl('doc', lesson.file)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
              >
                {t('فتح PDF')}
              </a>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white p-3 text-[10px]">
            <span className="flex items-center gap-2 text-muted">
              <Check size={13} className="text-brand" />
              {kind === 'video'
                ? formatDuration(lesson.durationSec)
                : t('{0} صفحات', [lesson.pages])}
              <span className="text-line-strong">/</span>
              {formatSize(lesson.sizeMb)}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {t('استبدال الملف')}
            </button>
          </div>
        </div>
      ) : null}
      {!lesson.file && !busy ? (
        <button
          className={`upload-zone ${drag ? 'is-dragging' : ''}`}
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void choose(e.dataTransfer.files[0]);
          }}
        >
          <span className="upload-zone-icon">
            <UploadCloud size={28} strokeWidth={1.4} />
          </span>
          <span className="mt-4 block text-sm font-bold">
            {t('اسحب ')}
            {kind === 'pdf' ? t('المستند') : t('الفيديو')}
            {t(' هنا، أو اختر ملفاً')}
          </span>
          <span className="mt-2 block text-[10px] text-muted">
            {kind === 'pdf' ? 'PDF' : t('MP4، WebM، MOV')}
            {t(' · حتى 100 MB')}
          </span>
          <span className="btn btn-primary btn-sm mt-5">{t('اختيار ملف')}</span>
        </button>
      ) : null}
      {busy ? (
        <div
          className="rounded-xl border border-brand/20 bg-brand-soft/40 p-5"
          role="status"
        >
          <div className="flex items-center gap-3">
            <LoaderCircle size={20} className="animate-spin text-brand" />
            <span className="flex-1 text-xs font-bold">
              {stage === 'reading'
                ? t('جارٍ التحقق من الملف وقراءة بياناته…')
                : progress === 100
                  ? t('اكتمل الإرسال، جارٍ حفظ الملف…')
                  : t('جارٍ رفع الملف…')}
            </span>
            <button
              onClick={() => controller.current?.abort()}
              aria-label={t('إلغاء رفع الملف')}
              className="btn btn-icon btn-ghost"
            >
              <X size={16} />
            </button>
          </div>
          {stage === 'uploading' ? (
            <>
              <progress
                className="upload-progress mt-4"
                max="100"
                value={progress}
                aria-label={t('تقدّم رفع الملف')}
              />
              <span className="num mt-2 block text-[10px] text-muted">
                {progress}%
              </span>
            </>
          ) : null}
          <p className="mt-2 text-[10px] text-muted">
            {t('يمكنك إلغاء العملية. لا تغلق هذه الصفحة قبل اكتمال الرفع.')}
          </p>
        </div>
      ) : null}
      {stage === 'done' ? (
        <p
          role="status"
          className="flex items-center gap-2 text-[11px] text-brand"
        >
          <Check size={14} />
          {t('الملف جاهز. احفظ الدرس لتثبيت التغيير.')}
        </p>
      ) : null}
      {error ? (
        <div
          className="rounded-lg border border-brand/20 bg-accent/20 p-4"
          role="alert"
        >
          <p className="text-xs leading-6">{t(error)}</p>
          {last.current && canRetry ? (
            <button
              className="mt-3 flex items-center gap-2 text-[11px] font-bold text-brand"
              onClick={() => choose(last.current ?? undefined)}
            >
              <RefreshCw size={13} />
              {t('إعادة المحاولة')}
            </button>
          ) : null}
        </div>
      ) : null}
      <input
        dir="auto"
        ref={input}
        type="file"
        className="sr-only"
        aria-label={kind === 'pdf' ? t('رفع ملف PDF') : t('رفع فيديو')}
        accept={
          kind === 'pdf'
            ? '.pdf,application/pdf'
            : '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime'
        }
        disabled={busy}
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
        <span>
          {kind === 'video'
            ? t('MP4 / H.264 كيعطي أفضل توافق مع الهواتف.')
            : t('المستند يظهر للتلميذ بالزوم والواترمارك.')}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => void showLibrary()}
        >
          <FolderOpen size={14} />
          {t('اختيار من المكتبة')}
        </button>
      </div>
      {picker ? (
        <Modal
          open
          onClose={() => setPicker(false)}
          title={kind === 'pdf' ? t('مكتبة المستندات') : t('مكتبة الفيديو')}
          description={t('اختر ملفاً موجوداً لإضافته إلى هذا الدرس.')}
          size="lg"
        >
          {pickerLoading ? (
            <p role="status" className="mb-4 text-sm text-muted">
              {t('جارٍ تحميل الملفات المرفوعة…')}
            </p>
          ) : null}
          {pickerError ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-line bg-accent/20 p-4 text-sm"
            >
              <p>
                {t(
                  'تعذّر تحميل الملفات المرفوعة. الملفات المرفقة بالنسخة تبقى متاحة أدناه.',
                )}
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm mt-3"
                onClick={() => void showLibrary()}
              >
                {t('إعادة تحميل المكتبة')}
              </button>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2" aria-busy={pickerLoading}>
            {[
              ...library
                .filter((i) => i.kind === kind)
                .map((i) => ({
                  file: i.file,
                  title: i.title,
                  durationSec: i.durationSec,
                  pages: i.pages,
                  sizeMb: i.sizeMb,
                })),
              ...uploads
                .filter(
                  (i) =>
                    i.kind === kind && !library.some((a) => a.file === i.name),
                )
                .map((i) => ({
                  file: i.name,
                  title: t('ملف مرفوع · {0}', [
                    i.name.split('/').pop() ?? i.name,
                  ]),
                  durationSec: i.durationSec,
                  pages: i.pages,
                  sizeMb: i.sizeMb,
                })),
            ].map((i) => (
              <button
                key={i.file}
                className="flex h-full min-h-24 items-start gap-3 rounded-lg border border-line p-4 text-start hover:bg-surface-alt"
                onClick={() => {
                  onChange({
                    file: i.file,
                    durationSec: i.durationSec,
                    pages: i.pages,
                    sizeMb: i.sizeMb,
                  });
                  setPicker(false);
                }}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  {kind === 'video' ? (
                    <Film size={19} />
                  ) : (
                    <FileText size={19} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-6 [overflow-wrap:anywhere]">
                    {i.title}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted">
                    {kind === 'video'
                      ? formatDuration(i.durationSec)
                      : t('{0} صفحات', [i.pages])}{' '}
                    · {formatSize(i.sizeMb)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
