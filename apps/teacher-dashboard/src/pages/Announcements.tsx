import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Megaphone, Plus, Send, Trash2 } from 'lucide-react';
import { relativeTime } from '@ostadiplus/shared';
import { Confirm, EmptyState, Field, Modal, PageHeader, Pill } from '@/components/ui';
import { useAction, useStore, type NewAnnouncement } from '@/store/DemoStore';

export default function Announcements() {
  const { state } = useStore();
  const dispatch = useAction();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('action') === 'new') {
      setCreating(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const targetLabel = (courseId: string | null) =>
    courseId
      ? state.courses.find((c) => c.id === courseId)?.title ?? 'دورة محذوفة'
      : 'جميع التلاميذ';

  const deleteTarget = state.announcements.find((a) => a.id === pendingDelete);

  return (
    <>
      <PageHeader
        title="الإعلانات"
        description="أرسل إعلاناً لدورة معيّنة أو لجميع التلاميذ — يظهر في تبويب الإعلانات بالتطبيق."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={17} />
            إعلان جديد
          </button>
        }
      />

      {state.announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={24} />}
          title="لا إعلانات بعد"
          description="أول إعلان قد يكون: موعد الحصة القادمة، واجب جديد، أو فتح التسجيلات."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus size={17} />
              إعلان جديد
            </button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {state.announcements.map((item) => (
            <li key={item.id} className="card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                  <Megaphone size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15.5px] font-bold text-ink">{item.title}</h3>
                    <Pill tone={item.courseId ? 'brand' : 'info'} dot>
                      {targetLabel(item.courseId)}
                    </Pill>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-body">
                    {item.body}
                  </p>
                  <div className="mt-2.5 text-xs text-faint">
                    نُشر {relativeTime(item.publishedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon shrink-0"
                  style={{ color: 'var(--color-danger)' }}
                  aria-label={`حذف إعلان ${item.title}`}
                  onClick={() => setPendingDelete(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <NewAnnouncementModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(payload) => {
          dispatch(
            { type: 'announcement/create', payload },
            payload.courseId
              ? 'نُشر الإعلان — يظهر الآن لطلبة الدورة'
              : 'نُشر الإعلان — يظهر الآن لجميع التلاميذ',
          );
          setCreating(false);
        }}
      />

      <Confirm
        open={deleteTarget !== undefined}
        title="حذف الإعلان؟"
        message={`سيختفي «${deleteTarget?.title ?? ''}» من تطبيق التلاميذ نهائياً.`}
        confirmLabel="حذف الإعلان"
        onConfirm={() => {
          if (!pendingDelete) return;
          dispatch({ type: 'announcement/delete', payload: { id: pendingDelete } }, 'تم حذف الإعلان');
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function NewAnnouncementModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: NewAnnouncement) => void;
}) {
  const { state } = useStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setBody('');
      setCourseId('');
      setTouched(false);
    }
  }, [open]);

  const titleInvalid = title.trim().length < 3;
  const bodyInvalid = body.trim().length < 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إعلان جديد"
      description="يُنشر فوراً ويظهر للتلاميذ في تبويب الإعلانات."
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setTouched(true);
              if (titleInvalid || bodyInvalid) return;
              onCreate({
                title: title.trim(),
                body: body.trim(),
                courseId: courseId || null,
              });
            }}
          >
            <Send size={16} />
            نشر الإعلان
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="عنوان الإعلان"
          error={touched && titleInvalid ? 'اكتب عنواناً من 3 أحرف على الأقل.' : undefined}
        >
          <input
            className="input"
            value={title}
            autoFocus
            maxLength={90}
            placeholder="مثال: حصة تصحيحية السبت"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        <Field
          label="نص الإعلان"
          hint="اكتب بسطر أو سطرين، مثال: «تم رفع تسجيل حصة الأمس في الدورة»."
          error={touched && bodyInvalid ? 'النص قصير جداً.' : undefined}
        >
          <textarea
            className="textarea"
            style={{ minHeight: 110 }}
            value={body}
            maxLength={400}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>

        <Field label="الجمهور">
          <select
            className="input"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">جميع التلاميذ المشتركين</option>
            {state.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
