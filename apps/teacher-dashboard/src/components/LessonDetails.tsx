import { useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import type { Lesson } from '@ostadiplus/shared';
export function LessonDetails({
  lesson,
  onSave,
}: {
  lesson: Lesson;
  onSave: (patch: Partial<Lesson>) => void;
}) {
  const [description, setDescription] = useState(lesson.description ?? '');
  const [thumbnail, setThumbnail] = useState(lesson.thumbnailUrl ?? '');
  const [allowDownload, setDownload] = useState(lesson.allowDownload !== false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function choose(file?: File) {
    if (!file) return;
    setError('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError('اختر صورة JPG أو PNG أو WebP، أقل من 8 MB.');
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext('2d')!;
      const ratio = Math.max(960 / image.width, 540 / image.height);
      ctx.drawImage(
        image,
        (960 - image.width * ratio) / 2,
        (540 - image.height * ratio) / 2,
        image.width * ratio,
        image.height * ratio,
      );
      setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
    } catch {
      setError('تعذّرت قراءة الصورة.');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }
  return (
    <section className="card p-5">
      <h3 className="mb-4 font-bold">تفاصيل الدرس وظهوره في التطبيق</h3>
      <label
        className="mb-2 block text-sm font-semibold"
        htmlFor="lesson-description"
      >
        وصف الدرس
      </label>
      <textarea
        id="lesson-description"
        className="input min-h-28"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="ماذا سيتعلّم التلميذ في هذا الدرس؟"
      />
      {lesson.kind === 'video' ? (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold">الصورة المصغّرة للفيديو</p>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt="معاينة الصورة المصغرة"
              className="mb-3 aspect-video w-full max-w-sm rounded-xl object-cover"
            />
          ) : null}
          <label className="btn btn-outline cursor-pointer">
            <ImagePlus size={17} />
            {busy ? 'جارٍ تجهيز الصورة…' : 'اختيار صورة مصغّرة'}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="اختيار صورة مصغّرة"
              disabled={busy}
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </label>
          {thumbnail ? (
            <button
              className="btn btn-ghost ms-2"
              onClick={() => setThumbnail('')}
            >
              إزالة الصورة
            </button>
          ) : null}
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setDownload(e.target.checked)}
            />
            السماح بتنزيل الفيديو للمشاهدة دون إنترنت
          </label>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button
        className="btn btn-primary mt-4"
        disabled={busy}
        onClick={() =>
          onSave({
            description: description.trim(),
            thumbnailUrl: thumbnail || undefined,
            allowDownload,
          })
        }
      >
        <Save size={16} />
        حفظ تفاصيل الدرس
      </button>
    </section>
  );
}
