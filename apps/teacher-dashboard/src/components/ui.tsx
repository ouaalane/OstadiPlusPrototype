import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { coverGradients, palette } from '@ostadiplus/shared';
import { useStore } from '@/store/DemoStore';

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const AVATAR_TONES = [
  ['#2E7BFF', '#1E3FCC'],
  ['#4F6BFF', '#2F3ED8'],
  ['#22B8F5', '#0C7BD6'],
  ['#12B8A6', '#0A7C8F'],
  ['#6D5BF5', '#4226C8'],
  ['#FF9F43', '#F07A00'],
] as const;

export function Avatar({
  label,
  size = 40,
  seed = 0,
  square = false,
}: {
  label: string;
  size?: number;
  seed?: number;
  square?: boolean;
}) {
  const [from, to] = AVATAR_TONES[Math.abs(seed) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center font-bold text-white ${
        square ? 'rounded-md' : 'rounded-full'
      }`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.36)),
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Pills                                                               */
/* ------------------------------------------------------------------ */

export type PillTone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'info';

const PILL_STYLES: Record<PillTone, { bg: string; fg: string }> = {
  brand: { bg: 'var(--color-brand-soft)', fg: 'var(--color-brand-dark)' },
  success: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
  warning: { bg: 'var(--color-accent-soft)', fg: '#8A5A00' },
  danger: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
  neutral: { bg: 'var(--color-surface-alt)', fg: 'var(--color-muted)' },
  info: { bg: 'var(--color-info-soft)', fg: '#0B6E99' },
};

export function Pill({
  tone = 'neutral',
  children,
  dot,
}: {
  tone?: PillTone;
  children: ReactNode;
  dot?: boolean;
}) {
  const style = PILL_STYLES[tone];
  return (
    <span className="pill" style={{ background: style.bg, color: style.fg }}>
      {dot ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: style.fg }}
        />
      ) : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  tone = 'brand',
  height = 8,
}: {
  value: number;
  tone?: 'brand' | 'success' | 'accent';
  height?: number;
}) {
  const color =
    tone === 'success'
      ? palette.success
      : tone === 'accent'
        ? palette.accent
        : palette.brand;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-surface-alt"
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Course cover                                                        */
/* ------------------------------------------------------------------ */

export function CourseCover({
  cover,
  subject,
  className = '',
  children,
}: {
  cover: string;
  subject: string;
  className?: string;
  children?: ReactNode;
}) {
  const [from, to] = coverGradients[cover] ?? coverGradients.blue;
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div
        aria-hidden
        className="absolute -end-8 -top-10 h-32 w-32 rounded-full opacity-20"
        style={{ background: '#fff' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-12 -start-6 h-28 w-28 rounded-full opacity-10"
        style={{ background: '#fff' }}
      />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="pill bg-white/20 text-white backdrop-blur-sm">
          {subject}
        </span>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-softer text-brand">
        {icon}
      </span>
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-[rgba(8,14,30,0.55)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`card animate-rise relative flex max-h-[92vh] w-full flex-col overflow-hidden sm:rounded-2xl ${width}`}
        style={{ boxShadow: 'var(--shadow-overlay)' }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg leading-snug">{title}</h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="btn btn-ghost btn-icon shrink-0"
          >
            <X size={18} />
          </button>
        </header>
        <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface-alt/60 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export function ToastHost() {
  const { toasts, dismissToast } = useStore();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const tone =
          toast.tone === 'error'
            ? { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' }
            : toast.tone === 'info'
              ? { bg: 'var(--color-info-soft)', fg: '#0B6E99' }
              : { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' };
        const Icon =
          toast.tone === 'error' ? AlertCircle : toast.tone === 'info' ? Info : CheckCircle2;
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="card animate-toast pointer-events-auto flex w-full max-w-md items-center gap-3 px-4 py-3 text-start"
            style={{ background: tone.bg, borderColor: 'transparent' }}
          >
            <Icon size={18} style={{ color: tone.fg }} />
            <span className="flex-1 text-sm font-semibold text-ink">
              {toast.message}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--color-brand)' : 'var(--color-line-strong)' }}
    >
      <span
        className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(-20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'brand';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            تراجع
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-body">{message}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Field({
  label: labelText,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{labelText}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: 'brand' | 'success' | 'accent';
}) {
  const tones = {
    brand: { bg: 'var(--color-brand-soft)', fg: 'var(--color-brand-dark)' },
    success: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    accent: { bg: 'var(--color-accent-soft)', fg: '#8A5A00' },
  } as const;
  const toneStyle = tones[tone];
  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: toneStyle.bg, color: toneStyle.fg }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-muted">{label}</div>
        <div className="num mt-0.5 text-2xl font-bold text-ink">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-faint">{hint}</div> : null}
      </div>
    </div>
  );
}
